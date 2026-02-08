import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function testAllBranchesData() {
  console.log('Verifying ALL Branches Real Data for Feb 7, 2026\n');
  console.log('='.repeat(80));

  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('*')
    .order('name');

  if (branchError) {
    console.error('Error fetching branches:', branchError);
    return;
  }

  const today = '2026-02-07';

  for (const branch of branches) {
    console.log(`\n📍 ${branch.name} (${branch.location})`);
    console.log('-'.repeat(80));

    // 1. Stock History
    const { data: stockHistory } = await supabase
      .from('stock_history')
      .select('opening_stock, closing_stock, products(name)')
      .eq('branch_id', branch.id)
      .eq('date', today);

    const openingTotal = stockHistory?.reduce((sum, s) => sum + parseFloat(s.opening_stock || 0), 0) || 0;
    const closingTotal = stockHistory?.reduce((sum, s) => sum + parseFloat(s.closing_stock || 0), 0) || 0;

    console.log(`📦 Stock History: ${stockHistory?.length || 0} products`);
    console.log(`   Opening Stock Total: ${openingTotal.toLocaleString()} kg`);
    console.log(`   Closing Stock Total: ${closingTotal.toLocaleString()} kg`);

    // 2. Sales/Transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total, payment_method')
      .eq('branch_id', branch.id)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const salesTotal = transactions?.reduce((sum, t) => sum + parseFloat(t.total || 0), 0) || 0;

    console.log(`💰 Sales/Transactions: ${transactions?.length || 0} transactions`);
    console.log(`   Sales Total: KES ${salesTotal.toLocaleString()}`);
    if (transactions?.length > 0) {
      console.log(`   Sample transactions: ${transactions.slice(0, 3).map(t => `KES ${t.total}`).join(', ')}`);
    }

    // 3. Expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, category')
      .eq('branch_id', branch.id)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const expensesTotal = expenses?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;

    console.log(`💸 Expenses: ${expenses?.length || 0} records`);
    console.log(`   Expense Total: KES ${expensesTotal.toLocaleString()}`);
    
    if (expenses && expenses.length > 0) {
      const byCategory = {};
      expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount || 0);
      });
      console.log('   By Category:');
      Object.entries(byCategory).forEach(([cat, amt]) => {
        console.log(`      ${cat}: KES ${amt.toLocaleString()}`);
      });
    }

    // 4. Staff
    const { count: staffCount } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('branch_id', branch.id);

    console.log(`👥 Staff: ${staffCount} members`);

    // 5. Low Stock Items
    const { data: products } = await supabase.from('products').select('*');
    const lowStockItems = stockHistory?.filter(sh => {
      const product = products.find(p => p.id === sh.product_id);
      if (!product) return false;
      const stockLevel = sh.closing_stock !== null ? sh.closing_stock : sh.opening_stock;
      return stockLevel < product.low_stock_threshold;
    }) || [];

    console.log(`⚠️  Low Stock Items: ${lowStockItems.length}`);
    if (lowStockItems.length > 0) {
      lowStockItems.slice(0, 3).forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        const stockLevel = item.closing_stock !== null ? item.closing_stock : item.opening_stock;
        console.log(`      ${product?.name}: ${stockLevel}kg (threshold: ${product?.low_stock_threshold}kg)`);
      });
    }

    console.log('\n✅ Summary for Card:');
    console.log(`   Sales: KES ${salesTotal.toLocaleString()}`);
    console.log(`   Staff: ${staffCount}`);
    console.log(`   Low Stock: ${lowStockItems.length}`);
    console.log(`   Opening: ${openingTotal.toLocaleString()} kg`);
    console.log(`   Closing: ${closingTotal.toLocaleString()} kg`);
    console.log(`   Expenses: KES ${expensesTotal.toLocaleString()}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
  process.exit(0);
}

testAllBranchesData();
