import { useEffect, useState, useMemo } from 'react';
import { PackageCheck, AlertTriangle, CheckCircle, Clock, Save, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface ClosingStockScreenProps {
  branchId: string;
  branchName?: string;
}

interface StockEntry {
  product_id: string;
  product_name: string;
  product_image: string;
  opening_stock: number;
  current_stock: number;   // live branch_stock (system-calculated)
  closing_stock: number | null; // already submitted today
  input: string;           // what the cashier is typing
  submitted: boolean;
}

export function ClosingStockScreen({ branchId, branchName }: ClosingStockScreenProps) {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingAll, setSavingAll] = useState(false);

  const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  const today = getKenyaDate();

  useEffect(() => {
    loadData();
  }, [branchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [products, stockList, historyList] = await Promise.all([
        apiClient.getBranchProducts(branchId),
        apiClient.getCurrentStock(branchId),
        apiClient.getStockHistoryByDate(branchId, today),
      ]);

      const stockMap: Record<string, number> = {};
      (Array.isArray(stockList) ? stockList : []).forEach((s: any) => {
        stockMap[s.product_id] = parseFloat(s.current_stock || 0);
      });

      const historyMap: Record<string, any> = {};
      (Array.isArray(historyList) ? historyList : []).forEach((h: any) => {
        historyMap[h.product_id] = h;
      });

      const built: StockEntry[] = (Array.isArray(products) ? products : []).map((p: any) => {
        const hist = historyMap[p.id];
        const alreadySubmitted = hist?.closing_stock !== null && hist?.closing_stock !== undefined;
        return {
          product_id: p.id,
          product_name: p.name,
          product_image: p.image || '🥩',
          opening_stock: parseFloat(hist?.opening_stock || 0),
          current_stock: stockMap[p.id] ?? 0,
          closing_stock: alreadySubmitted ? parseFloat(hist.closing_stock) : null,
          input: alreadySubmitted ? String(hist.closing_stock) : '',
          submitted: alreadySubmitted,
        };
      });

      setEntries(built);
    } catch (err) {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const submitOne = async (entry: StockEntry) => {
    const val = parseFloat(entry.input);
    if (isNaN(val) || val < 0) {
      toast.error(`Enter a valid count for ${entry.product_name}`);
      return;
    }
    setSaving(s => ({ ...s, [entry.product_id]: true }));
    try {
      await apiClient.recordClosingStock(entry.product_id, branchId, val, today);
      toast.success(`${entry.product_name}: ${val}kg saved`);
      setEntries(prev => prev.map(e =>
        e.product_id === entry.product_id
          ? { ...e, closing_stock: val, submitted: true }
          : e
      ));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Failed to save ${entry.product_name}`);
    } finally {
      setSaving(s => ({ ...s, [entry.product_id]: false }));
    }
  };

  const submitAll = async () => {
    const pending = entries.filter(e => e.input !== '' && !isNaN(parseFloat(e.input)));
    if (pending.length === 0) {
      toast.error('Enter at least one stock count before saving all');
      return;
    }
    setSavingAll(true);
    let successCount = 0;
    let failCount = 0;
    for (const entry of pending) {
      const val = parseFloat(entry.input);
      if (isNaN(val) || val < 0) { failCount++; continue; }
      try {
        await apiClient.recordClosingStock(entry.product_id, branchId, val, today);
        successCount++;
        setEntries(prev => prev.map(e =>
          e.product_id === entry.product_id
            ? { ...e, closing_stock: val, submitted: true }
            : e
        ));
      } catch {
        failCount++;
      }
    }
    setSavingAll(false);
    if (successCount > 0) toast.success(`${successCount} products saved successfully`);
    if (failCount > 0) toast.error(`${failCount} products failed to save`);
  };

  const submittedCount = entries.filter(e => e.submitted).length;
  const pendingCount = entries.length - submittedCount;
  const allDone = entries.length > 0 && pendingCount === 0;

  const totalVariance = useMemo(() =>
    entries.reduce((sum, e) => {
      if (e.closing_stock === null) return sum;
      return sum + (e.opening_stock - e.closing_stock);
    }, 0),
    [entries]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">End-of-Day Stock Count</h1>
          <p className="text-neutral-600 text-sm mt-1">
            {branchName} — <span className="font-medium">{today}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-neutral-200 hover:bg-neutral-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-neutral-500" />
          </button>
          <Button
            onClick={submitAll}
            disabled={savingAll}
            className="bg-red-700 hover:bg-red-800"
          >
            <Save className="w-4 h-4 mr-2" />
            {savingAll ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-blue-50 border-blue-200">
          <p className="text-xs text-blue-600 font-medium uppercase">Total Products</p>
          <p className="text-2xl font-bold text-blue-900">{entries.length}</p>
        </Card>
        <Card className="p-3 bg-green-50 border-green-200">
          <p className="text-xs text-green-600 font-medium uppercase">Submitted</p>
          <p className="text-2xl font-bold text-green-900">{submittedCount}</p>
        </Card>
        <Card className="p-3 bg-amber-50 border-amber-200">
          <p className="text-xs text-amber-600 font-medium uppercase">Pending</p>
          <p className="text-2xl font-bold text-amber-900">{pendingCount}</p>
        </Card>
        <Card className={`p-3 ${totalVariance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-xs font-medium uppercase ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            Total Variance
          </p>
          <p className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-900' : 'text-green-900'}`}>
            {totalVariance.toFixed(1)}kg
          </p>
        </Card>
      </div>

      {allDone && (
        <Card className="p-4 bg-green-50 border-green-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-700 shrink-0" />
          <div>
            <p className="font-semibold text-green-900">All products submitted for today</p>
            <p className="text-sm text-green-700">
              Total variance: {totalVariance.toFixed(1)}kg
              {totalVariance === 0 ? ' — Perfect, no shrinkage!' : totalVariance > 0 ? ' — Shrinkage detected' : ' — Stock gain detected'}
            </p>
          </div>
        </Card>
      )}

      {/* Stock entry table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900">Physical Stock Count</h3>
          <Badge className="bg-neutral-700">{today}</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-100 border-b border-neutral-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-neutral-700 text-sm">Product</th>
                <th className="text-center py-3 px-4 font-semibold text-neutral-700 text-sm">Opening</th>
                <th className="text-center py-3 px-4 font-semibold text-neutral-700 text-sm">System Stock</th>
                <th className="text-center py-3 px-4 font-semibold text-neutral-700 text-sm w-36">Physical Count</th>
                <th className="text-center py-3 px-4 font-semibold text-neutral-700 text-sm">Variance</th>
                <th className="text-center py-3 px-4 font-semibold text-neutral-700 text-sm">Status</th>
                <th className="py-3 px-4 text-sm"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {entries.map((entry) => {
                const inputVal = parseFloat(entry.input);
                const variance = !isNaN(inputVal) && entry.input !== ''
                  ? entry.opening_stock - inputVal
                  : entry.closing_stock !== null
                    ? entry.opening_stock - entry.closing_stock
                    : null;
                const systemDiff = !isNaN(inputVal) && entry.input !== ''
                  ? inputVal - entry.current_stock
                  : null;

                return (
                  <tr key={entry.product_id} className={`hover:bg-neutral-50 ${entry.submitted ? 'bg-green-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{entry.product_image}</span>
                        <span className="font-medium text-sm text-neutral-900">{entry.product_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-blue-700 text-sm">
                      {entry.opening_stock}kg
                    </td>
                    <td className="py-3 px-4 text-center text-sm">
                      <span className="font-semibold text-neutral-700">{entry.current_stock}kg</span>
                      {systemDiff !== null && systemDiff !== 0 && (
                        <p className={`text-xs mt-0.5 ${systemDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {systemDiff > 0 ? '+' : ''}{systemDiff.toFixed(1)}kg vs system
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0.0"
                          value={entry.input}
                          onChange={(e) => setEntries(prev => prev.map(en =>
                            en.product_id === entry.product_id
                              ? { ...en, input: e.target.value, submitted: false }
                              : en
                          ))}
                          className={`w-24 text-center text-sm h-8 ${entry.submitted ? 'border-green-400 bg-green-50' : ''}`}
                        />
                        <span className="text-xs text-neutral-500">kg</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {variance !== null ? (
                        <Badge
                          variant="outline"
                          className={
                            variance === 0
                              ? 'text-green-700 border-green-300 bg-green-50'
                              : variance > 0
                                ? 'text-red-700 border-red-300 bg-red-50'
                                : 'text-blue-700 border-blue-300 bg-blue-50'
                          }
                        >
                          {variance > 0 ? '-' : variance < 0 ? '+' : ''}{Math.abs(variance).toFixed(1)}kg
                        </Badge>
                      ) : (
                        <span className="text-neutral-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {entry.submitted ? (
                        <div className="flex items-center justify-center gap-1 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Done</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-amber-600">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs font-medium">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => submitOne(entry)}
                        disabled={saving[entry.product_id] || entry.input === ''}
                        className="px-3 py-1.5 bg-red-700 text-white rounded-lg text-xs font-medium hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving[entry.product_id] ? '...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="p-12 text-center text-neutral-400">
            <PackageCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No products assigned to this branch</p>
          </div>
        )}
      </Card>

      {/* Variance alert */}
      {submittedCount > 0 && totalVariance > 2 && (
        <Card className="p-4 border-red-200 bg-red-50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">High Variance Detected</p>
            <p className="text-sm text-red-700">
              Total variance of {totalVariance.toFixed(1)}kg is above normal. This may indicate
              measurement errors, theft, or unrecorded transfers. Please review before closing.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
