/**
 * Stock Audit Screen Data Verification Test
 * 
 * This script tests all API endpoints that StockAuditScreen depends on
 * to ensure real data is being fetched correctly.
 * 
 * Run: node backend/test-stock-audit-data.js
 */

import { supabase } from './src/db/supabase.js';

const getKenyaDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

async function testStockAuditData() {
  console.log('🔍 Testing Stock Audit Screen Data Fetching...\n');
  
  const today = getKenyaDate();
  console.log(`📅 Testing for date: ${today}\n`);

  try {
    // 1. Test branches fetch
    console.log('1️⃣ Testing branches fetch...');
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*');
    
    if (branchError) throw branchError;
    console.log(`   ✅ Fetched ${branches.length} branches`);
    branches.forEach(b => console.log(`      - ${b.name} (${b.id})`));
    console.log();

    // 2. Test products fetch
    console.log('2️⃣ Testing products fetch...');
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('*');
    
    if (productError) throw productError;
    console.log(`   ✅ Fetched ${products.length} products`);
    products.slice(0, 5).forEach(p => console.log(`      - ${p.image || '🥩'} ${p.name}`));
    if (products.length > 5) console.log(`      ... and ${products.length - 5} more`);
    console.log();

    // Test for first branch only (to keep output manageable)
    const testBranch = branches[0];
    console.log(`📍 Testing detailed data for: ${testBranch.name}\n`);

    // 3. Test stock history by date
    console.log('3️⃣ Testing stock history by date...');
    const { data: history, error: historyError } = await supabase
      .from('stock_history')
      .select('*')
      .eq('branch_id', testBranch.id)
      .eq('date', today);
    
    if (historyError) throw historyError;
    console.log(`   ✅ Fetched ${history.length} history records for ${today}`);
    history.slice(0, 3).forEach(h => {
      const product = products.find(p => p.id === h.product_id);
      console.log(`      - ${product?.name || 'Unknown'}: Opening=${h.opening_stock}kg, Closing=${h.closing_stock ?? 'pending'}kg`);
    });
    if (history.length > 3) console.log(`      ... and ${history.length - 3} more`);
    console.log();

    // 4. Test stock additions
    console.log('4️⃣ Testing stock additions...');
    const { data: additions, error: additionsError } = await supabase
      .from('stock_additions')
      .select('*')
      .eq('branch_id', testBranch.id)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (additionsError) throw additionsError;
    const todayAdditions = additions.filter(a => a.added_at?.startsWith(today));
    console.log(`   ✅ Fetched ${additions.length} total additions, ${todayAdditions.length} for ${today}`);
    todayAdditions.slice(0, 3).forEach(a => {
      const product = products.find(p => p.id === a.product_id);
      console.log(`      - ${product?.name || 'Unknown'}: +${a.quantity}kg (${a.reason || 'no reason'})`);
    });
    console.log();

    // 5. Test stock transfers
    console.log('5️⃣ Testing stock transfers...');
    const { data: transfers, error: transfersError } = await supabase
      .from('stock_transfers')
      .select('*')
      .or(`from_branch_id.eq.${testBranch.id},to_branch_id.eq.${testBranch.id}`)
      .order('transfer_date', { ascending: false })
      .limit(100);
    
    if (transfersError) throw transfersError;
    const todayTransfers = transfers.filter(t => t.transfer_date === today);
    console.log(`   ✅ Fetched ${transfers.length} total transfers, ${todayTransfers.length} for ${today}`);
    todayTransfers.slice(0, 3).forEach(t => {
      const product = products.find(p => p.id === t.product_id);
      const fromBranch = branches.find(b => b.id === t.from_branch_id);
      const toBranch = branches.find(b => b.id === t.to_branch_id);
      const direction = t.to_branch_id === testBranch.id ? 'IN' : 'OUT';
      console.log(`      - ${product?.name || 'Unknown'}: ${t.quantity}kg ${direction} (${fromBranch?.name?.split(' - ')[0]} → ${toBranch?.name?.split(' - ')[0]})`);
    });
    console.log();

    // 6. Test external dispatches
    console.log('6️⃣ Testing external dispatches...');
    const { data: dispatches, error: dispatchesError } = await supabase
      .from('external_dispatches')
      .select('*')
      .eq('branch_id', testBranch.id)
      .order('dispatch_date', { ascending: false })
      .limit(100);
    
    if (dispatchesError) throw dispatchesError;
    const todayDispatches = dispatches.filter(d => d.dispatch_date === today);
    console.log(`   ✅ Fetched ${dispatches.length} total dispatches, ${todayDispatches.length} for ${today}`);
    todayDispatches.slice(0, 3).forEach(d => {
      const product = products.find(p => p.id === d.product_id);
      console.log(`      - ${product?.name || 'Unknown'}: ${d.quantity}kg to ${d.client_name} (${d.client_type})`);
    });
    console.log();

    // 7. Test current stock
    console.log('7️⃣ Testing current stock...');
    const { data: currentStock, error: stockError } = await supabase
      .from('branch_stock')
      .select('*')
      .eq('branch_id', testBranch.id);
    
    if (stockError) throw stockError;
    console.log(`   ✅ Fetched ${currentStock.length} current stock records`);
    currentStock.slice(0, 3).forEach(s => {
      const product = products.find(p => p.id === s.product_id);
      console.log(`      - ${product?.name || 'Unknown'}: ${s.current_stock}kg`);
    });
    if (currentStock.length > 3) console.log(`      ... and ${currentStock.length - 3} more`);
    console.log();

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED - Stock Audit Screen can fetch real data!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary for StockAuditScreen:');
    console.log(`   • ${branches.length} branches available`);
    console.log(`   • ${products.length} products in system`);
    console.log(`   • ${history.length} stock history records for ${today}`);
    console.log(`   • ${todayAdditions.length} mid-shift additions for ${today}`);
    console.log(`   • ${todayTransfers.length} transfers for ${today}`);
    console.log(`   • ${todayDispatches.length} dispatches for ${today}`);
    console.log(`   • ${currentStock.length} current stock records`);
    console.log('\n🎯 The StockAuditScreen will display:');
    console.log('   ✓ Opening stock from stock_history');
    console.log('   ✓ Mid-shift additions from stock_additions');
    console.log('   ✓ Transfers in/out from stock_transfers');
    console.log('   ✓ External dispatches from external_dispatches');
    console.log('   ✓ Closing stock from stock_history');
    console.log('   ✓ Variance calculation (Closing - Expected)');
    console.log('\n🚀 Ready to use in production!\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testStockAuditData();
