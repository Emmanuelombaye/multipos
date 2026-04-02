import { supabase } from './src/db/supabase.js';

console.log('🔍 COMPREHENSIVE SYSTEM TEST - Admin View\n');
console.log('='.repeat(70));

async function testAdminEndpoints() {
  let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // Test 1: Admin Dashboard Data
  console.log('\n📊 Test 1: Admin Dashboard Overview');
  try {
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*');
    
    if (branchError) throw branchError;
    
    console.log(`✅ Branches: ${branches.length} found`);
    for (const branch of branches) {
      console.log(`   - ${branch.name} (${branch.status})`);
    }
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 2: Stock History - Opening/Closing Stock
  console.log('\n📋 Test 2: Stock History (Opening/Closing Stock)');
  try {
    const { data: branches } = await supabase.from('branches').select('id, name').limit(1);
    if (branches && branches.length > 0) {
      const branchId = branches[0].id;
      const { data: history, error } = await supabase
        .from('stock_history')
        .select('*, products(name)')
        .eq('branch_id', branchId)
        .order('date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      console.log(`✅ Stock History for ${branches[0].name}:`);
      if (history.length === 0) {
        console.log('   ⚠️  No stock history found');
        testResults.warnings++;
      } else {
        history.forEach(h => {
          console.log(`   - ${h.products?.name}: Opening=${h.opening_stock}kg, Closing=${h.closing_stock || 'Not set'}kg (${h.date})`);
        });
        testResults.passed++;
      }
    }
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 3: All Branch Stock Levels
  console.log('\n📦 Test 3: Current Stock Levels (All Branches)');
  try {
    const { data: stock, error } = await supabase
      .from('branch_stock')
      .select('*, branches(name), products(name)')
      .order('current_stock', { ascending: true });
    
    if (error) throw error;
    
    console.log(`✅ Total Stock Records: ${stock.length}`);
    const byBranch = {};
    stock.forEach(s => {
      const branchName = s.branches?.name || 'Unknown';
      if (!byBranch[branchName]) byBranch[branchName] = [];
      byBranch[branchName].push(s);
    });
    
    Object.keys(byBranch).forEach(branch => {
      console.log(`\n   ${branch}:`);
      byBranch[branch].forEach(s => {
        console.log(`      - ${s.products?.name}: ${s.current_stock}kg`);
      });
    });
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 4: Stock Transfers (Admin View)
  console.log('\n🔄 Test 4: Stock Transfers (All Branches)');
  try {
    const { data: transfers, error } = await supabase
      .from('stock_transfers')
      .select('*, products(name), from_branch:branches!stock_transfers_from_branch_id_fkey(name), to_branch:branches!stock_transfers_to_branch_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    console.log(`✅ Recent Transfers: ${transfers.length}`);
    if (transfers.length === 0) {
      console.log('   ℹ️  No transfers recorded yet');
    } else {
      transfers.forEach(t => {
        console.log(`   - ${t.products?.name}: ${t.from_branch?.name} → ${t.to_branch?.name} (${t.quantity}kg) [${t.transfer_date}]`);
      });
    }
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 5: Transfer Requests Status
  console.log('\n📨 Test 5: Transfer Requests (All Statuses)');
  try {
    const { data: requests, error } = await supabase
      .from('stock_transfer_requests')
      .select('*, products(name), from_branch:branches!stock_transfer_requests_from_branch_id_fkey(name), to_branch:branches!stock_transfer_requests_to_branch_id_fkey(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const statusCount = { pending: 0, accepted: 0, rejected: 0 };
    requests.forEach(r => statusCount[r.status]++);
    
    console.log(`✅ Transfer Requests: ${requests.length} total`);
    console.log(`   - Pending: ${statusCount.pending}`);
    console.log(`   - Accepted: ${statusCount.accepted}`);
    console.log(`   - Rejected: ${statusCount.rejected}`);
    
    if (requests.length > 0) {
      console.log('\n   Recent requests:');
      requests.slice(0, 5).forEach(r => {
        console.log(`   - ${r.products?.name}: ${r.from_branch?.name} → ${r.to_branch?.name} (${r.quantity}kg) [${r.status}]`);
      });
    }
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 6: External Dispatches
  console.log('\n🚚 Test 6: External Dispatches (All Branches)');
  try {
    const { data: dispatches, error } = await supabase
      .from('external_dispatches')
      .select('*, branches(name), products(name)')
      .order('dispatch_date', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const totalValue = dispatches.reduce((sum, d) => sum + parseFloat(d.total_value || 0), 0);
    const paymentStatus = { pending: 0, paid: 0, partial: 0 };
    dispatches.forEach(d => paymentStatus[d.payment_status]++);
    
    console.log(`✅ External Dispatches: ${dispatches.length}`);
    console.log(`   - Total Value: KES ${totalValue.toLocaleString()}`);
    console.log(`   - Paid: ${paymentStatus.paid}, Pending: ${paymentStatus.pending}, Partial: ${paymentStatus.partial}`);
    
    if (dispatches.length > 0) {
      console.log('\n   Recent dispatches:');
      dispatches.slice(0, 5).forEach(d => {
        console.log(`   - ${d.client_name} (${d.client_type}): ${d.products?.name} ${d.quantity}kg = KES ${parseFloat(d.total_value).toLocaleString()} [${d.payment_status}]`);
      });
    }
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 7: Stock Additions Audit
  console.log('\n➕ Test 7: Stock Additions (Mid-Shift)');
  try {
    const { data: additions, error } = await supabase
      .from('stock_additions')
      .select('*, branches(name), products(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    console.log(`✅ Stock Additions: ${additions.length}`);
    if (additions.length === 0) {
      console.log('   ℹ️  No mid-shift additions recorded yet');
    } else {
      additions.forEach(a => {
        console.log(`   - ${a.branches?.name}: ${a.products?.name} +${a.quantity}kg (${a.stock_before}→${a.stock_after}) by ${a.added_by}`);
      });
    }
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 8: Transactions Overview
  console.log('\n💰 Test 8: Transactions (All Branches)');
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, branches(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.total || 0), 0);
    const byPayment = {};
    transactions.forEach(t => {
      byPayment[t.payment_method] = (byPayment[t.payment_method] || 0) + parseFloat(t.total);
    });
    
    console.log(`✅ Recent Transactions: ${transactions.length}`);
    console.log(`   - Total Sales: KES ${totalSales.toLocaleString()}`);
    console.log('   - By Payment Method:');
    Object.keys(byPayment).forEach(method => {
      console.log(`      ${method}: KES ${byPayment[method].toLocaleString()}`);
    });
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 9: Expenses Overview
  console.log('\n💸 Test 9: Expenses (All Branches)');
  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*, branches(name)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const byCategory = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount);
    });
    
    console.log(`✅ Recent Expenses: ${expenses.length}`);
    console.log(`   - Total: KES ${totalExpenses.toLocaleString()}`);
    console.log('   - By Category:');
    Object.keys(byCategory).forEach(cat => {
      console.log(`      ${cat}: KES ${byCategory[cat].toLocaleString()}`);
    });
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Test 10: Users/Staff
  console.log('\n👥 Test 10: Users/Staff');
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*, branches(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const byRole = { admin: 0, manager: 0, cashier: 0 };
    users.forEach(u => byRole[u.role]++);
    
    console.log(`✅ Total Users: ${users.length}`);
    console.log(`   - Admins: ${byRole.admin}`);
    console.log(`   - Managers: ${byRole.manager}`);
    console.log(`   - Cashiers: ${byRole.cashier}`);
    testResults.passed++;
  } catch (err) {
    console.log('❌ FAILED:', err.message);
    testResults.failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Admin can see all data correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  console.log('='.repeat(70) + '\n');

  return testResults.failed === 0;
}

testAdminEndpoints()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
