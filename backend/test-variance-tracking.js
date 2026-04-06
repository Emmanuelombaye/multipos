import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function comprehensiveVarianceTest() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  console.log('=== COMPREHENSIVE VARIANCE TRACKING TEST ===');
  console.log(`Date: ${today}\n`);

  const { data: branches } = await supabase.from('branches').select('*');

  for (const branch of branches) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BRANCH: ${branch.name}`);
    console.log('='.repeat(60));

    const { data: stock } = await supabase
      .from('branch_stock')
      .select('*, products(name, unit)')
      .eq('branch_id', branch.id);

    const { data: history } = await supabase
      .from('stock_history')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('date', today);

    let branchTotalVariance = 0;

    for (const item of stock) {
      const productHistory = history?.find(h => h.product_id === item.product_id);
      
      if (!productHistory || productHistory.opening_stock === 0) continue;

      console.log(`\n--- ${item.products.name} ---`);
      
      const opening = productHistory.opening_stock || 0;
      const closingStock = productHistory.closing_stock;
      const hasClosing = closingStock !== null && closingStock !== undefined;
      const currentStock = item.current_stock;

      console.log(`Opening Stock: ${opening} ${item.products.unit}`);

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
      if (totalAdditions > 0) console.log(`  + Additions: ${totalAdditions} ${item.products.unit} (${additions.length} records)`);
      if (totalTransfersIn > 0) console.log(`  + Transfers IN: ${totalTransfersIn} ${item.products.unit} (${transfersIn.length} records)`);
      if (totalSales > 0) console.log(`  - Sales: ${totalSales} ${item.products.unit} (${sales.length} records)`);
      if (totalTransfersOut > 0) console.log(`  - Transfers OUT: ${totalTransfersOut} ${item.products.unit} (${transfersOut.length} records)`);
      if (totalDispatches > 0) console.log(`  - Dispatches: ${totalDispatches} ${item.products.unit} (${dispatches.length} records)`);

      // Calculate expected (additions already in opening)
      const expected = opening + totalTransfersIn - totalSales - totalTransfersOut - totalDispatches;

      console.log(`\nCalculation:`);
      console.log(`  Opening: ${opening}`);
      console.log(`  + Transfers IN: ${totalTransfersIn}`);
      console.log(`  - Sales: ${totalSales}`);
      console.log(`  - Transfers OUT: ${totalTransfersOut}`);
      console.log(`  - Dispatches: ${totalDispatches}`);
      console.log(`  = Expected: ${expected.toFixed(2)} ${item.products.unit}`);

      console.log(`\nActual Stock:`);
      console.log(`  System: ${currentStock} ${item.products.unit}`);
      if (hasClosing) {
        console.log(`  Cashier Counted: ${closingStock} ${item.products.unit}`);
      } else {
        console.log(`  Cashier Counted: Not submitted yet`);
      }

      let variance = 0;
      if (hasClosing) {
        // Variance = physical count vs system
        variance = closingStock - currentStock;
        console.log(`\nVariance (Cashier vs System): ${variance.toFixed(2)} ${item.products.unit}`);
        if (Math.abs(variance) < 0.1) {
          console.log(`✅ No variance - cashier count matches system`);
        } else {
          console.log(`⚠️  VARIANCE DETECTED - data entry error or system bug`);
        }
      } else {
        // Variance = system vs expected
        variance = currentStock - expected;
        console.log(`\nVariance (System vs Expected): ${variance.toFixed(2)} ${item.products.unit}`);
        if (Math.abs(variance) < 0.1) {
          console.log(`✅ No variance - all movements tracked correctly`);
        } else {
          console.log(`⚠️  VARIANCE DETECTED - unrecorded movement or calculation error`);
        }
      }

      if (Math.abs(variance) > 0.1) {
        branchTotalVariance += Math.abs(variance);
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`BRANCH TOTAL VARIANCE: ${branchTotalVariance.toFixed(2)} kg`);
    if (branchTotalVariance < 0.1) {
      console.log(`✅ All stock movements properly tracked!`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));

  process.exit(0);
}

comprehensiveVarianceTest();
