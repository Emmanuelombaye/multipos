import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function checkMsambweniVariance() {
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('name', 'Edendrop Msambweni')
    .single();

  console.log('=== MSAMBWENI VARIANCE CHECK ===\n');

  const { data: stock } = await supabase
    .from('branch_stock')
    .select('*, products(name, unit)')
    .eq('branch_id', branch.id);

  for (const item of stock) {
    console.log(`\n--- ${item.products.name} ---`);
    console.log(`Current Stock: ${item.current_stock} ${item.products.unit}`);

    // Get latest stock history for this product
    const { data: history } = await supabase
      .from('stock_history')
      .select('*')
      .eq('branch_id', branch.id)
      .eq('product_id', item.product_id)
      .order('date', { ascending: false })
      .limit(1);

    const openingStock = history?.[0]?.opening_stock || 0;
    console.log(`Opening Stock: ${openingStock}`);

    // Get stock additions
    const { data: additions } = await supabase
      .from('stock_additions')
      .select('quantity')
      .eq('branch_id', branch.id)
      .eq('product_id', item.product_id);
    
    const totalAdditions = additions?.reduce((sum, a) => sum + (a.quantity || 0), 0) || 0;
    console.log(`Stock Additions: ${totalAdditions}`);

    // Get transfers IN
    const { data: transfersIn } = await supabase
      .from('stock_transfers')
      .select('quantity')
      .eq('to_branch_id', branch.id)
      .eq('product_id', item.product_id)
      .eq('status', 'completed');
    
    const totalTransfersIn = transfersIn?.reduce((sum, t) => sum + (t.quantity || 0), 0) || 0;
    console.log(`Transfers IN: ${totalTransfersIn}`);

    // Get transfers OUT
    const { data: transfersOut } = await supabase
      .from('stock_transfers')
      .select('quantity')
      .eq('from_branch_id', branch.id)
      .eq('product_id', item.product_id)
      .eq('status', 'completed');
    
    const totalTransfersOut = transfersOut?.reduce((sum, t) => sum + (t.quantity || 0), 0) || 0;
    console.log(`Transfers OUT: ${totalTransfersOut}`);

    // Get sales
    const { data: sales } = await supabase
      .from('transaction_items')
      .select('quantity, transactions!inner(branch_id)')
      .eq('product_id', item.product_id)
      .eq('transactions.branch_id', branch.id);
    
    const totalSales = sales?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;
    console.log(`Sales: ${totalSales}`);

    // Get external dispatches
    const { data: dispatches } = await supabase
      .from('external_dispatches')
      .select('quantity')
      .eq('branch_id', branch.id)
      .eq('product_id', item.product_id);
    
    const totalDispatches = dispatches?.reduce((sum, d) => sum + (d.quantity || 0), 0) || 0;
    console.log(`External Dispatches: ${totalDispatches}`);

    // Calculate expected stock
    const expectedStock = openingStock + totalAdditions + totalTransfersIn - totalSales - totalTransfersOut - totalDispatches;
    console.log(`\nExpected Stock: ${expectedStock.toFixed(2)}`);
    console.log(`Actual Stock: ${item.current_stock}`);
    
    const variance = item.current_stock - expectedStock;
    console.log(`Variance: ${variance.toFixed(2)} ${item.products.unit}`);
    
    if (Math.abs(variance) > 0.1) {
      console.log(`⚠️  VARIANCE DETECTED!`);
    } else {
      console.log(`✓ Stock matches expected`);
    }
  }

  process.exit(0);
}

checkMsambweniVariance();
