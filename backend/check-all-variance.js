import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function checkAllBranchStats() {
  const { data: branches } = await supabase.from('branches').select('*');
  
  console.log('=== CHECKING ALL BRANCHES FOR VARIANCE ===\n');
  
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  let totalVariance = 0;

  for (const branch of branches) {
    console.log(`--- ${branch.name} ---`);
    
    // Get stock history (opening stock)
    const { data: history } = await supabase
      .from('stock_history')
      .select('product_id, opening_stock')
      .eq('branch_id', branch.id)
      .eq('date', today);

    // Get live stock
    const { data: stock } = await supabase
      .from('branch_stock')
      .select('product_id, current_stock')
      .eq('branch_id', branch.id);

    // Get stock additions
    const { data: additions } = await supabase
      .from('stock_additions')
      .select('product_id, quantity')
      .eq('branch_id', branch.id)
      .eq('addition_date', today);

    // Get transfers IN
    const { data: transfersIn } = await supabase
      .from('stock_transfers')
      .select('product_id, quantity')
      .eq('to_branch_id', branch.id)
      .eq('transfer_date', today);

    // Get transfers OUT
    const { data: transfersOut } = await supabase
      .from('stock_transfers')
      .select('product_id, quantity')
      .eq('from_branch_id', branch.id)
      .eq('transfer_date', today);

    // Get sales
    const { data: sales } = await supabase
      .from('transaction_items')
      .select('product_id, quantity, transactions!inner(branch_id, created_at)')
      .eq('transactions.branch_id', branch.id)
      .gte('transactions.created_at', `${today} 00:00:00`)
      .lte('transactions.created_at', `${today} 23:59:59`);

    // Get dispatches
    const { data: dispatches } = await supabase
      .from('external_dispatches')
      .select('product_id, quantity')
      .eq('branch_id', branch.id)
      .eq('dispatch_date', today);

    let branchVariance = 0;
    let totalOpening = 0;
    let totalLive = 0;

    if (stock) {
      for (const item of stock) {
        const historyRecord = history?.find(h => h.product_id === item.product_id);
        const opening = historyRecord?.opening_stock || 0;
        
        // Use closing_stock if cashier submitted it (physical count), otherwise use live stock
        const actual = historyRecord?.closing_stock !== null && historyRecord?.closing_stock !== undefined
          ? parseFloat(historyRecord.closing_stock)
          : parseFloat(item.current_stock || 0);
        
        totalOpening += opening;
        totalLive += actual;

        // Calculate expected (WITHOUT additions since they're in opening)
        const transferIn = transfersIn?.filter(t => t.product_id === item.product_id)
          .reduce((sum, t) => sum + parseFloat(t.quantity), 0) || 0;
        
        const transferOut = transfersOut?.filter(t => t.product_id === item.product_id)
          .reduce((sum, t) => sum + parseFloat(t.quantity), 0) || 0;
        
        const dispatched = dispatches?.filter(d => d.product_id === item.product_id)
          .reduce((sum, d) => sum + parseFloat(d.quantity), 0) || 0;
        
        const sold = sales?.filter(s => s.product_id === item.product_id)
          .reduce((sum, s) => sum + parseFloat(s.quantity), 0) || 0;

        const expected = opening + transferIn - sold - transferOut - dispatched;
        const variance = actual - expected;

        if (Math.abs(variance) > 0.1) {
          branchVariance += Math.abs(variance);
        }
      }
    }

    totalVariance += branchVariance;

    console.log(`Opening Stock: ${totalOpening.toFixed(2)} kg`);
    console.log(`Live Stock: ${totalLive.toFixed(2)} kg`);
    console.log(`Variance: ${branchVariance.toFixed(2)} kg`);
    console.log('');
  }

  console.log('=== TOTAL SYSTEM VARIANCE ===');
  console.log(`${totalVariance.toFixed(2)} kg\n`);

  if (totalVariance > 100) {
    console.log('⚠️  HIGH VARIANCE DETECTED!');
    console.log('This could indicate:');
    console.log('- Stock additions being double-counted');
    console.log('- Missing transaction records');
    console.log('- Incorrect opening stock values');
  }

  process.exit(0);
}

checkAllBranchStats();
