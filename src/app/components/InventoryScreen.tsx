import { useEffect, useMemo, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, Search, History, ArrowRightLeft } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface InventoryScreenProps {
  branchId?: string;
}

export function InventoryScreen({ branchId }: InventoryScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockByBranch, setStockByBranch] = useState<Record<string, any[]>>({});
  const [stockHistoryData, setStockHistoryData] = useState<any[]>([]);

  const isAdminView = !branchId;

  useEffect(() => {
    loadBaseData();
  }, [branchId]);

  useEffect(() => {
    if (products.length === 0) return;
    loadInventoryData();

    const intervalId = setInterval(() => {
      loadInventoryData(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [branchId, activeTab, products.length]);

  const loadBaseData = async () => {
    try {
      setLoading(true);
      const [branchList, productList] = await Promise.all([
        apiClient.getBranches(),
        apiClient.getProducts(),
      ]);

      setBranches(Array.isArray(branchList) ? branchList : []);
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      console.error('Failed to load inventory base data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const branchIds = branchId ? [branchId] : branches.map((branch) => branch.id);

      if (branchIds.length === 0) return;

      const stockResults = await Promise.all(
        branchIds.map(async (id) => {
          const stock = await apiClient.getCurrentStock(id);
          return [id, Array.isArray(stock) ? stock : []] as const;
        })
      );

      setStockByBranch(Object.fromEntries(stockResults));

      const historyResults = await Promise.all(
        branchIds.map(async (id) => {
          const historyResponse = await apiClient.getStockHistory(id, 50, 0);
          const historyArray = Array.isArray(historyResponse?.data)
            ? historyResponse.data
            : Array.isArray(historyResponse)
            ? historyResponse
            : [];
          return historyArray;
        })
      );

      const mergedHistory = historyResults
        .flat()
        .sort((a: any, b: any) => (a.date > b.date ? -1 : 1));

      setStockHistoryData(mergedHistory);
    } catch (error) {
      console.error('Failed to load inventory data:', error);
      toast.error('Failed to refresh inventory');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const branchById = useMemo(() => {
    const map: Record<string, any> = {};
    branches.forEach((branch) => {
      map[branch.id] = branch;
    });
    return map;
  }, [branches]);

  const productById = useMemo(() => {
    const map: Record<string, any> = {};
    products.forEach((product) => {
      map[product.id] = product;
    });
    return map;
  }, [products]);

  const branchStockMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    Object.entries(stockByBranch).forEach(([bId, items]) => {
      const productMap: Record<string, number> = {};
      (items as any[]).forEach((item) => {
        productMap[item.product_id] = item.current_stock || 0;
      });
      map[bId] = productMap;
    });
    return map;
  }, [stockByBranch]);

  const totalStockByProduct = useMemo(() => {
    const totals: Record<string, number> = {};
    products.forEach((product) => {
      const total = branches.reduce((sum, branch) => {
        const branchStock = branchStockMap[branch.id]?.[product.id] || 0;
        return sum + branchStock;
      }, 0);
      totals[product.id] = total;
    });
    return totals;
  }, [branches, branchStockMap, products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const filteredStockHistory = useMemo(() => {
    if (!branchId) return stockHistoryData;
    return stockHistoryData.filter((sh) => sh.branch_id === branchId);
  }, [branchId, stockHistoryData]);

  const totalSystemStock = useMemo(() => {
    return Object.values(totalStockByProduct).reduce((sum, value) => sum + value, 0);
  }, [totalStockByProduct]);

  const lowStockCount = useMemo(() => {
    if (isAdminView) {
      return products.filter((p) => (totalStockByProduct[p.id] || 0) < p.low_stock_threshold).length;
    }
    const branchStock = branchId ? branchStockMap[branchId] || {} : {};
    return products.filter((p) => (branchStock[p.id] || 0) < p.low_stock_threshold).length;
  }, [branchId, branchStockMap, isAdminView, products, totalStockByProduct]);

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 overflow-y-auto max-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Inventory Management</h1>
          <p className="text-neutral-600">
            {isAdminView ? 'All branches stock overview' : 'Stock levels for current branch'}
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="bg-neutral-100 grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Stock</TabsTrigger>
            <TabsTrigger value="history">Opening/Closing</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'current' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-200 rounded-full">
                  <Package className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Products</p>
                  <p className="text-2xl font-bold text-blue-900">{products.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-200 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Total System Stock</p>
                  <p className="text-2xl font-bold text-green-900">
                    {totalSystemStock.toLocaleString()}kg
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-200 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-red-700 font-medium">Low Stock Items</p>
                  <p className="text-2xl font-bold text-red-900">{lowStockCount}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-200 rounded-full">
                  <Package className="w-6 h-6 text-purple-700" />
                </div>
                <div>
                  <p className="text-sm text-purple-700 font-medium">Categories</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {new Set(products.map((p) => p.category)).size}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Products Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100 border-b border-neutral-200">
                  <tr>
                    <th className="text-left py-4 px-4 font-semibold text-neutral-700">Product</th>
                    <th className="text-left py-4 px-4 font-semibold text-neutral-700">Category</th>
                    <th className="text-left py-4 px-4 font-semibold text-neutral-700">
                      Price/kg
                    </th>
                    {isAdminView ? (
                      <>
                        <th className="text-left py-4 px-4 font-semibold text-neutral-700">
                          Total Stock
                        </th>
                        {branches.map((branch) => (
                          <th
                            key={branch.id}
                            className="text-left py-4 px-4 font-semibold text-neutral-700"
                          >
                            {branch.name.split(' - ')[0]}
                          </th>
                        ))}
                      </>
                    ) : (
                      <th className="text-left py-4 px-4 font-semibold text-neutral-700">Stock</th>
                    )}
                    <th className="text-left py-4 px-4 font-semibold text-neutral-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProducts.map((product) => {
                    const adminStock = totalStockByProduct[product.id] || 0;
                    const branchStock = branchId ? branchStockMap[branchId]?.[product.id] || 0 : 0;
                    const isLowStock = isAdminView
                      ? adminStock < product.low_stock_threshold
                      : branchStock < product.low_stock_threshold;

                    return (
                      <tr key={product.id} className="hover:bg-neutral-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{product.image || '🥩'}</span>
                            <span className="font-medium text-neutral-900">{product.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-neutral-600">{product.category}</td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-red-700">
                            KES {product.price_per_kg}
                          </span>
                        </td>
                        {isAdminView ? (
                          <>
                            <td className="py-4 px-4">
                              <span
                                className={`font-bold ${
                                  isLowStock ? 'text-red-700' : 'text-neutral-900'
                                }`}
                              >
                                {adminStock}kg
                              </span>
                            </td>
                            {branches.map((branch) => {
                              const stockVal = branchStockMap[branch.id]?.[product.id] || 0;
                              const isBranchLow = stockVal < product.low_stock_threshold;
                              return (
                                <td key={branch.id} className="py-4 px-4">
                                  <span
                                    className={`font-semibold ${
                                      isBranchLow ? 'text-red-700' : 'text-neutral-700'
                                    }`}
                                  >
                                    {stockVal}kg
                                  </span>
                                </td>
                              );
                            })}
                          </>
                        ) : (
                          <td className="py-4 px-4">
                            <span
                              className={`font-bold ${
                                isLowStock ? 'text-red-700' : 'text-neutral-900'
                              }`}
                            >
                              {branchStock}kg
                            </span>
                          </td>
                        )}
                        <td className="py-4 px-4">
                          {isLowStock ? (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-green-100 text-green-700 w-fit"
                            >
                              In Stock
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900">Stock Opening & Closing Logs</h3>
            <Badge className="bg-red-700">Historical Tracking</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-100 border-b border-neutral-200">
                <tr>
                  <th className="text-left py-4 px-4 font-semibold text-neutral-700">Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-neutral-700">Branch</th>
                  <th className="text-left py-4 px-4 font-semibold text-neutral-700">Product</th>
                  <th className="text-left py-4 px-4 font-semibold text-neutral-700 text-center">Opening Stock</th>
                  <th className="text-center py-4 px-4 font-semibold text-neutral-700">Sales (Est)</th>
                  <th className="text-left py-4 px-4 font-semibold text-neutral-700 text-center">Closing Stock</th>
                  <th className="text-left py-4 px-4 font-semibold text-neutral-700 text-center">Variance</th>
                  <th className="text-left py-4 px-4 font-semibold text-neutral-700">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredStockHistory.map((sh) => {
                  const product = productById[sh.product_id];
                  const branch = branchById[sh.branch_id];
                  const openingStock = sh.opening_stock || 0;
                  const closingStock = sh.closing_stock ?? null;
                  const variance = closingStock !== null ? (openingStock - closingStock) : 0;
                  
                  return (
                    <tr key={sh.id} className="hover:bg-neutral-50">
                      <td className="py-4 px-4 text-sm text-neutral-600">{sh.date}</td>
                      <td className="py-4 px-4 text-sm font-medium">
                        {branch?.name?.split(' - ')[0] || 'Branch'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span>{product?.image || '🥩'}</span>
                          <span className="text-sm">{product?.name || 'Product'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-blue-700">{openingStock}kg</td>
                      <td className="py-4 px-4 text-center text-neutral-400">
                        <ArrowRightLeft className="w-4 h-4 mx-auto" />
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-green-700">
                        {closingStock !== null ? `${closingStock}kg` : '--'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {closingStock !== null ? (
                          <Badge variant="outline" className={variance > 0 ? 'text-red-700 border-red-200' : 'text-green-700 border-green-200'}>
                            {variance > 0 ? `-${variance}kg` : 'No loss'}
                          </Badge>
                        ) : '--'}
                      </td>
                      <td className="py-4 px-4 text-sm text-neutral-600">{sh.added_by || 'System'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Low Stock Alert */}
      {activeTab === 'current' && lowStockCount > 0 && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-700" />
            <h3 className="font-semibold text-red-900">
              Critical Stock Alert - Immediate Action Required
            </h3>
          </div>
          <p className="text-sm text-red-700">
            {lowStockCount} products are below minimum stock threshold. Please restock immediately to avoid stockouts.
          </p>
        </Card>
      )}
    </div>
  );
}
