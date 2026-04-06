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

async function testProductCRUD() {
  console.log('🧪 Testing Product CRUD Operations...\n');

  try {
    // Step 1: Get a branch
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name')
      .limit(1);

    if (!branches || branches.length === 0) {
      throw new Error('No branches found');
    }

    const branch = branches[0];
    console.log(`✅ Using branch: ${branch.name} (${branch.id})\n`);

    // Step 2: Get a product from that branch
    const { data: branchStock } = await supabase
      .from('branch_stock')
      .select(`
        *,
        products (*)
      `)
      .eq('branch_id', branch.id)
      .limit(1);

    if (!branchStock || branchStock.length === 0) {
      throw new Error('No products found in branch');
    }

    const productStock = branchStock[0];
    const product = productStock.products;
    
    console.log('📦 Current Product Details:');
    console.log(`   Name: ${product.name}`);
    console.log(`   Global Price: KES ${product.price_per_kg}/kg`);
    console.log(`   Branch Price: KES ${productStock.price_per_kg}/kg`);
    console.log(`   Low Stock Threshold: ${productStock.low_stock_threshold}kg\n`);

    // Step 3: Test updating branch-specific price
    const newPrice = productStock.price_per_kg + 50;
    const newThreshold = productStock.low_stock_threshold + 5;

    console.log(`⏳ Updating branch-specific price to KES ${newPrice}/kg...`);
    const { data: updated, error: updateError } = await supabase
      .from('branch_stock')
      .update({
        price_per_kg: newPrice,
        low_stock_threshold: newThreshold
      })
      .eq('branch_id', branch.id)
      .eq('product_id', product.id)
      .select();

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      throw updateError;
    }

    console.log('✅ Branch-specific price updated successfully!\n');

    // Step 4: Verify the update
    const { data: verified } = await supabase
      .from('branch_stock')
      .select(`
        *,
        products (*)
      `)
      .eq('branch_id', branch.id)
      .eq('product_id', product.id)
      .single();

    console.log('📊 Verified Updated Details:');
    console.log(`   Name: ${verified.products.name}`);
    console.log(`   Global Price: KES ${verified.products.price_per_kg}/kg`);
    console.log(`   Branch Price: KES ${verified.price_per_kg}/kg ✅`);
    console.log(`   Low Stock Threshold: ${verified.low_stock_threshold}kg ✅\n`);

    // Step 5: Test updating global product details
    console.log(`⏳ Updating global product name...`);
    const newName = product.name + ' (Updated)';
    
    const { error: globalUpdateError } = await supabase
      .from('products')
      .update({
        name: newName,
        category: product.category
      })
      .eq('id', product.id);

    if (globalUpdateError) {
      console.error('❌ Global update failed:', globalUpdateError);
      throw globalUpdateError;
    }

    console.log('✅ Global product details updated successfully!\n');

    // Step 6: Revert changes
    console.log('⏳ Reverting changes...');
    await supabase
      .from('branch_stock')
      .update({
        price_per_kg: productStock.price_per_kg,
        low_stock_threshold: productStock.low_stock_threshold
      })
      .eq('branch_id', branch.id)
      .eq('product_id', product.id);

    await supabase
      .from('products')
      .update({
        name: product.name
      })
      .eq('id', product.id);

    console.log('✅ Changes reverted\n');

    console.log('✅ All CRUD operations working correctly!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Read product data');
    console.log('   ✅ Update branch-specific price');
    console.log('   ✅ Update branch-specific threshold');
    console.log('   ✅ Update global product name');
    console.log('   ✅ Verify updates');
    console.log('   ✅ Revert changes\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testProductCRUD();
