import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileText, TrendingUp, Award, Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import jsPDF from 'jspdf';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { apiClient } from '../api/client';
import { toast } from 'sonner';

type Timeframe = 'day' | '3day' | 'week' | 'month' | '3month';

export function ReportsScreen() {
    // PDF Export Handler
    const handleExportReport = () => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Reports & Analytics', 14, 18);
      doc.setFontSize(12);
      doc.text(`Timeframe: ${getTimeframeLabel(timeframe)}`, 14, 28);
      doc.text(`Total Sales: KES ${totalSales.toLocaleString()}`, 14, 38);
      doc.text(`Total Expenses: KES ${totalExpenses.toLocaleString()}`, 14, 48);
      doc.text(`Net Growth: KES ${netGrowth.toLocaleString()}`, 14, 58);
      doc.text(`Best Branch: ${bestBranchName || 'N/A'}`, 14, 68);

      doc.setFontSize(14);
      doc.text('Branch Sales:', 14, 80);
      branchSalesComparison.forEach((b, i) => {
        doc.text(`${b.branch}: KES ${b.sales.toLocaleString()}`, 14, 90 + i * 10);
      });

      doc.text('Expense Distribution:', 14, 100 + branchSalesComparison.length * 10);
      categoryDistribution.forEach((c, i) => {
        doc.text(`${c.name}: KES ${c.value.toLocaleString()} (${c.percentage}%)`, 14, 110 + branchSalesComparison.length * 10 + i * 10);
      });

      doc.save('report.pdf');
    };
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [branchSalesComparison, setBranchSalesComparison] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [summaryTotals, setSummaryTotals] = useState({ totalSales: 0, totalExpenses: 0, netGrowth: 0 });
  const [salesGrowthPercent, setSalesGrowthPercent] = useState(0);

  const COLORS = ['#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5'];

  const timeframeDays = useMemo(() => ({
    day: 1,
    '3day': 3,
    week: 7,
    month: 30,
    '3month': 90,
  }), []);

  useEffect(() => {
    loadReportData();
    const intervalId = setInterval(() => {
      loadReportData(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [timeframe]);

  const loadReportData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const branchList = branches.length > 0 ? branches : await apiClient.getBranches();
      const safeBranches = Array.isArray(branchList) ? branchList : [];
      if (branches.length === 0) {
        setBranches(safeBranches);
      }

      const days = timeframeDays[timeframe];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (days - 1));

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const metricsByBranch = await Promise.all(
        safeBranches.map(async (branch) => {
          const metrics = await apiClient.getMetrics(branch.id, startDateStr, endDateStr);
          return { branch, metrics: metrics || {} };
        })
      );

      const mergedMetrics: Record<string, { sales: number; expenses: number; profit: number }> = {};
      metricsByBranch.forEach(({ metrics }) => {
        Object.entries(metrics || {}).forEach(([date, values]: any) => {
          if (!mergedMetrics[date]) {
            mergedMetrics[date] = { sales: 0, expenses: 0, profit: 0 };
          }
          mergedMetrics[date].sales += values.sales || 0;
          mergedMetrics[date].expenses += values.expenses || 0;
          mergedMetrics[date].profit += values.profit || 0;
        });
      });

      const sortedChartData = Object.entries(mergedMetrics)
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      const totalSales = sortedChartData.reduce((sum, item) => sum + (item.sales || 0), 0);
      const totalExpenses = sortedChartData.reduce((sum, item) => sum + (item.expenses || 0), 0);
      const netGrowth = totalSales - totalExpenses;

      const todayKey = endDate.toISOString().split('T')[0];
      const yesterdayDate = new Date(endDate);
      yesterdayDate.setDate(endDate.getDate() - 1);
      const yesterdayKey = yesterdayDate.toISOString().split('T')[0];

      const todaySales = mergedMetrics[todayKey]?.sales || 0;
      const yesterdaySales = mergedMetrics[yesterdayKey]?.sales || 0;
      const growthPercent = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;

      const branchComparison = metricsByBranch.map(({ branch, metrics }) => {
        const branchSales = Object.values(metrics || {}).reduce(
          (sum: number, entry: any) => sum + (entry.sales || 0),
          0
        );
        return { branch: branch.name, sales: branchSales };
      });

      const expenseCategories = await Promise.all(
        safeBranches.map(async (branch) => {
          const categories = await apiClient.getExpensesByCategory(branch.id, startDateStr, endDateStr);
          return categories || {};
        })
      );

      const categoryTotals: Record<string, number> = {};
      expenseCategories.forEach((categoryMap) => {
        Object.entries(categoryMap).forEach(([category, amount]) => {
          categoryTotals[category] = (categoryTotals[category] || 0) + (amount as number);
        });
      });

      const categoryArray = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
      const categoryTotalSum = categoryArray.reduce((sum, item) => sum + item.value, 0);
      const categoryDistributionData = categoryArray.map((item) => ({
        ...item,
        percentage: categoryTotalSum > 0 ? Math.round((item.value / categoryTotalSum) * 100) : 0,
      }));

      setChartData(sortedChartData);
      setBranchSalesComparison(branchComparison);
      setCategoryDistribution(categoryDistributionData);
      setSummaryTotals({ totalSales, totalExpenses, netGrowth });
      setSalesGrowthPercent(Number.isFinite(growthPercent) ? growthPercent : 0);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const { totalSales, totalExpenses, netGrowth } = summaryTotals;
  const bestBranchName = branchSalesComparison.length > 0
    ? branchSalesComparison.reduce((best, current) => (current.sales > best.sales ? current : best))?.branch
    : branches[0]?.name;

  const getTimeframeLabel = (tf: Timeframe) => {
    switch(tf) {
      case 'day': return 'Last 24 Hours';
      case '3day': return 'Last 3 Days';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case '3month': return 'Last 90 Days';
      default: return 'Custom';
    }
  };

  if (loading && branches.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 overflow-y-auto max-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Reports & Analytics</h1>
          <p className="text-neutral-600">Business insights and performance metrics across all branches</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="hidden sm:flex">
            <Calendar className="w-4 h-4 mr-2" />
            Filter Dates
          </Button>
          <Button className="bg-red-700 hover:bg-red-800" onClick={handleExportReport}>
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Timeframe Toggle */}
      <Card className="p-2 w-fit">
        <Tabs value={timeframe} onValueChange={(val) => setTimeframe(val as Timeframe)}>
          <TabsList className="bg-neutral-100">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="3day">3 Days</TabsTrigger>
            <TabsTrigger value="week">1 Week</TabsTrigger>
            <TabsTrigger value="month">1 Month</TabsTrigger>
            <TabsTrigger value="3month">3 Months</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-green-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Total Sales ({timeframe})</p>
              <p className="text-2xl font-bold text-neutral-900">
                KES {totalSales.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">
                  {salesGrowthPercent >= 0 ? '+' : ''}{salesGrowthPercent.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-red-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-neutral-900">
                KES {totalExpenses.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2 text-red-600">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-sm">Includes petty cash</span>
              </div>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Net Growth</p>
              <p className="text-2xl font-bold text-neutral-900">
                KES {netGrowth.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-2 font-medium">Profit Margin: {((netGrowth / totalSales) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-600">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Best Branch</p>
              <p className="text-xl font-bold text-neutral-900">
                {bestBranchName?.split(' - ')[0] || 'N/A'}
              </p>
              <p className="text-sm text-purple-600 mt-2">Top efficiency rate</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Growth Chart */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Business Growth & Trends</h3>
            <p className="text-sm text-neutral-500">{getTimeframeLabel(timeframe)} Performance</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-700" />
              <span>Sales</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-neutral-300" />
              <span>Expenses</span>
            </div>
          </div>
        </div>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#b91c1c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#737373', fontSize: 12}}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#737373', fontSize: 12}}
                tickFormatter={(val) => `KES ${val / 1000}k`}
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
                fill="url(#colorSales)" 
              />
              <Bar 
                dataKey="expenses" 
                fill="#d4d4d4" 
                radius={[4, 4, 0, 0]} 
                barSize={timeframe === 'month' ? 4 : 20}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Row 2: Product Performance and Branch Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Branch Contribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchSalesComparison} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
                <XAxis type="number" hide />
                <YAxis dataKey="branch" type="category" axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: number) => `KES ${val.toLocaleString()}`} />
                <Bar dataKey="sales" fill="#b91c1c" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Expense Distribution</h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="percentage"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
