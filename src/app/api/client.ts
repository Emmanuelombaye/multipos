import axios, { AxiosInstance } from 'axios';
import { toast } from 'sonner';
import { enqueueOfflineAction, getOfflineQueue, removeOfflineActions } from './offlineQueue';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'manager' | 'cashier';
    branchId?: string;
  };
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'cashier';
  branchId?: string;
}

class APIClient {
  private axios: AxiosInstance;
  private cache: Map<string, { expiresAt: number; data: any }>;

  constructor() {
    this.cache = new Map();
    this.axios = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (!error.response) {
          return Promise.reject(error);
        }
        if (error.response?.status === 401) {
          // Clear auth data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('userName');

          // Only reload if not already on login page
          if (window.location.pathname !== '/') {
            // Use a more gentle approach - dispatch custom event
            window.dispatchEvent(new Event('auth-expired'));
            // Fallback to reload after short delay
            setTimeout(() => {
              if (window.location.pathname !== '/') {
                window.location.href = '/';
              }
            }, 1000);
          }
        } else if (error.response?.data?.error) {
          toast.error(error.response.data.error);
        }
        return Promise.reject(error);
      }
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushOfflineQueue();
      });
      if (navigator.onLine) {
        setTimeout(() => {
          this.flushOfflineQueue();
        }, 0);
      }
    }
  }

  private isOnline(): boolean {
    if (typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  }

  private async flushOfflineQueue(): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
      return;
    }

    const completed: string[] = [];

    for (const item of queue) {
      try {
        if (item.type === 'transaction') {
          await this.axios.post('/transactions', item.payload);
        } else if (item.type === 'expense') {
          await this.axios.post('/expenses', item.payload);
        } else if (item.type === 'closingStock') {
          await this.axios.put('/inventory/entry/closing', item.payload);
        }
        completed.push(item.id);
      } catch (error) {
        if (!this.isOnline()) {
          break;
        }
      }
    }

    removeOfflineActions(completed);
  }

  private async cachedGet<T>(url: string, ttlMs: number): Promise<T> {
    if (ttlMs > 0) {
      const cached = this.cache.get(url);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.data as T;
      }
    }

    const response = await this.axios.get(url);
    if (ttlMs > 0) {
      this.cache.set(url, { expiresAt: Date.now() + ttlMs, data: response.data });
    }
    return response.data as T;
  }

  // Public method to clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Auth endpoints
  async register(data: RegisterPayload): Promise<any> {
    const response = await this.axios.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.axios.post('/auth/login', { email, password });
    return response.data;
  }

  // Branches
  async getBranches(): Promise<any[]> {
    return this.cachedGet('/branches', 5000); // Shorter cache for branch list
  }

  async getBranch(id: string): Promise<any> {
    return this.cachedGet(`/branches/${id}`, 0); // No cache for branch details with stats
  }

  async updateBranch(id: string, updates: any): Promise<any> {
    const response = await this.axios.put(`/branches/${id}`, updates);
    return response.data;
  }

  // Products
  async getProducts(): Promise<any[]> {
    return this.cachedGet('/products', 30000);
  }

  async getProductsWithStock(branchId: string): Promise<any[]> {
    return this.cachedGet(`/products/stock/${branchId}`, 15000);
  }

  async getBranchProducts(branchId: string): Promise<any[]> {
    const cacheKey = `branchProducts:${branchId}`;

    if (!this.isOnline()) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return [];
        }
      }
      return [];
    }

    const data = await this.cachedGet(`/products/branch/${branchId}`, 5000);
    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }

  async addProductToBranch(branchId: string, name: string, category: string, pricePerKg: number, lowStockThreshold?: number, image?: string, initialStock?: number): Promise<any> {
    const response = await this.axios.post(`/products/branch/${branchId}`, {
      name,
      category,
      pricePerKg,
      lowStockThreshold,
      image,
      initialStock,
    });

    // Invalidate product caches
    this.cache.clear();

    return response.data;
  }

  async removeProductFromBranch(branchId: string, productId: string): Promise<any> {
    const response = await this.axios.delete(`/products/${productId}/branch/${branchId}`);

    // Invalidate all product and inventory caches
    this.cache.clear();

    return response.data;
  }

  async createProduct(name: string, category: string, pricePerKg: number, lowStockThreshold?: number, image?: string): Promise<any> {
    const response = await this.axios.post('/products', {
      name,
      category,
      pricePerKg,
      lowStockThreshold,
      image,
    });

    // Invalidate product caches
    this.cache.delete('/products');

    return response.data;
  }

  async updateProduct(id: string, updates: any): Promise<any> {
    const response = await this.axios.put(`/products/${id}`, updates);

    // Invalidate product caches
    this.cache.delete('/products');

    return response.data;
  }

  async deleteProduct(id: string): Promise<any> {
    const response = await this.axios.delete(`/products/${id}`);

    // Invalidate all product and inventory caches
    this.cache.clear();

    return response.data;
  }

  async updateBranchProduct(branchId: string, productId: string, updates: any): Promise<any> {
    const response = await this.axios.put(`/products/branch/${branchId}/${productId}`, updates);
    this.cache.clear();
    return response.data;
  }

  async addStock(branchId: string, productId: string, amount: number): Promise<any> {
    const response = await this.axios.post(`/products/branch/${branchId}/${productId}/stock`, {
      amount,
    });
    this.cache.clear();
    return response.data;
  }

  // Transactions
  async createTransaction(branchId: string, items: any[], paymentMethod: string): Promise<any> {
    if (!this.isOnline()) {
      const queuedId = enqueueOfflineAction('transaction', {
        branchId,
        items,
        paymentMethod,
      });
      return { offline: true, queuedId };
    }

    const response = await this.axios.post('/transactions', {
      branchId,
      items,
      paymentMethod,
    });

    // Invalidate all caches
    this.cache.clear();

    return response.data;
  }

  async getTransactionsByBranch(branchId: string, limit = 50, offset = 0): Promise<any> {
    return this.cachedGet(
      `/transactions/branch/${branchId}?limit=${limit}&offset=${offset}`,
      5000
    );
  }

  async getTransactionsByDateRange(branchId: string, startDate: string, endDate: string): Promise<any[]> {
    return this.cachedGet(
      `/transactions/branch/${branchId}/range?startDate=${startDate}&endDate=${endDate}`,
      0 // No cache for real-time data
    );
  }

  async getTodaySales(branchId: string): Promise<number> {
    const response = await this.axios.get(`/transactions/branch/${branchId}/today-sales`);
    return response.data.total;
  }

  // Inventory
  async recordStockEntry(productId: string, branchId: string, openingStock: number, date: string): Promise<any> {
    const response = await this.axios.post('/inventory/entry', {
      productId,
      branchId,
      openingStock,
      date,
      addedBy: localStorage.getItem('userName') || 'System',
    });
    return response.data;
  }

  async recordClosingStock(productId: string, branchId: string, closingStock: number, date: string): Promise<any> {
    if (!this.isOnline()) {
      const queuedId = enqueueOfflineAction('closingStock', {
        productId,
        branchId,
        closingStock,
        date,
      });
      return { offline: true, queuedId };
    }

    const response = await this.axios.put('/inventory/entry/closing', {
      productId,
      branchId,
      closingStock,
      date,
    });

    // Invalidate all caches so admin sees updated closing stock immediately
    this.cache.clear();

    return response.data;
  }

  async getStockHistory(branchId: string, limit = 50, offset = 0): Promise<any> {
    return this.cachedGet(
      `/inventory/history/${branchId}?limit=${limit}&offset=${offset}`,
      5000
    );
  }

  async getStockHistoryByDate(branchId: string, date: string): Promise<any[]> {
    return this.cachedGet(`/inventory/history/${branchId}/${date}`, 0); // No cache for real-time data
  }

  async getLowStockProducts(branchId: string): Promise<any[]> {
    return this.cachedGet(`/inventory/low-stock/${branchId}`, 0); // No cache for real-time data
  }

  async getCurrentStock(branchId: string): Promise<any[]> {
    return this.cachedGet(`/inventory/current/${branchId}`, 5000);
  }

  async updateBranchStock(branchId: string, productId: string, currentStock: number): Promise<any> {
    const response = await this.axios.put(`/inventory/stock/${branchId}/${productId}`, {
      currentStock,
    });

    // Invalidate related caches
    this.cache.delete(`/inventory/current/${branchId}`);
    this.cache.delete(`/inventory/low-stock/${branchId}`);

    return response.data;
  }

  // Expenses
  async createExpense(branchId: string, category: string, amount: number, description: string): Promise<any> {
    if (!this.isOnline()) {
      const queuedId = enqueueOfflineAction('expense', {
        branchId,
        category,
        amount,
        description,
      });
      return { offline: true, queuedId };
    }

    const response = await this.axios.post('/expenses', {
      branchId,
      category,
      amount,
      description,
    });

    // Invalidate all related caches
    this.cache.clear();

    return response.data;
  }

  async getExpensesByBranch(branchId: string, limit = 50, offset = 0): Promise<any> {
    const response = await this.axios.get(
      `/expenses/branch/${branchId}?limit=${limit}&offset=${offset}`
    );
    return response.data;
  }

  async getExpensesByDateRange(branchId: string, startDate: string, endDate: string): Promise<any[]> {
    const response = await this.axios.get(
      `/expenses/branch/${branchId}/range?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }

  async getTodayExpenses(branchId: string): Promise<number> {
    const response = await this.axios.get(`/expenses/branch/${branchId}/today-expenses`);
    return response.data.total;
  }

  async getExpensesByCategory(branchId: string, startDate: string, endDate: string): Promise<any> {
    const response = await this.axios.get(
      `/expenses/branch/${branchId}/by-category?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  }

  // Staff
  async getStaff(): Promise<any[]> {
    return this.cachedGet('/staff', 15000);
  }

  async getStaffByBranch(branchId: string): Promise<any[]> {
    return this.cachedGet(`/staff/branch/${branchId}`, 10000);
  }

  // Dashboard
  async getAdminDashboard(): Promise<any> {
    return this.cachedGet('/dashboard/admin', 5000);
  }

  async getBranchDashboard(branchId: string): Promise<any> {
    return this.cachedGet(`/dashboard/branch/${branchId}`, 5000);
  }

  async getMetrics(branchId: string, startDate: string, endDate: string): Promise<any> {
    return this.cachedGet(
      `/dashboard/metrics/${branchId}?startDate=${startDate}&endDate=${endDate}`,
      5000
    );
  }
}

export const apiClient = new APIClient();
export default apiClient;
