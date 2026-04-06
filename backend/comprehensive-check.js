import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function comprehensiveCheck() {
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('name', 'Edendrop Msambweni')
    .single();

  const { data: beef } = await supabase
    .from('products')
    .select('*')
    .eq('name', 'Beef')
    .single();

  console.log('=== COMPREHENSIVE BEEF MOVEMENT CHECK - MSAMBWENI ===\n');
  console.log(`Branch ID: ${branch.id}`);
  console.log(`Product ID: ${beef.id}\n`);

  // Current stock
  const { data: stock } = await supabase
    .from('branch_stock')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('product_id', beef.id)
    .single();
  
  console.log(`CURRENT STOCK: ${stock.current_stock} kg\n`);

  // Stock History
  console.log('=== STOCK HISTORY ===');
  const { data: history } = await supabase
    .from('stock_history')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('product_id', beef.id)
    .order('date', { ascending: true });
  
  console.log(`Records: ${history?.length || 0}`);
  history?.forEach(h => {
    console.log(`  ${h.date} | Type: ${h.movement_type} | Opening: ${h.opening_stock} | Qty: ${h.quantity} | Closing: ${h.closing_stock}`);
  });

  // Stock Additions
  console.log('\n=== STOCK ADDITIONS ===');
  const { data: additions } = await supabase
    .from('stock_additions')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('product_id', beef.id);
  
  console.log(`Records: ${additions?.length || 0}`);
  let totalAdditions = 0;
  additions?.forEach(a => {
    console.log(`  ${new Date(a.created_at).toLocaleString()} | +${a.quantity} kg | Reason: ${a.reason}`);
    totalAdditions += a.quantity;
  });
  console.log(`TOTAL ADDITIONS: +${totalAdditions} kg`);

  // Transfers OUT (from Msambweni)
  console.log('\n=== TRANSFERS OUT (From Msambweni) ===');
  const { data: transfersOut } = await supabase
    .from('stock_transfers')
    .select('*, to_branch:branches!stock_transfers_to_branch_id_fkey(name)')
    .eq('from_branch_id', branch.id)
    .eq('product_id', beef.id);
  
  console.log(`Records: ${transfersOut?.length || 0}`);
  let totalTransfersOut = 0;
  transfersOut?.forEach(t => {
    console.log(`  ${new Date(t.created_at).toLocaleString()} | -${t.quantity} kg | To: ${t.to_branch?.name} | Status: ${t.status}`);
    if (t.status === 'completed') totalTransfersOut += t.quantity;
  });
  console.log(`TOTAL TRANSFERS OUT (completed): -${totalTransfersOut} kg`);

  // Transfers IN (to Msambweni)
  console.log('\n=== TRANSFERS IN (To Msambweni) ===');
  const { data: transfersIn } = await supabase
    .from('stock_transfers')
    .select('*, from_branch:branches!stock_transfers_from_branch_id_fkey(name)')
    .eq('to_branch_id', branch.id)
    .eq('product_id', beef.id);
  
  console.log(`Records: ${transfersIn?.length || 0}`);
  let totalTransfersIn = 0;
  transfersIn?.forEach(t => {
    console.log(`  ${new Date(t.created_at).toLocaleString()} | +${t.quantity} kg | From: ${t.from_branch?.name} | Status: ${t.status}`);
    if (t.status === 'completed') totalTransfersIn += t.quantity;
  });
  console.log(`TOTAL TRANSFERS IN (completed): +${totalTransfersIn} kg`);

  // External Dispatches
  console.log('\n=== EXTERNAL DISPATCHES ===');
  const { data: dispatches } = await supabase
    .from('external_dispatches')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('product_id', beef.id);
  
  console.log(`Records: ${dispatches?.length || 0}`);
  let totalDispatches = 0;
  dispatches?.forEach(d => {
    console.log(`  ${new Date(d.created_at).toLocaleString()} | -${d.quantity} kg | To: ${d.destination} | Reason: ${d.reason}`);
    totalDispatches += d.quantity;
  });
  console.log(`TOTAL DISPATCHES: -${totalDispatches} kg`);

  // Sales (Transactions)
  console.log('\n=== SALES (Transactions) ===');
  const { data: sales } = await supabase
    .from('transaction_items')
    .select('*, transactions!inner(created_at, payment_method)')
    .eq('product_id', beef.id)
    .eq('transactions.branch_id', branch.id);
  
  console.log(`Records: ${sales?.length || 0}`);
  let totalSales = 0;
  sales?.forEach(s => {
    console.log(`  ${new Date(s.transactions.created_at).toLocaleString()} | -${s.quantity} kg | Price: ${s.price_per_kg} | Method: ${s.transactions.payment_method}`);
    totalSales += s.quantity;
  });
  console.log(`TOTAL SALES: -${totalSales} kg`);

  // Calculate Expected Stock
  console.log('\n=== CALCULATION ===');
  const openingStock = history?.[0]?.opening_stock || 0;
  console.log(`Opening Stock: ${openingStock} kg`);
  console.log(`+ Additions: ${totalAdditions} kg`);
  console.log(`+ Transfers IN: ${totalTransfersIn} kg`);
  console.log(`- Transfers OUT: ${totalTransfersOut} kg`);
  console.log(`- Sales: ${totalSales} kg`);
  console.log(`- Dispatches: ${totalDispatches} kg`);
  
  const expectedStock = openingStock + totalAdditions + totalTransfersIn - totalTransfersOut - totalSales - totalDispatches;
  console.log(`\nEXPECTED STOCK: ${expectedStock.toFixed(2)} kg`);
  console.log(`ACTUAL STOCK: ${stock.current_stock} kg`);
  console.log(`VARIANCE: ${(stock.current_stock - expectedStock).toFixed(2)} kg`);

  process.exit(0);
}

comprehensiveCheck();
