import { useEffect, useState, useMemo } from 'react';
import {
  ClipboardList, RefreshCw, ChevronDown, ChevronUp,
  ArrowRightLeft, Truck, Plus, PackageCheck, AlertTriangle
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface StockAuditScreenProps {
  /** Leave undefined for all-branches admin view */
  branchId?: string;
}

interface AuditRow {
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  productImage: string;
  date: string;
  openingStock: number;
  midShiftAdded: number;
  transfersIn: number;
  transfersOut: number;
  dispatched: number;
  closingStock: number | null;
  systemStock: number;
  expectedClosing: number;
  variance: number | null;
}

const getKenyaDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

export function StockAuditScreen({ branchId }: StockAuditScreenProps) {
  const [loading, setLoading] = useState(true);
  const [auditDate, setAuditDate] = useState(getKenyaDate());
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

  useEffect(() => { loadAudit(); }, [branchId, auditDate]);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const [branchList, productList] = await Promise.all([
        apiClient.getBranches(),
        apiClient.getProducts(),
      ]);

      const branches: any[] = Array.isArray(branchList) ? branchList : [];
      const products: any[] = Array.isArray(productList) ? productList : [];

      const targetBranches = branchId ? branches.filter(b => b.id === branchId) : branches;

      const productMap: Record<string, any> = {};
      products.forEach(p => { productMap[p.id] = p; });

      const allRows: AuditRow[] = [];

      await Promise.all(targetBranches.map(async (branch) => {
        try {
          const [historyRes, additionsRes, transfersRes, dispatchesRes, currentStockRes] = await Promise.all([
            apiClient.getStockHistoryByDate(branch.id, auditDate),
            apiClient.getStockAdditions(branch.id, 200, 0).catch(() => ({ data: [] })), // Graceful fallback
            apiClient.getStockTransfers(branch.id, 200, 0),
            apiClient.getExternalDispatches(branch.id, 200, 0),
            apiClient.getCurrentStock(branch.id),
          ]);

          const history: any[] = Array.isArray(historyRes) ? historyRes : [];
          const additions: any[] = Array.isArray(additionsRes?.data) ? additionsRes.data : [];
          const transfers: any[] = Array.isArray(transfersRes?.data) ? transfersRes.data : [];
          const dispatches: any[] = Array.isArray(dispatchesRes?.data) ? dispatchesRes.data : [];
          const currentStock: any[] = Array.isArray(currentStockRes) ? currentStockRes : [];

          const currentStockMap: Record<string, number> = {};
          currentStock.forEach(s => { currentStockMap[s.product_id] = parseFloat(s.current_stock || 0); });

          // Filter to audit date
          const dayAdditions = additions.filter(a => a.added_at?.startsWith(auditDate));
          const dayTransfers = transfers.filter(t => t.transfer_date === auditDate);
          const dayDispatches = dispatches.filter(d => d.dispatch_date === auditDate);

          // Build per-product maps for the day
          const addedMap: Record<string, number> = {};
          dayAdditions.forEach(a => {
            addedMap[a.product_id] = (addedMap[a.product_id] || 0) + parseFloat(a.quantity || 0);
          });

          const transfersInMap: Record<string, number> = {};
          const transfersOutMap: Record<string, number> = {};
          dayTransfers.forEach(t => {
            if (t.to_branch_id === branch.id) {
              transfersInMap[t.product_id] = (transfersInMap[t.product_id] || 0) + parseFloat(t.quantity || 0);
            }
            if (t.from_branch_id === branch.id) {
              transfersOutMap[t.product_id] = (transfersOutMap[t.product_id] || 0) + parseFloat(t.quantity || 0);
            }
          });

          const dispatchedMap: Record<string, number> = {};
          dayDispatches.forEach(d => {
            dispatchedMap[d.product_id] = (dispatchedMap[d.product_id] || 0) + parseFloat(d.quantity || 0);
          });

          // Build rows from history entries (one per product per day)
          const historyProductIds = new Set(history.map(h => h.product_id));

          // Also include products that had activity today even without a history entry
          const activeProductIds = new Set([
            ...historyProductIds,
            ...Object.keys(addedMap),
            ...Object.keys(transfersInMap),
            ...Object.keys(transfersOutMap),
            ...Object.keys(dispatchedMap),
          ]);

          // If no activity at all, show at least products with current stock
          if (activeProductIds.size === 0 && currentStock.length > 0) {
            currentStock.forEach(cs => activeProductIds.add(cs.product_id));
          }

          activeProductIds.forEach(productId => {
            const product = productMap[productId];
            if (!product) return;

            const hist = history.find(h => h.product_id === productId);
            const openingStock = parseFloat(hist?.opening_stock || 0);
            const closingStock = hist?.closing_stock !== null && hist?.closing_stock !== undefined
              ? parseFloat(hist.closing_stock)
              : null;

            const midShiftAdded = addedMap[productId] || 0;
            const transfersIn = transfersInMap[productId] || 0;
            const transfersOut = transfersOutMap[productId] || 0;
            const dispatched = dispatchedMap[productId] || 0;
            const systemStock = currentStockMap[productId] ?? 0;

            // Expected closing = opening + additions + transfers_in - transfers_out - dispatched
            const expectedClosing = openingStock + midShiftAdded + transfersIn - transfersOut - dispatched;
            const variance = closingStock !== null ? closingStock - expectedClosing : null;

            allRows.push({
              branchId: branch.id,
              branchName: branch.name?.split(' - ')[0] || branch.name,
              productId,
              productName: product.name,
              productImage: product.image || '🥩',
              date: auditDate,
              openingStock,
              midShiftAdded,
              transfersIn,
              transfersOut,
              dispatched,
              closingStock,
              systemStock,
              expectedClosing,
              variance,
            });
          });
        } catch {
          // skip branch on error
        }
      }));

      // Sort: branch name, then product name
      allRows.sort((a, b) =>
        a.branchName.localeCompare(b.branchName) || a.productName.localeCompare(b.productName)
      );

      setRows(allRows);

      // Auto-expand first branch
      if (allRows.length > 0 && !expandedBranch) {
        setExpandedBranch(allRows[0].branchId);
      }
    } catch {
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const branchGroups = useMemo(() => {
    const map: Record<string, AuditRow[]> = {};
    rows.forEach(r => {
      if (!map[r.branchId]) map[r.branchId] = [];
      map[r.branchId].push(r);
    });
    return map;
  }, [rows]);

  const summaryStats = useMemo(() => {
    const totalOpening = rows.reduce((s, r) => s + r.openingStock, 0);
    const totalAdded = rows.reduce((s, r) => s + r.midShiftAdded, 0);
    const totalDispatched = rows.reduce((s, r) => s + r.dispatched, 0);
    const totalVariance = rows.reduce((s, r) => s + (r.variance ?? 0), 0);
    const pendingClose = rows.filter(r => r.closingStock === null).length;
    return { totalOpening, totalAdded, totalDispatched, totalVariance, pendingClose };
  }, [rows]);

  const varianceColor = (v: number | null) => {
    if (v === null) return 'text-neutral-400';
    if (v === 0) return 'text-green-700';
    if (v > 0) return 'text-blue-700';   // gain
    return 'text-red-700';               // loss
  };

  const varianceBg = (v: number | null) => {
    if (v === null) return 'bg-neutral-50';
    if (v === 0) return 'bg-green-50';
    if (v > 0) return 'bg-blue-50';
    return 'bg-red-50';
  };

  return (
    <div className="space-y-5 p-4 md:p-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-red-700" />
            Stock Audit
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Opening · Mid-shift additions · Transfers · Dispatches · Closing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={auditDate}
            onChange={e => setAuditDate(e.target.value)}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={loadAudit}
            disabled={loading}
            className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-neutral-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-600 font-medium">Opening</p>
          <p className="text-xl font-bold text-blue-900">{summaryStats.totalOpening.toFixed(1)}kg</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-xs text-green-600 font-medium">Added</p>
          <p className="text-xl font-bold text-green-900">+{summaryStats.totalAdded.toFixed(1)}kg</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-xs text-orange-600 font-medium">Dispatched</p>
          <p className="text-xl font-bold text-orange-900">{summaryStats.totalDispatched.toFixed(1)}kg</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${summaryStats.totalVariance < 0 ? 'bg-red-50 border-red-200' : summaryStats.totalVariance > 0 ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-xs font-medium ${summaryStats.totalVariance < 0 ? 'text-red-600' : summaryStats.totalVariance > 0 ? 'text-blue-600' : 'text-green-600'}`}>Variance</p>
          <p className={`text-xl font-bold ${summaryStats.totalVariance < 0 ? 'text-red-900' : summaryStats.totalVariance > 0 ? 'text-blue-900' : 'text-green-900'}`}>
            {summaryStats.totalVariance > 0 ? '+' : ''}{summaryStats.totalVariance.toFixed(1)}kg
          </p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${summaryStats.pendingClose > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-xs font-medium ${summaryStats.pendingClose > 0 ? 'text-amber-600' : 'text-green-600'}`}>Pending Close</p>
          <p className={`text-xl font-bold ${summaryStats.pendingClose > 0 ? 'text-amber-900' : 'text-green-900'}`}>{summaryStats.pendingClose}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-neutral-500">
          Loading audit data...
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-neutral-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No stock activity found for {auditDate}</p>
          <p className="text-sm mt-1">Try selecting a different date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(branchGroups).map(([bId, bRows]) => {
            const isExpanded = expandedBranch === bId;
            const branchName = bRows[0].branchName;
            const branchVariance = bRows.reduce((s, r) => s + (r.variance ?? 0), 0);
            const branchPending = bRows.filter(r => r.closingStock === null).length;

            return (
              <Card key={bId} className="overflow-hidden">
                {/* Branch header — collapsible */}
                <button
                  onClick={() => setExpandedBranch(isExpanded ? null : bId)}
                  className="w-full flex items-center justify-between p-4 bg-neutral-50 hover:bg-neutral-100 transition-colors border-b"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-900">{branchName}</span>
                    <Badge className="bg-neutral-200 text-neutral-700 border-0 text-xs">{bRows.length} products</Badge>
                    {branchPending > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{branchPending} pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-semibold ${branchVariance < 0 ? 'text-red-700' : branchVariance > 0 ? 'text-blue-700' : 'text-green-700'}`}>
                      Variance: {branchVariance > 0 ? '+' : ''}{branchVariance.toFixed(1)}kg
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-500" /> : <ChevronDown className="w-4 h-4 text-neutral-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-100 border-b border-neutral-200">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold text-neutral-700">Product</th>
                          <th className="text-right py-3 px-3 font-semibold text-blue-700">
                            <span className="flex items-center justify-end gap-1">Opening</span>
                          </th>
                          <th className="text-right py-3 px-3 font-semibold text-green-700">
                            <span className="flex items-center justify-end gap-1"><Plus className="w-3 h-3" />Added</span>
                          </th>
                          <th className="text-right py-3 px-3 font-semibold text-purple-700">
                            <span className="flex items-center justify-end gap-1"><ArrowRightLeft className="w-3 h-3" />In</span>
                          </th>
                          <th className="text-right py-3 px-3 font-semibold text-red-600">
                            <span className="flex items-center justify-end gap-1"><ArrowRightLeft className="w-3 h-3" />Out</span>
                          </th>
                          <th className="text-right py-3 px-3 font-semibold text-orange-700">
                            <span className="flex items-center justify-end gap-1"><Truck className="w-3 h-3" />Dispatch</span>
                          </th>
                          <th className="text-right py-3 px-3 font-semibold text-neutral-600">Expected</th>
                          <th className="text-right py-3 px-3 font-semibold text-neutral-900">
                            <span className="flex items-center justify-end gap-1"><PackageCheck className="w-3 h-3" />Closing</span>
                          </th>
                          <th className="text-right py-3 px-4 font-semibold text-neutral-700">Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {bRows.map(row => (
                          <tr key={row.productId} className="hover:bg-neutral-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{row.productImage}</span>
                                <span className="font-medium text-neutral-900">{row.productName}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-semibold text-blue-700">{row.openingStock}kg</td>
                            <td className="py-3 px-3 text-right text-green-700">
                              {row.midShiftAdded > 0 ? `+${row.midShiftAdded}kg` : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="py-3 px-3 text-right text-purple-700">
                              {row.transfersIn > 0 ? `+${row.transfersIn}kg` : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="py-3 px-3 text-right text-red-600">
                              {row.transfersOut > 0 ? `-${row.transfersOut}kg` : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="py-3 px-3 text-right text-orange-700">
                              {row.dispatched > 0 ? `-${row.dispatched}kg` : <span className="text-neutral-300">—</span>}
                            </td>
                            <td className="py-3 px-3 text-right text-neutral-500">{row.expectedClosing.toFixed(1)}kg</td>
                            <td className="py-3 px-3 text-right">
                              {row.closingStock !== null ? (
                                <span className="font-bold text-neutral-900">{row.closingStock}kg</span>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pending</Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {row.variance !== null ? (
                                <span className={`font-semibold ${varianceColor(row.variance)} px-2 py-0.5 rounded ${varianceBg(row.variance)}`}>
                                  {row.variance === 0 ? '0kg' : `${row.variance > 0 ? '+' : ''}${row.variance.toFixed(1)}kg`}
                                </span>
                              ) : (
                                <span className="text-neutral-300 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Branch totals footer */}
                      <tfoot className="bg-neutral-50 border-t-2 border-neutral-200">
                        <tr>
                          <td className="py-2 px-4 font-semibold text-neutral-700 text-xs uppercase tracking-wide">Totals</td>
                          <td className="py-2 px-3 text-right font-bold text-blue-700 text-xs">
                            {bRows.reduce((s, r) => s + r.openingStock, 0).toFixed(1)}kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-green-700 text-xs">
                            +{bRows.reduce((s, r) => s + r.midShiftAdded, 0).toFixed(1)}kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-purple-700 text-xs">
                            +{bRows.reduce((s, r) => s + r.transfersIn, 0).toFixed(1)}kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-red-600 text-xs">
                            -{bRows.reduce((s, r) => s + r.transfersOut, 0).toFixed(1)}kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-orange-700 text-xs">
                            -{bRows.reduce((s, r) => s + r.dispatched, 0).toFixed(1)}kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-neutral-500 text-xs">
                            {bRows.reduce((s, r) => s + r.expectedClosing, 0).toFixed(1)}kg
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-neutral-900 text-xs">
                            {bRows.filter(r => r.closingStock !== null).length > 0
                              ? `${bRows.reduce((s, r) => s + (r.closingStock ?? 0), 0).toFixed(1)}kg`
                              : '—'}
                          </td>
                          <td className={`py-2 px-4 text-right font-bold text-xs ${varianceColor(branchVariance)}`}>
                            {branchVariance > 0 ? '+' : ''}{branchVariance.toFixed(1)}kg
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-neutral-500 pt-2">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Opening stock at day start</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Mid-shift additions</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />Transfers received</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Transfers sent out</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />External dispatches</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-400 inline-block" />Variance = Closing − Expected</span>
      </div>
    </div>
  );
}
