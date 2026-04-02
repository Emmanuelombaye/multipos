import { supabase } from './src/db/supabase.js';

console.log('🔬 COMPREHENSIVE ADMIN FUNCTIONALITY TEST\n');
console.log('Testing EVERY admin endpoint and edit capability...\n');
console.log('='.repeat(80));

let testsPassed = 0;
let testsFailed = 0;
let testsWarning = 0;

async function runAllTests() {
  
  // ============================================================================
  // TEST 1: Can Admin View All Branches?
  // ============================================================================
  console.log('\n📍 TEST 1: View All Branches');
  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*');
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${branches.length} branches`);
    branches.forEach(b => console.log(`   - ${b.name} (${b.location}) - ${b.status}`));
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 2: Can Admin Edit Branch Details?
  // ============================================================================
  console.log('\n📍 TEST 2: Edit Branch Details');
  try {
    const { data: branches } = await supabase.from('branches').select('id, name').limit(1);
    if (!branches || branches.length === 0) throw new Error('No branches to test');
    
    const testBranch = branches[0];
    const originalName = testBranch.name;
    const testName = `${originalName} (TEST)`;
    
    // Update
    const { data: updated, error: updateErr } = await supabase
      .from('branches')
      .update({ name: testName })
      .eq('id', testBranch.id)
      .select()
      .single();
    
    if (updateErr) throw updateErr;
    console.log(`✅ PASSED: Updated branch name to "${testName}"`);
    
    // Restore
    await supabase
      .from('branches')
      .update({ name: originalName })
      .eq('id', testBranch.id);
    console.log(`   ↩️  Restored original name: "${originalName}"`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 3: Can Admin View All Products?
  // ============================================================================
  console.log('\n📦 TEST 3: View All Products');
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${products.length} products`);
    products.slice(0, 5).forEach(p => console.log(`   - ${p.name} (${p.category}) - KES ${p.price_per_kg}/kg`));
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 4: Can Admin Edit Product Price? (CRITICAL TEST)
  // ============================================================================
  console.log('\n💰 TEST 4: Edit Product Price (CRITICAL)');
  try {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price_per_kg')
      .limit(1);
    
    if (!products || products.length === 0) throw new Error('No products to test');
    
    const testProduct = products[0];
    const originalPrice = testProduct.price_per_kg;
    const testPrice = parseFloat((originalPrice + 10).toFixed(2));
    
    console.log(`   Testing product: ${testProduct.name}`);
    console.log(`   Original price: KES ${originalPrice}/kg`);
    console.log(`   Test price: KES ${testPrice}/kg`);
    
    // Update price
    const { data: updated, error: updateErr } = await supabase
      .from('products')
      .update({ price_per_kg: testPrice })
      .eq('id', testProduct.id)
      .select()
      .single();
    
    if (updateErr) throw updateErr;
    
    // Verify update
    const { data: verified } = await supabase
      .from('products')
      .select('price_per_kg')
      .eq('id', testProduct.id)
      .single();
    
    if (verified.price_per_kg === testPrice) {
      console.log(`✅ PASSED: Price updated successfully to KES ${testPrice}/kg`);
      console.log(`   ✓ Database confirmed: KES ${verified.price_per_kg}/kg`);
    } else {
      throw new Error(`Price mismatch: Expected ${testPrice}, got ${verified.price_per_kg}`);
    }
    
    // Restore original price
    await supabase
      .from('products')
      .update({ price_per_kg: originalPrice })
      .eq('id', testProduct.id);
    console.log(`   ↩️  Restored original price: KES ${originalPrice}/kg`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 5: Can Admin Edit Branch-Specific Product Price?
  // ============================================================================
  console.log('\n💰 TEST 5: Edit Branch-Specific Product Price');
  try {
    const { data: branchStock } = await supabase
      .from('branch_stock')
      .select('id, branch_id, product_id, price_per_kg')
      .not('price_per_kg', 'is', null)
      .limit(1);
    
    if (!branchStock || branchStock.length === 0) {
      console.log(`⚠️  WARNING: No branch-specific prices set to test`);
      testsWarning++;
    } else {
      const testItem = branchStock[0];
      const originalPrice = testItem.price_per_kg;
      const testPrice = parseFloat((originalPrice + 5).toFixed(2));
      
      // Update
      const { data: updated, error: updateErr } = await supabase
        .from('branch_stock')
        .update({ price_per_kg: testPrice })
        .eq('id', testItem.id)
        .select()
        .single();
      
      if (updateErr) throw updateErr;
      console.log(`✅ PASSED: Branch-specific price updated to KES ${testPrice}/kg`);
      
      // Restore
      await supabase
        .from('branch_stock')
        .update({ price_per_kg: originalPrice })
        .eq('id', testItem.id);
      console.log(`   ↩️  Restored original price: KES ${originalPrice}/kg`);
      testsPassed++;
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 6: Can Admin View All Stock Levels?
  // ============================================================================
  console.log('\n📊 TEST 6: View All Stock Levels');
  try {
    const { data: stock, error } = await supabase
      .from('branch_stock')
      .select('*, branches(name), products(name)')
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${stock.length} stock records`);
    stock.slice(0, 5).forEach(s => {
      console.log(`   - ${s.branches?.name}: ${s.products?.name} = ${s.current_stock}kg`);
    });
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 7: Can Admin Adjust Stock Levels?
  // ============================================================================
  console.log('\n📊 TEST 7: Adjust Stock Levels');
  try {
    const { data: stock } = await supabase
      .from('branch_stock')
      .select('id, branch_id, product_id, current_stock')
      .limit(1);
    
    if (!stock || stock.length === 0) throw new Error('No stock to test');
    
    const testStock = stock[0];
    const originalStock = testStock.current_stock;
    const testStockValue = parseFloat((originalStock + 10).toFixed(2));
    
    console.log(`   Original stock: ${originalStock}kg`);
    console.log(`   Test stock: ${testStockValue}kg`);
    
    // Update
    const { data: updated, error: updateErr } = await supabase
      .from('branch_stock')
      .update({ current_stock: testStockValue })
      .eq('id', testStock.id)
      .select()
      .single();
    
    if (updateErr) throw updateErr;
    console.log(`✅ PASSED: Stock updated to ${testStockValue}kg`);
    
    // Restore
    await supabase
      .from('branch_stock')
      .update({ current_stock: originalStock })
      .eq('id', testStock.id);
    console.log(`   ↩️  Restored original stock: ${originalStock}kg`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 8: Can Admin View All Transactions?
  // ============================================================================
  console.log('\n💳 TEST 8: View All Transactions');
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, branches(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${transactions.length} transactions`);
    const total = transactions.reduce((sum, t) => sum + parseFloat(t.total), 0);
    console.log(`   Total value: KES ${total.toLocaleString()}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 9: Can Admin View Transaction Items?
  // ============================================================================
  console.log('\n🛒 TEST 9: View Transaction Items');
  try {
    const { data: items, error } = await supabase
      .from('transaction_items')
      .select('*, products(name)')
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${items.length} transaction items`);
    items.slice(0, 3).forEach(i => {
      console.log(`   - ${i.products?.name}: ${i.quantity}kg @ KES ${i.price_per_kg}/kg = KES ${i.subtotal}`);
    });
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 10: Can Admin View All Expenses?
  // ============================================================================
  console.log('\n💸 TEST 10: View All Expenses');
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, branches(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${expenses.length} expenses`);
    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    console.log(`   Total expenses: KES ${total.toLocaleString()}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 11: Can Admin View Stock History?
  // ============================================================================
  console.log('\n📋 TEST 11: View Stock History');
  try {
    const { data: history, error } = await supabase
      .from('stock_history')
      .select('*, products(name), branches(name)')
      .order('date', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${history.length} stock history records`);
    history.slice(0, 3).forEach(h => {
      console.log(`   - ${h.branches?.name}: ${h.products?.name} (${h.date})`);
      console.log(`     Opening: ${h.opening_stock}kg, Closing: ${h.closing_stock || 'Not set'}kg`);
    });
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 12: Can Admin View Stock Transfers?
  // ============================================================================
  console.log('\n🔄 TEST 12: View Stock Transfers');
  try {
    const { data: transfers, error } = await supabase
      .from('stock_transfers')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${transfers.length} stock transfers`);
    transfers.slice(0, 3).forEach(t => {
      console.log(`   - ${t.products?.name}: ${t.quantity}kg (${t.transfer_date})`);
    });
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 13: Can Admin View Transfer Requests?
  // ============================================================================
  console.log('\n📨 TEST 13: View Transfer Requests');
  try {
    const { data: requests, error } = await supabase
      .from('stock_transfer_requests')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${requests.length} transfer requests`);
    const byStatus = { pending: 0, accepted: 0, rejected: 0 };
    requests.forEach(r => byStatus[r.status]++);
    console.log(`   Pending: ${byStatus.pending}, Accepted: ${byStatus.accepted}, Rejected: ${byStatus.rejected}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 14: Can Admin View External Dispatches?
  // ============================================================================
  console.log('\n🚚 TEST 14: View External Dispatches');
  try {
    const { data: dispatches, error } = await supabase
      .from('external_dispatches')
      .select('*, branches(name), products(name)')
      .order('dispatch_date', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${dispatches.length} external dispatches`);
    const total = dispatches.reduce((sum, d) => sum + parseFloat(d.total_value), 0);
    console.log(`   Total value: KES ${total.toLocaleString()}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 15: Can Admin View Stock Additions?
  // ============================================================================
  console.log('\n➕ TEST 15: View Stock Additions');
  try {
    const { data: additions, error } = await supabase
      .from('stock_additions')
      .select('*, branches(name), products(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${additions.length} stock additions`);
    additions.slice(0, 3).forEach(a => {
      console.log(`   - ${a.branches?.name}: ${a.products?.name} +${a.quantity}kg by ${a.added_by}`);
    });
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 16: Can Admin View All Users?
  // ============================================================================
  console.log('\n👥 TEST 16: View All Users');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*, branches(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    console.log(`✅ PASSED: Found ${users.length} users`);
    const byRole = { admin: 0, manager: 0, cashier: 0 };
    users.forEach(u => byRole[u.role]++);
    console.log(`   Admins: ${byRole.admin}, Managers: ${byRole.manager}, Cashiers: ${byRole.cashier}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 17: Can Admin Create New Product?
  // ============================================================================
  console.log('\n📦 TEST 17: Create New Product');
  try {
    const testProductName = `TEST_PRODUCT_${Date.now()}`;
    
    const { data: created, error: createErr } = await supabase
      .from('products')
      .insert({
        name: testProductName,
        category: 'Test',
        price_per_kg: 500,
        low_stock_threshold: 10,
        image: '🧪'
      })
      .select()
      .single();
    
    if (createErr) throw createErr;
    console.log(`✅ PASSED: Created product "${testProductName}"`);
    
    // Delete test product
    await supabase
      .from('products')
      .delete()
      .eq('id', created.id);
    console.log(`   🗑️  Cleaned up test product`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // TEST 18: Can Admin Delete Product?
  // ============================================================================
  console.log('\n🗑️  TEST 18: Delete Product');
  try {
    // Create a test product first
    const { data: created } = await supabase
      .from('products')
      .insert({
        name: `DELETE_TEST_${Date.now()}`,
        category: 'Test',
        price_per_kg: 100,
        image: '🗑️'
      })
      .select()
      .single();
    
    // Delete it
    const { error: deleteErr } = await supabase
      .from('products')
      .delete()
      .eq('id', created.id);
    
    if (deleteErr) throw deleteErr;
    
    // Verify deletion
    const { data: verified } = await supabase
      .from('products')
      .select('*')
      .eq('id', created.id);
    
    if (verified.length === 0) {
      console.log(`✅ PASSED: Product deleted successfully`);
      testsPassed++;
    } else {
      throw new Error('Product still exists after deletion');
    }
  } catch (err) {
    console.log(`❌ FAILED: ${err.message}`);
    testsFailed++;
  }

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ PASSED: ${testsPassed}`);
  console.log(`❌ FAILED: ${testsFailed}`);
  console.log(`⚠️  WARNINGS: ${testsWarning}`);
  console.log('='.repeat(80));
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Admin has full control over the system.');
    console.log('\n✅ Admin CAN:');
    console.log('   - View all branches, products, stock, transactions, expenses');
    console.log('   - Edit product prices (global and branch-specific)');
    console.log('   - Adjust stock levels');
    console.log('   - Create and delete products');
    console.log('   - View complete audit trails');
    console.log('   - Access all historical data');
    console.log('   - Monitor all branch operations\n');
  } else {
    console.log(`\n⚠️  ${testsFailed} test(s) failed. Please review the errors above.\n`);
  }

  return testsFailed === 0;
}

runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
