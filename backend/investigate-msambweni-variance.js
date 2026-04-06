import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function investigateMsambweni() {
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('name', 'Edendrop Msambweni')
    .single();

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  console.log('=== MSAMBWENI DETAILED VARIANCE INVESTIGATION ===');
  console.log(`Date: ${today}\n`);

  const { data: stock } = await supabase
    .from('branch_stock')
    .select('*, products(name, unit)')
    .eq('branch_id', branch.id);

  for (const item of stock) {
    if (item.current_stock === 0) continue; // Skip zero stock items

    console.log(`\n--- ${item.products.name} ---`);
    console.log(`Current Stock: ${item.current_stock} ${item.products.unit}`);

    // Get history
    const { data: history } = await supabase
      .from('stock_history')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('product_id', item.product_id)
      .eq('date', today)
      .maybeSingle();

    const opening = history?.opening_stock || 0;
    console.log(`Opening Stock: ${opening}`);

    // Get all movements
    const { data: additions } = await supabase
      .from('stock_additions')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('product_id', item.product_id)
      .eq('addition_date', today);

    const { data: transfersIn } = await supabase
      .from('stock_transfers')
      .select('*')
      .eq('to_branch_id', branch.id)
      .eq('product_id', item.product_id)
      .eq('transfer_date', today);

    const { data: transfersOut } = await supabase
      .from('stock_transfers')
      .select('*')
      .eq('from_branch_id', branch.id)
      .eq('product_id', item.product_id)
      .eq('transfer_date', today);

    const { data: sales } = await supabase
      .from('transaction_items')
      .select('*, transactions!inner(*)')
      .eq('product_id', item.product_id)
      .eq('transactions.branch_id', branch.id)
      .gte('transactions.created_at', `${today} 00:00:00`)
      .lte('transactions.created_at', `${today} 23:59:59`);

    const { data: dispatches } = await supabase
      .from('external_dispatches')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('product_id', item.product_id)
      .eq('dispatch_date', today);

    const totalAdditions = additions?.reduce((sum, a) => sum + a.quantity, 0) || 0;
    const totalTransfersIn = transfersIn?.reduce((sum, t) => sum + t.quantity, 0) || 0;
    const totalTransfersOut = transfersOut?.reduce((sum, t) => sum + t.quantity, 0) || 0;
    const totalSales = sales?.reduce((sum, s) => sum + s.quantity, 0) || 0;
    const totalDispatches = dispatches?.reduce((sum, d) => sum + d.quantity, 0) || 0;

    console.log(`\nMovements:`);
    console.log(`  Additions: ${totalAdditions} (${additions?.length || 0} records)`);
    console.log(`  Transfers IN: ${totalTransfersIn} (${transfersIn?.length || 0} records)`);
    console.log(`  Transfers OUT: ${totalTransfersOut} (${transfersOut?.length || 0} records)`);
    console.log(`  Sales: ${totalSales} (${sales?.length || 0} records)`);
    console.log(`  Dispatches: ${totalDispatches} (${dispatches?.length || 0} records)`);

    // Expected WITHOUT additions (since they're in opening)
    const expected = opening + totalTransfersIn - totalSales - totalTransfersOut - totalDispatches;
    const variance = item.current_stock - expected;

    console.log(`\nCalculation (additions already in opening):`);
    console.log(`  Expected = ${opening} + ${totalTransfersIn} - ${totalSales} - ${totalTransfersOut} - ${totalDispatches}`);
    console.log(`  Expected = ${expected.toFixed(2)}`);
    console.log(`  Actual = ${item.current_stock}`);
    console.log(`  Variance = ${variance.toFixed(2)} ${item.products.unit}`);

    if (Math.abs(variance) > 0.1) {
      console.log(`  ⚠️  VARIANCE DETECTED!`);
      
      // Check if additions were double-counted
      if (totalAdditions > 0) {
        const expectedWithAdditions = opening + totalAdditions + totalTransfersIn - totalSales - totalTransfersOut - totalDispatches;
        console.log(`\n  DEBUG: If additions were counted separately:`);
        console.log(`    Expected = ${opening} + ${totalAdditions} + ${totalTransfersIn} - ${totalSales} - ${totalTransfersOut} - ${totalDispatches}`);
        console.log(`    Expected = ${expectedWithAdditions.toFixed(2)}`);
        console.log(`    Variance would be = ${(item.current_stock - expectedWithAdditions).toFixed(2)}`);
      }
    }
  }

  process.exit(0);
}

investigateMsambweni();
