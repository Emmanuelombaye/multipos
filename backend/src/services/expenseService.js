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
  // Clean date input: ensure strict +03:00 (EAT) boundaries
  const isFullISO = (d) => d && d.includes('T') && (d.includes('Z') || d.includes('+') || d.includes('-'));
  const cleanDate = (d) => d && d.split('T')[0];

  const startISO = isFullISO(startDate) ? startDate : `${cleanDate(startDate)}T00:00:00+03:00`;
  const endISO = isFullISO(endDate) ? endDate : `${cleanDate(endDate)}T23:59:59.999+03:00`;

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

export const getTotalExpensesByDay = async (branchId, dateStr) => {
  const date = dateStr || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('expenses')
    .select('amount')
    .eq('branch_id', branchId)
    .gte('created_at', `${date} 00:00:00`)
    .lte('created_at', `${date} 23:59:59`);

  if (error) throw error;
  return data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
};

export const getExpensesByCategory = async (branchId, startDate, endDate) => {
  // Simple date-only queries (DB is in EAT)
  const cleanDate = (d) => d && d.split('T')[0];
  const startDateStr = cleanDate(startDate);
  const endDateStr = cleanDate(endDate);

  const { data, error } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('branch_id', branchId)
    .gte('created_at', `${startDateStr} 00:00:00`)
    .lte('created_at', `${endDateStr} 23:59:59`);

  if (error) throw error;

  const byCategory = {};
  data?.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  return byCategory;
};
