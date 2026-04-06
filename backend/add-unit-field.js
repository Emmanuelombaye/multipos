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

async function addUnitField() {
  console.log('🔄 Adding unit field to products...\n');

  try {
    // Get all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*');

    if (fetchError) throw fetchError;

    console.log(`📦 Found ${products.length} products\n`);

    // Update each product with appropriate unit
    for (const product of products) {
      let unit = 'kg'; // default
      let priceLabel = 'Price per Kg';

      // Check if product name contains "Kuku" (chicken)
      if (product.name.toLowerCase().includes('kuku')) {
        unit = 'pieces';
        priceLabel = 'Price per Piece';
      }

      // Note: We can't add columns via Supabase client, but we can update existing data
      // The unit will be stored in a new column that needs to be added via SQL
      console.log(`✅ ${product.name}: ${unit}`);
    }

    console.log('\n⚠️  Note: You need to add the "unit" column to the products table via SQL:\n');
    console.log('ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT \'kg\';\n');
    console.log('Then update chicken products:\n');
    console.log('UPDATE products SET unit = \'pieces\' WHERE name ILIKE \'%kuku%\';\n');

    // For now, let's just verify the chicken products
    const chickenProducts = products.filter(p => p.name.toLowerCase().includes('kuku'));
    console.log(`\n🐔 Found ${chickenProducts.length} chicken products:`);
    chickenProducts.forEach(p => {
      console.log(`   - ${p.name} (should be in pieces)`);
    });

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

addUnitField();
