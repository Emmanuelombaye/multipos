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

const getKenyaDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

async function setReemOpeningStock() {
  console.log('🔄 Setting opening stock for Reem branch...\n');

  try {
    // Get Reem branch
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .ilike('name', '%reem%');

    if (branchError) throw branchError;
    if (!branches || branches.length === 0) {
      throw new Error('Reem branch not found');
    }

    const reemBranch = branches[0];
    console.log(`✅ Found branch: ${reemBranch.name} (${reemBranch.id})\n`);

    // Get products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name');

    if (productsError) throw productsError;

    // Map product names to IDs
    const productMap = {};
    products.forEach(p => {
      productMap[p.name] = p.id;
    });

    // Define opening stock for today
    const today = getKenyaDate();
    const openingStockData = [
      { name: 'Beef', stock: 32 + 51 }, // 83 kg
      { name: 'Goat', stock: 12 },
      { name: 'Matumbo', stock: 7 },
      { name: 'Kuku Broiler', stock: 67 } // pieces (treating as kg for now)
    ];

    console.log(`📅 Date: ${today}\n`);
    console.log('📦 Setting opening stock:\n');

    for (const item of openingStockData) {
      const productId = productMap[item.name];
      if (!productId) {
        console.log(`⚠️  Product "${item.name}" not found, skipping...`);
        continue;
      }

      // Update branch_stock
      const { error: stockError } = await supabase
        .from('branch_stock')
        .update({
          current_stock: item.stock,
          updated_at: new Date().toISOString()
        })
        .eq('branch_id', reemBranch.id)
        .eq('product_id', productId);

      if (stockError) {
        console.error(`❌ Error updating ${item.name}:`, stockError);
        continue;
      }

      // Update or create stock_history for today
      const { data: existingHistory } = await supabase
        .from('stock_history')
        .select('id, opening_stock')
        .eq('branch_id', reemBranch.id)
        .eq('product_id', productId)
        .eq('date', today)
        .maybeSingle();

      if (existingHistory) {
        // Update existing record
        const { error: historyError } = await supabase
          .from('stock_history')
          .update({
            opening_stock: item.stock,
            closing_stock: item.stock,
            added_by: 'Admin (Manual Opening Stock)'
          })
          .eq('id', existingHistory.id);

        if (historyError) {
          console.error(`❌ Error updating history for ${item.name}:`, historyError);
        } else {
          console.log(`✅ ${item.name}: ${item.stock}kg (updated existing record)`);
        }
      } else {
        // Create new record
        const { error: historyError } = await supabase
          .from('stock_history')
          .insert({
            branch_id: reemBranch.id,
            product_id: productId,
            date: today,
            opening_stock: item.stock,
            closing_stock: item.stock,
            added_by: 'Admin (Manual Opening Stock)'
          });

        if (historyError) {
          console.error(`❌ Error creating history for ${item.name}:`, historyError);
        } else {
          console.log(`✅ ${item.name}: ${item.stock}kg (created new record)`);
        }
      }
    }

    console.log('\n✅ Opening stock set successfully!\n');

    // Verify
    console.log('📊 Verification:\n');
    const { data: verification } = await supabase
      .from('branch_stock')
      .select(`
        current_stock,
        products (name)
      `)
      .eq('branch_id', reemBranch.id)
      .in('product_id', Object.values(productMap));

    verification.forEach(v => {
      console.log(`   ${v.products.name}: ${v.current_stock}kg`);
    });

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

setReemOpeningStock();
