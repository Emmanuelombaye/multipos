import { useEffect, useState } from 'react';
import { ArrowRightLeft, Truck, RefreshCw, ArrowRight, ArrowLeft, CheckCircle, Clock, DollarSign, Send, X, Plus, Check } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface StockMovementsScreenProps {
  branchId: string;
  branchName?: string;
  isAdmin?: boolean;
}

export function StockMovementsScreen({ branchId, branchName, isAdmin = false }: StockMovementsScreenProps) {
  const [activeTab, setActiveTab] = useState<'transfers' | 'dispatches' | 'requests'>('transfers');
  const [transfers, setTransfers] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [branches, setBranches] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showSendForm, setShowSendForm] = useState(false);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [branchProducts, setBranchProducts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
  }, [branchId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [transferRes, dispatchRes, requestRes, branchList, productList, branchProds] = await Promise.all([
        isAdmin ? apiClient.getStockTransfers(undefined, 200, 0) : apiClient.getStockTransfers(branchId, 100, 0),
        isAdmin ? apiClient.getExternalDispatches('all', 200, 0) : apiClient.getExternalDispatches(branchId, 100, 0),
        isAdmin ? apiClient.getTransferRequests('all') : apiClient.getTransferRequests(branchId),
        apiClient.getBranches(),
        apiClient.getProducts(),
        branchId && !isAdmin ? apiClient.getBranchProducts(branchId) : Promise.resolve([]),
      ]);

      setTransfers(Array.isArray(transferRes?.data) ? transferRes.data : []);
      setDispatches(Array.isArray(dispatchRes?.data) ? dispatchRes.data : []);
      setRequests(Array.isArray(requestRes) ? requestRes : []);
      setBranchProducts(Array.isArray(branchProds) ? branchProds : []);

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

  const handleSendTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const form = e.currentTarget;
    const data = new FormData(form);
    setIsSubmitting(true);
    try {
      await apiClient.sendTransferRequest(
        branchId,
        data.get('toBranch') as string,
        data.get('product') as string,
        Number(data.get('quantity')),
        data.get('notes') as string || undefined
      );
      toast.success('Transfer request sent');
      setShowSendForm(false);
      loadAll();
    } catch {
      toast.error('Failed to send transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const form = e.currentTarget;
    const data = new FormData(form);
    setIsSubmitting(true);
    try {
      await apiClient.createExternalDispatch({
        branchId,
        productId: data.get('product') as string,
        clientName: data.get('clientName') as string,
        clientType: data.get('clientType') as string,
        quantity: Number(data.get('quantity')),
        pricePerKg: Number(data.get('pricePerKg')),
        paymentStatus: data.get('paymentStatus') as string,
        paymentMethod: data.get('paymentMethod') as string || undefined,
        notes: data.get('notes') as string || undefined,
        dispatchDate: new Date().toISOString().split('T')[0],
      });
      toast.success('Dispatch recorded');
      setShowDispatchForm(false);
      loadAll();
    } catch {
      toast.error('Failed to record dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.acceptTransferRequest(requestId);
      toast.success('Transfer accepted');
      loadAll();
    } catch {
      toast.error('Failed to accept');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await apiClient.rejectTransferRequest(requestId);
      toast.success('Transfer rejected');
      loadAll();
    } catch {
      toast.error('Failed to reject');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <button onClick={loadAll} className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95">
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* Summary + Actions */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-center">
          <p className="text-xs text-red-600 font-medium">Transfers</p>
          <p className="text-xl font-bold text-red-900">{transfers.length}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 text-center">
          <p className="text-xs text-orange-600 font-medium">Dispatches</p>
          <p className="text-xl font-bold text-orange-900">{dispatches.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-center">
          <p className="text-xs text-blue-600 font-medium">Requests</p>
          <p className="text-xl font-bold text-blue-900">{requests.filter(r => r.status === 'pending').length}</p>
        </div>
      </div>

      {/* Action Buttons - Only show for branch users */}
      {!isAdmin && branchId && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowSendForm(true)} className="flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-lg font-medium active:scale-95">
            <Send className="w-4 h-4" /> Send Transfer
          </button>
          <button onClick={() => setShowDispatchForm(true)} className="flex items-center justify-center gap-2 bg-orange-600 text-white py-3 rounded-lg font-medium active:scale-95">
            <Truck className="w-4 h-4" /> Dispatch
          </button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-neutral-100 grid w-full grid-cols-3">
          <TabsTrigger value="transfers" className="flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transfers
          </TabsTrigger>
          <TabsTrigger value="dispatches" className="flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Dispatches
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Requests
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
              const isOutgoing = branchId && !isAdmin && t.from_branch_id === branchId;
              const isIncoming = branchId && !isAdmin && t.to_branch_id === branchId;
              const fromBranch = branchShortName(t.from_branch_id);
              const toBranch = branchShortName(t.to_branch_id);
              const otherBranch = isOutgoing ? toBranch : fromBranch;

              return (
                <Card key={t.id} className={`p-4 border-l-4 ${isAdmin ? 'border-l-purple-500' : isOutgoing ? 'border-l-red-500' : 'border-l-green-500'}`}>
                  {/* Top row: product + direction badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{product?.image || '🥩'}</span>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{product?.name || '—'}</p>
                        <p className="text-xs text-neutral-500">{t.transfer_date}</p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 flex items-center gap-1 ${isAdmin ? 'bg-purple-100 text-purple-700 border-0' : isOutgoing ? 'bg-red-100 text-red-700 border-0' : 'bg-green-100 text-green-700 border-0'}`}>
                      {isAdmin ? (
                        <ArrowRightLeft className="w-3 h-3" />
                      ) : isOutgoing ? (
                        <ArrowRight className="w-3 h-3" />
                      ) : (
                        <ArrowLeft className="w-3 h-3" />
                      )}
                      {isAdmin ? 'Transfer' : isOutgoing ? 'Sent Out' : 'Received'}
                    </Badge>
                  </div>

                  {/* Stock flow */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-neutral-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-neutral-500">Quantity</p>
                      <p className="text-base font-bold text-neutral-900">{t.quantity}kg</p>
                    </div>
                    {!isAdmin && (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Direction info */}
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      {isAdmin ? `${fromBranch} → ${toBranch}` : isOutgoing ? `→ Sent to ${otherBranch}` : `← Received from ${otherBranch}`}
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

      {/* ── REQUESTS TAB ── */}
      {activeTab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transfer requests</p>
            </div>
          ) : (
            requests.map((r) => {
              const product = products[r.product_id];
              const isIncoming = branchId && !isAdmin && r.to_branch_id === branchId;
              const fromBranch = branchShortName(r.from_branch_id);
              const toBranch = branchShortName(r.to_branch_id);
              const otherBranch = isIncoming ? fromBranch : toBranch;
              return (
                <Card key={r.id} className={`p-4 border-l-4 ${isAdmin ? 'border-l-purple-500' : isIncoming ? 'border-l-blue-500' : 'border-l-purple-500'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{product?.image || '🥩'}</span>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">{product?.name || '—'}</p>
                        <p className="text-xs text-neutral-500">{r.requested_at?.split('T')[0]}</p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} border-0`}>
                      {r.status}
                    </Badge>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-2 mb-3">
                    <p className="text-xs text-neutral-500">Quantity</p>
                    <p className="text-base font-bold text-neutral-900">{r.quantity}kg</p>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">
                    {isAdmin ? `${fromBranch} → ${toBranch}` : isIncoming ? `← From ${otherBranch}` : `→ To ${otherBranch}`}
                  </p>
                  {r.notes && <p className="text-xs text-neutral-400 italic mb-2">"{r.notes}"</p>}
                  {!isAdmin && isIncoming && r.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button onClick={() => handleAccept(r.id)} className="flex items-center justify-center gap-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium active:scale-95 disabled:opacity-50" disabled={isSubmitting}>
                        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Accept
                      </button>
                      <button onClick={() => handleReject(r.id)} className="flex items-center justify-center gap-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium active:scale-95 disabled:opacity-50" disabled={isSubmitting}>
                        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
                      </button>
                    </div>
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
              const dispatchBranch = branchShortName(d.branch_id);
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
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-neutral-400">By: {d.dispatched_by}</p>
                    {isAdmin && <p className="text-xs text-neutral-500 font-medium">{dispatchBranch}</p>}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── SEND TRANSFER FORM ── */}
      {!isAdmin && showSendForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto pb-safe">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-lg">Send Transfer Request</h2>
              <button onClick={() => setShowSendForm(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendTransfer} className="p-4 space-y-4 pb-24">
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select name="product" required className="w-full border rounded-lg p-2">
                  <option value="">Select product</option>
                  {branchProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.image} {p.name} ({p.current_stock}kg)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Branch</label>
                <select name="toBranch" required className="w-full border rounded-lg p-2">
                  <option value="">Select branch</option>
                  {Object.values(branches).filter((b: any) => b.id !== branchId).map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity (kg)</label>
                <input name="quantity" type="number" step="0.01" required className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea name="notes" rows={2} className="w-full border rounded-lg p-2" />
              </div>
              <div className="sticky bottom-0 bg-white pt-4 pb-safe">
                <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-lg font-medium active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />Sending...</>
                  ) : (
                    'Send Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DISPATCH FORM ── */}
      {!isAdmin && showDispatchForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto pb-safe">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-lg">External Dispatch</h2>
              <button onClick={() => setShowDispatchForm(false)} className="p-2 hover:bg-neutral-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDispatch} className="p-4 space-y-4 pb-24">
              <div>
                <label className="block text-sm font-medium mb-1">Product</label>
                <select name="product" required className="w-full border rounded-lg p-2">
                  <option value="">Select product</option>
                  {branchProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.image} {p.name} ({p.current_stock}kg)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client Name</label>
                <input name="clientName" type="text" required className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client Type</label>
                <select name="clientType" required className="w-full border rounded-lg p-2">
                  <option value="hotel">🏨 Hotel</option>
                  <option value="villa">🏡 Villa</option>
                  <option value="school">🏫 School</option>
                  <option value="restaurant">🍽️ Restaurant</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity (kg)</label>
                  <input name="quantity" type="number" step="0.01" required className="w-full border rounded-lg p-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price/kg</label>
                  <input name="pricePerKg" type="number" step="0.01" required className="w-full border rounded-lg p-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Status</label>
                <select name="paymentStatus" required className="w-full border rounded-lg p-2">
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select name="paymentMethod" className="w-full border rounded-lg p-2">
                  <option value="">Select method</option>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea name="notes" rows={2} className="w-full border rounded-lg p-2" />
              </div>
              <div className="sticky bottom-0 bg-white pt-4 pb-safe">
                <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />Recording...</>
                  ) : (
                    'Record Dispatch'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
