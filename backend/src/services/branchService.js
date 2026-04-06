import { supabase } from '../db/supabase.js';

export const getAllBranches = async () => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const getBranchById = async (id) => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const createBranch = async (name, location) => {
  const { data, error } = await supabase
    .from('branches')
    .insert({ name, location })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateBranch = async (id, updates) => {
  const { data, error } = await supabase
    .from('branches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getBranchWithStats = async (branchId) => {
  const { data: branch, error: branchError } = await supabase
    .from('branches')
    .select('*')
    .eq('id', branchId)
    .single();

  if (branchError) throw branchError;

  // Get staff count
  const { count: staffCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId);

  // Get today's sales (DB is now in EAT)
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

  const { data: todayTransactions } = await supabase
    .from('transactions')
    .select('total')
    .eq('branch_id', branchId)
    .gte('created_at', `${today} 00:00:00`)
    .lte('created_at', `${today} 23:59:59`);

  const todaySales = todayTransactions?.reduce((sum, t) => sum + t.total, 0) || 0;

  const { data: todayExpenseRows } = await supabase
    .from('expenses')
    .select('amount')
    .eq('branch_id', branchId)
    .gte('created_at', `${today} 00:00:00`)
    .lte('created_at', `${today} 23:59:59`);

  const todayExpenses = todayExpenseRows?.reduce((sum, e) => sum + e.amount, 0) || 0;

  // VARIANCE CALCULATION: Expected vs Actual Stock
  // Expected = Opening + Additions + Transfers In - Sales - Transfers Out - Dispatches
  // Variance = Actual (Live Stock) - Expected
  
  const { data: stockHistory } = await supabase
    .from('stock_history')
    .select('product_id, opening_stock, closing_stock')
    .eq('branch_id', branchId)
    .eq('date', today);

  const { data: liveStock } = await supabase
    .from('branch_stock')
    .select('product_id, current_stock')
    .eq('branch_id', branchId);

  // Get today's stock additions (mid-shift additions)
  const { data: stockAdditions } = await supabase
    .from('stock_additions')
    .select('product_id, quantity')
    .eq('branch_id', branchId)
    .eq('addition_date', today);

  // Get today's transfers IN (received)
  const { data: transfersIn } = await supabase
    .from('stock_transfers')
    .select('product_id, quantity')
    .eq('to_branch_id', branchId)
    .eq('transfer_date', today);

  // Get today's transfers OUT (sent)
  const { data: transfersOut } = await supabase
    .from('stock_transfers')
    .select('product_id, quantity')
    .eq('from_branch_id', branchId)
    .eq('transfer_date', today);

  // Get today's external dispatches
  const { data: dispatches } = await supabase
    .from('external_dispatches')
    .select('product_id, quantity')
    .eq('branch_id', branchId)
    .eq('dispatch_date', today);

  // Get today's sales
  const { data: salesItems } = await supabase
    .from('transaction_items')
    .select('product_id, quantity, transactions!inner(branch_id, created_at)')
    .eq('transactions.branch_id', branchId)
    .gte('transactions.created_at', `${today} 00:00:00`)
    .lte('transactions.created_at', `${today} 23:59:59`);

  let totalVariance = 0;
  let totalOpeningStock = 0;
  let totalLiveStock = 0;

  if (liveStock && stockHistory) {
    liveStock.forEach(live => {
      const history = stockHistory.find(h => h.product_id === live.product_id);
      const opening = parseFloat(history?.opening_stock || 0);
      
      // Use closing_stock if cashier submitted it (physical count), otherwise use live stock
      const actual = history?.closing_stock !== null && history?.closing_stock !== undefined
        ? parseFloat(history.closing_stock)
        : parseFloat(live.current_stock || 0);
      
      totalOpeningStock += opening;
      totalLiveStock += actual;
      
      // Calculate expected stock
      // NOTE: Stock additions are already included in opening_stock (system updates opening when stock is added mid-shift)
      // So we don't add them again here to avoid double-counting
      
      const transferIn = transfersIn?.filter(t => t.product_id === live.product_id)
        .reduce((sum, t) => sum + parseFloat(t.quantity), 0) || 0;
      
      const transferOut = transfersOut?.filter(t => t.product_id === live.product_id)
        .reduce((sum, t) => sum + parseFloat(t.quantity), 0) || 0;
      
      const dispatched = dispatches?.filter(d => d.product_id === live.product_id)
        .reduce((sum, d) => sum + parseFloat(d.quantity), 0) || 0;
      
      const sold = salesItems?.filter(s => s.product_id === live.product_id)
        .reduce((sum, s) => sum + parseFloat(s.quantity), 0) || 0;
      
      // Expected = Opening + Transfers In - Sales - Transfers Out - Dispatches
      // (Opening already includes mid-shift additions)
      const expected = opening + transferIn - sold - transferOut - dispatched;
      
      // Variance = Actual (physical count or live stock) - Expected (calculated)
      // If cashier submitted closing stock, that's the truth and variance shows discrepancy
      const variance = actual - expected;
      
      // Only count significant variances (more than 0.1kg difference)
      if (Math.abs(variance) > 0.1) {
        totalVariance += Math.abs(variance);
      }
    });
  }

  return {
    ...branch,
    staffCount: staffCount || 0,
    todaySales,
    todayExpenses,
    profit: todaySales - todayExpenses,
    totalOpeningStock,
    totalLiveStock,
    unaccountedStock: totalVariance, // Renamed but keeping same field for compatibility
  };
};
