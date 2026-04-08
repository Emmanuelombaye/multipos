import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from './client';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'cashier';
  branchId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoggedIn: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(true);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const lastOnlineTime = localStorage.getItem('lastOnlineTime');
      
      if (storedToken && storedUser) {
        // If offline, allow login with cached credentials (up to 30 days)
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          const daysSinceOnline = lastOnlineTime 
            ? (Date.now() - parseInt(lastOnlineTime)) / (1000 * 60 * 60 * 24)
            : 0;
          
          if (daysSinceOnline <= 30) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            console.log(`📴 Offline mode: ${Math.floor(daysSinceOnline)} days since last online`);
          } else {
            console.log('⚠️ Offline credentials expired (>30 days)');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userName');
            setToken(null);
            setUser(null);
          }
          setIsValidating(false);
          return;
        }
        
        // Online - validate token with server
        try {
          await apiClient.getBranches();
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          localStorage.setItem('lastOnlineTime', Date.now().toString());
        } catch (error: any) {
          if (error.response?.status === 401) {
            console.log('Token expired, clearing auth');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userName');
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsValidating(false);
    };

    validateToken();
    const handleOnline = () => {
      localStorage.setItem('lastOnlineTime', Date.now().toString());
      validateToken();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Check if offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Try offline login with cached credentials
        const cachedEmail = localStorage.getItem('cachedEmail');
        const cachedPassword = localStorage.getItem('cachedPassword');
        const cachedUser = localStorage.getItem('cachedUserData');
        const cachedToken = localStorage.getItem('cachedToken');
        
        if (cachedEmail === email && cachedPassword === password && cachedUser && cachedToken) {
          const userData = JSON.parse(cachedUser);
          setUser(userData);
          setToken(cachedToken);
          
          // Restore to active storage
          localStorage.setItem('token', cachedToken);
          localStorage.setItem('user', cachedUser);
          localStorage.setItem('userName', userData.name);
          
          toast.success(`📴 Offline login: Welcome, ${userData.name}!`);
          return;
        } else {
          toast.error('📴 Offline login failed. Wrong credentials or login online first.');
          throw new Error('Offline login failed');
        }
      }
      
      // Online login
      const response = await apiClient.login(email, password);
      
      const userData = response.user;
      setUser(userData);
      setToken(response.token);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userName', userData.name);
      localStorage.setItem('lastOnlineTime', Date.now().toString());
      
      // Cache credentials AND user data for offline login
      localStorage.setItem('cachedEmail', email);
      localStorage.setItem('cachedPassword', password);
      localStorage.setItem('cachedToken', response.token);
      localStorage.setItem('cachedUserData', JSON.stringify(userData));

      toast.success(`Welcome, ${userData.name}!`);
    } catch (error: any) {
      if (navigator.onLine) {
        toast.error(error.response?.data?.error || 'Login failed');
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
    // DON'T remove cachedEmail and cachedPassword - keep for offline login
    // localStorage.removeItem('cachedEmail');
    // localStorage.removeItem('cachedPassword');
    // Keep lastOnlineTime for offline mode tracking
    toast.success('Logged out successfully');
  };

  const isLoggedIn = () => {
    return !!token && !!user;
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, isLoggedIn }}>
      {isValidating ? (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-red-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
