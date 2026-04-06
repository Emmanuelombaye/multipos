import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateProducts() {
  console.log('🔄 Starting product update migration...\n');

  try {
    // Step 1: Delete transaction_items first (to avoid foreign key issues)
    console.log('⏳ Step 1: Clearing transaction items...');
    const { error: deleteItemsError } = await supabase
      .from('transaction_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteItemsError) {
      console.error('❌ Error deleting transaction items:', deleteItemsError);
      throw deleteItemsError;
    }
    console.log('✅ Transaction items cleared\n');

    // Step 2: Delete transactions
    console.log('⏳ Step 2: Clearing transactions...');
    const { error: deleteTransError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteTransError) {
      console.error('❌ Error deleting transactions:', deleteTransError);
      throw deleteTransError;
    }
    console.log('✅ Transactions cleared\n');

    // Step 3: Delete branch_stock
    console.log('⏳ Step 3: Clearing branch stock...');
    const { error: deleteStockError } = await supabase
      .from('branch_stock')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteStockError) {
      console.error('❌ Error deleting branch stock:', deleteStockError);
      throw deleteStockError;
    }
    console.log('✅ Branch stock cleared\n');

    // Step 4: Delete all existing products
    console.log('⏳ Step 4: Clearing existing products...');
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      console.error('❌ Error deleting products:', deleteError);
      throw deleteError;
    }
    console.log('✅ Existing products cleared\n');

    // Step 5: Insert the 7 new products
    console.log('⏳ Step 5: Creating 7 new products...');
    const newProducts = [
      { name: 'Beef', category: 'Meat', image: '🥩', price_per_kg: 850, low_stock_threshold: 20 },
      { name: 'Goat', category: 'Meat', image: '🐐', price_per_kg: 900, low_stock_threshold: 20 },
      { name: 'Matumbo', category: 'Offal', image: '🫘', price_per_kg: 450, low_stock_threshold: 10 },
      { name: 'Kuku Broiler', category: 'Poultry', image: '🐔', price_per_kg: 550, low_stock_threshold: 15 },
      { name: 'Kuku Kienyeji', category: 'Poultry', image: '🐓', price_per_kg: 750, low_stock_threshold: 15 },
      { name: 'Fillets', category: 'Processed', image: '🥓', price_per_kg: 950, low_stock_threshold: 10 },
      { name: 'Minced Meat', category: 'Processed', image: '🍖', price_per_kg: 700, low_stock_threshold: 10 }
    ];

    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .insert(newProducts)
      .select();

    if (insertError) {
      console.error('❌ Error inserting products:', insertError);
      throw insertError;
    }
    console.log(`✅ Created ${insertedProducts.length} products\n`);

    // Step 6: Get all branches
    console.log('⏳ Step 6: Fetching branches...');
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name');

    if (branchesError) {
      console.error('❌ Error fetching branches:', branchesError);
      throw branchesError;
    }
    console.log(`✅ Found ${branches.length} branches\n`);

    // Step 7: Add products to all branches
    console.log('⏳ Step 7: Adding products to branches...');
    const branchStockRecords = [];

    for (const branch of branches) {
      for (const product of insertedProducts) {
        // Set default prices and thresholds
        let pricePerKg = 500;
        let lowStockThreshold = 10;

        switch (product.name) {
          case 'Beef':
            pricePerKg = 850;
            lowStockThreshold = 20;
            break;
          case 'Goat':
            pricePerKg = 900;
            lowStockThreshold = 20;
            break;
          case 'Matumbo':
            pricePerKg = 450;
            lowStockThreshold = 10;
            break;
          case 'Kuku Broiler':
            pricePerKg = 550;
            lowStockThreshold = 15;
            break;
          case 'Kuku Kienyeji':
            pricePerKg = 750;
            lowStockThreshold = 15;
            break;
          case 'Fillets':
            pricePerKg = 950;
            lowStockThreshold = 10;
            break;
          case 'Minced Meat':
            pricePerKg = 700;
            lowStockThreshold = 10;
            break;
        }

        branchStockRecords.push({
          branch_id: branch.id,
          product_id: product.id,
          current_stock: 0,
          low_stock_threshold: lowStockThreshold,
          price_per_kg: pricePerKg
        });
      }
    }

    const { error: stockError } = await supabase
      .from('branch_stock')
      .insert(branchStockRecords);

    if (stockError) {
      console.error('❌ Error adding products to branches:', stockError);
      throw stockError;
    }
    console.log(`✅ Added ${branchStockRecords.length} product-branch assignments\n`);

    // Verification
    console.log('📊 Verification:\n');
    console.log('✅ Products in database:');
    insertedProducts.forEach(p => {
      console.log(`   - ${p.name} (${p.category}) ${p.image}`);
    });
    console.log(`\n📦 Total: ${insertedProducts.length} products\n`);

    for (const branch of branches) {
      const { data: branchProducts } = await supabase
        .from('branch_stock')
        .select(`
          *,
          products (name, category)
        `)
        .eq('branch_id', branch.id)
        .order('products(name)');

      console.log(`✅ ${branch.name}: ${branchProducts.length} products`);
      branchProducts.forEach(bp => {
        console.log(`   - ${bp.products.name}: KES ${bp.price_per_kg}/kg (Alert: ${bp.low_stock_threshold}kg)`);
      });
      console.log('');
    }

    console.log('✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

updateProducts();
