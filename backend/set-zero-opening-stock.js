import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const getKenyaDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

async function setZeroOpeningStock() {
  const branchNames = ['msambweni', 'reem', 'tamasha'];
  const today = getKenyaDate();

  console.log(`📅 Date: ${today}\n`);
  console.log('🔄 Setting opening stock to ZERO for all products...\n');

  for (const branchName of branchNames) {
    console.log(`\n=== ${branchName.toUpperCase()} ===`);

    const { data: branches, error: brErr } = await supabase
      .from('branches')
      .select('id, name')
      .ilike('name', `%${branchName}%`);

    if (brErr || !branches || branches.length === 0) {
      console.log(`❌ Branch "${branchName}" not found`);
      continue;
    }

    const branch = branches[0];
    console.log(`✅ Found: ${branch.name} (${branch.id})`);

    const { data: branchStock, error: stockErr } = await supabase
      .from('branch_stock')
      .select('product_id, products(name)')
      .eq('branch_id', branch.id);

    if (stockErr || !branchStock || branchStock.length === 0) {
      console.log(`⚠️  No stock records found`);
      continue;
    }

    console.log(`📦 Setting ${branchStock.length} products to 0:\n`);

    for (const item of branchStock) {
      const productName = item.products?.name || 'Unknown';

      const { error: updateErr } = await supabase
        .from('branch_stock')
        .update({
          current_stock: 0,
          updated_at: new Date().toISOString()
        })
        .eq('branch_id', branch.id)
        .eq('product_id', item.product_id);

      if (updateErr) {
        console.log(`   ❌ ${productName}: Failed`);
        continue;
      }

      const { data: existingHistory } = await supabase
        .from('stock_history')
        .select('id')
        .eq('branch_id', branch.id)
        .eq('product_id', item.product_id)
        .eq('date', today)
        .maybeSingle();

      if (existingHistory) {
        await supabase
          .from('stock_history')
          .update({
            opening_stock: 0,
            closing_stock: 0,
            added_by: 'Admin (Zero Stock Reset)'
          })
          .eq('id', existingHistory.id);
      } else {
        await supabase
          .from('stock_history')
          .insert({
            branch_id: branch.id,
            product_id: item.product_id,
            date: today,
            opening_stock: 0,
            closing_stock: 0,
            added_by: 'Admin (Zero Stock Reset)'
          });
      }

      console.log(`   ✅ ${productName}: 0`);
    }
  }

  console.log('\n\n✅ All branches set to zero stock!\n');
}

setZeroOpeningStock().catch(e => console.error('❌ FATAL:', e.message));
