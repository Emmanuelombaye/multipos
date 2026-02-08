import { supabase } from '../db/supabase.js';

export const createExpense = async (branchId, category, amount, description, recordedBy) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      branch_id: branchId,
      category,
      amount,
      description,
      recorded_by: recordedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getExpensesByBranch = async (branchId, limit = 50, offset = 0) => {
  const { data, error, count } = await supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
};

export const getExpensesByDateRange = async (branchId, startDate, endDate) => {
  // Clean date input: strip time portion if present
  const cleanDate = (d) => d.split('T')[0];
  const startISO = `${cleanDate(startDate)}T00:00:00Z`;
  const endISO = `${cleanDate(endDate)}T23:59:59.999Z`;
  
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('branch_id', branchId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getTotalExpensesByDay = async (branchId) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('expenses')
    .select('total:amount')
    .eq('branch_id', branchId)
    .gte('created_at', today);

  if (error) throw error;
  return data?.reduce((sum, e) => sum + (e.total || 0), 0) || 0;
};

export const getExpensesByCategory = async (branchId, startDate, endDate) => {
  // Convert date strings to timestamp ranges
  const startISO = `${startDate}T00:00:00Z`;
  const endISO = `${endDate}T23:59:59.999Z`;
  
  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('branch_id', branchId)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  if (error) throw error;

  const byCategory = {};
  data?.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  return byCategory;
};
