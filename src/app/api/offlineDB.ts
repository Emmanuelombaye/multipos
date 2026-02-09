// IndexedDB wrapper for enhanced offline storage
// Provides 50MB+ storage vs localStorage's 5MB limit

const DB_NAME = 'MultiPOS_OfflineDB';
const DB_VERSION = 1;

interface DBStores {
    products: 'products';
    transactions: 'transactions';
    branches: 'branches';
    expenses: 'expenses';
}

class OfflineDB {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    async init(): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                console.warn('IndexedDB not available, falling back to localStorage');
                resolve();
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ IndexedDB initialized successfully');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Products store
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id' });
                    productStore.createIndex('branch_id', 'branch_id', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                }

                // Transactions store (for offline viewing)
                if (!db.objectStoreNames.contains('transactions')) {
                    const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
                    txStore.createIndex('branch_id', 'branch_id', { unique: false });
                    txStore.createIndex('created_at', 'created_at', { unique: false });
                }

                // Branches store
                if (!db.objectStoreNames.contains('branches')) {
                    db.createObjectStore('branches', { keyPath: 'id' });
                }

                // Expenses store (for offline viewing)
                if (!db.objectStoreNames.contains('expenses')) {
                    const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
                    expenseStore.createIndex('branch_id', 'branch_id', { unique: false });
                    expenseStore.createIndex('created_at', 'created_at', { unique: false });
                }

                console.log('✅ IndexedDB object stores created');
            };
        });

        return this.initPromise;
    }

    // Generic get method
    async get<T>(storeName: keyof DBStores, key: string): Promise<T | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic getAll method
    async getAll<T>(storeName: keyof DBStores): Promise<T[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Generic put method
    async put<T>(storeName: keyof DBStores, value: T): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(value);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Generic putMany method
    async putMany<T>(storeName: keyof DBStores, values: T[]): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            let completed = 0;
            const total = values.length;

            values.forEach((value) => {
                const request = store.put(value);
                request.onsuccess = () => {
                    completed++;
                    if (completed === total) resolve();
                };
                request.onerror = () => reject(request.error);
            });

            if (total === 0) resolve();
        });
    }

    // Get by index
    async getByIndex<T>(
        storeName: keyof DBStores,
        indexName: string,
        value: string
    ): Promise<T[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Clear store
    async clear(storeName: keyof DBStores): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Delete specific item
    async delete(storeName: keyof DBStores, key: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Get database size estimate
    async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0,
            };
        }
        return null;
    }
}

// Export singleton instance
export const offlineDB = new OfflineDB();

// Helper functions for common operations
export const cacheProducts = async (products: any[]) => {
    try {
        await offlineDB.putMany('products', products);
        console.log(`✅ Cached ${products.length} products to IndexedDB`);
    } catch (error) {
        console.error('Failed to cache products:', error);
    }
};

export const getCachedProducts = async (branchId?: string): Promise<any[]> => {
    try {
        if (branchId) {
            return await offlineDB.getByIndex('products', 'branch_id', branchId);
        }
        return await offlineDB.getAll('products');
    } catch (error) {
        console.error('Failed to get cached products:', error);
        return [];
    }
};

export const cacheTransaction = async (transaction: any) => {
    try {
        await offlineDB.put('transactions', transaction);
    } catch (error) {
        console.error('Failed to cache transaction:', error);
    }
};

export const getCachedTransactions = async (branchId: string, limit = 100): Promise<any[]> => {
    try {
        const transactions = await offlineDB.getByIndex('transactions', 'branch_id', branchId);
        return transactions.slice(0, limit);
    } catch (error) {
        console.error('Failed to get cached transactions:', error);
        return [];
    }
};

export const cacheBranches = async (branches: any[]) => {
    try {
        await offlineDB.putMany('branches', branches);
        console.log(`✅ Cached ${branches.length} branches to IndexedDB`);
    } catch (error) {
        console.error('Failed to cache branches:', error);
    }
};

export const getCachedBranches = async (): Promise<any[]> => {
    try {
        return await offlineDB.getAll('branches');
    } catch (error) {
        console.error('Failed to get cached branches:', error);
        return [];
    }
};
