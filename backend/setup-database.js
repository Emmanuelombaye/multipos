import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function setupDatabase() {
  console.log('=== DATABASE SETUP SCRIPT ===');
  console.log('This will reset the database to a clean state\n');

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  try {
    // ============================================
    // STEP 1: Clean up existing data
    // ============================================
    console.log('STEP 1: Cleaning up existing data...\n');

    // Delete in correct order (respecting foreign keys)
    await supabase.from('transaction_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stock_additions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stock_transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stock_transfer_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('external_dispatches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('cash_register').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('stock_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('branch_stock').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Cleaned up transactions, stock movements, and history\n');

    // ============================================
    // STEP 2: Get or create branches
    // ============================================
    console.log('STEP 2: Setting up branches...\n');

    const { data: existingBranches } = await supabase.from('branches').select('*');
    
    let branches = {};
    
    if (existingBranches && existingBranches.length > 0) {
      console.log('Using existing branches:');
      existingBranches.forEach(b => {
        console.log(`  - ${b.name}`);
        if (b.name.includes('Tamasha')) branches.tamasha = b;
        if (b.name.includes('Reem')) branches.reem = b;
        if (b.name.includes('Msambweni') || b.name.includes('Msabweni')) branches.msambweni = b;
      });
      
      // Ensure all branches exist
      if (!branches.tamasha || !branches.reem || !branches.msambweni) {
        console.log('\n⚠️  Missing branches, creating them...');
        
        if (!branches.tamasha) {
          const { data: tamasha } = await supabase.from('branches').insert({
            name: 'Edendrop Tamasha',
            location: 'Tamasha Complex',
            status: 'open'
          }).select().single();
          branches.tamasha = tamasha;
        }
        
        if (!branches.reem) {
          const { data: reem } = await supabase.from('branches').insert({
            name: 'Edendrop Reem',
            location: 'Reem Plaza',
            status: 'open'
          }).select().single();
          branches.reem = reem;
        }
        
        if (!branches.msambweni) {
          const { data: msambweni } = await supabase.from('branches').insert({
            name: 'Edendrop Msambweni',
            location: 'Msambweni',
            status: 'open'
          }).select().single();
          branches.msambweni = msambweni;
        }
      }
    } else {
      console.log('Creating new branches...');
      const { data: tamasha } = await supabase.from('branches').insert({
        name: 'Edendrop Tamasha',
        location: 'Tamasha Complex',
        status: 'open'
      }).select().single();
      
      const { data: reem } = await supabase.from('branches').insert({
        name: 'Edendrop Reem',
        location: 'Reem Plaza',
        status: 'open'
      }).select().single();
      
      const { data: msambweni } = await supabase.from('branches').insert({
        name: 'Edendrop Msambweni',
        location: 'Msambweni',
        status: 'open'
      }).select().single();
      
      branches = { tamasha, reem, msambweni };
      console.log('✅ Created 3 branches');
    }
    
    console.log('');

    // ============================================
    // STEP 3: Setup products (no duplicates)
    // ============================================
    console.log('STEP 3: Setting up products...\n');

    const { data: existingProducts } = await supabase.from('products').select('*');
    
    const productDefinitions = [
      { name: 'Beef', category: 'meat', price_per_kg: 850, unit: 'kg' },
      { name: 'Goat', category: 'meat', price_per_kg: 900, unit: 'kg' },
      { name: 'Matumbo', category: 'offal', price_per_kg: 450, unit: 'kg' },
      { name: 'Kuku Broiler', category: 'poultry', price_per_kg: 550, unit: 'pieces' },
      { name: 'Kuku Kienyeji', category: 'poultry', price_per_kg: 750, unit: 'pieces' },
      { name: 'Fillets', category: 'meat', price_per_kg: 950, unit: 'kg' },
      { name: 'Minced Meat', category: 'meat', price_per_kg: 700, unit: 'kg' }
    ];

    let products = {};

    for (const prodDef of productDefinitions) {
      const existing = existingProducts?.find(p => p.name === prodDef.name);
      
      let productKey = prodDef.name.toLowerCase().replace(/ /g, '_');
      
      if (existing) {
        // Update existing product
        const { data: updated, error } = await supabase
          .from('products')
          .update({
            category: prodDef.category,
            price_per_kg: prodDef.price_per_kg,
            unit: prodDef.unit
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          console.log(`  ❌ Error updating ${prodDef.name}:`, error);
          products[productKey] = existing; // Use existing if update fails
        } else {
          products[productKey] = updated || existing;
          console.log(`  ✓ Updated ${prodDef.name} (key: ${productKey})`);
        }
      } else {
        // Create new product
        const { data: created, error } = await supabase
          .from('products')
          .insert(prodDef)
          .select()
          .single();
        
        if (error) {
          console.log(`  ❌ Error creating ${prodDef.name}:`, error);
        } else {
          products[productKey] = created;
          console.log(`  + Created ${prodDef.name} (key: ${productKey})`);
        }
      }
    }

    console.log('\n✅ Products setup complete\n');

    // ============================================
    // STEP 4: Setup branch stock (Reem only)
    // ============================================
    console.log('STEP 4: Setting up initial stock for Reem branch...\n');

    // Debug: Check products
    console.log('Products available:');
    console.log('  beef:', products.beef ? products.beef.name : 'NULL');
    console.log('  goat:', products.goat ? products.goat.name : 'NULL');
    console.log('  matumbo:', products.matumbo ? products.matumbo.name : 'NULL');
    console.log('  kuku_broiler:', products.kuku_broiler ? products.kuku_broiler.name : 'NULL');
    console.log('');

    const reemStock = [
      { product: products.beef, quantity: 83, price: 730, threshold: 20 },
      { product: products.goat, quantity: 12, price: 900, threshold: 10 },
      { product: products.matumbo, quantity: 7, price: 450, threshold: 5 },
      { product: products.kuku_broiler, quantity: 67, price: 550, threshold: 20 }
    ];

    for (const item of reemStock) {
      await supabase.from('branch_stock').upsert({
        branch_id: branches.reem.id,
        product_id: item.product.id,
        current_stock: item.quantity,
        price_per_kg: item.price,
        low_stock_threshold: item.threshold
      }, { onConflict: 'branch_id,product_id' });

      console.log(`  ✓ ${item.product.name}: ${item.quantity} ${item.product.unit}`);
    }

    // Initialize other products with 0 stock for Reem
    const otherProducts = [products.kuku_kienyeji, products.fillets, products.minced_meat];
    for (const product of otherProducts) {
      await supabase.from('branch_stock').upsert({
        branch_id: branches.reem.id,
        product_id: product.id,
        current_stock: 0,
        price_per_kg: product.price_per_kg,
        low_stock_threshold: 10
      }, { onConflict: 'branch_id,product_id' });
    }

    console.log('\n✅ Reem stock initialized\n');

    // ============================================
    // STEP 5: Initialize Tamasha and Msambweni with 0 stock
    // ============================================
    console.log('STEP 5: Initializing Tamasha and Msambweni with zero stock...\n');

    const allProducts = Object.values(products);
    
    for (const branch of [branches.tamasha, branches.msambweni]) {
      for (const product of allProducts) {
        await supabase.from('branch_stock').upsert({
          branch_id: branch.id,
          product_id: product.id,
          current_stock: 0,
          price_per_kg: product.price_per_kg,
          low_stock_threshold: 10
        }, { onConflict: 'branch_id,product_id' });
      }
      console.log(`  ✓ ${branch.name}: All products set to 0`);
    }

    console.log('\n✅ All branches initialized\n');

    // ============================================
    // STEP 6: Setup stock history for Reem
    // ============================================
    console.log('STEP 6: Setting up stock history for Reem...\n');

    for (const item of reemStock) {
      await supabase.from('stock_history').upsert({
        branch_id: branches.reem.id,
        product_id: item.product.id,
        date: today,
        opening_stock: item.quantity,
        closing_stock: item.quantity,
        added_by: 'System Setup'
      }, { onConflict: 'branch_id,product_id,date' });
    }

    console.log('✅ Stock history created for Reem\n');

    // ============================================
    // STEP 7: Verify setup
    // ============================================
    console.log('STEP 7: Verifying setup...\n');

    const { data: branchList } = await supabase.from('branches').select('*');
    console.log(`Branches: ${branchList.length}`);
    branchList.forEach(b => console.log(`  - ${b.name} (${b.status})`));

    const { data: productList } = await supabase.from('products').select('*');
    console.log(`\nProducts: ${productList.length}`);
    productList.forEach(p => console.log(`  - ${p.name} (${p.price_per_kg} KES/${p.unit})`));

    const { data: stockList } = await supabase
      .from('branch_stock')
      .select('*, branches(name), products(name, unit)')
      .gt('current_stock', 0);
    
    console.log(`\nStock with inventory:`);
    stockList.forEach(s => {
      console.log(`  - ${s.branches.name}: ${s.products.name} = ${s.current_stock} ${s.products.unit}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ DATABASE SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  - 3 Branches (Tamasha, Reem, Msambweni)`);
    console.log(`  - 7 Products (Beef, Goat, Matumbo, Kuku Broiler, Kuku Kienyeji, Fillets, Minced Meat)`);
    console.log(`  - Reem has initial stock (Beef: 83kg, Goat: 12kg, Matumbo: 7kg, Kuku Broiler: 67 pieces)`);
    console.log(`  - Tamasha and Msambweni start with 0 stock`);
    console.log(`  - No duplicate data`);
    console.log(`  - Ready for testing!\n`);

  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }

  process.exit(0);
}

setupDatabase();
