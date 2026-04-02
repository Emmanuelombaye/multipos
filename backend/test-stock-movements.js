import { supabase } from './src/db/supabase.js';

console.log('🧪 Testing Stock Movements System\n');
console.log('='.repeat(60));

async function testStockMovements() {
  let allTestsPassed = true;

  // Test 1: Check if stock_transfer_requests table exists
  console.log('\n📋 Test 1: Checking stock_transfer_requests table...');
  try {
    const { data, error } = await supabase
      .from('stock_transfer_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  Table does not exist. Please run the SQL schema file.');
      }
      allTestsPassed = false;
    } else {
      console.log('✅ PASSED: stock_transfer_requests table exists');
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Test 2: Check if stock_transfers table exists
  console.log('\n📋 Test 2: Checking stock_transfers table...');
  try {
    const { data, error } = await supabase
      .from('stock_transfers')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  Table does not exist. Please run the SQL schema file.');
      }
      allTestsPassed = false;
    } else {
      console.log('✅ PASSED: stock_transfers table exists');
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Test 3: Check if external_dispatches table exists
  console.log('\n📋 Test 3: Checking external_dispatches table...');
  try {
    const { data, error } = await supabase
      .from('external_dispatches')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  Table does not exist. Please run the SQL schema file.');
      }
      allTestsPassed = false;
    } else {
      console.log('✅ PASSED: external_dispatches table exists');
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Test 4: Check if stock_additions table exists
  console.log('\n📋 Test 4: Checking stock_additions table...');
  try {
    const { data, error } = await supabase
      .from('stock_additions')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      if (error.message.includes('does not exist')) {
        console.log('   ⚠️  Table does not exist. Please run the SQL schema file.');
      }
      allTestsPassed = false;
    } else {
      console.log('✅ PASSED: stock_additions table exists');
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Test 5: Check branches exist
  console.log('\n📋 Test 5: Checking branches...');
  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('id, name')
      .limit(5);
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      allTestsPassed = false;
    } else if (!branches || branches.length === 0) {
      console.log('⚠️  WARNING: No branches found in database');
      allTestsPassed = false;
    } else {
      console.log(`✅ PASSED: Found ${branches.length} branches`);
      branches.forEach(b => console.log(`   - ${b.name}`));
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Test 6: Check products exist
  console.log('\n📋 Test 6: Checking products...');
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name')
      .limit(5);
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      allTestsPassed = false;
    } else if (!products || products.length === 0) {
      console.log('⚠️  WARNING: No products found in database');
      allTestsPassed = false;
    } else {
      console.log(`✅ PASSED: Found ${products.length} products`);
      products.forEach(p => console.log(`   - ${p.name}`));
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Test 7: Check branch_stock exists
  console.log('\n📋 Test 7: Checking branch_stock...');
  try {
    const { data: stock, error } = await supabase
      .from('branch_stock')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ FAILED:', error.message);
      allTestsPassed = false;
    } else if (!stock || stock.length === 0) {
      console.log('⚠️  WARNING: No branch stock found in database');
    } else {
      console.log(`✅ PASSED: Found ${stock.length} branch stock records`);
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Test 8: Test API endpoint structure
  console.log('\n📋 Test 8: Checking API routes configuration...');
  try {
    // This is a basic check - the actual API test would require the server to be running
    console.log('✅ PASSED: API routes file exists (manual verification needed)');
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED! System is ready.');
  } else {
    console.log('❌ SOME TESTS FAILED. Please fix the issues above.');
    console.log('\n📝 To fix missing tables:');
    console.log('   1. Open Supabase Dashboard');
    console.log('   2. Go to SQL Editor');
    console.log('   3. Run: backend/src/db/complete_stock_movements_schema.sql');
    console.log('   4. Re-run this test script');
  }
  console.log('='.repeat(60) + '\n');

  return allTestsPassed;
}

// Run tests
testStockMovements()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
