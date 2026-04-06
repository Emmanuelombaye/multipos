// ========================================
// DIRECT DATABASE FLOW TEST
// Bypasses API authentication, tests database directly
// ========================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let testBranchId = null;
let testProductId = null;
let initialStock = 0;

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
  } else {
    results.failed++;
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 ${title}`);
  console.log('='.repeat(60));
}

// ========================================
// TEST 0: VERIFY SQL FUNCTION EXISTS
// ========================================
async function testSQLFunctionExists() {
  logSection('TEST 0: Verify reduce_branch_stock Function Exists');
  
  try {
    const { data, error } = await supabase.rpc('reduce_branch_stock', {
      p_branch_id: '00000000-0000-0000-0000-000000000000',
      p_product_id: '00000000-0000-0000-0000-000000000000',
      p_quantity: 0
    });
    
    // Function exists if we don't get "function does not exist" error
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      logTest('SQL Function - reduce_branch_stock Exists', false, 
        '⚠️ CRITICAL: Function does not exist! Run fix_stock_deduction.sql in Supabase');
      return false;
    }
    
    logTest('SQL Function - reduce_branch_stock Exists', true, 
      '✅ Function exists and is callable');
    return true;
  } catch (error) {
    logTest('SQL Function - reduce_branch_stock Exists', false, error.message);
    return false;
  }
}

// ========================================
// SETUP: Get test data
// ========================================
async function setup() {
  logSection('SETUP: Get Test Data');
  
  try {
    // Get branches
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*')
      .limit(1);
    
    if (branchError) throw branchError;
    
    if (!branches || branches.length === 0) {
      logTest('Setup - Get Branch', false, 'No branches found');
      return false;
    }
    
    testBranchId = branches[0].id;
    logTest('Setup - Get Branch', true, `Testing with: ${branches[0].name}`);
    
    // Get products with stock - try different branch if needed
    let { data: products, error: productError } = await supabase
      .from('branch_stock')
      .select(`
        *,
        products (id, name)
      `)
      .eq('branch_id', testBranchId)
      .gt('current_stock', 0)
      .limit(1);
    
    if (productError) throw productError;
    
    // If no products in first branch, try another branch
    if (!products || products.length === 0) {
      const { data: allBranches } = await supabase
        .from('branches')
        .select('*')
        .limit(3);
      
      for (const branch of allBranches) {
        const { data: branchProducts } = await supabase
          .from('branch_stock')
          .select(`
            *,
            products (id, name)
          `)
          .eq('branch_id', branch.id)
          .gt('current_stock', 0)
          .limit(1);
        
        if (branchProducts && branchProducts.length > 0) {
          products = branchProducts;
          testBranchId = branch.id;
          logTest('Setup - Switch Branch', true, `Switched to: ${branch.name}`);
          break;
        }
      }
    }
    
    if (!products || products.length === 0) {
      logTest('Setup - Get Product', false, 'No products with sufficient stock found');
      return false;
    }
    
    testProductId = products[0].product_id;
    initialStock = products[0].current_stock;
    logTest('Setup - Get Product', true, 
      `Testing with: ${products[0].products.name} (${initialStock}kg)`);
    
    return true;
  } catch (error) {
    logTest('Setup - Get Test Data', false, error.message);
    return false;
  }
}

// ========================================
// TEST 1: ADMIN ADDS STOCK
// ========================================
async function testAdminAddStock() {
  logSection('TEST 1: Admin Adds Stock Mid-Shift');
  
  try {
    const addQuantity = 5;
    
    // Insert stock addition record
    const { data: addition, error: addError } = await supabase
      .from('stock_additions')
      .insert({
        branch_id: testBranchId,
        product_id: testProductId,
        quantity: addQuantity,
        reason: 'Test: Admin adding stock',
        added_by: 'Test Script'
      })
      .select()
      .single();
    
    if (addError) throw addError;
    
    logTest('Admin Add Stock - Insert Record', true, `Added ${addQuantity}kg`);
    
    // Update branch_stock
    const { error: updateError } = await supabase
      .from('branch_stock')
      .update({ 
        current_stock: initialStock + addQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('branch_id', testBranchId)
      .eq('product_id', testProductId);
    
    if (updateError) throw updateError;
    
    // Verify stock increased
    const { data: updated, error: verifyError } = await supabase
      .from('branch_stock')
      .select('current_stock')
      .eq('branch_id', testBranchId)
      .eq('product_id', testProductId)
      .single();
    
    if (verifyError) throw verifyError;
    
    const expectedStock = initialStock + addQuantity;
    if (Math.abs(updated.current_stock - expectedStock) < 0.01) {
      logTest('Admin Add Stock - Verify Increase', true, 
        `Stock: ${initialStock}kg → ${updated.current_stock}kg (+${addQuantity}kg)`);
      initialStock = updated.current_stock;
      return true;
    } else {
      logTest('Admin Add Stock - Verify Increase', false, 
        `Expected: ${expectedStock}kg, Got: ${updated.current_stock}kg`);
      return false;
    }
  } catch (error) {
    logTest('Admin Add Stock - Insert Record', false, error.message);
    return false;
  }
}

// ========================================
// TEST 2: CASHIER SALE (USING SQL FUNCTION)
// ========================================
async function testCashierSaleWithFunction() {
  logSection('TEST 2: Cashier Sale Using reduce_branch_stock Function (CRITICAL)');
  
  try {
    const saleQuantity = 3.5;
    
    // Call the reduce_branch_stock function
    const { error: reduceError } = await supabase.rpc('reduce_branch_stock', {
      p_branch_id: testBranchId,
      p_product_id: testProductId,
      p_quantity: saleQuantity
    });
    
    if (reduceError) throw reduceError;
    
    logTest('Cashier Sale - Call reduce_branch_stock', true, 
      `Called function to reduce ${saleQuantity}kg`);
    
    // Verify stock was deducted
    const { data: updated, error: verifyError } = await supabase
      .from('branch_stock')
      .select('current_stock')
      .eq('branch_id', testBranchId)
      .eq('product_id', testProductId)
      .single();
    
    if (verifyError) throw verifyError;
    
    const expectedStock = initialStock - saleQuantity;
    if (Math.abs(updated.current_stock - expectedStock) < 0.01) {
      logTest('Cashier Sale - Verify Stock Deduction', true, 
        `Stock: ${initialStock}kg → ${updated.current_stock}kg (-${saleQuantity}kg) ✅ CRITICAL TEST PASSED`);
      initialStock = updated.current_stock;
      return true;
    } else {
      logTest('Cashier Sale - Verify Stock Deduction', false, 
        `Expected: ${expectedStock}kg, Got: ${updated.current_stock}kg ⚠️ CRITICAL TEST FAILED`);
      return false;
    }
  } catch (error) {
    logTest('Cashier Sale - Call reduce_branch_stock', false, error.message);
    return false;
  }
}

// ========================================
// TEST 3: EXTERNAL DISPATCH
// ========================================
async function testExternalDispatch() {
  logSection('TEST 3: External Dispatch (Sell to Customer)');
  
  try {
    const dispatchQuantity = 2;
    const pricePerKg = 450;
    
    // Create external dispatch
    const { data: dispatch, error: dispatchError } = await supabase
      .from('external_dispatches')
      .insert({
        branch_id: testBranchId,
        product_id: testProductId,
        client_name: 'Test Customer Ltd',
        client_type: 'business',
        quantity: dispatchQuantity,
        price_per_kg: pricePerKg,
        total_amount: dispatchQuantity * pricePerKg,
        payment_status: 'paid',
        payment_method: 'mpesa',
        notes: 'Test: External dispatch',
        dispatch_date: new Date().toISOString()
      })
      .select()
      .single();
    
    if (dispatchError) throw dispatchError;
    
    logTest('External Dispatch - Create Record', true, 
      `Dispatched ${dispatchQuantity}kg to Test Customer Ltd`);
    
    // Reduce stock using function
    const { error: reduceError } = await supabase.rpc('reduce_branch_stock', {
      p_branch_id: testBranchId,
      p_product_id: testProductId,
      p_quantity: dispatchQuantity
    });
    
    if (reduceError) throw reduceError;
    
    // Verify stock was deducted
    const { data: updated, error: verifyError } = await supabase
      .from('branch_stock')
      .select('current_stock')
      .eq('branch_id', testBranchId)
      .eq('product_id', testProductId)
      .single();
    
    if (verifyError) throw verifyError;
    
    const expectedStock = initialStock - dispatchQuantity;
    if (Math.abs(updated.current_stock - expectedStock) < 0.01) {
      logTest('External Dispatch - Verify Stock Deduction', true, 
        `Stock: ${initialStock}kg → ${updated.current_stock}kg (-${dispatchQuantity}kg)`);
      initialStock = updated.current_stock;
      return true;
    } else {
      logTest('External Dispatch - Verify Stock Deduction', false, 
        `Expected: ${expectedStock}kg, Got: ${updated.current_stock}kg`);
      return false;
    }
  } catch (error) {
    logTest('External Dispatch - Create Record', false, error.message);
    return false;
  }
}

// ========================================
// TEST 4: VERIFY STOCK HISTORY
// ========================================
async function testStockHistory() {
  logSection('TEST 4: Verify Stock History Records');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: history, error } = await supabase
      .from('stock_history')
      .select('*')
      .eq('branch_id', testBranchId)
      .eq('date', today);
    
    if (error) throw error;
    
    if (!history || history.length === 0) {
      logTest('Stock History - Get Records', false, 'No stock history found for today');
      return false;
    }
    
    logTest('Stock History - Get Records', true, 
      `Found ${history.length} products in today's history`);
    
    const productHistory = history.find(h => h.product_id === testProductId);
    if (productHistory) {
      logTest('Stock History - Test Product Exists', true, 
        `Opening: ${productHistory.opening_stock || 'NULL'}, Closing: ${productHistory.closing_stock || 'NULL'}`);
      return true;
    } else {
      logTest('Stock History - Test Product Exists', false, 
        'Test product not found in history');
      return false;
    }
  } catch (error) {
    logTest('Stock History - Get Records', false, error.message);
    return false;
  }
}

