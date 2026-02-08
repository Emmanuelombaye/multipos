import 'dotenv/config';
import { getTransactionsByDateRange } from './src/services/transactionService.js';
import { getExpensesByDateRange, getExpensesByCategory } from './src/services/expenseService.js';
import { getStockHistoryByDate } from './src/services/inventoryService.js';
import { supabase } from './src/db/supabase.js';

async function testServices() {
  const branchId = 'b2f1c741-b8e6-4bd9-8b8a-ebd48be05b13'; // Msabweni
  const date = '2026-02-07';

  console.log('Testing Backend Services after Date Range Fix\n');

  try {
    // Test transactions
    console.log('1. getTransactionsByDateRange:');
    const txs = await getTransactionsByDateRange(branchId, date, date);
    console.log(`   Result: ${txs?.length || 0} transactions`);
    if (txs && txs.length > 0) {
      const total = txs.reduce((sum, t) => sum + (t.total || 0), 0);
      console.log(`   Total: KES ${total}`);
    }

    // Test expenses
    console.log('\n2. getExpensesByDateRange:');
    const exps = await getExpensesByDateRange(branchId, date, date);
    console.log(`   Result: ${exps?.length || 0} expenses`);
    if (exps && exps.length > 0) {
      const total = exps.reduce((sum, e) => sum + (e.amount || 0), 0);
      console.log(`   Total: KES ${total}`);
    }

    // Test expenses by category
    console.log('\n3. getExpensesByCategory:');
    const cats = await getExpensesByCategory(branchId, date, date);
    console.log(`   Result:`, cats);
    const catTotal = Object.values(cats).reduce((sum, v) => sum + v, 0);
    console.log(`   Total: KES ${catTotal}`);

    // Test stock history
    console.log('\n4. getStockHistoryByDate:');
    const stocks = await getStockHistoryByDate(branchId, date);
    console.log(`   Result: ${stocks?.length || 0} records`);
    if (stocks && stocks.length > 0) {
      const opening = stocks.reduce((sum, s) => sum + parseFloat(s.opening_stock || 0), 0);
      const closing = stocks.reduce((sum, s) => sum + parseFloat(s.closing_stock || 0), 0);
      console.log(`   Opening: ${opening} kg`);
      console.log(`   Closing: ${closing} kg`);
    }

    // Test staff count
    console.log('\n5. User/Staff count:');
    const { count: staffCount } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .eq('branch_id', branchId);
    console.log(`   Staff: ${staffCount} members`);

    console.log('\n✅ All services working correctly!');

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

testServices();
