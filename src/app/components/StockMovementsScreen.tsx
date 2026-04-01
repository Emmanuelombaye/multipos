import { useEffect, useState } from 'react';
import { ArrowRightLeft, Truck, RefreshCw, ArrowRight, ArrowLeft, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface StockMovementsScreenProps {
  branchId: string;
  branchName?: string;
}

export function StockMovementsScreen({ branchId, branchName }: StockMovementsScreenProps) {
  const [activeTab, setActiveTab] = useState<'transfers' | 'dispatches'>('transfers');
  const [transfers, setTransfers] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [branches, setBranches] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [branchId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [transferRes, dispatchRes, branchList, productList] = await Promise.all([
        apiClient.getStockTransfers(branchId, 100, 0),
        apiClient.getExternalDispatches(branchId, 100, 0),
        apiClient.getBranches(),
        apiClient.getProducts(),
      ]);

      setTransfers(Array.isArray(transferRes?.data) ? transferRes.data : []);
      setDispatches(Array.isArray(dispatchRes?.data) ? dispatchRes.data : []);

      const bMap: Record<string, any> = {};
      (Array.isArray(branchList) ? branchList : []).forEach((b: any) => { bMap[b.id] = b; });
      setBranches(bMap);

      const pMap: Record<string, any> = {};
      (Array.isArray(productList) ? productList : []).forEach((p: any) => { pMap[p.id] = p; });
      setProducts(pMap);
    } catch {
      toast.error('Failed to load stock movements');
    } finally {
      setLoading(false);
    }
  };

  const branchShortName = (id: string) =>
    branches[id]?.name?.split(' - ')[0]?.replace('Edendrop ', '') || '—';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading movements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:p-6 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Stock Movements</h1>
          <p className="text-sm text-neutral-500">{branchName}</p>
        </div>
        <button
          onClick={loadAll}
          className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95"
        >
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Summary pills */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs text-red-600 font-medium">Internal Transfers</p>
          <p className="text-2xl font-bold text-red-900">{transfers.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-xs text-orange-600 font-medium">External Dispatches</p>
          <p className="text-2xl font-bold text-orange-900">{dispatches.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-neutral-100 grid w-full grid-cols-2">
          <TabsTrigger value="transfers" className="flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="dispatches" className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Dispatches
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── TRANSFERS TAB ── */}
      {activeTab === 'transfers' && (
        <div className="space-y-3">
          {transfers.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transfers recorded yet</p>
              <p className="text-sm mt-1">Internal transfers between branches will appear here</p>
            </div>
          ) : (
            transfers.map((t) => {
              const product = products[t.product_id];
              const isOutgoing = t.from_branch_id === branchId;
              const isIncoming = t.to_branch_id === branchId;
              const otherBranch = isOutgoing ? branchShortName(t.to_branch_id) : branchShortName(t.from_branch_id);

              return (
                <Card key={t.id} className={`p-4 border-l-4 ${isOutgoing ? 'border-l-red-500' : 'border-l-green-500'}`}>
                  {/* Top row: product + direction badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{product?.image || '🥩'}</span>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{product?.name || '—'}</p>
                        <p className="text-xs text-neutral-500">{t.transfer_date}</p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 flex items-center gap-1 ${isOutgoing ? 'bg-red-100 text-red-700 border-0' : 'bg-green-100 text-green-700 border-0'}`}>
                      {isOutgoing ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                      {isOutgoing ? 'Sent Out' : 'Received'}
                    </Badge>
                  </div>

                  {/* Stock flow */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-neutral-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">Quantity</p>
                      <p className="text-base font-bold text-neutral-900">{t.quantity}kg</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${isOutgoing ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className="text-xs text-neutral-500">Before</p>
                      <p className="text-base font-bold text-neutral-700">
                        {isOutgoing ? t.from_stock_before : t.to_stock_before}kg
                      </p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${isOutgoing ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className="text-xs text-neutral-500">After</p>
                      <p className={`text-base font-bold ${isOutgoing ? 'text-red-700' : 'text-green-700'}`}>
                        {isOutgoing ? t.from_stock_after : t.to_stock_after}kg
                      </p>
                    </div>
                  </div>

                  {/* Direction info */}
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      {isOutgoing ? `→ Sent to ${otherBranch}` : `← Received from ${otherBranch}`}
                    </span>
                    <span>By: {t.transferred_by}</span>
                  </div>
                  {t.notes && (
                    <p className="text-xs text-neutral-400 mt-1 italic">"{t.notes}"</p>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── DISPATCHES TAB ── */}
      {activeTab === 'dispatches' && (
        <div className="space-y-3">
          {/* Total value summary */}
          {dispatches.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm text-orange-700 font-medium">Total Dispatch Value</span>
              <span className="font-bold text-orange-900">
                KES {dispatches.reduce((s, d) => s + parseFloat(d.total_value || 0), 0).toLocaleString()}
              </span>
            </div>
          )}

          {dispatches.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No dispatches recorded yet</p>
              <p className="text-sm mt-1">External dispatches to hotels, villas, schools will appear here</p>
            </div>
          ) : (
            dispatches.map((d) => {
              const product = products[d.product_id];
              const clientTypeEmoji: Record<string, string> = {
                hotel: '🏨', villa: '🏡', school: '🏫', restaurant: '🍽️', other: '📦'
              };

              return (
                <Card key={d.id} className="p-4 border-l-4 border-l-orange-500">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{clientTypeEmoji[d.client_type] || '📦'}</span>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{d.client_name}</p>
                        <p className="text-xs text-neutral-500 capitalize">{d.client_type} · {d.dispatch_date}</p>
                      </div>
                    </div>
                    {d.payment_status === 'paid' ? (
                      <Badge className="bg-green-100 text-green-700 border-0 flex items-center gap-1 shrink-0">
                        <CheckCircle className="w-3 h-3" />Paid
                      </Badge>
                    ) : d.payment_status === 'partial' ? (
                      <Badge className="bg-yellow-100 text-yellow-700 border-0 flex items-center gap-1 shrink-0">
                        <DollarSign className="w-3 h-3" />Partial
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border-0 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />Pending
                      </Badge>
                    )}
                  </div>

                  {/* Product + amounts */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{product?.image || '🥩'}</span>
                    <span className="text-sm text-neutral-700 font-medium">{product?.name || '—'}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">Qty</p>
                      <p className="text-base font-bold text-neutral-900">{d.quantity}kg</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">Price/kg</p>
                      <p className="text-sm font-bold text-neutral-700">KES {parseFloat(d.price_per_kg).toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">Total</p>
                      <p className="text-sm font-bold text-orange-700">KES {parseFloat(d.total_value).toLocaleString()}</p>
                    </div>
                  </div>

                  {d.notes && (
                    <p className="text-xs text-neutral-400 mt-2 italic">"{d.notes}"</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">By: {d.dispatched_by}</p>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