// ========================================
// TEST 5: VERIFY STOCK ADDITIONS LOG
// ========================================
async function testStockAdditionsLog() {
  logSection('TEST 5: Verify Stock Additions Are Logged');
  
  try {
    const { data: additions, error } = await supabase
      .from('stock_additions')
      .select('*')
      .eq('branch_id', testBranchId)
      .eq('product_id', testProductId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    if (!additions || additions.length === 0) {
      logTest('Stock Additions Log - Get Records', false, 'No stock additions found');
      return false;
    }
    
    logTest('Stock Additions Log - Get Records', true, 
      `Found ${additions.length} stock addition records`);
    
    const testAddition = additions.find(a => 
      a.reason && a.reason.includes('Test: Admin adding stock')
    );
    
    if (testAddition) {
      logTest('Stock Additions Log - Test Addition Logged', true, 
        `Found our test addition: +${testAddition.quantity}kg`);
      return true;
    } else {
      logTest('Stock Additions Log - Test Addition Logged', false, 
        'Our test addition not found in logs');
      return false;
    }
  } catch (error) {
    logTest('Stock Additions Log - Get Records', false, error.message);
    return false;
  }
}

// ========================================
// TEST 6: VERIFY EXTERNAL DISPATCHES LOG
// ========================================
async function testExternalDispatchesLog() {
  logSection('TEST 6: Verify External Dispatches Are Logged');
  
  try {
    const { data: dispatches, error } = await supabase
      .from('external_dispatches')
      .select('*')
      .eq('branch_id', testBranchId)
      .eq('product_id', testProductId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    if (!dispatches || dispatches.length === 0) {
      logTest('External Dispatches Log - Get Records', false, 'No dispatches found');
      return false;
    }
    
    logTest('External Dispatches Log - Get Records', true, 
      `Found ${dispatches.length} dispatch records`);
    
    const testDispatch = dispatches.find(d => 
      d.client_name === 'Test Customer Ltd'
    );
    
    if (testDispatch) {
      logTest('External Dispatches Log - Test Dispatch Logged', true, 
        `Found our test dispatch: ${testDispatch.quantity}kg to ${testDispatch.client_name}`);
      return true;
    } else {
      logTest('External Dispatches Log - Test Dispatch Logged', false, 
        'Our test dispatch not found in logs');
      return false;
    }
  } catch (error) {
    logTest('External Dispatches Log - Get Records', false, error.message);
    return false;
  }
}

// ========================================
// TEST 7: FINAL STOCK VERIFICATION
// ========================================
async function testFinalStockVerification() {
  logSection('TEST 7: Final Stock Verification');
  
  try {
    const { data: stock, error } = await supabase
      .from('branch_stock')
      .select('current_stock')
      .eq('branch_id', testBranchId)
      .eq('product_id', testProductId)
      .single();
    
    if (error) throw error;
    
    logTest('Final Verification - Get Current Stock', true, 
      `Final stock: ${stock.current_stock}kg`);
    
    if (Math.abs(stock.current_stock - initialStock) < 0.01) {
      logTest('Final Verification - Stock Matches Tracked Value', true, 
        `✅ All stock movements tracked correctly!`);
      return true;
    } else {
      logTest('Final Verification - Stock Matches Tracked Value', false, 
        `Mismatch: Expected ${initialStock}kg, Got ${stock.current_stock}kg`);
      return false;
    }
  } catch (error) {
    logTest('Final Verification - Get Current Stock', false, error.message);
    return false;
  }
}

// ========================================
// RUN ALL TESTS
// ========================================
async function runAllTests() {
  console.log('🚀 COMPREHENSIVE DATABASE FLOW TEST');
  console.log('Direct database testing - bypassing API authentication\n');
  
  // CRITICAL: Check if SQL function exists first
  const functionExists = await testSQLFunctionExists();
  if (!functionExists) {
    console.log('\n❌ CRITICAL: reduce_branch_stock function does not exist!');
    console.log('👉 Run this SQL in Supabase: backend/migrations/fix_stock_deduction.sql');
    process.exit(1);
  }
  
  const setupSuccess = await setup();
  if (!setupSuccess) {
    console.log('\n❌ Setup failed. Cannot continue tests.');
    process.exit(1);
  }
  
  await testAdminAddStock();
  await testCashierSaleWithFunction(); // CRITICAL TEST
  await testExternalDispatch();
  await testStockHistory();
  await testStockAdditionsLog();
  await testExternalDispatchesLog();
  await testFinalStockVerification();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Total: ${results.tests.length}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}`);
      if (t.details) console.log(`     ${t.details}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Backend flow is working perfectly.');
    console.log('✅ Stock deduction works correctly');
    console.log('✅ All movements are logged');
    console.log('✅ Database integrity maintained');
  } else {
    console.log('⚠️  SOME TESTS FAILED! Check issues above.');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error.message);
  console.error(error);
  process.exit(1);
});
