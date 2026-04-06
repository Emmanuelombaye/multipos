import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function checkMsambweni() {
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('name', 'Edendrop Msambweni')
    .single();

  console.log('=== MSAMBWENI BRANCH ===');
  console.log(JSON.stringify(branch, null, 2));

  const { data: stock } = await supabase
    .from('branch_stock')
    .select('*, products(name, unit)')
    .eq('branch_id', branch.id);

  console.log('\n=== CURRENT STOCK ===');
  stock.forEach(s => {
    console.log(`${s.products.name}: ${s.current_stock} ${s.products.unit}`);
  });

  const { data: history } = await supabase
    .from('stock_history')
    .select('*')
    .eq('branch_id', branch.id)
    .order('date', { ascending: false })
    .limit(10);

  console.log('\n=== RECENT STOCK HISTORY ===');
  history.forEach(h => {
    console.log(`${h.date} | ${h.movement_type} | Product: ${h.product_id} | Qty: ${h.quantity}`);
  });

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, transaction_items(*)')
    .eq('branch_id', branch.id)
    .order('created_at', { ascending: false });

  console.log('\n=== TRANSACTIONS ===');
  transactions.forEach(t => {
    console.log(`\nTransaction ${t.id} - ${new Date(t.created_at).toLocaleString()}`);
    console.log(`Total: KES ${t.total_amount}`);
    t.transaction_items.forEach(item => {
      console.log(`  - Product ${item.product_id}: ${item.quantity} @ ${item.price_per_unit}`);
    });
  });

  process.exit(0);
}

checkMsambweni();
