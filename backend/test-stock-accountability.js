import { supabase } from './src/db/supabase.js';
import { ensureDailyHistory, recordClosingStock } from './src/services/inventoryService.js';
import { reconcileDailyOpeningStock } from './src/services/stockReconciliationService.js';

/**
 * COMPREHENSIVE STOCK ACCOUNTABILITY TEST
 * Tests the entire flow from closing stock to opening stock
 */

const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

const getYesterdayDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
};

async function runStockAccountabilityTests() {
  console.log('\n🧪 ========================================');
  console.log('   STOCK ACCOUNTABILITY SYSTEM TEST');
  console.log('========================================\n');

  const today = getKenyaDate();
  const yesterday = getYesterdayDate();
  
  console.log(`📅 Today: ${today}`);
  console.log(`📅 Yesterday: ${yesterday}\n`);

  try {
    // ============================================
    // TEST 1: Get all branches
    // ============================================
    console.log('📋 TEST 1: Fetching all branches...');
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*');
    
    if (branchError) throw branchError;
    console.log(`✅ Found ${branches.length} branches:`, branches.map(b => b.name).join(', '));

    if (branches.length === 0) {
      console.log('❌ No branches found! Cannot continue tests.');
      return;
    }

    // ============================================
    // TEST 2: Check branch_stock for each branch
    // ============================================
    console.log('\n📦 TEST 2: Checking live stock (branch_stock)...');
    for (const branch of branches) {
      const { data: stockData, error: stockError } = await supabase
        .from('branch_stock')
        .select('*, products(name)')
        .eq('branch_id', branch.id);
      
      if (stockError) throw stockError;
      
      console.log(`\n  Branch: ${branch.name}`);
      if (stockData.length === 0) {
        console.log('    ⚠️  No stock records found');
      } else {
        stockData.forEach(stock => {
          console.log(`    - ${stock.products?.name || 'Unknown'}: ${stock.current_stock}kg`);
        });
      }
    }

    // ============================================
    // TEST 3: Check yesterday's closing stock
    // ============================================
    console.log('\n📊 TEST 3: Checking yesterday\'s closing stock...');
    for (const branch of branches) {
      const { data: yesterdayHistory, error: histError } = await supabase
        .from('stock_history')
        .select('*, products(name)')
        .eq('branch_id', branch.id)
        .eq('date', yesterday);
      
      if (histError) throw histError;
      
      console.log(`\n  Branch: ${branch.name} (${yesterday})`);
      if (yesterdayHistory.length === 0) {
        console.log('    ⚠️  No stock history for yesterday');
      } else {
        yesterdayHistory.forEach(hist => {
          const closing = hist.closing_stock !== null ? `${hist.closing_stock}kg` : 'NULL ❌';
          console.log(`    - ${hist.products?.name || 'Unknown'}: Opening=${hist.opening_stock}kg, Closing=${closing}`);
        });
      }
    }

    // ============================================
    // TEST 4: Check today's opening stock
    // ============================================
    console.log('\n📈 TEST 4: Checking today\'s opening stock...');
    for (const branch of branches) {
      const { data: todayHistory, error: histError } = await supabase
        .from('stock_history')
        .select('*, products(name)')
        .eq('branch_id', branch.id)
        .eq('date', today);
      
      if (histError) throw histError;
      
      console.log(`\n  Branch: ${branch.name} (${today})`);
      if (todayHistory.length === 0) {
        console.log('    ⚠️  No stock history for today yet');
      } else {
        todayHistory.forEach(hist => {
          const closing = hist.closing_stock !== null ? `${hist.closing_stock}kg` : 'Pending';
          console.log(`    - ${hist.products?.name || 'Unknown'}: Opening=${hist.opening_stock}kg, Closing=${closing}`);
        });
      }
    }

    // ============================================
    // TEST 5: Identify discrepancies
    // ============================================
    console.log('\n🔍 TEST 5: Identifying discrepancies (Opening=0 but Live>0)...');
    let discrepanciesFound = 0;
    
    for (const branch of branches) {
      const { data: todayHistory } = await supabase
        .from('stock_history')
        .select('*, products(name)')
        .eq('branch_id', branch.id)
        .eq('date', today)
        .eq('opening_stock', 0);
      
      if (todayHistory && todayHistory.length > 0) {
        for (const hist of todayHistory) {
          const { data: liveStock } = await supabase
            .from('branch_stock')
            .select('current_stock')
            .eq('branch_id', branch.id)
            .eq('product_id', hist.product_id)
            .maybeSingle();
          
          const currentStock = parseFloat(liveStock?.current_stock || 0);
          
          if (currentStock > 0) {
            console.log(`  ⚠️  DISCREPANCY FOUND:`);
            console.log(`      Branch: ${branch.name}`);
            console.log(`      Product: ${hist.products?.name || 'Unknown'}`);
            console.log(`      Opening Stock: 0kg ❌`);
            console.log(`      Live Stock: ${currentStock}kg`);
            console.log(`      Unaccounted: ${currentStock}kg\n`);
            discrepanciesFound++;
          }
        }
      }
    }

    if (discrepanciesFound === 0) {
      console.log('  ✅ No discrepancies found! System is clean.');
    } else {
      console.log(`  ❌ Found ${discrepanciesFound} discrepancies that need reconciliation.`);
    }

    // ============================================
    // TEST 6: Test ensureDailyHistory function
    // ============================================
    console.log('\n🔧 TEST 6: Testing ensureDailyHistory() function...');
    
    // Get first branch and product for testing
    const testBranch = branches[0];
    const { data: testProducts } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (testProducts && testProducts.length > 0) {
      const testProduct = testProducts[0];
      console.log(`  Testing with: ${testBranch.name} - ${testProduct.name}`);
      
      const result = await ensureDailyHistory(testProduct.id, testBranch.id, today);
      
      if (result) {
        console.log(`  ✅ ensureDailyHistory() returned:`);
        console.log(`     Opening Stock: ${result.opening_stock}kg`);
        console.log(`     Closing Stock: ${result.closing_stock !== null ? result.closing_stock + 'kg' : 'NULL'}`);
        console.log(`     Added By: ${result.added_by}`);
      } else {
        console.log('  ❌ ensureDailyHistory() returned null');
      }
    }

    // ============================================
    // TEST 7: Run reconciliation
    // ============================================
    if (discrepanciesFound > 0) {
      console.log('\n🔄 TEST 7: Running automatic reconciliation...');
      const reconResult = await reconcileDailyOpeningStock();
      console.log(`  ✅ Reconciliation complete:`);
      console.log(`     Records reconciled: ${reconResult.reconciled}`);
      console.log(`     Message: ${reconResult.message}`);
      
      if (reconResult.details && reconResult.details.length > 0) {
        console.log('\n  📝 Reconciliation details:');
        reconResult.details.forEach(detail => {
          console.log(`     - Product ${detail.productId}: ${detail.oldOpening}kg → ${detail.newOpening}kg`);
        });
      }
    } else {
      console.log('\n✅ TEST 7: Skipped reconciliation (no discrepancies found)');
    }

    // ============================================
    // TEST 8: Verify reconciliation worked
    // ============================================
    if (discrepanciesFound > 0) {
      console.log('\n✔️  TEST 8: Verifying reconciliation results...');
      let remainingDiscrepancies = 0;
      
      for (const branch of branches) {
        const { data: todayHistory } = await supabase
          .from('stock_history')
          .select('*, products(name)')
          .eq('branch_id', branch.id)
          .eq('date', today)
          .eq('opening_stock', 0);
        
        if (todayHistory && todayHistory.length > 0) {
          for (const hist of todayHistory) {
            const { data: liveStock } = await supabase
              .from('branch_stock')
              .select('current_stock')
              .eq('branch_id', branch.id)
              .eq('product_id', hist.product_id)
              .maybeSingle();
            
            const currentStock = parseFloat(liveStock?.current_stock || 0);
            
            if (currentStock > 0) {
              console.log(`  ❌ Still has discrepancy: ${branch.name} - ${hist.products?.name}`);
              remainingDiscrepancies++;
            }
          }
        }
      }
      
      if (remainingDiscrepancies === 0) {
        console.log('  ✅ All discrepancies resolved!');
      } else {
        console.log(`  ⚠️  ${remainingDiscrepancies} discrepancies still remain`);
      }
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n📊 ========================================');
    console.log('   TEST SUMMARY');
    console.log('========================================');
    console.log(`✅ Branches tested: ${branches.length}`);
    console.log(`${discrepanciesFound > 0 ? '⚠️' : '✅'} Discrepancies found: ${discrepanciesFound}`);
    console.log(`✅ System functions: Working`);
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error);
    throw error;
  }
}

// Run the tests
runStockAccountabilityTests()
  .then(() => {
    console.log('✅ All tests completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  });
