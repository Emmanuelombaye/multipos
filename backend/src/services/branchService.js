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

  // ACCOUNTABILITY CHECK: Get stock discrepancies
  const { data: stockHistory } = await supabase
    .from('stock_history')
    .select('product_id, opening_stock, closing_stock')
    .eq('branch_id', branchId)
    .eq('date', today);

  const { data: liveStock } = await supabase
    .from('branch_stock')
    .select('product_id, current_stock')
    .eq('branch_id', branchId);

  let unaccountedStock = 0;
  let totalOpeningStock = 0;
  let totalLiveStock = 0;

  if (liveStock && stockHistory) {
    liveStock.forEach(live => {
      const history = stockHistory.find(h => h.product_id === live.product_id);
      const opening = parseFloat(history?.opening_stock || 0);
      const current = parseFloat(live.current_stock || 0);
      
      totalOpeningStock += opening;
      totalLiveStock += current;
      
      // If live stock exists but opening was 0, it's unaccounted
      if (opening === 0 && current > 0) {
        unaccountedStock += current;
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
    unaccountedStock,
  };
};
