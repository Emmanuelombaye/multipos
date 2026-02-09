import express from 'express';
import * as branchService from '../services/branchService.js';
import * as transactionService from '../services/transactionService.js';
import * as expenseService from '../services/expenseService.js';
import { authorize } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';

const router = express.Router();

// Get admin dashboard (all branches)
router.get('/admin', authorize(['admin']), async (req, res, next) => {
  try {
    const { data: branches } = await supabase
      .from('branches')
      .select('*');

    const stats = {
      totalBranches: branches?.length || 0,
      activeBranches: branches?.filter(b => b.status === 'open').length || 0,
    };

    // Calculate TOTAL SALES (all time, all branches)
    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('total');

    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount');

    stats.total_sales = allTransactions?.reduce((sum, t) => sum + (t.total || 0), 0) || 0;
    stats.totalExpenses = allExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    stats.profit = stats.total_sales - stats.totalExpenses;

    // Get total staff count across all branches
    const { data: allStaff, error: staffError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: false });

    stats.total_staff = allStaff?.length || 0;

    // Get low stock products count across all branches using dynamic thresholds
    const { data: allBranchStock } = await supabase
      .from('branch_stock')
      .select('*, products(low_stock_threshold)');

    const lowStockItems = (allBranchStock || []).filter(item => {
      const threshold = item.products?.low_stock_threshold || 5;
      return item.current_stock < threshold;
    });

    stats.low_stock_count = new Set(lowStockItems.map(item => item.product_id)).size;

    // Get recent transactions
    const { data: recentTransactions } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    stats.recentTransactions = recentTransactions || [];

    // Get all branches with stats
    const branchesWithStats = await Promise.all(
      branches?.map(b => branchService.getBranchWithStats(b.id)) || []
    );

    stats.branches = branchesWithStats;

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// Get branch dashboard
router.get('/branch/:branchId', async (req, res, next) => {
  try {
    const { branchId } = req.params;

    // Parallelize all dashboard queries
    const [
      branch,
      { data: lowStockProducts },
      { data: recentTransactions },
      { data: recentExpenses },
      todaySalesResult,
      todayExpensesResult
    ] = await Promise.all([
      branchService.getBranchById(branchId),
      supabase
        .from('branch_stock')
        .select('*, products(*)')
        .eq('branch_id', branchId),
      supabase
        .from('transactions')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('expenses')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(10),
      transactionService.getTotalSalesByDay(branchId),
      expenseService.getTotalExpensesByDay(branchId)
    ]);

    const todaySales = todaySalesResult || 0;
    const todayExpenses = todayExpensesResult || 0;

    const lowStockFilterd = lowStockProducts?.filter(
      bs => bs.current_stock < bs.products?.low_stock_threshold
    ) || [];

    res.json({
      branch,
      todaySales,
      todayExpenses,
      profit: todaySales - todayExpenses,
      lowStockProducts: lowStockFilterd,
      recentTransactions: recentTransactions || [],
      recentExpenses: recentExpenses || [],
    });
  } catch (error) {
    next(error);
  }
});

// Get sales metrics for date range
router.get('/metrics/:branchId', async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    // Simple date-only queries (assumes DB is in EAT)
    const cleanDate = (d) => d && d.split('T')[0];
    const startDateStr = cleanDate(startDate);
    const endDateStr = cleanDate(endDate);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('total, created_at')
      .eq('branch_id', branchId)
      .gte('created_at', `${startDateStr} 00:00:00`)
      .lte('created_at', `${endDateStr} 23:59:59`);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, created_at')
      .eq('branch_id', branchId)
      .gte('created_at', `${startDateStr} 00:00:00`)
      .lte('created_at', `${endDateStr} 23:59:59`);

    // Group by date
    const dateMetrics = {};

    transactions?.forEach(t => {
      const date = t.created_at.split('T')[0];
      if (!dateMetrics[date]) {
        dateMetrics[date] = { sales: 0, expenses: 0, profit: 0 };
      }
      dateMetrics[date].sales += t.total;
    });

    expenses?.forEach(e => {
      const date = e.created_at.split('T')[0];
      if (!dateMetrics[date]) {
        dateMetrics[date] = { sales: 0, expenses: 0, profit: 0 };
      }
      dateMetrics[date].expenses += e.amount;
    });

    // Calculate profit
    Object.keys(dateMetrics).forEach(date => {
      dateMetrics[date].profit = dateMetrics[date].sales - dateMetrics[date].expenses;
    });

    res.json(dateMetrics);
  } catch (error) {
    next(error);
  }
});

export default router;
