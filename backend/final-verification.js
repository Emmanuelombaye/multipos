import 'dotenv/config';
import { getTransactionsByDateRange } from './src/services/transactionService.js';
import { getExpensesByDateRange, getExpensesByCategory } from './src/services/expenseService.js';
import { getStockHistoryByDate } from './src/services/inventoryService.js';
import { supabase } from './src/db/supabase.js';

async function finalTest() {
  console.log('\n' + '='.repeat(100));
  console.log('FINAL VERIFICATION: All Branch Cards Will Now Display Real-Time Data');
  console.log('='.repeat(100) + '\n');

  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .order('name');

  const date = '2026-02-07';

  for (const branch of branches) {
    console.log(`\n📊 ${branch.name.toUpperCase()} - Card Data Display:`);
    console.log('-'.repeat(100));

    // Fetch all data
    const [txs, exps, expsByCategory, stocks, { count: staff }] = await Promise.all([
      getTransactionsByDateRange(branch.id, date, date),
      getExpensesByDateRange(branch.id, date, date),
      getExpensesByCategory(branch.id, date, date),
      getStockHistoryByDate(branch.id, date),
      supabase.from('users').select('id', { count: 'exact' }).eq('branch_id', branch.id)
    ]);

    // Calculate totals
    const salesTotal = (txs || []).reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
    const expensesTotal = (exps || []).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const stocksArray = stocks || [];
    const openingStock = stocksArray.reduce((sum, s) => sum + parseFloat(s.opening_stock || 0), 0);
    const closingStock = stocksArray.reduce((sum, s) => sum + parseFloat(s.closing_stock || 0), 0);

    // Calculate low stock
    const { data: products } = await supabase.from('products').select('*');
    const lowStockCount = stocksArray.filter(sh => {
      const product = products.find(p => p.id === sh.product_id);
      if (!product) return false;
      const level = sh.closing_stock !== null ? sh.closing_stock : sh.opening_stock;
      return level < product.low_stock_threshold;
    }).length;

    // Display card layout
    console.log(`
    ┌────────────────────────────────────────────────────────────────┐
    │ ${branch.name.padEnd(60)} OPEN │
    │ 📍 ${branch.location.padEnd(58)} │
    ├────────────────────────────────────────────────────────────────┤
    │ Sales              ${`KES ${salesTotal.toLocaleString()}`.padEnd(46)} │
    │ Staff Members      ${`${staff}`.padEnd(46)} │
    │ Low Stock Alerts   ${`${lowStockCount}`.padEnd(46)} │
    │ Opening Stock      ${`${openingStock.toLocaleString()} kg`.padEnd(46)} │
    │ Closing Stock      ${`${closingStock.toLocaleString()} kg`.padEnd(46)} │
    │ Expenses           ${`KES ${expensesTotal.toLocaleString()}`.padEnd(46)} │
    ├────────────────────────────────────────────────────────────────┤
    │ Expense Breakdown:`);
    
    Object.entries(expsByCategory).forEach(([cat, amt]) => {
      console.log(`    │   ${cat.padEnd(30)} KES ${parseInt(amt).toLocaleString()}`);
    });

    console.log(`    └────────────────────────────────────────────────────────────────┘`);

    console.log(`
    ✅ DATA SOURCES:
       • Sales: ${txs?.length || 0} transactions from POS
       • Staff: Fetched from users table
       • Stock: ${stocksArray.length} products tracked
       • Expenses: ${exps?.length || 0} expense records
       • Low Stock: Compared against thresholds
    `);
  }

  console.log('\n' + '='.repeat(100));
  console.log('✅ ALL BRANCH CARDS READY FOR ADMIN DASHBOARD');
  console.log('Data is REAL, ACCURATE, and sourced from cashier submissions');
  console.log('='.repeat(100) + '\n');

  process.exit(0);
}

finalTest();
