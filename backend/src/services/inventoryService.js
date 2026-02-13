import { supabase } from '../db/supabase.js';

export const ensureDailyHistory = async (productId, branchId, date) => {
  // Check if a record already exists for this day
  const { data: existing } = await supabase
    .from('stock_history')
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .eq('date', date)
    .maybeSingle();

  if (existing) return existing;

  // Initialize from previous closing stock
  const { data: lastHistory } = await supabase
    .from('stock_history')
    .select('closing_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .lt('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  let openingStock;
  if (lastHistory && lastHistory.closing_stock !== null) {
    openingStock = lastHistory.closing_stock;
  } else {
    // Fallback to live branch stock
    const { data: branchStock } = await supabase
      .from('branch_stock')
      .select('current_stock')
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .single();
    openingStock = branchStock?.current_stock || 0;
  }

  const { data, error } = await supabase
    .from('stock_history')
    .insert({
      product_id: productId,
      branch_id: branchId,
      date,
      opening_stock: openingStock,
      added_by: 'System (Auto-Init)'
    })
    .select()
    .single();

  if (error) {
    console.error(`[InventoryService] Error auto-initializing history for ${productId}:`, error);
    return null;
  }
  return data;
};

export const recordStockEntry = async (productId, branchId, openingStock, date, addedBy) => {
  const { data, error } = await supabase
    .from('stock_history')
    .insert({
      product_id: productId,
      branch_id: branchId,
      opening_stock: openingStock,
      date,
      added_by: addedBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Update or insert branch_stock with opening stock
  const { error: stockError } = await supabase
    .from('branch_stock')
    .upsert(
      {
        branch_id: branchId,
        product_id: productId,
        current_stock: openingStock,
      },
      { onConflict: 'branch_id,product_id' }
    );

  if (stockError) throw stockError;
  return data;
};

export const recordClosingStock = async (productId, branchId, closingStock, date) => {
  console.log(`[InventoryService] Recording closing stock: Product=${productId}, Branch=${branchId}, Date=${date}, Stock=${closingStock}`);

  // 1. Ensure the daily record exists (inherits from yesterday if needed)
  const history = await ensureDailyHistory(productId, branchId, date);
  if (!history) throw new Error('Failed to access or initialize stock history');

  // 2. Update existing record with the closing stock
  const { data: updated, error: updateError } = await supabase
    .from('stock_history')
    .update({
      closing_stock: closingStock,
      added_by: 'Cashier (Closing)'
    })
    .eq('id', history.id)
    .select()
    .single();

  if (updateError) throw updateError;
  const result = updated;

  // 3. CRITICAL SYNC: Update branch_stock to match the new physical count (closing stock)
  // This ensures POS and Admin "Current Stock" reflects the physical count submitted by cashier
  const { error: stockSyncError } = await supabase
    .from('branch_stock')
    .upsert({
      branch_id: branchId,
      product_id: productId,
      current_stock: closingStock,
      updated_at: new Date().toISOString()
    }, { onConflict: 'branch_id,product_id' });

  if (stockSyncError) {
    console.error(`[InventoryService] Error syncing closing stock to branch_stock:`, stockSyncError);
  }

  return result;
};

export const getStockHistoryByBranch = async (branchId, limit = 50, offset = 0) => {
  const { data, error, count } = await supabase
    .from('stock_history')
    .select('*', { count: 'exact' })
    .eq('branch_id', branchId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { data, count };
};

export const getStockHistoryByDate = async (branchId, date) => {
  const { data, error } = await supabase
    .from('stock_history')
    .select('*')
    .eq('branch_id', branchId)
    .eq('date', date);

  if (error) throw error;
  return data;
};

export const getLowStockProducts = async (branchId) => {
  const { data, error } = await supabase
    .from('branch_stock')
    .select('*, products(*)')
    .eq('branch_id', branchId);

  if (error) throw error;

  return data?.filter(bs => bs.current_stock < bs.products?.low_stock_threshold) || [];
};

export const getCurrentStockByBranch = async (branchId) => {
  const { data, error } = await supabase
    .from('branch_stock')
    .select('*')
    .eq('branch_id', branchId);

  if (error) throw error;
  return data;
};

export const updateBranchStock = async (branchId, productId, currentStock) => {
  try {
    // First check if record exists
    const { data: existing } = await supabase
      .from('branch_stock')
      .select('*')
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .single();

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('branch_stock')
        .update({
          current_stock: currentStock,
          updated_at: new Date().toISOString(),
        })
        .eq('branch_id', branchId)
        .eq('product_id', productId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('branch_stock')
        .insert({
          branch_id: branchId,
          product_id: productId,
          current_stock: currentStock,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    console.error('Error updating branch stock:', error);
    throw error;
  }
};

export const addStock = async (branchId, productId, amount, addedBy) => {
  // 1. Get current stock
  const { data: current, error: fetchError } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

  const oldStock = current?.current_stock || 0;
  const newStock = parseFloat(oldStock) + parseFloat(amount);

  // 2. Update branch_stock
  const { data, error } = await supabase
    .from('branch_stock')
    .upsert({
      branch_id: branchId,
      product_id: productId,
      current_stock: newStock,
      updated_at: new Date().toISOString()
    }, { onConflict: 'branch_id,product_id' })
    .select()
    .single();

  if (error) throw error;

  // 3. Log to stock_history (Additive Opening Stock)
  const today = new Date().toISOString().split('T')[0];

  const history = await ensureDailyHistory(productId, branchId, today);
  if (history) {
    const updatedOpening = (parseFloat(history.opening_stock) || 0) + parseFloat(amount);
    await supabase
      .from('stock_history')
      .update({
        opening_stock: updatedOpening,
        added_by: addedBy || 'Admin'
      })
      .eq('id', history.id);
    console.log(`[InventoryService] Updated opening stock via addition: ${history.opening_stock} -> ${updatedOpening}`);
  }

  return data;
};
