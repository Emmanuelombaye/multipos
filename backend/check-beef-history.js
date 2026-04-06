import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function checkBeefHistory() {
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

  console.log('=== BEEF STOCK HISTORY AT MSAMBWENI ===\n');

  const { data: history } = await supabase
    .from('stock_history')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('product_id', beef.id)
    .order('date', { ascending: true });

  history?.forEach(h => {
    console.log(`Date: ${h.date}`);
    console.log(`Movement Type: ${h.movement_type}`);
    console.log(`Opening Stock: ${h.opening_stock}`);
    console.log(`Quantity: ${h.quantity}`);
    console.log(`Closing Stock: ${h.closing_stock}`);
    console.log(`Notes: ${h.notes || 'N/A'}`);
    console.log('---');
  });

  console.log('\n=== STOCK ADDITIONS ===\n');
  const { data: additions } = await supabase
    .from('stock_additions')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('product_id', beef.id)
    .order('created_at', { ascending: true });

  additions?.forEach(a => {
    console.log(`Date: ${new Date(a.created_at).toLocaleString()}`);
    console.log(`Quantity: ${a.quantity}`);
    console.log(`Reason: ${a.reason}`);
    console.log(`Added by: ${a.added_by_user_id}`);
    console.log('---');
  });

  console.log('\n=== TRANSACTIONS (SALES) ===\n');
  const { data: sales } = await supabase
    .from('transaction_items')
    .select('*, transactions!inner(branch_id, created_at)')
    .eq('product_id', beef.id)
    .eq('transactions.branch_id', branch.id)
    .order('transactions.created_at', { ascending: true });

  sales?.forEach(s => {
    console.log(`Date: ${new Date(s.transactions.created_at).toLocaleString()}`);
    console.log(`Quantity Sold: ${s.quantity}`);
    console.log(`Price: ${s.price_per_unit}`);
    console.log('---');
  });

  process.exit(0);
}

checkBeefHistory();
