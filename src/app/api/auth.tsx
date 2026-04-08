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
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        localStorage.setItem('lastOnlineTime', Date.now().toString());
      }
      setIsValidating(false);
    };

    // Don't wait for validation, just load immediately
    validateToken();
    
    const handleOnline = () => {
      localStorage.setItem('lastOnlineTime', Date.now().toString());
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // ALWAYS try cached credentials first
      const cachedEmail = localStorage.getItem('cachedEmail');
      const cachedPassword = localStorage.getItem('cachedPassword');
      const cachedUser = localStorage.getItem('cachedUserData');
      const cachedToken = localStorage.getItem('cachedToken');
      
      if (cachedEmail === email && cachedPassword === password && cachedUser && cachedToken) {
        const userData = JSON.parse(cachedUser);
        setUser(userData);
        setToken(cachedToken);
        
        localStorage.setItem('token', cachedToken);
        localStorage.setItem('user', cachedUser);
        localStorage.setItem('userName', userData.name);
        
        toast.success(`Welcome back, ${userData.name}!`);
        
        // Try to refresh in background (don't wait, don't fail)
        if (navigator.onLine) {
          apiClient.login(email, password)
            .then(response => {
              localStorage.setItem('cachedToken', response.token);
              localStorage.setItem('cachedUserData', JSON.stringify(response.user));
              localStorage.setItem('token', response.token);
              localStorage.setItem('user', JSON.stringify(response.user));
              localStorage.setItem('lastOnlineTime', Date.now().toString());
            })
            .catch(() => {});
        }
        return;
      }
      
      // No cached credentials - must login online
      const response = await apiClient.login(email, password);
      
      const userData = response.user;
      setUser(userData);
      setToken(response.token);

      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userName', userData.name);
      localStorage.setItem('lastOnlineTime', Date.now().toString());
      
      localStorage.setItem('cachedEmail', email);
      localStorage.setItem('cachedPassword', password);
      localStorage.setItem('cachedToken', response.token);
      localStorage.setItem('cachedUserData', JSON.stringify(userData));

      toast.success(`Welcome, ${userData.name}!`);
    } catch (error: any) {
      toast.error('Cannot connect to server. Please check your internet.');
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
