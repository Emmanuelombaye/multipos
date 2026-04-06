// ========================================
// COMPREHENSIVE BACKEND FLOW TEST
// Tests: Admin adds stock → Cashier sells → Stock movements → Verify database
// ========================================

import axios from 'axios';

const API_BASE = 'https://multipos.onrender.com/api';

// Test configuration
let adminToken = null;
let cashierToken = null;
let testBranchId = null;
let testProductId = null;
let secondBranchId = null;
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
// SETUP: Get branches and products
// ========================================
async function setup() {
  logSection('SETUP: Get Test Data');
  
  try {
    // Get branches
    const branchesResponse = await axios.get(`${API_BASE}/branches`);
    const branches = branchesResponse.data;
    
    if (branches.length < 2) {
      logTest('Setup - Get Branches', false, 'Need at least 2 branches for transfer tests');
      return false;
    }
    
    testBranchId = branches[0].id;
    secondBranchId = branches[1].id;
    logTest('Setup - Get Branches', true, `Branch 1: ${branches[0].name}, Branch 2: ${branches[1].name}`);
    
    // Get products for first branch
    const productsResponse = await axios.get(`${API_BASE}/products/branch/${testBranchId}`);
    const products = productsResponse.data;
    
    if (products.length === 0) {
      logTest('Setup - Get Products', false, 'No products found');
      return false;
    }
    
    // Find product with stock
    const productWithStock = products.find(p => p.current_stock > 5);
    if (!productWithStock) {
      logTest('Setup - Find Product with Stock', false, 'No products have sufficient stock (need >5kg)');
      return false;
    }
    
    testProductId = productWithStock.id;
    initialStock = productWithStock.current_stock;
    logTest('Setup - Get Products', true, `Testing with: ${productWithStock.name} (${initialStock}${productWithStock.unit})`);
    
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
    const addQuantity = 10; // Add 10kg
    
    // Admin adds stock mid-shift
    const response = await axios.post(`${API_BASE}/inventory/add-stock`, {
      branchId: testBranchId,
      productId: testProductId,
      quantity: addQuantity,
      reason: 'Test: Admin adding stock mid-shift'
    });
    
    if (response.status !== 200 && response.status !== 201) {
      logTest('Admin Add Stock - API Call', false, `Status: ${response.status}`);
      return false;
    }
    
    logTest('Admin Add Stock - API Call', true, `Added ${addQuantity}kg`);
    
    // Wait for database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify stock increased
    const stockResponse = await axios.get(`${API_BASE}/products/branch/${testBranchId}`);
    const updatedProduct = stockResponse.data.find(p => p.id === testProductId);
    
    if (!updatedProduct) {
      logTest('Admin Add Stock - Verify Increase', false, 'Product not found');
      return false;
    }
    
    const expectedStock = initialStock + addQuantity;
    const actualStock = updatedProduct.current_stock;
    
    if (Math.abs(actualStock - expectedStock) < 0.01) {
      logTest('Admin Add Stock - Verify Increase', true, 
        `Stock: ${initialStock}kg → ${actualStock}kg (+${addQuantity}kg)`);
      initialStock = actualStock; // Update for next test
      return true;
    } else {
      logTest('Admin Add Stock - Verify Increase', false, 
        `Expected: ${expectedStock}kg, Got: ${actualStock}kg`);
      return false;
    }
  } catch (error) {
    logTest('Admin Add Stock - API Call', false, error.response?.data?.error || error.message);
    return false;
  }
}

// ========================================
// TEST 2: CASHIER MAKES SALE
// ========================================
async function testCashierSale() {
  logSection('TEST 2: Cashier Makes Sale (Stock Deduction)');
  
  try {
    const saleQuantity = 3.5; // Sell 3.5kg
    const salePrice = 400;
    
    // Create transaction
    const response = await axios.post(`${API_BASE}/transactions`, {
      branchId: testBranchId,
      userId: 'test-cashier-id',
      items: [
        {
          productId: testProductId,
          quantity: saleQuantity,
          price: salePrice
        }
      ],
      paymentMethod: 'cash',
      totalAmount: saleQuantity * salePrice
    });
    
    if (response.status !== 200 && response.status !== 201) {
      logTest('Cashier Sale - Create Transaction', false, `Status: ${response.status}`);
      return false;
    }
    
    logTest('Cashier Sale - Create Transaction', true, 
      `Sold ${saleQuantity}kg for KES ${saleQuantity * salePrice}`);
    
    // Wait for database to update
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // CRITICAL: Verify stock was deducted
    const stockResponse = await axios.get(`${API_BASE}/products/branch/${testBranchId}`);
    const updatedProduct = stockResponse.data.find(p => p.id === testProductId);
    
    if (!updatedProduct) {
      logTest('Cashier Sale - Verify Stock Deduction', false, 'Product not found');
      return false;
    }
    
    const expectedStock = initialStock - saleQuantity;
    const actualStock = updatedProduct.current_stock;
    
    if (Math.abs(actualStock - expectedStock) < 0.01) {
      logTest('Cashier Sale - Verify Stock Deduction', true, 
        `Stock: ${initialStock}kg → ${actualStock}kg (-${saleQuantity}kg) ✅ CRITICAL TEST PASSED`);
      initialStock = actualStock; // Update for next test
      return true;
    } else {
      logTest('Cashier Sale - Verify Stock Deduction', false, 
        `Expected: ${expectedStock}kg, Got: ${actualStock}kg ⚠️ CRITICAL TEST FAILED`);
      return false;
    }
  } catch (error) {
    logTest('Cashier Sale - Create Transaction', false, error.response?.data?.error || error.message);
    return false;
  }
}

