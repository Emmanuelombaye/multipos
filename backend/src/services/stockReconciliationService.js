import { supabase } from '../db/supabase.js';

/**
 * Daily Stock Reconciliation Service
 * Fixes opening stock discrepancies where:
 * - Opening stock = 0 but live stock > 0
 * - Yesterday's closing stock was NULL (not submitted)
 * 
 * This ensures accountability by syncing opening stock with actual inventory
 */

export const reconcileDailyOpeningStock = async () => {
  const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  
  const today = getKenyaDate();
  
  console.log(`[StockReconciliation] Starting daily reconciliation for ${today}...`);

  try {
    // 1. Get all stock_history records for today with opening_stock = 0
    const { data: historyRecords, error: historyError } = await supabase
      .from('stock_history')
      .select('id, product_id, branch_id, opening_stock, closing_stock')
      .eq('date', today)
      .eq('opening_stock', 0);

    if (historyError) throw historyError;

    if (!historyRecords || historyRecords.length === 0) {
      console.log(`[StockReconciliation] No records with opening_stock=0 found for ${today}`);
      return { reconciled: 0, message: 'No discrepancies found' };
    }

    console.log(`[StockReconciliation] Found ${historyRecords.length} records with opening_stock=0`);

    // 2. For each record, check if live stock > 0
    const reconciliations = [];
    
    for (const record of historyRecords) {
      // Get current live stock
      const { data: liveStock, error: stockError } = await supabase
        .from('branch_stock')
        .select('current_stock')
        .eq('branch_id', record.branch_id)
        .eq('product_id', record.product_id)
        .maybeSingle();

      if (stockError) {
        console.error(`[StockReconciliation] Error fetching live stock for product ${record.product_id}:`, stockError);
        continue;
      }

      const currentStock = parseFloat(liveStock?.current_stock || 0);

      // 3. If live stock > 0, update opening_stock to match
      if (currentStock > 0) {
        const { error: updateError } = await supabase
          .from('stock_history')
          .update({
            opening_stock: currentStock,
            added_by: 'System (Auto-Reconciliation)'
          })
          .eq('id', record.id);

        if (updateError) {
          console.error(`[StockReconciliation] Error updating record ${record.id}:`, updateError);
          continue;
        }

        reconciliations.push({
          historyId: record.id,
          productId: record.product_id,
          branchId: record.branch_id,
          oldOpening: 0,
          newOpening: currentStock
        });

        console.log(`[StockReconciliation] ✅ Reconciled: Product ${record.product_id}, Branch ${record.branch_id}: 0kg → ${currentStock}kg`);
      }
    }

    console.log(`[StockReconciliation] Completed. Reconciled ${reconciliations.length} records.`);
    
    return {
      reconciled: reconciliations.length,
      details: reconciliations,
      message: `Successfully reconciled ${reconciliations.length} opening stock records`
    };

  } catch (error) {
    console.error('[StockReconciliation] Fatal error:', error);
    throw error;
  }
};

/**
 * Reconcile specific branch
 */
export const reconcileBranchOpeningStock = async (branchId) => {
  const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  
  const today = getKenyaDate();
  
  console.log(`[StockReconciliation] Reconciling branch ${branchId} for ${today}...`);

  try {
    const { data: historyRecords, error: historyError } = await supabase
      .from('stock_history')
      .select('id, product_id, branch_id, opening_stock, closing_stock')
      .eq('date', today)
      .eq('branch_id', branchId)
      .eq('opening_stock', 0);

    if (historyError) throw historyError;

    if (!historyRecords || historyRecords.length === 0) {
      return { reconciled: 0, message: 'No discrepancies found for this branch' };
    }

    const reconciliations = [];
    
    for (const record of historyRecords) {
      const { data: liveStock } = await supabase
        .from('branch_stock')
        .select('current_stock')
        .eq('branch_id', record.branch_id)
        .eq('product_id', record.product_id)
        .maybeSingle();

      const currentStock = parseFloat(liveStock?.current_stock || 0);

      if (currentStock > 0) {
        await supabase
          .from('stock_history')
          .update({
            opening_stock: currentStock,
            added_by: 'System (Manual Reconciliation)'
          })
          .eq('id', record.id);

        reconciliations.push({
          productId: record.product_id,
          oldOpening: 0,
          newOpening: currentStock
        });
      }
    }

    return {
      reconciled: reconciliations.length,
      details: reconciliations,
      message: `Reconciled ${reconciliations.length} records for branch ${branchId}`
    };

  } catch (error) {
    console.error(`[StockReconciliation] Error reconciling branch ${branchId}:`, error);
    throw error;
  }
};
