import { supabase } from '../db/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import { ensureDailyHistory } from './inventoryService.js';

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

  // Today's date for history tracking in Kenya Time (EAT)
  const getKenyaDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };
  const today = getKenyaDate();

  // Update branch stock
  for (const item of items) {
    try {
      // 1. Ensure history row exists so Opening Stock is visible immediately
      await ensureDailyHistory(item.productId, branchId, today);

      // 2. Atomic update via PostgreSQL function (prevents race conditions)
      const { error: updateError } = await supabase.rpc('reduce_branch_stock', {
        p_branch_id: branchId,
        p_product_id: item.productId,
        p_quantity: parseFloat(item.quantity) || 0
      });

      if (updateError) {
        console.error(`[TransactionService] Error calling rpc.reduce_branch_stock for ${item.productId}:`, updateError);
      }
    } catch (err) {
      console.error(`[TransactionService] Unexpected error updating stock for product ${item.productId}:`, err);
    }
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
  // Simple date-only queries (DB is in EAT)
  const cleanDate = (d) => d && d.split('T')[0];
  const startDateStr = cleanDate(startDate);
  const endDateStr = cleanDate(endDate);

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('branch_id', branchId)
    .gte('created_at', `${startDateStr} 00:00:00`)
    .lte('created_at', `${endDateStr} 23:59:59`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getTotalSalesByDay = async (branchId, dateStr) => {
  const date = dateStr || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('transactions')
    .select('total')
    .eq('branch_id', branchId)
    .gte('created_at', `${date} 00:00:00`)
    .lte('created_at', `${date} 23:59:59`);

  if (error) throw error;
  return data?.reduce((sum, t) => sum + t.total, 0) || 0;
};
