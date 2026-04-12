import { useEffect, useMemo, useState } from 'react';
import { Store, Users, TrendingUp, Package, MapPin, Edit2, Calendar as CalendarIcon, Wallet, RefreshCw, ChevronDown, Download, Trash2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { exportToPDF } from '../api/pdfExportUtils';

export function BranchManagement() {
  const [branches, setBranches] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [branchStaff, setBranchStaff] = useState<any[]>([]);
  const [branchStock, setBranchStock] = useState<any[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [addBranchDialogOpen, setAddBranchDialogOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', location: '' });
  const [editingStock, setEditingStock] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [branchMetrics, setBranchMetrics] = useState<Record<string, any>>({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());

  // Helper function to get category label
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'supplies': '🏪 Supplies',
      'utilities': '💡 Utilities',
      'petty-cash': '💵 Petty Cash',
      'maintenance': '🔧 Maintenance',
      'other': '📝 Other'
    };
    return labels[category] || category;
  };

  const toggleExpenseDetails = (branchId: string) => {
    const newExpanded = new Set(expandedExpenses);
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId);
    } else {
      newExpanded.add(branchId);
    }
    setExpandedExpenses(newExpanded);
  };

  useEffect(() => {
    loadBranches();
    loadProducts();
    // Clear any cached data to ensure fresh data
    apiClient.clearCache?.();
  }, []);

  useEffect(() => {
    if (branches.length > 0 && selectedDate && allProducts.length > 0) {
      loadBranchMetrics(selectedDate);

      // Poll for updates every 10 seconds
      const intervalId = setInterval(() => {
        if (branches.length > 0 && selectedDate && allProducts.length > 0) {
          loadBranchMetrics(selectedDate);
        }
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, [branches, selectedDate, allProducts]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      console.log('[BranchManagement] Loading branches...');
      const data = await apiClient.getBranches();
      const branchesArray = Array.isArray(data) ? data : [];
      console.log(`[BranchManagement] Fetched ${branchesArray.length} branches:`, branchesArray.map(b => b.name));

      // Load detailed info for each branch
      const branchesWithDetails = await Promise.all(
        branchesArray.map(async (branch) => {
          try {
            const details = await apiClient.getBranch(branch.id);
            return details;
          } catch (error) {
            return branch;
          }
        })
      );

      setBranches(branchesWithDetails);
    } catch (error) {
      console.error('Failed to load branches:', error);
      toast.error('Failed to load branches');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiClient.getProducts();
      setAllProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadBranchDetails = async (branchId: string) => {
    try {
      const [staff, stock] = await Promise.all([
        apiClient.getStaffByBranch(branchId),
        apiClient.getCurrentStock(branchId),
      ]);
      setBranchStaff(Array.isArray(staff) ? staff : []);
      setBranchStock(Array.isArray(stock) ? stock : []);
    } catch (error) {
      console.error('Failed to load branch details:', error);
      toast.error('Failed to load branch details');
    }
  };

  const loadBranchMetrics = async (date: Date) => {
    // Construct local YYYY-MM-DD string in Kenya Time (EAT)
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date || new Date());

    // Calculate local start and end of day in EAT format (+03:00)
    const formatEAT = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+03:00`;
    };
    const localStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const localEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    const startISO = formatEAT(localStart);
    const endISO = formatEAT(localEnd);

    console.log(`[BranchManagement] Loading metrics for ${dateStr} (Local: ${startISO} to ${endISO})`);
    setMetricsLoading(true);

    try {
      // Clear cache to get fresh data
      apiClient.clearCache?.();

      const metricsEntries = await Promise.all(
        branches.map(async (branch) => {
          console.log(`[BranchManagement] Fetching data for ${branch.name}...`);
          const [stockHistory, expenses, transactions, expensesByCategory, currentStock] = await Promise.all([
            apiClient.getStockHistoryByDate(branch.id, dateStr),
            apiClient.getExpensesByDateRange(branch.id, startISO, endISO),
            apiClient.getTransactionsByDateRange(branch.id, startISO, endISO),
            apiClient.getExpensesByCategory(branch.id, startISO, endISO),
            isSelectedDateToday ? apiClient.getCurrentStock(branch.id) : Promise.resolve([])
          ]);
          console.log(`[BranchManagement] ${branch.name} raw data:`, {
            stockHistory: stockHistory?.length || 0,
            expenses: expenses?.length || 0,
            transactions: transactions?.length || 0,
            expensesByCategory: Object.keys(expensesByCategory || {}).length
          });

          const stockHistoryArray = Array.isArray(stockHistory) ? stockHistory : [];
          const expensesArray = Array.isArray(expenses) ? expenses : [];
          const transactionsArray = Array.isArray(transactions) ? transactions : [];

          const openingStock = stockHistoryArray.reduce(
            (sum: number, entry: any) => sum + (parseFloat(entry.opening_stock) || 0),
            0
          );

          let closingStock;
          if (isSelectedDateToday) {
            // Use live current stock for today
            const currentStockArray = Array.isArray(currentStock) ? currentStock : [];
            closingStock = currentStockArray.reduce(
              (sum: number, entry: any) => sum + (parseFloat(entry.current_stock) || 0),
              0
            );
          } else {
            // Use recorded historical closing stock
            closingStock = stockHistoryArray.reduce(
              (sum: number, entry: any) => sum + (parseFloat(entry.closing_stock) || 0),
              0
            );
          }
          const expensesTotal = expensesArray.reduce(
            (sum: number, entry: any) => sum + (parseFloat(entry.amount) || 0),
            0
          );

          const salesTotal = transactionsArray.reduce(
            (sum: number, transaction: any) => sum + (parseFloat(transaction.total) || 0),
            0
          );

          // Calculate low stock count
          let lowStockCount;
          if (isSelectedDateToday) {
            // Use live current stock for today's alerts
            const currentStockArray = Array.isArray(currentStock) ? currentStock : [];
            lowStockCount = currentStockArray.reduce((count: number, bs: any) => {
              const product = allProducts.find((p) => p.id === bs.product_id);
              if (!product) return count;
              return bs.current_stock < product.low_stock_threshold ? count + 1 : count;
            }, 0);
          } else {
            // Use historical closing stock for past dates
            lowStockCount = stockHistoryArray.reduce((count: number, entry: any) => {
              const product = allProducts.find((p) => p.id === entry.product_id);
              if (!product) return count;
              const stockLevel = entry.closing_stock !== null ? entry.closing_stock : entry.opening_stock;
              return stockLevel < product.low_stock_threshold ? count + 1 : count;
            }, 0);
          }

          // Process expense breakdown by category
          const expenseBreakdown: Record<string, number> = expensesByCategory || {};

          console.log(`[BranchManagement] ${branch.name} calculated metrics:`, {
            openingStock,
            closingStock,
            expensesTotal,
            salesTotal,
            lowStockCount,
            expenseBreakdown
          });

          return [branch.id, { openingStock, closingStock, expensesTotal, salesTotal, lowStockCount, expenseBreakdown }];
        })
      );

      const metricsObject = Object.fromEntries(metricsEntries);
      console.log('[BranchManagement] Final metrics object:', metricsObject);
      setBranchMetrics(metricsObject);
    } catch (error) {
      console.error('[BranchManagement] Failed to load branch metrics:', error);
      toast.error('Failed to load branch metrics');
    } finally {
      setMetricsLoading(false);
    }
  };

  const isSelectedDateToday = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date();
    return (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    );
  }, [selectedDate]);

  const formattedDate = useMemo(() => {
    return selectedDate ? selectedDate.toLocaleDateString() : 'Select date';
  }, [selectedDate]);

  const handleManageClick = async (branch: any) => {
    setSelectedBranch(branch);
    await loadBranchDetails(branch.id);
    setEditingBranch({ ...branch });
    setEditDialogOpen(true);
  };

  const handleEditStock = async () => {
    if (!selectedBranch) return;

    // Create editing stock array with current values
    const stockWithProducts = branchStock.map((bs: any) => {
      const product = allProducts.find(p => p.id === bs.product_id);
      return {
        ...bs,
        product,
        newStock: bs.current_stock,
      };
    });

    setEditingStock(stockWithProducts);
    setStockDialogOpen(true);
  };

  const handleCreateBranch = async () => {
    if (!newBranch.name || !newBranch.location) {
      toast.error('Name and location are required');
      return;
    }
    try {
      await apiClient.createBranch(newBranch.name, newBranch.location);
      toast.success('Branch created successfully');
      setAddBranchDialogOpen(false);
      setNewBranch({ name: '', location: '' });
      await loadBranches();
    } catch (error) {
      console.error('Failed to create branch:', error);
      toast.error('Failed to create branch');
    }
  };

  const handleSaveBranch = async () => {
    if (!editingBranch) return;

    try {
      await apiClient.updateBranch(editingBranch.id, {
        name: editingBranch.name,
        location: editingBranch.location,
        status: editingBranch.status,
      });

      toast.success('Branch updated successfully');
      await loadBranches();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update branch:', error);
      toast.error('Failed to update branch');
    }
  };

  const handleDeleteBranch = async () => {
    if (!editingBranch) return;
    
    if (!confirm(`Are you absolutely sure you want to permanently delete the branch "${editingBranch.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.deleteBranch(editingBranch.id);
      toast.success('Branch deleted successfully');
      setEditDialogOpen(false);
      await loadBranches();
    } catch (error: any) {
      console.error('Failed to delete branch:', error);
      toast.error(error?.response?.data?.error || 'Failed to delete branch. It may contain protected active data.');
    }
  };

  const handleSaveStock = async () => {
    if (!selectedBranch) return;

    try {
      // Update all stock items
      await Promise.all(
        editingStock.map((item: any) =>
          apiClient.updateBranchStock(selectedBranch.id, item.product_id, item.newStock)
        )
      );

      toast.success('Stock updated successfully');
      await loadBranchDetails(selectedBranch.id);
      setStockDialogOpen(false);
    } catch (error) {
      console.error('Failed to update stock:', error);
      toast.error('Failed to update stock');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-neutral-500">Loading branches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">Branch Management</h1>
          <p className="text-neutral-600">Manage all branches and operations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => selectedDate && loadBranchMetrics(selectedDate)}
            disabled={metricsLoading}
            className="text-neutral-700 border-neutral-200"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${metricsLoading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setAddBranchDialogOpen(true)}
          >
            <Store className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
          <Button
            className="bg-red-700 hover:bg-red-800"
            onClick={() => {
              const summaryCards = [
                { label: 'Total Revenue', value: `KES ${branches.reduce((sum, b) => sum + (branchMetrics[b.id]?.salesTotal || 0), 0).toLocaleString()}` },
                { label: 'Active Branches', value: `${branches.filter(b => b.status === 'open').length} / ${branches.length}` },
                { label: 'Total Staff', value: `${branches.reduce((sum, b) => sum + (b.staffCount || 0), 0)} Members` },
              ];
              const tables = [
                {
                  title: 'Branch Performance Summary',
                  headers: ['Branch', 'Status', 'Sales', 'Expenses', 'Staff'],
                  rows: branches.map(b => {
                    const m = branchMetrics[b.id] || {};
                    return [
                      b.name,
                      b.status?.toUpperCase(),
                      `KES ${(m.salesTotal || 0).toLocaleString()}`,
                      `KES ${(m.expensesTotal || 0).toLocaleString()}`,
                      b.staffCount || 0
                    ];
                  })
                }
              ];
              exportToPDF({
                title: 'Branch Management Report',
                subtitle: `Date: ${formattedDate}`,
                summaryCards,
                tables
              }, `Branch_Report_${formattedDate.replace(/\//g, '-')}`);
              toast.success('Branch report exported successfully');
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <CalendarIcon className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">Selected Date</p>
              <p className="text-lg font-semibold text-neutral-900">{formattedDate}</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                }
              }}
              className="rounded-md border"
              disabled={(date) => date > new Date()}
            />
          </div>
        </div>
      </Card>

      {/* Branch Cards */}
      {metricsLoading && (
        <div className="text-center py-4">
          <p className="text-neutral-500">Loading metrics for {formattedDate}...</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {branches.map((branch) => {
          const metrics = branchMetrics[branch.id] || {
            openingStock: 0,
            closingStock: 0,
            expensesTotal: 0,
            salesTotal: 0,
            lowStockCount: 0,
            expenseBreakdown: {},
          };
          const showActive = branch.status === 'open' && isSelectedDateToday;

          return (
            <Card key={branch.id} className={`p-6 hover:shadow-xl transition-all ${metricsLoading ? 'opacity-60' : 'opacity-100'}`}>
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Store className="w-6 h-6 text-red-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-neutral-900">{branch.name}</h3>
                    <div className="flex items-center gap-1 text-neutral-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{branch.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {showActive && (
                    <Badge className="bg-emerald-100 text-emerald-700">ACTIVE</Badge>
                  )}
                  <Badge
                    variant={branch.status === 'open' ? 'default' : 'secondary'}
                    className={
                      branch.status === 'open'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-neutral-200 text-neutral-600'
                    }
                  >
                    {branch.status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-700 mx-auto mb-1" />
                  <p className="text-lg font-bold text-neutral-900">
                    KES {(metrics.salesTotal || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-neutral-600">{isSelectedDateToday ? 'Today\'s Sales' : 'Sales'}</p>
                </div>

                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Users className="w-5 h-5 text-blue-700 mx-auto mb-1" />
                  <p className="text-lg font-bold text-neutral-900">{branch.staffCount || 0}</p>
                  <p className="text-xs text-neutral-600">Staff Members</p>
                </div>

                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <Package className="w-5 h-5 text-red-700 mx-auto mb-1" />
                  <p className="text-lg font-bold text-neutral-900">{metrics.lowStockCount}</p>
                  <p className="text-xs text-neutral-600">Low Stock</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500">Opening Stock</p>
                  <p className="text-lg font-semibold text-neutral-900">
                    {metrics.openingStock.toLocaleString()} kg
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-500">
                      {showActive ? 'Live Stock Balance' : 'Closing Stock'}
                    </p>
                    {showActive && (
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700">ACTIVE</Badge>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-neutral-900">
                    {metrics.closingStock.toLocaleString()} kg
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg mb-4 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => toggleExpenseDetails(branch.id)}>
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-700" />
                  <p className="text-sm text-amber-700">Expenses</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-neutral-900">
                    KES {metrics.expensesTotal.toLocaleString()}
                  </p>
                  <ChevronDown
                    className={`w-4 h-4 text-amber-700 transition-transform ${expandedExpenses.has(branch.id) ? 'rotate-180' : ''
                      }`}
                  />
                </div>
              </div>

              {/* Expense Breakdown */}
              {expandedExpenses.has(branch.id) && metrics.expenseBreakdown && Object.keys(metrics.expenseBreakdown).length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg mb-4 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-900 mb-2">Expense Breakdown</p>
                  <div className="space-y-2">
                    {Object.entries(metrics.expenseBreakdown).map(([category, amount]: [string, any]) => (
                      <div key={category} className="flex items-center justify-between text-sm">
                        <span className="text-amber-700">{getCategoryLabel(category)}</span>
                        <span className="font-semibold text-neutral-900">KES {(amount || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleManageClick(branch)}
                >
                  View Details
                </Button>
                <Button
                  className="flex-1 bg-red-700 hover:bg-red-800"
                  onClick={() => handleManageClick(branch)}
                >
                  Manage
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-neutral-900 to-red-950 text-white">
          <h3 className="text-sm mb-2 opacity-90">Total Revenue Today</h3>
          <p className="text-3xl font-bold">
            KES {branches.reduce((sum, b) => {
              const metrics = branchMetrics[b.id];
              return sum + (metrics?.salesTotal || 0);
            }, 0).toLocaleString()}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-neutral-900 to-red-950 text-white">
          <h3 className="text-sm mb-2 opacity-90">Active Branches</h3>
          <p className="text-3xl font-bold">
            {branches.filter((b) => b.status === 'open').length} / {branches.length}
          </p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-neutral-900 to-red-950 text-white">
          <h3 className="text-sm mb-2 opacity-90">Total Staff</h3>
          <p className="text-3xl font-bold">
            {branches.reduce((sum, b) => sum + (b.staffCount || 0), 0)} Members
          </p>
        </Card>
      </div>

      <Dialog open={addBranchDialogOpen} onOpenChange={setAddBranchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>
              Create a new operational branch in the system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-name">Branch Name</Label>
              <Input
                id="new-name"
                placeholder="e.g., Downtown Store"
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="new-location">Location</Label>
              <Input
                id="new-location"
                placeholder="e.g., Central Plaza, Nairobi"
                value={newBranch.location}
                onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBranchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBranch} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Create Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Branch: {editingBranch?.name}</DialogTitle>
            <DialogDescription>
              Update branch details, view staff, and manage inventory
            </DialogDescription>
          </DialogHeader>

          {editingBranch && (
            <div className="space-y-6">
              {/* Branch Details Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Branch Name</Label>
                  <Input
                    id="name"
                    value={editingBranch.name}
                    onChange={(e) =>
                      setEditingBranch({ ...editingBranch, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editingBranch.location}
                    onChange={(e) =>
                      setEditingBranch({ ...editingBranch, location: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={editingBranch.status}
                    onValueChange={(value) =>
                      setEditingBranch({ ...editingBranch, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Staff Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-neutral-900">Staff Members</h3>
                  <Badge>{branchStaff.length} Total</Badge>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {branchStaff.length > 0 ? (
                    branchStaff.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-neutral-900">{member.name}</p>
                          <p className="text-sm text-neutral-600">{member.email}</p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">No staff assigned</p>
                  )}
                </div>
              </div>

              {/* Stock Management Button */}
              <div>
                <Button
                  onClick={handleEditStock}
                  className="w-full bg-red-700 hover:bg-red-800"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Manage Stock Levels
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between w-full mt-4 flex items-center">
            <Button
              variant="outline"
              onClick={handleDeleteBranch}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Branch
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveBranch} className="bg-red-700 hover:bg-red-800">
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Management Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Stock Levels</DialogTitle>
            <DialogDescription>
              Update current stock levels for {selectedBranch?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {editingStock.map((item: any, index: number) => (
              <div key={item.product_id} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{item.product?.name || 'Unknown Product'}</p>
                  <p className="text-sm text-neutral-600">
                    Current: {item.current_stock}kg | Min: {item.product?.low_stock_threshold || 0}kg
                  </p>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={item.newStock}
                    onChange={(e) => {
                      const updated = [...editingStock];
                      updated[index].newStock = parseFloat(e.target.value) || 0;
                      setEditingStock(updated);
                    }}
                    className="text-right"
                  />
                </div>
                <span className="text-sm text-neutral-600">kg</span>
              </div>
            ))}
            {editingStock.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-8">No stock data available</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStock} className="bg-red-700 hover:bg-red-800">
              Update Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
