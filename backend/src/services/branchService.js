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

  // Get today's sales
  const today = new Date().toISOString().split('T')[0];
  const { data: todayTransactions } = await supabase
    .from('transactions')
    .select('total')
    .eq('branch_id', branchId)
    .gte('created_at', today);

  const todaySales = todayTransactions?.reduce((sum, t) => sum + t.total, 0) || 0;

  return {
    ...branch,
    staffCount: staffCount || 0,
    todaySales,
  };
};
