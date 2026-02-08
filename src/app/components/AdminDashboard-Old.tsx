import { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Store, Users, AlertTriangle, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  branches,
  recentTransactions,
  growthData,
  branchSalesComparison,
  products,
  staff,
} from '../data/mockData';

type Timeframe = 'day' | '3day' | 'week' | 'month' | '3month';

export function AdminDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  
  const currentGrowthData = growthData[timeframe];
  const totalSales = branches.reduce((sum, branch) => sum + branch.todaySales, 0);
  const activeBranches = branches.filter((b) => b.status === 'open').length;
  const totalStaff = staff.length;
  const lowStockProducts = products.filter((p) => p.stock < p.lowStockThreshold);

  return (
    <div className="space-y-6 p-4 md:p-6 overflow-y-auto max-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Admin Dashboard</h1>
          <p className="text-neutral-600">Enterprise-wide overview for all butchery locations</p>
        </div>
        <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-lg">
          <Clock className="w-4 h-4 text-neutral-500 ml-2" />
          <span className="text-sm font-medium text-neutral-600 mr-2">System Live</span>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mr-2" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-green-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Total Sales Today</p>
              <p className="text-2xl font-bold text-neutral-900">
                KES {totalSales.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">+12.5%</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Active Branches</p>
              <p className="text-2xl font-bold text-neutral-900">
                {activeBranches} / {branches.length}
              </p>
              <p className="text-sm text-blue-600 mt-2 font-medium">92% Uptime</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-purple-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Total Staff</p>
              <p className="text-2xl font-bold text-neutral-900">{totalStaff}</p>
              <p className="text-sm text-purple-600 mt-2 font-medium">8 On Duty</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-red-600 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-500 mb-1">Inventory Alerts</p>
              <p className="text-2xl font-bold text-neutral-900">{lowStockProducts.length}</p>
              <p className="text-sm text-red-600 mt-2 font-medium">Action Required</p>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Growth Chart */}
      <Card className="p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-neutral-900">Revenue Growth</h3>
            <p className="text-sm text-neutral-500">System-wide performance monitoring</p>
          </div>
          <Tabs value={timeframe} onValueChange={(val) => setTimeframe(val as Timeframe)}>
            <TabsList className="bg-neutral-100">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="3month">3M</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentGrowthData}>
              <defs>
                <linearGradient id="adminSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b91c1c" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#b91c1c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey={timeframe === 'day' ? 'time' : 'date'} 
                axisLine={false}
                tickLine={false}
                tick={{fill: '#737373', fontSize: 12}}
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
                fill="url(#adminSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Comparison */}
        <Card className="p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">Branch Performance Comparison</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchSalesComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="branch" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} hide />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none' }}
                  formatter={(value: number) => `KES ${value.toLocaleString()}`}
                />
                <Bar dataKey="sales" fill="#b91c1c" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Branch Status Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-neutral-900">Real-time Branch Monitor</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.map((branch) => (
              <Card key={branch.id} className="p-4 hover:shadow-md transition-all border-l-4 border-l-red-100">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-neutral-900">{branch.name}</h4>
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">{branch.location}</p>
                  </div>
                  <Badge
                    variant={branch.status === 'open' ? 'default' : 'secondary'}
                    className={
                      branch.status === 'open'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-200 text-neutral-600'
                    }
                  >
                    {branch.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Today:</span>
                    <span className="font-bold text-neutral-900">KES {branch.todaySales.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className="bg-red-600 h-full rounded-full" 
                      style={{ width: `${(branch.todaySales / 60000) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions & Alerts Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-neutral-50 flex items-center justify-between">
          <h3 className="font-bold text-neutral-900">Critical Alerts & Recent Movements</h3>
          <Badge className="bg-red-700">Live Feed</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                <th className="text-left py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Item / Branch</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Description</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Amount / Stock</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-neutral-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {lowStockProducts.slice(0, 3).map((p) => (
                <tr key={p.id}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.image}</span>
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-neutral-600">Low stock system alert</td>
                  <td className="py-3 px-4 text-sm font-bold text-red-700">{p.stock}kg remaining</td>
                  <td className="py-3 px-4"><Badge variant="destructive" className="text-[10px]">Restock</Badge></td>
                </tr>
              ))}
              {recentTransactions.slice(0, 3).map((t) => (
                <tr key={t.id}>
                  <td className="py-3 px-4 text-sm font-medium">{t.branchName.split(' - ')[0]}</td>
                  <td className="py-3 px-4 text-xs text-neutral-600">Sale by {t.cashier}</td>
                  <td className="py-3 px-4 text-sm font-bold text-green-700">KES {t.total.toLocaleString()}</td>
                  <td className="py-3 px-4"><Badge variant="outline" className="text-[10px] border-green-200 text-green-700">Success</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
