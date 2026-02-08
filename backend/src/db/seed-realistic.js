import { supabase } from './supabase.js';
import bcrypt from 'bcryptjs';

// Helper to generate dates
const generateDateRange = (startDate, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
};

// Helper to generate random numbers
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seed() {
  try {
    console.log('🌱 Generating 1-month realistic dataset...\n');

    // 1. Get existing branches
    console.log('📍 Getting branches...');
    const { data: existingBranches } = await supabase
      .from('branches')
      .select('*');
    
    const branches = existingBranches || [];
    console.log(`✓ Found ${branches.length} branches`);

    // 2. Get existing products
    console.log('\n🥩 Getting products...');
    let { data: existingProducts } = await supabase
      .from('products')
      .select('*');
    
    const products = existingProducts || [];
    console.log(`✓ Found ${products.length} products`);

    // 3. Get existing users
    console.log('\n👥 Getting staff...');
    let { data: existingUsers } = await supabase
      .from('users')
      .select('*');
    
    const users = existingUsers || [];
    console.log(`✓ Found ${users.length} staff members`);

    // 4. Initialize branch stock
    console.log('\n📦 Initializing branch stock...');
    for (const branch of branches) {
      let stockCount = 0;
      for (const product of products) {
        const initialStock = random(30, 100);
        try {
          await supabase
            .from('branch_stock')
            .upsert({
              product_id: product.id,
              branch_id: branch.id,
              current_stock: initialStock
            });
          stockCount++;
        } catch (err) {
          // Ignore duplicates
        }
      }
      console.log(`✓ Stock initialized for ${branch.name} (${stockCount} items)`);
    }

    // 5. Generate 1 month of transactions
    console.log('\n💰 Generating 1 month of transactions...');
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();
    const dates = generateDateRange(startDate, endDate);

    let transactionCount = 0;
    let transactionItemCount = 0;
    let dateProgress = 0;
    
    for (const date of dates) {
      dateProgress++;
      if (dateProgress % 10 === 0) {
        console.log(`  Processing day ${dateProgress}/${dates.length}...`);
      }
      
      // 2-5 transactions per day per branch
      const branchesToProcess = branches.slice(0, random(1, branches.length));
      
      for (const branch of branchesToProcess) {
        const transactionsPerDay = random(2, 5);
        
        for (let i = 0; i < transactionsPerDay; i++) {
          // Select 2-5 random products
          const itemCount = random(2, 5);
          const selectedProducts = [];
          for (let j = 0; j < itemCount; j++) {
            selectedProducts.push(products[random(0, products.length - 1)]);
          }

          // Calculate total
          let total = 0;
          const items = selectedProducts.map(prod => {
            const quantity = random(1, 5);
            const subtotal = quantity * prod.price_per_kg;
            total += subtotal;
            return {
              product_id: prod.id,
              quantity,
              price_per_kg: prod.price_per_kg,
              subtotal
            };
          });

          const paymentMethods = ['cash', 'mpesa', 'card'];
          const paymentMethod = paymentMethods[random(0, 2)];

          // Get cashier ID (UUID) for this branch
          const branchCashiers = users.filter(u => u.branch_id === branch.id && u.role === 'cashier');
          const cashier = branchCashiers.length > 0 
            ? branchCashiers[random(0, branchCashiers.length - 1)] 
            : users.find(u => u.role === 'cashier') || users[0];

          if (!cashier) {
            continue;
          }

          // Insert transaction
          const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert({
              branch_id: branch.id,
              cashier_id: cashier.id,
              payment_method: paymentMethod,
              total,
              created_at: new Date(date.getTime() + random(0, 86400000)).toISOString()
            })
            .select()
            .single();

          if (txError) {
            continue;
          }

          transactionCount++;

          // Insert transaction items
          for (const item of items) {
            const { error: itemError } = await supabase
              .from('transaction_items')
              .insert({
                transaction_id: transaction.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price_per_kg: item.price_per_kg,
                subtotal: item.subtotal
              });

            if (!itemError) transactionItemCount++;
          }
        }
      }
    }
    console.log(`✓ Generated ${transactionCount} transactions with ${transactionItemCount} items`);

    // 6. Generate stock history
    console.log('\n📊 Generating stock history...');
    let historyCount = 0;
    let historyProgress = 0;
    
    for (const date of dates) {
      historyProgress++;
      if (historyProgress % 5 === 0) {
        console.log(`  Processing stock history day ${historyProgress}/${dates.length}...`);
      }
      
      const dateStr = date.toISOString().split('T')[0];
      
      for (const branch of branches) {
        for (const product of products) {
          const openingStock = random(20, 100);
          const closingStock = Math.max(5, openingStock - random(0, 30));

          try {
            const { error } = await supabase
              .from('stock_history')
              .upsert(
                {
                  product_id: product.id,
                  branch_id: branch.id,
                  opening_stock: openingStock,
                  closing_stock: closingStock,
                  date: dateStr,
                  added_by: 'System Auto-Count'
                },
                { onConflict: 'branch_id,product_id,date' }
              );

            if (!error) historyCount++;
          } catch (err) {
            // Ignore duplicates
          }
        }
      }
    }
    console.log(`✓ Generated ${historyCount} stock history entries`);

    // 7. Generate expenses
    console.log('\n💸 Generating daily expenses...');
    const expenseCategories = ['supplies', 'utilities', 'petty-cash', 'maintenance', 'other'];
    let expenseCount = 0;
    let expenseProgress = 0;
    
    for (const date of dates) {
      expenseProgress++;
      if (expenseProgress % 5 === 0) {
        console.log(`  Processing expenses day ${expenseProgress}/${dates.length}...`);
      }
      
      for (const branch of branches) {
        // 1-3 expenses per branch per day
        const expensesPerDay = random(1, 3);
        
        for (let i = 0; i < expensesPerDay; i++) {
          const category = expenseCategories[random(0, 4)];
          const amount = random(500, 5000);
          const descriptions = {
            supplies: ['Cleaning supplies', 'Office supplies', 'Packaging materials', 'Plastic bags', 'Labels'],
            utilities: ['Water bill', 'Electricity bill', 'Internet', 'Phone'],
            'petty-cash': ['Staff meal', 'Transport', 'Small purchase', 'Miscellaneous'],
            maintenance: ['Freezer maintenance', 'Equipment repair', 'Plumbing fix', 'Electrical repair'],
            other: ['Misc expense', 'Ad placement', 'License renewal', 'Training']
          };
          const description = descriptions[category][random(0, descriptions[category].length - 1)];

          // Get a random manager or admin from this branch to record the expense
          const branchUsers = users.filter(u => u.branch_id === branch.id && (u.role === 'manager' || u.role === 'admin'));
          const recordedBy = branchUsers.length > 0 
            ? branchUsers[random(0, branchUsers.length - 1)].id 
            : users.find(u => u.role === 'admin')?.id || users[0]?.id;

          if (!recordedBy) {
            continue;
          }

          const { error } = await supabase
            .from('expenses')
            .insert({
              branch_id: branch.id,
              category,
              amount,
              description,
              recorded_by: recordedBy,
              created_at: new Date(date.getTime() + random(0, 86400000)).toISOString()
            });

          if (!error) expenseCount++;
        }
      }
    }
    console.log(`✓ Generated ${expenseCount} expense entries`);

    console.log('\n✅ Dataset generation completed!\n');
    console.log('📊 Summary:');
    console.log(`   • Branches: ${branches.length}`);
    console.log(`   • Products: ${products.length}`);
    console.log(`   • Users: ${users.length}`);
    console.log(`   • Transactions: ${transactionCount}`);
    console.log(`   • Transaction Items: ${transactionItemCount}`);
    console.log(`   • Stock History Entries: ${historyCount}`);
    console.log(`   • Expense Entries: ${expenseCount}`);
    console.log(`   • Date Range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log('   Admin: admin@example.com / password123');
    console.log('   Manager: sarah.manager@example.com / password123');
    console.log('   Cashier: alice.cashier@example.com / password123');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

seed();
