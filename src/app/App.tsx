import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Package,
  FileText,
  LogOut,
  Menu,
  X,
  WalletCards
} from 'lucide-react';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { POSScreen } from './components/POSScreen';
import { BranchManagement } from './components/BranchManagement';
import { InventoryScreen } from './components/InventoryScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { BranchDashboard } from './components/BranchDashboard';
import { AdminFinancials } from './components/AdminFinancials';
import { ProductManagement } from './components/ProductManagement';
import { Button } from './components/ui/button';
import { Toaster } from './components/ui/sonner';
import { apiClient } from './api/client';
import { useAuth } from './api/auth';

type Screen =
  | 'dashboard'
  | 'pos'
  | 'branches'
  | 'inventory'
  | 'products'
  | 'reports'
  | 'financials';

export default function App() {
  const { user, isLoggedIn, logout } = useAuth();
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string>('User');
  const [branchName, setBranchName] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // CACHE BUSTER: Force reload if version mismatch
  const APP_VERSION = "4.1.0"; // Product-First Mobile Redesign
  useEffect(() => {
    const cachedVersion = localStorage.getItem('app_version');
    if (cachedVersion !== APP_VERSION) {
      console.log(`[CacheBuster] Version mismatch: ${cachedVersion} vs ${APP_VERSION}. Forcing reload...`);
      localStorage.setItem('app_version', APP_VERSION);
      // Hard reload from server
      window.location.reload();
    }
  }, []);

  // Initialize user data from auth context
  useEffect(() => {
    if (user) {
      setUserRole(user.role || 'cashier');
      setSelectedBranch(user.branchId || '');
      setUserName(user.name || user.email || 'User');

      // Set default screen based on role
      if (user.role === 'cashier') {
        setCurrentScreen('pos');
      } else {
        setCurrentScreen('dashboard');
      }

      // Load branch name if branchId exists
      if (user.branchId) {
        loadBranchName(user.branchId);
      }
    }
    setIsInitialized(true);
  }, [user]);

  // Listen for auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      handleLogout();
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const loadBranchName = async (branchId: string) => {
    try {
      const branch = await apiClient.getBranch(branchId);
      setBranchName(branch?.name || '');
    } catch (error) {
      console.error('Failed to load branch:', error);
    }
  };

  const handleLogin = (role: 'admin' | 'manager' | 'cashier', branchId: string) => {
    // User data is already in localStorage and auth context
    // Just update local state
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUserName(userData.name || userData.email || 'User');
      setUserRole(userData.role || role);
      setSelectedBranch(userData.branchId || branchId);

      // Load branch name if branchId exists
      if (userData.branchId) {
        loadBranchName(userData.branchId);
      }

      // Set default screen based on role
      if (userData.role === 'cashier') {
        setCurrentScreen('pos');
      } else {
        setCurrentScreen('dashboard');
      }
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentScreen('dashboard');
    setMobileMenuOpen(false);
    setUserName('User');
    setBranchName('');
  };

  // Wait for initialization before rendering
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-700 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Navigation items based on role
  const getNavigationItems = () => {
    if (userRole === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'financials', label: 'Financials', icon: WalletCards },
        { id: 'branches', label: 'Branches', icon: Store },
        { id: 'products', label: 'Products', icon: Package },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'reports', label: 'Analytics', icon: FileText },
        { id: 'pos', label: 'POS Demo', icon: ShoppingCart },
      ];
    } else if (userRole === 'manager') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'pos', label: 'POS', icon: ShoppingCart },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'reports', label: 'Reports', icon: FileText },
      ];
    } else {
      return [
        { id: 'pos', label: 'POS', icon: ShoppingCart },
      ];
    }
  };

  const navigationItems = getNavigationItems();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        if (userRole === 'admin') {
          return <AdminDashboard />;
        } else {
          return <BranchDashboard branchId={selectedBranch} />;
        }
      case 'financials':
        return <AdminFinancials />;
      case 'pos':
        return <POSScreen branchId={selectedBranch} cashierName={userName} />
      case 'branches':
        return <BranchManagement />;
      case 'products':
        return <ProductManagement />;
      case 'inventory':
        return <InventoryScreen branchId={userRole === 'admin' ? undefined : selectedBranch} />;
      case 'reports':
        return <ReportsScreen />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Toaster position="top-right" />

      {/* Top Navigation Bar */}
      <header className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-red-950 text-white shadow-lg sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="flex items-center gap-3">
              <img src="/edendroplogo.png" alt="EdenDropInvestment" className="w-8 h-8 object-contain" />
              <div>
                <h1 className="text-xl font-bold">EdenDropInvestment</h1>
                {userRole !== 'admin' && branchName && (
                  <p className="text-xs text-neutral-300">{branchName}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-neutral-300 capitalize">{userRole}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:bg-white/10"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex border-t border-white/10 px-4">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentScreen(item.id as Screen)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${currentScreen === item.id
                  ? 'border-red-500 text-white bg-white/5'
                  : 'border-transparent text-neutral-300 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b shadow-lg z-30">
          <nav className="px-4 py-2 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentScreen(item.id as Screen);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentScreen === item.id
                    ? 'bg-red-50 text-red-700 font-semibold'
                    : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderScreen()}
      </main>

      {/* Mobile Bottom Navigation removed to prioritize Product-First POS Layout and avoid overlap with Floating Cart */}
    </div>
  );
}
