import { supabase } from './supabase.js';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // 1. Create branches
    console.log('📍 Creating branches...');
    const branchesData = [
      {
        name: 'Edendrop Tamasha',
        location: 'Tamasha Complex',
        status: 'open'
      },
      {
        name: 'Edendrop Reem',
        location: 'Reem Plaza',
        status: 'open'
      },
      {
        name: 'Edendrop Lavington',
        location: 'Lavington Mall',
        status: 'open'
      }
    ];

    const branches = [];
    for (const branch of branchesData) {
      const { data, error } = await supabase
        .from('branches')
        .insert(branch)
        .select()
        .single();
      if (error) console.error('Branch error:', error);
      else {
        branches.push(data);
        console.log(`✓ Created branch: ${branch.name}`);
      }
    }

    // 2. Create products
    console.log('\n🥩 Creating products...');
    const productsData = [
      { name: 'Beef - Fillet', category: 'beef', price_per_kg: 850, low_stock_threshold: 10, image: '🥩' },
      { name: 'Beef - Sirloin', category: 'beef', price_per_kg: 750, low_stock_threshold: 10, image: '🥩' },
      { name: 'Beef - Ribs', category: 'beef', price_per_kg: 650, low_stock_threshold: 15, image: '🍖' },
      { name: 'Mutton - Leg', category: 'mutton', price_per_kg: 900, low_stock_threshold: 8, image: '🍖' },
      { name: 'Mutton - Chops', category: 'mutton', price_per_kg: 950, low_stock_threshold: 8, image: '🥩' },
      { name: 'Chicken - Whole', category: 'chicken', price_per_kg: 420, low_stock_threshold: 20, image: '🍗' },
      { name: 'Chicken - Breast', category: 'chicken', price_per_kg: 480, low_stock_threshold: 15, image: '🍗' },
      { name: 'Chicken - Wings', category: 'chicken', price_per_kg: 380, low_stock_threshold: 15, image: '🍗' },
      { name: 'Pork - Chops', category: 'pork', price_per_kg: 700, low_stock_threshold: 10, image: '🥓' },
      { name: 'Pork - Bacon', category: 'pork', price_per_kg: 850, low_stock_threshold: 8, image: '🥓' },
      { name: 'Sausages - Beef', category: 'processed', price_per_kg: 550, low_stock_threshold: 12, image: '🌭' },
      { name: 'Minced Meat', category: 'processed', price_per_kg: 600, low_stock_threshold: 15, image: '🥩' }
    ];

    const products = [];
    for (const product of productsData) {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) console.error('Product error:', error);
      else {
        products.push(data);
        console.log(`✓ Created product: ${product.name}`);
      }
    }

    // 3. Create branch stock for each branch-product combination
    console.log('\n📦 Creating branch stock...');
    for (const branch of branches) {
      for (const product of products) {
        const stockAmount = Math.floor(Math.random() * 50) + 20; // Random stock between 20-70kg
        const { error } = await supabase
          .from('branch_stock')
          .insert({
            product_id: product.id,
            branch_id: branch.id,
            current_stock: stockAmount
          });
        if (error && error.code !== '23505') { // Ignore duplicate constraint
          console.error('Branch stock error:', error);
        }
      }
      console.log(`✓ Created stock for ${branch.name}`);
    }

    // 4. Create stock history entries for today
    console.log('\n📊 Creating stock history...');
    const today = new Date().toISOString().split('T')[0];
    for (const branch of branches) {
      for (const product of products) {
        const stockAmount = Math.floor(Math.random() * 50) + 20;
        const { error } = await supabase
          .from('stock_history')
          .insert({
            product_id: product.id,
            branch_id: branch.id,
            opening_stock: stockAmount,
            closing_stock: stockAmount,
            date: today,
            added_by: 'System'
          });
        if (error && error.code !== '23505') {
          console.error('Stock history error:', error);
        }
      }
    }
    console.log('✓ Created stock history entries');

    // 5. Create users
    console.log('\n👥 Creating users...');
    const password = await bcrypt.hash('password123', 10);
    
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password_hash: password,
        role: 'admin',
        branch_id: null
      },
      {
        name: 'Manager Tamasha',
        email: 'manager@example.com',
        password_hash: password,
        role: 'manager',
        branch_id: branches[0]?.id
      },
      {
        name: 'Cashier Tamasha',
        email: 'cashier@example.com',
        password_hash: password,
        role: 'cashier',
        branch_id: branches[0]?.id
      },
      {
        name: 'Cashier Reem',
        email: 'cashier2@example.com',
        password_hash: password,
        role: 'cashier',
        branch_id: branches[1]?.id
      }
    ];

    for (const user of users) {
      const { error } = await supabase
        .from('users')
        .insert(user);
      if (error) console.error('User error:', error);
      else console.log(`✓ Created user: ${user.email} (${user.role})`);
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Admin: admin@example.com / password123');
    console.log('   Manager: manager@example.com / password123');
    console.log('   Cashier: cashier@example.com / password123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seed();
