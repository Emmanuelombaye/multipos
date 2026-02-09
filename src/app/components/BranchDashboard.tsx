import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Package, DollarSign, Users, AlertTriangle, Clock, ArrowRightLeft } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface BranchDashboardProps {
  branchId: string;
}

type Timeframe = 'day' | '3day' | 'week' | 'month';

export function BranchDashboard({ branchId }: BranchDashboardProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('day');
  const [loading, setLoading] = useState(true);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [todaySales, setTodaySales] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branchStock, setBranchStock] = useState<Record<string, number>>({});
  const [chartData, setChartData] = useState<any[]>([]);
  const [stockVariance, setStockVariance] = useState(0);
  const getLocalDateString = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nairobiTime = new Date(utcTime + (3 * 3600000));
    return nairobiTime.toISOString().split('T')[0];
  };
  const [varianceDate, setVarianceDate] = useState<string>(getLocalDateString());

  const timeframeDays: Record<Timeframe, number> = {
    day: 1,
    '3day': 3,
    week: 7,
    month: 30,
  };

  // Calculate and format date range for display
  const dateRangeDisplay = useMemo(() => {
    const days = timeframeDays[timeframe];
    const endDate = varianceDate ? new Date(varianceDate) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (days - 1));

    const formatDate = (date: Date) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getDate()}`;
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }, [timeframe, varianceDate]);

  useEffect(() => {
    loadBranchDashboard();
    const intervalId = setInterval(() => {
      loadBranchDashboard(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [branchId, timeframe, varianceDate]);

  const loadSecondaryData = async () => {
    try {
      const [staffList, productsList, stockList] = await Promise.all([
        apiClient.getStaffByBranch(branchId),
        apiClient.getBranchProducts(branchId),
        apiClient.getCurrentStock(branchId),
      ]);

      setStaff(Array.isArray(staffList) ? staffList : []);
      setProducts(Array.isArray(productsList) ? productsList : []);

      const stockMap: Record<string, number> = {};
      (Array.isArray(stockList) ? stockList : []).forEach((item: any) => {
        stockMap[item.product_id] = item.current_stock || 0;
      });
      setBranchStock(stockMap);
    } catch (error) {
      console.error('Failed to load secondary data:', error);
    }
  };

  const loadBranchDashboard = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const varianceDateKey = varianceDate || getLocalDateString();

      // Calculate date range for metrics using EAT boundaries
      const formatEAT = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+03:00`;
      };

      const days = timeframeDays[timeframe];
      const endDateVal = varianceDate ? new Date(varianceDate) : new Date();
      const startDateVal = new Date(endDateVal);
      startDateVal.setDate(endDateVal.getDate() - (days - 1));

      const startISO = formatEAT(new Date(startDateVal.getFullYear(), startDateVal.getMonth(), startDateVal.getDate(), 0, 0, 0));
      const endISO = formatEAT(new Date(endDateVal.getFullYear(), endDateVal.getMonth(), endDateVal.getDate(), 23, 59, 59));

      // Load critical data in parallel
      const [dashboard, stockHistory, metrics] = await Promise.all([
        apiClient.getBranchDashboard(branchId),
        apiClient.getStockHistoryByDate(branchId, varianceDateKey),
        apiClient.getMetrics(branchId, startISO, endISO),
      ]);

      setBranchInfo(dashboard?.branch || null);
      setTodaySales(dashboard?.todaySales || 0);
      setTodayExpenses(dashboard?.todayExpenses || 0);
      setRecentTransactions(Array.isArray(dashboard?.recentTransactions) ? dashboard.recentTransactions : []);
      setLowStockProducts(Array.isArray(dashboard?.lowStockProducts) ? dashboard.lowStockProducts : []);

      const stockHistoryArray = Array.isArray(stockHistory) ? stockHistory : [];
      const varianceTotal = stockHistoryArray.reduce((sum: number, entry: any) => {
        if (entry.closing_stock === null || entry.closing_stock === undefined) return sum;
        return sum + ((entry.opening_stock || 0) - entry.closing_stock);
      }, 0);
      setStockVariance(varianceTotal);

      const metricEntries = Object.entries(metrics || {})
        .map(([date, values]: any) => ({ date, ...values }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      setChartData(metricEntries);

      // Load secondary data lazily on initial load only
      if (!silent && (products.length === 0 || staff.length === 0 || Object.keys(branchStock).length === 0)) {
        loadSecondaryData();
      }
    } catch (error) {
      console.error('Failed to load branch dashboard:', error);
      toast.error('Failed to load branch dashboard');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const avgTransaction = useMemo(() => {
    if (recentTransactions.length === 0) return 0;
    const total = recentTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
    return total / recentTransactions.length;
  }, [recentTransactions]);

  const lowStockCount = lowStockProducts.length;

  const isActive = branchInfo?.status === 'open';

  if (loading && !branchInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading branch dashboard...</p>
      </div>
    );
  }

  if (!branchInfo) return <div>Branch not found</div>;

  return (
    <div className="space-y-6 p-4 md:p-6 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-1">{branchInfo.name}</h1>
          <p className="text-neutral-600 flex items-center gap-2">
            {branchInfo.location} •
            <span className={`font-medium ${isActive ? 'text-green-600' : 'text-neutral-500'}`}>
              {isActive ? 'Session Active' : 'Session Closed'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={
              isActive
                ? 'bg-green-100 text-green-700 px-4 py-2 border-green-200'
                : 'bg-neutral-200 text-neutral-600 px-4 py-2'
            }
          >
            {branchInfo.status?.toUpperCase() || 'UNKNOWN'}
          </Badge>
        </div>
      </div>

      <Card className="p-4 bg-neutral-50 border-neutral-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-neutral-500 uppercase">Stock Variance Date</p>
            <p className="text-sm text-neutral-600">Select a date to calculate variance</p>
          </div>
          <Input
            type="date"
            value={varianceDate}
            onChange={(e) => setVarianceDate(e.target.value)}
            className="w-full sm:w-48 bg-white"
          />
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-green-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Today's Sales</p>
              <p className="text-2xl font-bold text-neutral-900">
                KES {todaySales.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-1 text-green-600">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">Live updates</span>
              </div>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-blue-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Transactions</p>
              <p className="text-2xl font-bold text-neutral-900">{recentTransactions.length}</p>
              <p className="text-xs text-blue-600 mt-1 font-medium">Average KES {avgTransaction.toFixed(0)}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-purple-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Stock Variance</p>
              <p className="text-2xl font-bold text-neutral-900">{stockVariance.toFixed(1)}kg</p>
              <p className="text-xs text-purple-600 mt-1 font-medium">Today's closing variance</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-red-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Stock Alerts</p>
              <p className="text-2xl font-bold text-neutral-900">{lowStockCount}</p>
              <p className="text-xs text-red-600 mt-1 font-medium">Restock needed</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Growth Chart */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Branch Growth Analytics</h3>
            <p className="text-sm text-neutral-500">Sales vs Operating Expenses ({dateRangeDisplay})</p>
          </div>
          <Tabs value={timeframe} onValueChange={(val) => setTimeframe(val as Timeframe)}>
            <TabsList className="bg-neutral-100">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="3day">3D</TabsTrigger>
              <TabsTrigger value="week">1W</TabsTrigger>
              <TabsTrigger value="month">1M</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="branchSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#b91c1c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#737373', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => `KES ${value.toLocaleString()}`}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#b91c1c"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#branchSales)"
              />
              <Bar dataKey="expenses" fill="#d4d4d4" radius={[4, 4, 0, 0]} barSize={timeframe === 'month' ? 4 : 20} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-neutral-900">Current Stock Levels</h3>
            <Badge variant="outline">Live Inventory</Badge>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {products.map((product) => {
              const stock = branchStock[product.id] || 0;
              const isLow = stock < product.low_stock_threshold;
              const percentage = (stock / (product.low_stock_threshold * 3)) * 100;

              return (
                <div key={product.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{product.image || '🥩'}</span>
                      <span className="text-sm font-bold text-neutral-700">{product.name}</span>
                    </div>
                    <span className={`text-sm font-bold ${isLow ? 'text-red-700' : 'text-neutral-900'}`}>
                      {stock}kg
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-600' : 'bg-green-600'}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Staff & Shift Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Active Staff & Shift Info</h3>
          <div className="space-y-3">
            {staff.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs uppercase">
                    {member.name?.charAt(0) || member.email?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{member.name || member.email}</p>
                    <p className="text-xs text-neutral-500 capitalize">{member.role}</p>
                  </div>
                </div>
                <Badge className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">On Shift</Badge>
              </div>
            ))}
            {staff.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-4">No staff assigned</p>
            )}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-700 uppercase mb-1">Shift Note</p>
              <p className="text-sm text-blue-900">Shift timing updates based on activity logs.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
