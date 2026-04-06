import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function testVarianceScenario() {
  console.log('=== VARIANCE TEST SCENARIO ===');
  console.log('System Stock: 800 kg');
  console.log('Closing Stock (Cashier counted): 799 kg\n');

  // Simulate the variance calculation logic from branchService.js
  const liveStockValue = 800; // System's current_stock
  const closingStock = 799;   // Cashier's physical count
  const hasClosingStock = true;

  console.log('--- Variance Calculation ---\n');

  if (hasClosingStock) {
    console.log('Cashier HAS submitted closing stock (physical count)');
    console.log('Using logic: Variance = Closing Stock - System Stock\n');
    
    const variance = closingStock - liveStockValue;
    
    console.log('Calculation:');
    console.log(`  Closing Stock (Physical): ${closingStock} kg`);
    console.log(`  System Stock: ${liveStockValue} kg`);
    console.log(`  Variance = ${closingStock} - ${liveStockValue} = ${variance} kg\n`);

    if (Math.abs(variance) > 0.1) {
      console.log('⚠️  VARIANCE DETECTED!');
      console.log(`   Absolute Variance: ${Math.abs(variance)} kg`);
      
      if (variance < 0) {
        console.log(`   Type: SHORTAGE (${Math.abs(variance)} kg missing)`);
        console.log('   Meaning: Cashier counted LESS than system shows');
        console.log('   Possible causes:');
        console.log('     - Cashier miscounted (counted 799 instead of 800)');
        console.log('     - System has data entry error (recorded wrong amount)');
        console.log('     - Stock was sold/used but system not updated yet');
      } else {
        console.log(`   Type: SURPLUS (${variance} kg extra)`);
        console.log('   Meaning: Cashier counted MORE than system shows');
        console.log('   Possible causes:');
        console.log('     - Cashier miscounted (counted extra)');
        console.log('     - System missed recording a stock addition');
        console.log('     - System has data entry error');
      }
    } else {
      console.log('✅ NO VARIANCE');
      console.log('   Cashier count matches system perfectly!');
    }
  }

  console.log('\n--- What This Means ---');
  console.log('When cashier submits closing stock, that becomes the "truth"');
  console.log('Variance shows the difference between:');
  console.log('  - What cashier physically counted (799 kg)');
  console.log('  - What system thinks should be there (800 kg)');
  console.log('\nThis 1 kg difference needs investigation:');
  console.log('  1. Recount the physical stock');
  console.log('  2. Check if there was a recent transaction not yet processed');
  console.log('  3. Verify all transactions were entered correctly');
  console.log('  4. Accept the physical count as correct and adjust system');

  console.log('\n--- In Admin Dashboard ---');
  console.log('This branch would show:');
  console.log('  Opening Stock: [depends on history]');
  console.log('  Live Stock: 799 kg (uses closing stock when submitted)');
  console.log('  Variance: 1 kg ⚠️');
  console.log('  Status: Variance detected - requires investigation');

  process.exit(0);
}

testVarianceScenario();
