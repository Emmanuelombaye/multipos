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
      .maybeSingle();
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
  // Upsert — if a row already exists for this date (e.g. auto-init), update it instead of failing
  const { data: existing } = await supabase
    .from('stock_history')
    .select('id')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .eq('date', date)
    .maybeSingle();

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from('stock_history')
      .update({ opening_stock: openingStock, added_by: addedBy })
      .eq('id', existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('stock_history')
      .insert({ product_id: productId, branch_id: branchId, opening_stock: openingStock, date, added_by: addedBy })
      .select()
      .single());
  }

  if (error) throw error;

  // Sync branch_stock to opening stock
  const { error: stockError } = await supabase
    .from('branch_stock')
    .upsert(
      { branch_id: branchId, product_id: productId, current_stock: openingStock },
      { onConflict: 'branch_id,product_id' }
    );

  if (stockError) throw stockError;
  return data;
};

export const recordClosingStock = async (productId, branchId, closingStock, date, submittedBy) => {
  console.log(`[InventoryService] Recording closing stock: Product=${productId}, Branch=${branchId}, Date=${date}, Stock=${closingStock}, By=${submittedBy}`);

  // 1. Ensure the daily record exists
  const history = await ensureDailyHistory(productId, branchId, date);
  if (!history) throw new Error('Failed to access or initialize stock history');

  // 2. Update with closing stock and real submitter name
  const { data: updated, error: updateError } = await supabase
    .from('stock_history')
    .update({
      closing_stock: closingStock,
      added_by: submittedBy || 'Cashier (Closing)'
    })
    .eq('id', history.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // 3. Sync branch_stock to physical count
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

  return updated;
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

export const transferStock = async (fromBranchId, toBranchId, productId, quantity, transferredBy, notes = '') => {
  quantity = parseFloat(quantity);
  if (quantity <= 0) throw new Error('Transfer quantity must be greater than 0');

  const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const today = getKenyaDate();

  // 1. Get source stock — use maybeSingle so missing row gives null, not an error
  const { data: sourceStock, error: srcErr } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', fromBranchId)
    .eq('product_id', productId)
    .maybeSingle();

  if (srcErr) throw srcErr;
  const fromBefore = parseFloat(sourceStock?.current_stock || 0);
  if (fromBefore < quantity) {
    throw new Error(`Insufficient stock. Available: ${fromBefore}kg, Requested: ${quantity}kg`);
  }

  // 2. Get destination stock
  const { data: destStock } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', toBranchId)
    .eq('product_id', productId)
    .maybeSingle();

  const toBefore = parseFloat(destStock?.current_stock || 0);
  const fromAfter = parseFloat((fromBefore - quantity).toFixed(2));
  const toAfter   = parseFloat((toBefore  + quantity).toFixed(2));

  // 3. Deduct from source
  const { error: sourceError } = await supabase
    .from('branch_stock')
    .update({ current_stock: fromAfter, updated_at: new Date().toISOString() })
    .eq('branch_id', fromBranchId)
    .eq('product_id', productId);
  if (sourceError) throw sourceError;

  // 4. Add to destination
  const { error: destError } = await supabase
    .from('branch_stock')
    .upsert({
      branch_id: toBranchId,
      product_id: productId,
      current_stock: toAfter,
      updated_at: new Date().toISOString()
    }, { onConflict: 'branch_id,product_id' });
  if (destError) throw destError;

  // 5. Write immutable audit record to stock_transfers
  const { data: transferRecord, error: auditError } = await supabase
    .from('stock_transfers')
    .insert({
      product_id: productId,
      from_branch_id: fromBranchId,
      to_branch_id: toBranchId,
      quantity,
      from_stock_before: fromBefore,
      from_stock_after:  fromAfter,
      to_stock_before:   toBefore,
      to_stock_after:    toAfter,
      transferred_by: transferredBy || 'Admin',
      transfer_date: today,
      notes: notes || null,
    })
    .select()
    .single();
  if (auditError) {
    console.error('[transferStock] Audit insert failed (stock already moved):', auditError);
  }

  // 6. Reflect in stock_history — source closing goes down, destination opening goes UP (transfer-in is additive to available stock)
  const [fromHistory, toHistory] = await Promise.all([
    ensureDailyHistory(productId, fromBranchId, today),
    ensureDailyHistory(productId, toBranchId, today),
  ]);

  const historyUpdates = [];
  if (fromHistory) {
    historyUpdates.push(
      supabase.from('stock_history')
        .update({ closing_stock: fromAfter, added_by: `Transfer out → (${transferredBy || 'Admin'})` })
        .eq('id', fromHistory.id)
    );
  }
  if (toHistory) {
    // Transfer-in increases the opening stock — it is new stock arriving at this branch today
    const updatedOpening = parseFloat((parseFloat(toHistory.opening_stock) + quantity).toFixed(2));
    historyUpdates.push(
      supabase.from('stock_history')
        .update({
          opening_stock: updatedOpening,
          closing_stock: toAfter,
          added_by: `Transfer in ← (${transferredBy || 'Admin'})`
        })
        .eq('id', toHistory.id)
    );
  }
  await Promise.all(historyUpdates);

  return { transferRecord, fromBranchId, toBranchId, productId, quantity, fromBefore, fromAfter, toBefore, toAfter };
};

export const getStockTransfers = async (branchId, limit = 50, offset = 0) => {
  let query = supabase
    .from('stock_transfers')
    .select('*', { count: 'exact' })
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (branchId) {
    // Show transfers where this branch was either source or destination
    query = query.or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
};

export const createExternalDispatch = async ({ branchId, productId, clientName, clientType, quantity, pricePerKg, paymentStatus, paymentMethod, notes, dispatchedBy, dispatchDate }) => {
  quantity = parseFloat(quantity);
  pricePerKg = parseFloat(pricePerKg);

  // 1. Validate source stock
  const { data: sourceStock, error: fetchError } = await supabase
    .from('branch_stock')
    .select('current_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .single();

  if (fetchError) throw new Error('Branch stock record not found for this product');
  const available = parseFloat(sourceStock?.current_stock || 0);
  if (available < quantity) {
    throw new Error(`Insufficient stock. Available: ${available}kg, Requested: ${quantity}kg`);
  }

  const totalValue = parseFloat((quantity * pricePerKg).toFixed(2));
  const newStock = parseFloat((available - quantity).toFixed(2));

  // 2. Deduct from branch_stock
  const { error: deductError } = await supabase
    .from('branch_stock')
    .update({ current_stock: newStock, updated_at: new Date().toISOString() })
    .eq('branch_id', branchId)
    .eq('product_id', productId);

  if (deductError) throw deductError;

  // 3. Record the dispatch
  const { data: dispatch, error: insertError } = await supabase
    .from('external_dispatches')
    .insert({
      branch_id: branchId,
      product_id: productId,
      client_name: clientName,
      client_type: clientType,
      quantity,
      price_per_kg: pricePerKg,
      total_value: totalValue,
      payment_status: paymentStatus || 'pending',
      payment_method: paymentMethod || null,
      notes: notes || null,
      dispatched_by: dispatchedBy,
      dispatch_date: dispatchDate,
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // 4. Reflect in stock_history — update today's closing stock
  const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const today = getKenyaDate();

  const history = await ensureDailyHistory(productId, branchId, today);
  if (history) {
    await supabase
      .from('stock_history')
      .update({
        closing_stock: newStock,
        added_by: `External dispatch to ${clientName} (${dispatchedBy})`
      })
      .eq('id', history.id);
  }

  return { ...dispatch, newStock };
};

export const getExternalDispatches = async (branchId, limit = 50, offset = 0) => {
  let query = supabase
    .from('external_dispatches')
    .select('*', { count: 'exact' })
    .order('dispatch_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Only filter by branch when a specific branchId is provided (null = all branches)
  if (branchId && branchId !== 'all') {
    query = query.eq('branch_id', branchId);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
};

export const updateDispatchPayment = async (dispatchId, paymentStatus, paymentMethod) => {
  const { data, error } = await supabase
    .from('external_dispatches')
    .update({ payment_status: paymentStatus, payment_method: paymentMethod })
    .eq('id', dispatchId)
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const getKenyaDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };
  const today = getKenyaDate();

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
