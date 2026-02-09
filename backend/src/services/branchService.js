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

  // Get today's sales using local EAT logic (+03:00)
  const getLocalDate = () => {
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nairobiTime = new Date(utcTime + (3 * 3600000));
    return nairobiTime.toISOString().split('T')[0];
  };
  const today = getLocalDate();
  const startISO = `${today}T00:00:00+03:00`;

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
