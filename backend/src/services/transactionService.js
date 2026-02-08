import { supabase } from '../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';

export const createTransaction = async (branchId, cashierId, items, paymentMethod) => {
  let total = 0;

  // Calculate total
  items.forEach(item => {
    total += item.subtotal;
  });

  // Start transaction
  const transactionId = uuidv4();

  // Create transaction record
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      id: transactionId,
      branch_id: branchId,
      cashier_id: cashierId,
      payment_method: paymentMethod,
      total,
    })
    .select()
    .single();

  if (txError) throw txError;

  // Insert transaction items
  const itemsToInsert = items.map(item => ({
    transaction_id: transactionId,
    product_id: item.productId,
    quantity: item.quantity,
    price_per_kg: item.pricePerKg,
    subtotal: item.subtotal,
  }));

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;

  // Update branch stock
  for (const item of items) {
    const { data: stock } = await supabase
      .from('branch_stock')
      .select('current_stock')
      .eq('branch_id', branchId)
      .eq('product_id', item.productId)
      .single();

    const newStock = (stock?.current_stock || 0) - item.quantity;

    await supabase
      .from('branch_stock')
      .upsert({
        branch_id: branchId,
        product_id: item.productId,
        current_stock: Math.max(0, newStock),
      });
  }

  return transaction;
};

export const getTransactionById = async (id) => {
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();

  if (txError) throw txError;

  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transaction_id', id);

  if (itemsError) throw itemsError;

  return { ...transaction, items };
};

export const getTransactionsByBranch = async (branchId, limit = 50, offset = 0) => {
  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
};

export const getTransactionsByDateRange = async (branchId, startDate, endDate) => {
  // Convert date strings to timestamp ranges
  // startDate: '2026-02-07' -> '2026-02-07T00:00:00Z'
  // endDate: '2026-02-07' -> '2026-02-07T23:59:59Z'
  // startDate: '2026-02-07' -> '2026-02-07T00:00:00Z'
  // endDate: '2026-02-07' -> '2026-02-07T23:59:59.999Z'
  const cleanDate = (d) => d && d.split('T')[0];
  const startISO = `${cleanDate(startDate)}T00:00:00Z`;
  const endISO = `${cleanDate(endDate)}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('branch_id', branchId)
    .gte('created_at', startISO)
    .lte('created_at', endISO)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getTotalSalesByDay = async (branchId, dateStr) => {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const startISO = `${date}T00:00:00Z`;
  const endISO = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('transactions')
    .select('total')
    .eq('branch_id', branchId)
    .gte('created_at', startISO)
    .lte('created_at', endISO);

  if (error) throw error;
  return data?.reduce((sum, t) => sum + t.total, 0) || 0;
};
