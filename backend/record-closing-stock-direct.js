// Direct database test - Records 20kg closing stock for Tamasha on 2026-02-08
import 'dotenv/config.js';
import supabase from './src/db/supabase.js';

const TAMASHA_ID = '092f7071-d8c2-4f4f-baa0-7c4879968374';
const TARGET_DATE = '2026-02-08';
const CLOSING_STOCK = 20;

async function recordClosingStock() {
  try {
    console.log('📦 Recording Closing Stock...\n');
    
    // Get all products
    const { data: products } = await supabase.from('products').select('id, name');
    console.log(`Found ${products.length} products\n`);
    
    // Get existing stock history for this date to find product_ids in Tamasha
    const { data: existingHistory } = await supabase
      .from('stock_history')
      .select('product_id')
      .eq('branch_id', TAMASHA_ID)
      .eq('date', TARGET_DATE)
      .limit(1);
    
    let recordedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      // Check if record exists for this product/date/branch
      const { data: existing } = await supabase
        .from('stock_history')
        .select('id')
        .eq('product_id', product.id)
        .eq('branch_id', TAMASHA_ID)
        .eq('date', TARGET_DATE)
        .single();
      
      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('stock_history')
          .update({ closing_stock: CLOSING_STOCK })
          .eq('id', existing.id);
        
        if (error) {
          console.log(`  ✗ ${product.name}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`  ✓ ${product.name}: Updated to ${CLOSING_STOCK}kg`);
          recordedCount++;
        }
      } else {
        // Create new record with opening_stock = 50 (default)
        const { error } = await supabase
          .from('stock_history')
          .insert({
            product_id: product.id,
            branch_id: TAMASHA_ID,
            date: TARGET_DATE,
            opening_stock: 50,
            closing_stock: CLOSING_STOCK,
            added_by: 'Direct Test Script'
          });
        
        if (error) {
          console.log(`  ✗ ${product.name}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`  ✓ ${product.name}: Created with ${CLOSING_STOCK}kg closing stock`);
          recordedCount++;
        }
      }
    }
    
    console.log(`\n✅ Done: ${recordedCount} recorded, ${errorCount} errors\n`);
    
    // Verify
    console.log('📊 Verification:');
    const { data: verify } = await supabase
      .from('stock_history')
      .select('product_id, date, closing_stock')
      .eq('branch_id', TAMASHA_ID)
      .eq('date', TARGET_DATE)
      .eq('closing_stock', CLOSING_STOCK);
    
    console.log(`   Found ${verify.length} records with closing_stock = ${CLOSING_STOCK}kg on ${TARGET_DATE}\n`);
    
    console.log('🎯 Now in Admin:');
    console.log(`   1. Select Branch: Tamasha`);
    console.log(`   2. Select Date: 2026-02-08`);
    console.log(`   3. View Stock Accountability section`);
    console.log(`   4. All products should show closing stock = 20kg\n`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

recordClosingStock();
