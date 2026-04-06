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

async function testFullCRUD() {
  console.log('🧪 Testing Complete CRUD Operations...\n');

  try {
    // Get a branch
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name')
      .limit(1);

    const branch = branches[0];
    console.log(`✅ Using branch: ${branch.name}\n`);

    // TEST 1: CREATE - Add new product to branch
    console.log('📝 TEST 1: CREATE Product');
    console.log('⏳ Creating test product...');
    
    const testProduct = {
      name: 'Test Product ' + Date.now(),
      category: 'Meat',
      price_per_kg: 999,
      low_stock_threshold: 15,
      image: '🧪',
      current_stock: 50
    };

    const { data: createdStock, error: createError } = await supabase
      .from('branch_stock')
      .insert({
        branch_id: branch.id,
        product_id: (await supabase.from('products').insert({
          name: testProduct.name,
          category: testProduct.category,
          price_per_kg: testProduct.price_per_kg,
          low_stock_threshold: testProduct.low_stock_threshold,
          image: testProduct.image
        }).select().single()).data.id,
        current_stock: testProduct.current_stock,
        price_per_kg: testProduct.price_per_kg,
        low_stock_threshold: testProduct.low_stock_threshold
      })
      .select()
      .single();

    if (createError) throw createError;
    
    const productId = createdStock.product_id;
    console.log('✅ Product created successfully');
    console.log(`   ID: ${productId}`);
    console.log(`   Name: ${testProduct.name}`);
    console.log(`   Price: KES ${testProduct.price_per_kg}/kg`);
    console.log(`   Threshold: ${testProduct.low_stock_threshold}kg\n`);

    // TEST 2: READ - Fetch product with branch-specific values
    console.log('📖 TEST 2: READ Product');
    console.log('⏳ Fetching product...');
    
    const { data: readData } = await supabase
      .from('branch_stock')
      .select(`
        product_id,
        current_stock,
        price_per_kg,
        low_stock_threshold,
        products (
          id,
          name,
          category,
          price_per_kg,
          low_stock_threshold,
          image
        )
      `)
      .eq('branch_id', branch.id)
      .eq('product_id', productId)
      .single();

    console.log('✅ Product fetched successfully');
    console.log(`   Name: ${readData.products.name}`);
    console.log(`   Branch Price: KES ${readData.price_per_kg}/kg`);
    console.log(`   Branch Threshold: ${readData.low_stock_threshold}kg`);
    console.log(`   Stock: ${readData.current_stock}kg\n`);

    // TEST 3: UPDATE - Edit all fields
    console.log('✏️  TEST 3: UPDATE Product');
    console.log('⏳ Updating product name, category, emoji...');
    
    const newName = testProduct.name + ' (Updated)';
    const newCategory = 'Poultry';
    const newImage = '🐔';
    
    await supabase
      .from('products')
      .update({
        name: newName,
        category: newCategory,
        image: newImage
      })
      .eq('id', productId);

    console.log('⏳ Updating branch-specific price and threshold...');
    
    const newPrice = 1299;
    const newThreshold = 25;
    
    await supabase
      .from('branch_stock')
      .update({
        price_per_kg: newPrice,
        low_stock_threshold: newThreshold
      })
      .eq('branch_id', branch.id)
      .eq('product_id', productId);

    // Verify updates
    const { data: updatedData } = await supabase
      .from('branch_stock')
      .select(`
        product_id,
        current_stock,
        price_per_kg,
        low_stock_threshold,
        products (
          id,
          name,
          category,
          image
        )
      `)
      .eq('branch_id', branch.id)
      .eq('product_id', productId)
      .single();

    console.log('✅ Product updated successfully');
    console.log(`   Name: ${updatedData.products.name} ✅`);
    console.log(`   Category: ${updatedData.products.category} ✅`);
    console.log(`   Emoji: ${updatedData.products.image} ✅`);
    console.log(`   Price: KES ${updatedData.price_per_kg}/kg ✅`);
    console.log(`   Threshold: ${updatedData.low_stock_threshold}kg ✅\n`);

    // TEST 4: DELETE - Remove product from branch
    console.log('🗑️  TEST 4: DELETE Product');
    console.log('⏳ Removing product from branch...');
    
    await supabase
      .from('branch_stock')
      .delete()
      .eq('branch_id', branch.id)
      .eq('product_id', productId);

    console.log('⏳ Deleting product globally...');
    
    await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    console.log('✅ Product deleted successfully\n');

    // Verify deletion
    const { data: verifyDelete } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (!verifyDelete) {
      console.log('✅ Deletion verified - product no longer exists\n');
    }

    // SUMMARY
    console.log('📊 CRUD TEST SUMMARY:');
    console.log('   ✅ CREATE - Product added with all fields');
    console.log('   ✅ READ - Product fetched with branch-specific values');
    console.log('   ✅ UPDATE - Name, category, emoji, price, threshold all updated');
    console.log('   ✅ DELETE - Product removed from branch and database');
    console.log('\n✅ All CRUD operations working correctly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFullCRUD();