// ========================================
// TEST 3: STOCK TRANSFER REQUEST
// ========================================
async function testStockTransferRequest() {
  logSection('TEST 3: Stock Transfer Request (Branch to Branch)');
  
  try {
    const transferQuantity = 2; // Request 2kg transfer
    
    // Create transfer request
    const response = await axios.post(`${API_BASE}/inventory/transfer-request`, {
      fromBranchId: testBranchId,
      toBranchId: secondBranchId,
      productId: testProductId,
      quantity: transferQuantity,
      notes: 'Test: Transfer request'
    });
    
    if (response.status !== 200 && response.status !== 201) {
      logTest('Transfer Request - Create Request', false, `Status: ${response.status}`);
      return false;
    }
    
    const requestId = response.data.id;
    logTest('Transfer Request - Create Request', true, 
      `Requested ${transferQuantity}kg transfer`);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get pending requests for receiving branch
    const pendingResponse = await axios.get(`${API_BASE}/inventory/transfer-requests/${secondBranchId}`);
    const pendingRequests = pendingResponse.data;
    
    const ourRequest = pendingRequests.find(r => r.id === requestId);
    if (ourRequest && ourRequest.status === 'pending') {
      logTest('Transfer Request - Verify Pending', true, 
        `Request visible in receiving branch (status: ${ourRequest.status})`);
      return true;
    } else {
      logTest('Transfer Request - Verify Pending', false, 
        'Request not found or wrong status');
      return false;
    }
  } catch (error) {
    logTest('Transfer Request - Create Request', false, error.response?.data?.error || error.message);
    return false;
  }
}

// ========================================
// TEST 4: EXTERNAL DISPATCH
// ========================================
async function testExternalDispatch() {
  logSection('TEST 4: External Dispatch (Sell to Customer)');
  
  try {
    const dispatchQuantity = 1.5; // Dispatch 1.5kg
    const pricePerKg = 450;
    
    // Create external dispatch
    const response = await axios.post(`${API_BASE}/inventory/dispatch`, {
      branchId: testBranchId,
      productId: testProductId,
      clientName: 'Test Customer Ltd',
      clientType: 'business',
      quantity: dispatchQuantity,
      pricePerKg: pricePerKg,
      paymentStatus: 'paid',
      paymentMethod: 'mpesa',
      notes: 'Test: External dispatch',
      dispatchDate: new Date().toISOString()
    });
    
    if (response.status !== 200 && response.status !== 201) {
      logTest('External Dispatch - Create Dispatch', false, `Status: ${response.status}`);
      return false;
    }
    
    logTest('External Dispatch - Create Dispatch', true, 
      `Dispatched ${dispatchQuantity}kg to Test Customer Ltd`);
    
    // Wait for database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify stock was deducted
    const stockResponse = await axios.get(`${API_BASE}/products/branch/${testBranchId}`);
    const updatedProduct = stockResponse.data.find(p => p.id === testProductId);
    
    if (!updatedProduct) {
      logTest('External Dispatch - Verify Stock Deduction', false, 'Product not found');
      return false;
    }
    
    const expectedStock = initialStock - dispatchQuantity;
    const actualStock = updatedProduct.current_stock;
    
    if (Math.abs(actualStock - expectedStock) < 0.01) {
      logTest('External Dispatch - Verify Stock Deduction', true, 
        `Stock: ${initialStock}kg → ${actualStock}kg (-${dispatchQuantity}kg)`);
      initialStock = actualStock; // Update for next test
      return true;
    } else {
      logTest('External Dispatch - Verify Stock Deduction', false, 
        `Expected: ${expectedStock}kg, Got: ${actualStock}kg`);
      return false;
    }
  } catch (error) {
    logTest('External Dispatch - Create Dispatch', false, error.response?.data?.error || error.message);
    return false;
  }
}

