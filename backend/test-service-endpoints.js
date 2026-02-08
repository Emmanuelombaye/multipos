import 'dotenv/config';
import supabase from './src/db/supabase.js';
import branchService from './src/services/branchService.js';
import * as expenseService from './src/services/expenseService.js';
import * as transactionService from './src/services/transactionService.js';
import * as inventoryService from './src/services/inventoryService.js';

async function testEndpoints() {
  const branchId = 'b2f1c741-b8e6-4bd9-8b8a-ebd48be05b13'; // Msabweni
  const date = '2026-02-07';

  console.log('Testing API Endpoints\n');

  try {
    // Test transactions endpoint
    console.log('1. Testing getTransactionsByDateRange:');
    const txs = await transactionService.getTransactionsByDateRange(branchId, date, date);
    console.log(`   Result: ${txs?.length || 0} transactions`);
    if (txs && txs.length > 0) {
      const total = txs.reduce((sum, t) => sum + (t.total || 0), 0);
      console.log(`   Total: KES ${total}`);
      console.log(`   Sample: ${JSON.stringify(txs[0], null, 2)}`);
    }

    // Test expenses endpoint
    console.log('\n2. Testing getExpensesByDateRange:');
    const exps = await expenseService.getExpensesByDateRange(branchId, date, date);
    console.log(`   Result: ${exps?.length || 0} expenses`);
    if (exps && exps.length > 0) {
      const total = exps.reduce((sum, e) => sum + (e.amount || 0), 0);
      console.log(`   Total: KES ${total}`);
      console.log(`   Sample: ${JSON.stringify(exps[0], null, 2)}`);
    }

    // Test stock history endpoint
    console.log('\n3. Testing getStockHistoryByDate:');
    const stocks = await inventoryService.getStockHistoryByDate(branchId, date);
    console.log(`   Result: ${stocks?.length || 0} stock records`);
    if (stocks && stocks.length > 0) {
      const opening = stocks.reduce((sum, s) => sum + parseFloat(s.opening_stock || 0), 0);
      const closing = stocks.reduce((sum, s) => sum + parseFloat(s.closing_stock || 0), 0);
      console.log(`   Opening: ${opening} kg`);
      console.log(`   Closing: ${closing} kg`);
    }

    // Test expense by category endpoint
    console.log('\n4. Testing getExpensesByCategory:');
    const expsByCategory = await expenseService.getExpensesByCategory(branchId, date, date);
    console.log(`   Result:`, expsByCategory);

  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

testEndpoints();
