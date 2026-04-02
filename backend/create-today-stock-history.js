import { supabase } from './src/db/supabase.js';
import { ensureDailyHistory } from './src/services/inventoryService.js';

const getKenyaDate = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

async function createTodayStockHistory() {
  console.log('\n🔧 Creating today\'s stock history for all branches...\n');
  
  const today = getKenyaDate();
  console.log(`📅 Date: ${today}\n`);

  try {
    // Get all branches
    const { data: branches } = await supabase.from('branches').select('*');
    
    for (const branch of branches) {
      console.log(`📍 Branch: ${branch.name}`);
      
      // Get all products with stock in this branch
      const { data: stockData } = await supabase
        .from('branch_stock')
        .select('product_id, current_stock, products(name)')
        .eq('branch_id', branch.id);
      
      if (!stockData || stockData.length === 0) {
        console.log('   No stock found\n');
        continue;
      }

      for (const stock of stockData) {
        const result = await ensureDailyHistory(stock.product_id, branch.id, today);
        
        if (result) {
          console.log(`   ✅ ${stock.products?.name}: Opening=${result.opening_stock}kg (Live=${stock.current_stock}kg)`);
        } else {
          console.log(`   ❌ ${stock.products?.name}: Failed to create history`);
        }
      }
      console.log('');
    }

    console.log('✅ Stock history creation complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

createTodayStockHistory()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
