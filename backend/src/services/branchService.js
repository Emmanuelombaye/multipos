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

  // Get today's sales using local midnight logic (approximate for Kenya UTC+3)
  // This is a fallback; the frontend now calculates this precisely via transactions endpoint
  const now = new Date();
  const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const startISO = localStart.toISOString();

  const { data: todayTransactions } = await supabase
    .from('transactions')
    .select('total')
    .eq('branch_id', branchId)
    .gte('created_at', startISO);

  const todaySales = todayTransactions?.reduce((sum, t) => sum + t.total, 0) || 0;

  return {
    ...branch,
    staffCount: staffCount || 0,
    todaySales,
  };
};
