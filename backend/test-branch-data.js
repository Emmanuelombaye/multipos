import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function testBranchData() {
  const branchId = '092f7071-d8c2-4f4f-baa0-7c4879968374'; // Tamasha
  const today = '2026-02-07';

  console.log('Testing Branch Data APIs for Tamasha...\n');

  // 1. Check stock history for today
  console.log('1. Stock History:');
  const { data: stockHistory, error: stockError } = await supabase
    .from('stock_history')
    .select('*, products(name)')
    .eq('branch_id', branchId)
    .eq('date', today);

  if (stockError) {
    console.error('Stock history error:', stockError);
  } else {
    console.log(`   Found ${stockHistory.length} records`);
    if (stockHistory.length > 0) {
      const openingTotal = stockHistory.reduce((sum, s) => sum + parseFloat(s.opening_stock || 0), 0);
      const closingTotal = stockHistory.reduce((sum, s) => sum + parseFloat(s.closing_stock || 0), 0);
      console.log(`   Opening Stock Total: ${openingTotal} kg`);
      console.log(`   Closing Stock Total: ${closingTotal} kg`);
      console.log(`   Sample: ${stockHistory[0].products.name} - Opening: ${stockHistory[0].opening_stock}, Closing: ${stockHistory[0].closing_stock}`);
    }
  }

  // 2. Check transactions for today
  console.log('\n2. Transactions:');
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('total')
    .eq('branch_id', branchId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  if (txError) {
    console.error('Transaction error:', txError);
  } else {
    console.log(`   Found ${transactions.length} transactions`);
    const salesTotal = transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
    console.log(`   Sales Total: KES ${salesTotal.toLocaleString()}`);
  }

  // 3. Check expenses for today
  console.log('\n3. Expenses:');
  const { data: expenses, error: expError } = await supabase
    .from('expenses')
    .select('amount, category')
    .eq('branch_id', branchId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  if (expError) {
    console.error('Expense error:', expError);
  } else {
    console.log(`   Found ${expenses.length} expenses`);
    const expenseTotal = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    console.log(`   Expense Total: KES ${expenseTotal.toLocaleString()}`);
    
    // Group by category
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount || 0);
    });
    console.log('   By Category:');
    Object.entries(byCategory).forEach(([cat, amt]) => {
      console.log(`      ${cat}: KES ${amt.toLocaleString()}`);
    });
  }

  // 4. Check staff count
  console.log('\n4. Staff:');
  const { count: staffCount, error: staffError } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('branch_id', branchId);

  if (staffError) {
    console.error('Staff error:', staffError);
  } else {
    console.log(`   Staff Count: ${staffCount}`);
  }

  // 5. Check low stock items
  console.log('\n5. Low Stock Items:');
  const { data: products } = await supabase.from('products').select('*');
  const lowStockItems = stockHistory.filter(sh => {
    const product = products.find(p => p.id === sh.product_id);
    if (!product) return false;
    const stockLevel = sh.closing_stock !== null ? sh.closing_stock : sh.opening_stock;
    return stockLevel < product.low_stock_threshold;
  });
  console.log(`   Low Stock Count: ${lowStockItems.length}`);
  if (lowStockItems.length > 0) {
    lowStockItems.slice(0, 3).forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      const stockLevel = item.closing_stock !== null ? item.closing_stock : item.opening_stock;
      console.log(`      ${product.name}: ${stockLevel}kg (threshold: ${product.low_stock_threshold}kg)`);
    });
  }

  process.exit(0);
}

testBranchData();
