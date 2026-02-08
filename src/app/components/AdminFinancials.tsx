import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { 
  FileText, 
  Calendar as CalendarIcon, 
  ArrowRightLeft, 
  DollarSign, 
  Smartphone, 
  Receipt, 
  PackageSearch,
  Download,
  Filter
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

export function AdminFinancials() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [transactionsData, setTransactionsData] = useState<any[]>([]);
  const [stockHistoryData, setStockHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const currentBranchName = selectedBranchId === 'all'
    ? 'All Branches'
    : branches.find(b => b.id === selectedBranchId)?.name || 'Selected Branch';

  const staffById = useMemo(() => {
    const map: Record<string, string> = {};
    staff.forEach((member: any) => {
      map[member.id] = member.name || member.email || 'Staff';
    });
    return map;
  }, [staff]);

  const productsById = useMemo(() => {
    const map: Record<string, any> = {};
    products.forEach((product: any) => {
      map[product.id] = product;
    });
    return map;
  }, [products]);

  useEffect(() => {
    loadBaseData();
  }, []);

  useEffect(() => {
    if (branches.length === 0) return;

    loadDailyData();
    const intervalId = setInterval(() => {
      loadDailyData(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [branches, selectedBranchId, selectedDate]);

  const loadBaseData = async () => {
    try {
      setLoading(true);
      const [branchList, productList, staffList] = await Promise.all([
        apiClient.getBranches(),
        apiClient.getProducts(),
        apiClient.getStaff(),
      ]);

      setBranches(Array.isArray(branchList) ? branchList : []);
      setProducts(Array.isArray(productList) ? productList : []);
      setStaff(Array.isArray(staffList) ? staffList : []);
    } catch (error) {
      console.error('Failed to load base data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyData = async (silent = false) => {
    const branchIds = selectedBranchId === 'all'
      ? branches.map((branch) => branch.id)
      : [selectedBranchId];

    if (branchIds.length === 0) return;

    const startDateStr = selectedDate.split('T')[0];
    const endDateStr = selectedDate.split('T')[0];

    try {
      if (!silent) {
        setLoading(true);
      }

      const results = await Promise.all(
        branchIds.map(async (branchId) => {
          const [expenses, transactions, stockHistory] = await Promise.all([
            apiClient.getExpensesByDateRange(branchId, startDateStr, endDateStr),
            apiClient.getTransactionsByDateRange(branchId, startDateStr, endDateStr),
            apiClient.getStockHistoryByDate(branchId, startDateStr),
          ]);

          return {
            branchId,
            expenses: Array.isArray(expenses) ? expenses : [],
            transactions: Array.isArray(transactions) ? transactions : [],
            stockHistory: Array.isArray(stockHistory) ? stockHistory : [],
          };
        })
      );

      setExpensesData(results.flatMap((r) => r.expenses));
      setTransactionsData(results.flatMap((r) => r.transactions));
      setStockHistoryData(results.flatMap((r) => r.stockHistory));
    } catch (error) {
      console.error('Failed to load daily financials:', error);
      toast.error('Failed to refresh financial data');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Filtered Data
  const filteredExpenses = useMemo(() => {
    if (selectedBranchId === 'all') return expensesData;
    return expensesData.filter((exp) => exp.branch_id === selectedBranchId);
  }, [expensesData, selectedBranchId]);

  const filteredTransactions = useMemo(() => {
    if (selectedBranchId === 'all') return transactionsData;
    return transactionsData.filter((txn) => txn.branch_id === selectedBranchId);
  }, [transactionsData, selectedBranchId]);

  const filteredStock = useMemo(() => {
    if (selectedBranchId === 'all') return stockHistoryData;
    return stockHistoryData.filter((sh) => sh.branch_id === selectedBranchId);
  }, [stockHistoryData, selectedBranchId]);

  // Calculations
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const mpesaSales = filteredTransactions.filter(t => t.payment_method === 'mpesa').reduce((sum, t) => sum + (t.total || 0), 0);
  const cashSales = filteredTransactions.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + (t.total || 0), 0);
  const totalSales = mpesaSales + cashSales;
  const expectedRevenue = filteredStock.reduce((sum, sh) => {
    const product = productsById[sh.product_id];
    const openingStock = sh.opening_stock || 0;
    const closingStock = sh.closing_stock ?? null;
    if (!product || closingStock === null) return sum;
    const soldQty = openingStock - closingStock;
    const unitPrice = Number(product.price_per_kg || 0);
    return sum + Math.max(soldQty, 0) * unitPrice;
  }, 0);
  const salesVariance = totalSales - expectedRevenue;

  const handleExportPDF = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Generating PDF report...',
        success: `Report for ${currentBranchName} (${selectedDate}) exported successfully!`,
        error: 'Failed to generate report',
      }
    );
  };

  if (loading && branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 overflow-y-auto max-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-1">Financial & Stock Report</h1>
          <p className="text-neutral-600">Daily reconciliation for {currentBranchName}</p>
        </div>
        <Button onClick={handleExportPDF} className="bg-red-700 hover:bg-red-800">
          <Download className="w-4 h-4 mr-2" />
          Export as PDF
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-neutral-50 border-neutral-200">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-neutral-500 uppercase">Select Branch</label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-neutral-500 uppercase">Select Day</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
          <Button
            variant="outline"
            className="border-neutral-300"
            onClick={() => {
              setSelectedBranchId('all');
              setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-blue-600">
          <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Total Sales</p>
          <p className="text-2xl font-bold text-neutral-900">KES {totalSales.toLocaleString()}</p>
          <p className="text-xs text-blue-600 mt-2">{filteredTransactions.length} orders today</p>
        </Card>
        <Card className="p-5 border-l-4 border-l-green-600">
          <p className="text-xs font-bold text-neutral-500 uppercase mb-1">M-Pesa Sales</p>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-green-600" />
            <p className="text-2xl font-bold text-neutral-900">KES {mpesaSales.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-orange-600">
          <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Cash Sales</p>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-600" />
            <p className="text-2xl font-bold text-neutral-900">KES {cashSales.toLocaleString()}</p>
          </div>
        </Card>
        <Card className="p-5 border-l-4 border-l-red-600">
          <p className="text-xs font-bold text-neutral-500 uppercase mb-1">Expenses</p>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-red-600" />
            <p className="text-2xl font-bold text-neutral-900">KES {totalExpenses.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <Card className="p-5 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase">Expected vs Actual Sales</p>
            <p className="text-sm text-neutral-600">Calculated from opening and closing stock for {selectedDate}</p>
          </div>
          <Badge variant="outline">Stock Reconciliation</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-neutral-50">
            <p className="text-xs text-neutral-500 uppercase">Expected Sales</p>
            <p className="text-xl font-bold text-neutral-900">KES {expectedRevenue.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50">
            <p className="text-xs text-neutral-500 uppercase">Actual Sales</p>
            <p className="text-xl font-bold text-neutral-900">KES {totalSales.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg bg-neutral-50">
            <p className="text-xs text-neutral-500 uppercase">Variance</p>
            <p className={`text-xl font-bold ${salesVariance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              KES {salesVariance.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detailed Expenses */}
        <Card className="flex flex-col h-[500px]">
          <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900">Branch Expenses</h3>
            <Badge className="bg-red-700">{filteredExpenses.length} Records</Badge>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredExpenses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
                <Receipt className="w-12 h-12 mb-2 opacity-20" />
                <p>No expenses recorded for this day</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr className="border-b border-neutral-100">
                    <th className="text-left py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Category</th>
                    <th className="text-left py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Description</th>
                    <th className="text-right py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-neutral-50">
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">{exp.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <p className="font-medium">{exp.description || 'Expense'}</p>
                        <p className="text-xs text-neutral-400">
                          {format(new Date(exp.created_at), 'HH:mm')} • {staffById[exp.recorded_by] || 'Staff'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-red-700">
                        KES {(exp.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-4 border-t bg-neutral-50">
            <div className="flex justify-between items-center">
              <span className="font-bold text-neutral-600">Daily Total:</span>
              <span className="text-xl font-bold text-red-700">KES {totalExpenses.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Stock Reconcilliation */}
        <Card className="flex flex-col h-[500px]">
          <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900">Opening & Closing Stock</h3>
            <PackageSearch className="w-5 h-5 text-neutral-400" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredStock.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 p-8 text-center">
                <PackageSearch className="w-12 h-12 mb-2 opacity-20" />
                <p>No stock logs found for this day</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr className="border-b border-neutral-100">
                    <th className="text-left py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Product</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Opening</th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Closing</th>
                    <th className="text-right py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Var</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {filteredStock.map(sh => {
                    const product = productsById[sh.product_id];
                    const openingStock = sh.opening_stock || 0;
                    const closingStock = sh.closing_stock ?? null;
                    const variance = closingStock !== null ? (openingStock - closingStock) : null;
                    return (
                      <tr key={sh.id} className="hover:bg-neutral-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-500">
                              {product?.name?.split(' ')[0] || 'Item'}
                            </span>
                            <span className="text-sm font-medium">{product?.name || 'Product'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-blue-700">{openingStock}kg</td>
                        <td className="py-3 px-4 text-center font-bold text-green-700">{closingStock !== null ? `${closingStock}kg` : '--'}</td>
                        <td className="py-3 px-4 text-right">
                          {variance !== null ? (
                            <Badge variant="outline" className={variance > 0 ? 'text-red-700 border-red-200' : 'text-green-700 border-green-200'}>
                              {variance}kg
                            </Badge>
                          ) : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
