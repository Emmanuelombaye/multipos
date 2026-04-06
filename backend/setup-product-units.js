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

async function setupUnits() {
  console.log('🔄 Setting up product units...\n');

  try {
    // Step 1: Get all products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*');

    if (fetchError) throw fetchError;

    console.log(`📦 Found ${products.length} products\n`);

    // Step 2: Check if unit column exists by trying to read it
    console.log('⏳ Checking if unit column exists...');
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('id, name, unit')
      .limit(1);

    if (testError && testError.message.includes('column')) {
      console.log('❌ Unit column does not exist yet.');
      console.log('\n📋 Please run this SQL in your Supabase SQL Editor:\n');
      console.log('----------------------------------------');
      console.log('ALTER TABLE products ADD COLUMN unit VARCHAR(20) DEFAULT \'kg\';');
      console.log('UPDATE products SET unit = \'pieces\' WHERE name ILIKE \'%kuku%\';');
      console.log('----------------------------------------\n');
      console.log('After running the SQL, run this script again.\n');
      return;
    }

    console.log('✅ Unit column exists\n');

    // Step 3: Update chicken products to pieces
    console.log('⏳ Updating chicken products to use pieces...\n');
    
    for (const product of products) {
      if (product.name.toLowerCase().includes('kuku')) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ unit: 'pieces' })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Error updating ${product.name}:`, updateError);
        } else {
          console.log(`✅ ${product.name}: set to pieces`);
        }
      } else {
        const { error: updateError } = await supabase
          .from('products')
          .update({ unit: 'kg' })
          .eq('id', product.id);

        if (updateError) {
          console.error(`❌ Error updating ${product.name}:`, updateError);
        } else {
          console.log(`✅ ${product.name}: set to kg`);
        }
      }
    }

    // Step 4: Verify
    console.log('\n📊 Verification:\n');
    const { data: verification, error: verifyError } = await supabase
      .from('products')
      .select('name, category, unit, price_per_kg')
      .order('name');

    if (verifyError) throw verifyError;

    verification.forEach(p => {
      const priceLabel = p.unit === 'pieces' ? 'per piece' : 'per kg';
      console.log(`   ${p.name} (${p.category}): ${p.unit} - KES ${p.price_per_kg} ${priceLabel}`);
    });

    console.log('\n✅ Unit setup completed successfully!\n');

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

setupUnits();
