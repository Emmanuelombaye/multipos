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
  current_stock: number;
  closing_stock: number | null;
  input: string;
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

  useEffect(() => { loadData(); }, [branchId]);

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
    } catch {
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
    let ok = 0, fail = 0;
    for (const entry of pending) {
      const val = parseFloat(entry.input);
      if (isNaN(val) || val < 0) { fail++; continue; }
      try {
        await apiClient.recordClosingStock(entry.product_id, branchId, val, today);
        ok++;
        setEntries(prev => prev.map(e =>
          e.product_id === entry.product_id ? { ...e, closing_stock: val, submitted: true } : e
        ));
      } catch { fail++; }
    }
    setSavingAll(false);
    if (ok > 0) toast.success(`${ok} products saved`);
    if (fail > 0) toast.error(`${fail} failed to save`);
  };

  const submittedCount = entries.filter(e => e.submitted).length;
  const pendingCount = entries.length - submittedCount;
  const allDone = entries.length > 0 && pendingCount === 0;

  const totalVariance = useMemo(() =>
    entries.reduce((sum, e) => {
      if (e.closing_stock === null) return sum;
      return sum + (e.opening_stock - e.closing_stock);
    }, 0), [entries]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading stock data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:p-6 pb-24">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">End-of-Day Count</h1>
          <p className="text-sm text-neutral-500">{branchName} · {today}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 active:scale-95"
          >
            <RefreshCw className="w-4 h-4 text-neutral-500" />
          </button>
          <Button
            onClick={submitAll}
            disabled={savingAll}
            className="bg-red-700 hover:bg-red-800 h-9 px-4 text-sm"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {savingAll ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* Status pills */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center">
          <p className="text-xs text-blue-600 font-medium">Total</p>
          <p className="text-xl font-bold text-blue-900">{entries.length}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 text-center">
          <p className="text-xs text-green-600 font-medium">Done</p>
          <p className="text-xl font-bold text-green-900">{submittedCount}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
          <p className="text-xs text-amber-600 font-medium">Left</p>
          <p className="text-xl font-bold text-amber-900">{pendingCount}</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center border ${totalVariance > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-xs font-medium ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>Var</p>
          <p className={`text-xl font-bold ${totalVariance > 0 ? 'text-red-900' : 'text-green-900'}`}>
            {totalVariance.toFixed(1)}
          </p>
        </div>
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-700 shrink-0" />
          <div>
            <p className="font-semibold text-green-900 text-sm">All products submitted ✓</p>
            <p className="text-xs text-green-700">
              Variance: {totalVariance.toFixed(1)}kg
              {totalVariance === 0 ? ' — No shrinkage' : totalVariance > 0 ? ' — Shrinkage detected' : ' — Stock gain'}
            </p>
          </div>
        </div>
      )}

      {/* Product cards — mobile-first, no table */}
      <div className="space-y-3">
        {entries.map((entry) => {
          const inputVal = parseFloat(entry.input);
          const variance = !isNaN(inputVal) && entry.input !== ''
            ? entry.opening_stock - inputVal
            : entry.closing_stock !== null
              ? entry.opening_stock - entry.closing_stock
              : null;

          return (
            <Card
              key={entry.product_id}
              className={`p-4 transition-all ${entry.submitted ? 'border-green-300 bg-green-50/40' : 'border-neutral-200'}`}
            >
              {/* Product name + status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl shrink-0">{entry.product_image}</span>
                  <span className="font-semibold text-neutral-900 text-sm truncate">{entry.product_name}</span>
                </div>
                {entry.submitted ? (
                  <div className="flex items-center gap-1 text-green-700 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Saved</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-600 shrink-0">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Pending</span>
                  </div>
                )}
              </div>

              {/* Stock info row */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-blue-600 font-medium">Opening</p>
                  <p className="text-sm font-bold text-blue-900">{entry.opening_stock}kg</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-2">
                  <p className="text-xs text-neutral-500 font-medium">System</p>
                  <p className="text-sm font-bold text-neutral-700">{entry.current_stock}kg</p>
                </div>
                <div className={`rounded-lg p-2 ${
                  variance === null ? 'bg-neutral-50' :
                  variance === 0 ? 'bg-green-50' :
                  variance > 0 ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  <p className="text-xs text-neutral-500 font-medium">Variance</p>
                  <p className={`text-sm font-bold ${
                    variance === null ? 'text-neutral-400' :
                    variance === 0 ? 'text-green-700' :
                    variance > 0 ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {variance === null ? '—' :
                     variance === 0 ? '0kg' :
                     `${variance > 0 ? '-' : '+'}${Math.abs(variance).toFixed(1)}kg`}
                  </p>
                </div>
              </div>

              {/* Input + Save button */}
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    placeholder="Physical count..."
                    value={entry.input}
                    onChange={(e) => setEntries(prev => prev.map(en =>
                      en.product_id === entry.product_id
                        ? { ...en, input: e.target.value, submitted: false }
                        : en
                    ))}
                    className={`h-12 text-base text-center pr-10 ${
                      entry.submitted ? 'border-green-400 bg-green-50' : ''
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400 pointer-events-none">kg</span>
                </div>
                <button
                  onClick={() => submitOne(entry)}
                  disabled={saving[entry.product_id] || entry.input === ''}
                  className={`h-12 px-5 rounded-lg text-sm font-semibold transition-all active:scale-95 shrink-0 ${
                    entry.submitted
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-700 hover:bg-red-800 text-white'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {saving[entry.product_id] ? '...' : entry.submitted ? 'Update' : 'Save'}
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-16 text-neutral-400">
          <PackageCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No products assigned to this branch</p>
        </div>
      )}

      {/* High variance warning */}
      {submittedCount > 0 && totalVariance > 2 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 text-sm">High Variance: {totalVariance.toFixed(1)}kg</p>
            <p className="text-xs text-red-700 mt-0.5">
              May indicate measurement errors, theft, or unrecorded transfers. Review before closing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
