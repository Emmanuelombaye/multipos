import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Store, Users, AlertTriangle, TrendingUp, TrendingDown, Clock, Loader } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | '3month'>('week');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [branchesData, setBranchesData] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    const intervalId = setInterval(() => {
      loadDashboardData(true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [timeframe]);

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      // Fetch dashboard data
      const dashboard = await apiClient.getAdminDashboard();
      setDashboardData(dashboard);

      // Fetch branches
      const branches = await apiClient.getBranches();
      const branchesArray = Array.isArray(branches) ? branches : [];
      setBranchesData(branchesArray);

      if (branchesArray.length > 0) {
        const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - days);

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch data from ALL branches and aggregate
        const allBranchData = await Promise.all(
          branchesArray.map(async (branch) => {
            try {
              console.log(`Fetching data for branch: ${branch.name} (${branch.id})`);
              const [metrics, expenses, lowStock, transactions] = await Promise.all([
                apiClient.getMetrics(branch.id, startDateStr, endDateStr),
                apiClient.getExpensesByCategory(branch.id, startDateStr, endDateStr),
                apiClient.getLowStockProducts(branch.id),
                apiClient.getTransactionsByBranch(branch.id, 10)
              ]);
              console.log(`${branch.name} - Transactions:`, transactions?.length || 0, `Low stock:`, lowStock?.length || 0);
              return { branchId: branch.id, branchName: branch.name, metrics, expenses, lowStock, transactions };
            } catch (error) {
              console.error(`Failed to load data for ${branch.name}:`, error);
              return { branchId: branch.id, branchName: branch.name, metrics: {}, expenses: {}, lowStock: [], transactions: [] };
            }
          })
        );

        // Aggregate metrics across all branches
        const aggregatedMetrics: Record<string, any> = {};
        allBranchData.forEach(branchData => {
          Object.entries(branchData.metrics || {}).forEach(([date, values]: any) => {
            if (!aggregatedMetrics[date]) {
              aggregatedMetrics[date] = { sales: 0, expenses: 0, profit: 0 };
            }
            aggregatedMetrics[date].sales += values.sales || 0;
            aggregatedMetrics[date].expenses += values.expenses || 0;
            aggregatedMetrics[date].profit += values.profit || 0;
          });
        });

        const metricEntries = Object.entries(aggregatedMetrics)
          .map(([date, values]: any) => ({ date, ...values }))
          .sort((a, b) => (a.date > b.date ? 1 : -1))
          .slice(-days);

        setChartData(metricEntries);

        // Aggregate expenses by category
        const aggregatedExpenses: Record<string, number> = {};
        allBranchData.forEach(branchData => {
          Object.entries(branchData.expenses || {}).forEach(([category, amount]: any) => {
            aggregatedExpenses[category] = (aggregatedExpenses[category] || 0) + amount;
          });
        });

        const categoryData = Object.entries(aggregatedExpenses).map(([category, amount]: any) => ({
          name: category.charAt(0).toUpperCase() + category.slice(1),
          value: amount,
          color: generateColor(category),
        }));
        setExpensesByCategory(categoryData);

        // Aggregate low stock products
        const allLowStock = allBranchData.flatMap(bd => Array.isArray(bd.lowStock) ? bd.lowStock : []);
        setLowStockProducts(allLowStock.slice(0, 5));

        // Get recent transactions from all branches
        const allTransactions = allBranchData
          .flatMap(bd => Array.isArray(bd.transactions) ? bd.transactions : [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        console.log('Total aggregated transactions:', allTransactions.length);
        console.log('Sample transaction:', allTransactions[0]);
        setRecentTransactions(allTransactions);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Generate consistent colors for expense categories
  const generateColor = (category: string) => {
    const colors: Record<string, string> = {
      'supplies': '#3b82f6',
      'utilities': '#8b5cf6',
      'maintenance': '#ec4899',
      'petty-cash': '#f59e0b',
      'other': '#6366f1',
    };
    return colors[category] || '#6366f1';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-red-700 mx-auto mb-4" />
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalSales = dashboardData?.total_sales || 0;
  const activeBranches = branchesData.filter((b: any) => b.status === 'open').length;
  const totalStaff = dashboardData?.total_staff || 0;
  const alertCount = dashboardData?.low_stock_count || lowStockProducts.length;

  return (
    <div className="space-y-6 p-4 md:p-6 bg-neutral-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Admin Dashboard</h1>
          <p className="text-neutral-600">Real-time enterprise overview</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={timeframe} onValueChange={(val: any) => setTimeframe(val)}>
            <TabsList className="bg-neutral-100">
              <TabsTrigger value="week">1W</TabsTrigger>
              <TabsTrigger value="month">1M</TabsTrigger>
              <TabsTrigger value="3month">3M</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-700">System Live</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-green-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-neutral-900">
                KES {(totalSales || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">+8.2% this month</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Active Branches</p>
              <p className="text-2xl font-bold text-neutral-900">
                {activeBranches} / {branchesData.length}
              </p>
              <p className="text-sm text-blue-600 mt-2 font-medium">All operational</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Total Staff</p>
              <p className="text-2xl font-bold text-neutral-900">{totalStaff}</p>
              <p className="text-sm text-purple-600 mt-2 font-medium">Across all branches</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-red-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-neutral-900">{alertCount}</p>
              <p className="text-sm text-red-600 mt-2 font-medium">Requires attention</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Sales & Expenses Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#10b981"
                fill="#d1fae5"
                name="Sales (KES)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                fill="#fee2e2"
                name="Expenses (KES)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Expenses by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: KES${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `KES ${value}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Transactions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {Array.isArray(recentTransactions) && recentTransactions.length > 0 ? (
              recentTransactions.slice(0, 5).map((tx: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">Transaction #{tx.id?.slice(0, 8) || idx}</p>
                    <p className="text-xs text-neutral-500">{tx.created_at ? new Date(tx.created_at).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">+KES {(tx.total || 0).toLocaleString()}</p>
                    <Badge className="text-xs capitalize">{tx.payment_method || 'unknown'}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 text-center py-4">No transactions yet</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-neutral-900 mb-4">Low Stock Items</h3>
          <div className="space-y-3">
            {Array.isArray(lowStockProducts) && lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 5).map((product: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{product.name}</p>
                    <p className="text-xs text-neutral-500">{product.stock || 0}kg available</p>
                  </div>
                  <Badge variant="destructive">Alert</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 text-center py-4">All items in stock</p>
            )}
          </div>
        </Card>
      </div>

      {/* Branch Performance */}
      <Card className="p-6">
        <h3 className="font-semibold text-neutral-900 mb-4">Branch Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Branch</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-700">Location</th>
              </tr>
            </thead>
            <tbody>
              {branchesData.map((branch: any, idx: number) => (
                <tr key={idx} className="border-b hover:bg-neutral-50">
                  <td className="px-4 py-3 text-sm font-medium text-neutral-900">{branch.name}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge className={branch.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {branch.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-600">{branch.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