// ========================================
// TEST 5: VERIFY STOCK HISTORY
// ========================================
async function testStockHistory() {
  logSection('TEST 5: Verify Stock History Records');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's stock history
    const response = await axios.get(`${API_BASE}/inventory/history/${testBranchId}/${today}`);
    const history = response.data;
    
    if (history.length === 0) {
      logTest('Stock History - Get Records', false, 'No stock history found for today');
      return false;
    }
    
    logTest('Stock History - Get Records', true, 
      `Found ${history.length} products in today's history`);
    
    // Find our test product
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
    logTest('Stock History - Get Records', false, error.response?.data?.error || error.message);
    return false;
  }
}

// ========================================
// TEST 6: VERIFY STOCK ADDITIONS LOG
// ========================================
async function testStockAdditionsLog() {
  logSection('TEST 6: Verify Stock Additions Are Logged');
  
  try {
    // Get stock additions for branch
    const response = await axios.get(`${API_BASE}/inventory/additions/${testBranchId}?limit=10`);
    const additions = response.data;
    
    if (additions.length === 0) {
      logTest('Stock Additions Log - Get Records', false, 'No stock additions found');
      return false;
    }
    
    logTest('Stock Additions Log - Get Records', true, 
      `Found ${additions.length} stock addition records`);
    
    // Check if our test addition is there
    const recentAddition = additions.find(a => 
      a.product_id === testProductId && 
      a.reason && 
      a.reason.includes('Test: Admin adding stock')
    );
    
    if (recentAddition) {
      logTest('Stock Additions Log - Test Addition Logged', true, 
        `Found our test addition: +${recentAddition.quantity}kg`);
      return true;
    } else {
      logTest('Stock Additions Log - Test Addition Logged', false, 
        'Our test addition not found in logs');
      return false;
    }
  } catch (error) {
    logTest('Stock Additions Log - Get Records', false, error.response?.data?.error || error.message);
    return false;
  }
}

// ========================================
// TEST 7: VERIFY EXTERNAL DISPATCHES LOG
// ========================================
async function testExternalDispatchesLog() {
  logSection('TEST 7: Verify External Dispatches Are Logged');
  
  try {
    // Get external dispatches for branch
    const response = await axios.get(`${API_BASE}/inventory/dispatches/${testBranchId}?limit=10`);
    const dispatches = response.data;
    
    if (dispatches.length === 0) {
      logTest('External Dispatches Log - Get Records', false, 'No dispatches found');
      return false;
    }
    
    logTest('External Dispatches Log - Get Records', true, 
      `Found ${dispatches.length} dispatch records`);
    
    // Check if our test dispatch is there
    const recentDispatch = dispatches.find(d => 
      d.product_id === testProductId && 
      d.client_name === 'Test Customer Ltd'
    );
    
    if (recentDispatch) {
      logTest('External Dispatches Log - Test Dispatch Logged', true, 
        `Found our test dispatch: ${recentDispatch.quantity}kg to ${recentDispatch.client_name}`);
      return true;
    } else {
      logTest('External Dispatches Log - Test Dispatch Logged', false, 
        'Our test dispatch not found in logs');
      return false;
    }
  } catch (error) {
    logTest('External Dispatches Log - Get Records', false, error.response?.data?.error || error.message);
    return false;
  }
}

// ========================================
// TEST 8: FINAL STOCK VERIFICATION
// ========================================
async function testFinalStockVerification() {
  logSection('TEST 8: Final Stock Verification');
  
  try {
    // Get current stock
    const response = await axios.get(`${API_BASE}/products/branch/${testBranchId}`);
    const product = response.data.find(p => p.id === testProductId);
    
    if (!product) {
      logTest('Final Verification - Get Current Stock', false, 'Product not found');
      return false;
    }
    
    logTest('Final Verification - Get Current Stock', true, 
      `Final stock: ${product.current_stock}kg`);
    
    // Verify it matches our tracked value
    if (Math.abs(product.current_stock - initialStock) < 0.01) {
      logTest('Final Verification - Stock Matches Tracked Value', true, 
        `✅ All stock movements tracked correctly!`);
      return true;
    } else {
      logTest('Final Verification - Stock Matches Tracked Value', false, 
        `Mismatch: Expected ${initialStock}kg, Got ${product.current_stock}kg`);
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
  console.log('🚀 COMPREHENSIVE BACKEND FLOW TEST');
  console.log('Testing: Admin adds stock → Cashier sells → Stock movements → Verify\n');
  
  const setupSuccess = await setup();
  if (!setupSuccess) {
    console.log('\n❌ Setup failed. Cannot continue tests.');
    process.exit(1);
  }
  
  await testAdminAddStock();
  await testCashierSale(); // CRITICAL TEST
  await testStockTransferRequest();
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
  } else {
    console.log('⚠️  SOME TESTS FAILED! Check issues above.');
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error.message);
  process.exit(1);
});
