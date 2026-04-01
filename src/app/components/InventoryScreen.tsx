import { useEffect, useMemo, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, Search, ArrowRightLeft, ArrowRight, Truck, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface InventoryScreenProps {
  branchId?: string;
  hideHeader?: boolean;
  hidePadding?: boolean;
  initialTab?: string;
}

export function InventoryScreen({ branchId, hideHeader = false, hidePadding = false, initialTab = 'current' }: InventoryScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockByBranch, setStockByBranch] = useState<Record<string, any[]>>({});
  const [stockHistoryData, setStockHistoryData] = useState<any[]>([]);
  const [transferModal, setTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromBranchId: '', toBranchId: '', productId: '', quantity: '', notes: '' });
  const [transferring, setTransferring] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [dispatchModal, setDispatchModal] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    branchId: '', productId: '', clientName: '', clientType: 'hotel',
    quantity: '', pricePerKg: '', paymentStatus: 'pending', paymentMethod: '', notes: '', dispatchDate: ''
  });
  const [dispatching, setDispatching] = useState(false);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [dispatchesLoading, setDispatchesLoading] = useState(false);

  const isAdminView = !branchId;

  const loadDispatches = async () => {
    setDispatchesLoading(true);
    try {
      const target = branchId || 'all';
      const result = await apiClient.getExternalDispatches(target, 100, 0);
      setDispatches(Array.isArray(result?.data) ? result.data : []);
    } catch {
      toast.error('Failed to load dispatches');
    } finally {
      setDispatchesLoading(false);
    }
  };

  const loadTransfers = async () => {
    setTransfersLoading(true);
    try {
      const result = await apiClient.getStockTransfers(branchId || undefined, 100, 0);
      setTransfers(Array.isArray(result?.data) ? result.data : []);
    } catch {
      toast.error('Failed to load transfer log');
    } finally {
      setTransfersLoading(false);
    }
  };

  const handleDispatch = async () => {
    const { branchId: fBranch, productId: fProduct, clientName, clientType, quantity, pricePerKg, paymentStatus, paymentMethod, notes, dispatchDate } = dispatchForm;
    if (!fBranch || !fProduct || !clientName || !clientType || !quantity || !pricePerKg || !dispatchDate) {
      toast.error('All required fields must be filled');
      return;
    }
    const qty = parseFloat(quantity);
    const ppkg = parseFloat(pricePerKg);
    if (isNaN(qty) || qty <= 0 || isNaN(ppkg) || ppkg <= 0) {
      toast.error('Enter valid quantity and price');
      return;
    }
    setDispatching(true);
    try {
      await apiClient.createExternalDispatch({
        branchId: fBranch, productId: fProduct, clientName, clientType,
        quantity: qty, pricePerKg: ppkg, paymentStatus,
        paymentMethod: paymentMethod || undefined,
        notes: notes || undefined, dispatchDate
      });
      toast.success(`Dispatched ${qty}kg to ${clientName}`);
      setDispatchModal(false);
      setDispatchForm({ branchId: '', productId: '', clientName: '', clientType: 'hotel', quantity: '', pricePerKg: '', paymentStatus: 'pending', paymentMethod: '', notes: '', dispatchDate: '' });
      loadInventoryData();
      loadDispatches();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  const handleTransfer = async () => {
    const { fromBranchId, toBranchId, productId, quantity } = transferForm;
    if (!fromBranchId || !toBranchId || !productId || !quantity) {
      toast.error('All fields are required');
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error('Source and destination branches must be different');
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    setTransferring(true);
    try {
      await apiClient.transferStock(fromBranchId, toBranchId, productId, qty, transferForm.notes || undefined);
      toast.success(`Transferred ${qty}kg successfully`);
      setTransferModal(false);
      setTransferForm({ fromBranchId: '', toBranchId: '', productId: '', quantity: '', notes: '' });
      loadInventoryData();
      loadTransfers();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || 'Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  useEffect(() => {
    loadBaseData();
    loadDispatches();
    loadTransfers();
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
    <div className={`space-y-6 ${hidePadding ? '' : 'p-4 md:p-6'} overflow-y-auto max-h-screen`}>
      {!hideHeader && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Inventory Management</h1>
            <p className="text-neutral-600">
              {isAdminView ? 'All branches stock overview' : 'Stock levels for current branch'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {isAdminView && (
                <button
                  onClick={() => setTransferModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-medium text-sm"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Transfer
                </button>
              )}
              <button
                onClick={() => {
                  setDispatchForm((f) => ({ ...f, branchId: branchId || (branches[0]?.id || ''), dispatchDate: new Date().toISOString().split('T')[0] }));
                  setDispatchModal(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
              >
                <Truck className="w-4 h-4" />
                Dispatch
              </button>
            </div>
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'dispatches') loadDispatches(); if (v === 'transfers') loadTransfers(); }} className="w-full">
              <TabsList className="bg-neutral-100 grid w-full grid-cols-4">
                <TabsTrigger value="current">Stock</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="transfers">Transfers</TabsTrigger>
                <TabsTrigger value="dispatches">Dispatches</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

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
                                className={`font-bold ${isLowStock ? 'text-red-700' : 'text-neutral-900'
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
                                    className={`font-semibold ${isBranchLow ? 'text-red-700' : 'text-neutral-700'
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
                              className={`font-bold ${isLowStock ? 'text-red-700' : 'text-neutral-900'
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
      ) : activeTab === 'transfers' ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-neutral-900">Internal Stock Transfers</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Branch-to-branch transfer audit log — immutable record</p>
            </div>
            <Badge className="bg-red-700 flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" />{transfers.length} records</Badge>
          </div>
          {transfersLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading transfers...</div>
          ) : transfers.length === 0 ? (
            <div className="p-8 text-center text-neutral-400">
              <ArrowRightLeft className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No internal transfers recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100 border-b border-neutral-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Product</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">From</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">To</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700 text-sm">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700 text-sm">From Stock</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700 text-sm">To Stock</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">By</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {transfers.map((t) => {
                    const product = productById[t.product_id];
                    const fromBranch = branchById[t.from_branch_id];
                    const toBranch = branchById[t.to_branch_id];
                    return (
                      <tr key={t.id} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 text-sm text-neutral-600">{t.transfer_date}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span>{product?.image || '🥩'}</span>
                            <span className="text-sm font-medium">{product?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-neutral-800">{fromBranch?.name?.split(' - ')[0] || '—'}</p>
                          <p className="text-xs text-neutral-400">{t.from_stock_before}kg → {t.from_stock_after}kg</p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-neutral-800">{toBranch?.name?.split(' - ')[0] || '—'}</p>
                          <p className="text-xs text-neutral-400">{t.to_stock_before}kg → {t.to_stock_after}kg</p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-bold text-red-700">{t.quantity}kg</span>
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-neutral-500">
                          <span className="line-through text-neutral-400">{t.from_stock_before}kg</span><br />
                          <span className="font-semibold text-neutral-700">{t.from_stock_after}kg</span>
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-neutral-500">
                          <span className="line-through text-neutral-400">{t.to_stock_before}kg</span><br />
                          <span className="font-semibold text-green-700">{t.to_stock_after}kg</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-neutral-500">{t.transferred_by}</td>
                        <td className="py-3 px-4 text-xs text-neutral-400 max-w-[120px] truncate">{t.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : activeTab === 'dispatches' ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-neutral-900">External Dispatches</h3>
              <p className="text-xs text-neutral-500 mt-0.5">Stock sent to hotels, villas, schools &amp; other clients</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-neutral-500">Total Value</p>
                <p className="font-bold text-orange-700">
                  KES {dispatches.reduce((s, d) => s + parseFloat(d.total_value || 0), 0).toLocaleString()}
                </p>
              </div>
              <Badge className="bg-orange-600 flex items-center gap-1"><Truck className="w-3 h-3" />{dispatches.length} records</Badge>
            </div>
          </div>
          {dispatchesLoading ? (
            <div className="p-8 text-center text-neutral-500">Loading dispatches...</div>
          ) : dispatches.length === 0 ? (
            <div className="p-8 text-center text-neutral-400">
              <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No external dispatches recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-100 border-b border-neutral-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Client</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Branch</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Product</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700 text-sm">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700 text-sm">Price/kg</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700 text-sm">Total</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Payment</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {dispatches.map((d) => {
                    const product = productById[d.product_id];
                    const branch = branchById[d.branch_id];
                    return (
                      <tr key={d.id} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 text-sm text-neutral-600">{d.dispatch_date}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-sm text-neutral-900">{d.client_name}</p>
                          <p className="text-xs text-neutral-400 capitalize">{d.client_type}</p>
                        </td>
                        <td className="py-3 px-4 text-sm text-neutral-600">{branch?.name?.split(' - ')[0] || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span>{product?.image || '🥩'}</span>
                            <span className="text-sm">{product?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-sm">{d.quantity}kg</td>
                        <td className="py-3 px-4 text-right text-sm text-neutral-600">KES {parseFloat(d.price_per_kg).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-orange-700 text-sm">KES {parseFloat(d.total_value).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          {d.payment_status === 'paid' ? (
                            <Badge className="bg-green-100 text-green-700 border-0 text-xs flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3" />Paid</Badge>
                          ) : d.payment_status === 'partial' ? (
                            <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs flex items-center gap-1 w-fit"><DollarSign className="w-3 h-3" />Partial</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-0 text-xs flex items-center gap-1 w-fit"><Clock className="w-3 h-3" />Pending</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-neutral-500">{d.dispatched_by}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
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

      {/* Dispatch Modal */}
      {dispatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">External Stock Dispatch</h2>
                <p className="text-xs text-neutral-500">Record stock sent to hotels, villas, schools, etc.</p>
              </div>
              <button onClick={() => setDispatchModal(false)} className="text-neutral-400 hover:text-neutral-700 text-xl font-bold">×</button>
            </div>

            <div className="space-y-3">
              {/* Branch — only show selector in admin view */}
              {isAdminView && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Dispatching Branch <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={dispatchForm.branchId}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, branchId: e.target.value }))}
                  >
                    <option value="">Select branch...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Product <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={dispatchForm.productId}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, productId: e.target.value }))}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.image || '🥩'} {p.name}</option>
                    ))}
                  </select>
                  {dispatchForm.branchId && dispatchForm.productId && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Available: <span className="font-semibold text-neutral-700">{branchStockMap[dispatchForm.branchId]?.[dispatchForm.productId] ?? 0}kg</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Dispatch Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    value={dispatchForm.dispatchDate}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, dispatchDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Client Name <span className="text-red-500">*</span></label>
                  <Input
                    placeholder="e.g. Serena Hotel"
                    value={dispatchForm.clientName}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, clientName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Client Type <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={dispatchForm.clientType}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, clientType: e.target.value }))}
                  >
                    <option value="hotel">🏨 Hotel</option>
                    <option value="villa">🏡 Villa</option>
                    <option value="school">🏫 School</option>
                    <option value="restaurant">🍽️ Restaurant</option>
                    <option value="other">📦 Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Quantity (kg) <span className="text-red-500">*</span></label>
                  <Input
                    type="number" min="0.1" step="0.1" placeholder="e.g. 20"
                    value={dispatchForm.quantity}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Price/kg (KES) <span className="text-red-500">*</span></label>
                  <Input
                    type="number" min="0" step="0.01" placeholder="e.g. 850"
                    value={dispatchForm.pricePerKg}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, pricePerKg: e.target.value }))}
                  />
                </div>
              </div>

              {dispatchForm.quantity && dispatchForm.pricePerKg && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 flex items-center justify-between">
                  <span className="text-sm text-orange-700">Total Dispatch Value</span>
                  <span className="font-bold text-orange-800">
                    KES {(parseFloat(dispatchForm.quantity || '0') * parseFloat(dispatchForm.pricePerKg || '0')).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Status</label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={dispatchForm.paymentStatus}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, paymentStatus: e.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Method</label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={dispatchForm.paymentMethod}
                    onChange={(e) => setDispatchForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="card">Card</option>
                    <option value="invoice">Invoice</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
                <Input
                  placeholder="e.g. Weekly standing order, delivery included"
                  value={dispatchForm.notes}
                  onChange={(e) => setDispatchForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDispatchModal(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                {dispatching ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900">Transfer Stock Between Branches</h2>
              <button onClick={() => setTransferModal(false)} className="text-neutral-400 hover:text-neutral-700 text-xl font-bold">×</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Product</label>
                <select
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={transferForm.productId}
                  onChange={(e) => setTransferForm((f) => ({ ...f, productId: e.target.value }))}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.image || '🥩'} {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">From Branch</label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={transferForm.fromBranchId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, fromBranchId: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
                    ))}
                  </select>
                  {transferForm.fromBranchId && transferForm.productId && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Available: <span className="font-semibold text-neutral-700">
                        {branchStockMap[transferForm.fromBranchId]?.[transferForm.productId] ?? 0}kg
                      </span>
                    </p>
                  )}
                </div>
                <ArrowRight className="w-5 h-5 text-neutral-400 mb-2" />
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">To Branch</label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={transferForm.toBranchId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, toBranchId: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {branches.filter((b) => b.id !== transferForm.fromBranchId).map((b) => (
                      <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Quantity (kg)</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 10"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
                <Input
                  placeholder="e.g. Restocking low branch, event supply"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setTransferModal(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferring}
                className="flex-1 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 disabled:opacity-50"
              >
                {transferring ? 'Transferring...' : 'Confirm Transfer'}
              </button>
            </div>
          </Card>
        </div>
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

