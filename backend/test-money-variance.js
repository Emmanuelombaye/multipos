import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function testMoneyVariance() {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  console.log('=== MONEY VARIANCE TEST ===');
  console.log(`Date: ${today}\n`);

  // Use Reem branch for testing
  const { data: branch } = await supabase
    .from('branches')
    .select('*')
    .eq('name', 'Edendrop Reem')
    .single();

  console.log(`Branch: ${branch.name}\n`);

  // Get cashier user
  const { data: cashier } = await supabase
    .from('users')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('role', 'cashier')
    .limit(1)
    .single();

  console.log('--- STEP 1: Check Opening Cash ---\n');
  
  // Get opening cash from cash_register
  const { data: cashRegister } = await supabase
    .from('cash_register')
    .select('*')
    .eq('branch_id', branch.id)
    .eq('date', today)
    .maybeSingle();

  const openingCash = cashRegister?.opening_cash || 0;
  console.log(`Opening Cash: KES ${openingCash.toLocaleString()}`);

  console.log('\n--- STEP 2: Add Expense ---\n');
  
  // Add an expense
  const expenseAmount = 500;
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      branch_id: branch.id,
      category: 'supplies',
      amount: expenseAmount,
      description: 'Test expense for variance',
      recorded_by: cashier.id
    })
    .select()
    .single();

  if (expenseError) {
    console.log('Error adding expense:', expenseError);
    process.exit(1);
  }

  console.log(`Expense Added: KES ${expenseAmount}`);
  console.log(`Category: ${expense.category}`);
  console.log(`Description: ${expense.description}`);

  console.log('\n--- STEP 3: Make Sales ---\n');

  // Get a product
  const { data: product } = await supabase
    .from('branch_stock')
    .select('*, products(*)')
    .eq('branch_id', branch.id)
    .gt('current_stock', 10)
    .limit(1)
    .single();

  console.log(`Product: ${product.products.name}`);
  console.log(`Available Stock: ${product.current_stock} ${product.products.unit}`);
  console.log(`Price: KES ${product.price_per_kg}/kg`);

  // Create sale 1 - Cash
  const sale1Qty = 2;
  const sale1Amount = sale1Qty * product.price_per_kg;
  
  const { data: transaction1 } = await supabase
    .from('transactions')
    .insert({
      branch_id: branch.id,
      cashier_id: cashier.id,
      payment_method: 'cash',
      total: sale1Amount
    })
    .select()
    .single();

  await supabase.from('transaction_items').insert({
    transaction_id: transaction1.id,
    product_id: product.product_id,
    quantity: sale1Qty,
    price_per_kg: product.price_per_kg,
    subtotal: sale1Amount
  });

  console.log(`\nSale 1 (Cash): ${sale1Qty} kg × KES ${product.price_per_kg} = KES ${sale1Amount}`);

  // Create sale 2 - M-Pesa
  const sale2Qty = 3;
  const sale2Amount = sale2Qty * product.price_per_kg;
  
  const { data: transaction2 } = await supabase
    .from('transactions')
    .insert({
      branch_id: branch.id,
      cashier_id: cashier.id,
      payment_method: 'mpesa',
      total: sale2Amount
    })
    .select()
    .single();

  await supabase.from('transaction_items').insert({
    transaction_id: transaction2.id,
    product_id: product.product_id,
    quantity: sale2Qty,
    price_per_kg: product.price_per_kg,
    subtotal: sale2Amount
  });

  console.log(`Sale 2 (M-Pesa): ${sale2Qty} kg × KES ${product.price_per_kg} = KES ${sale2Amount}`);

  // Deduct stock
  const newStock = product.current_stock - sale1Qty - sale2Qty;
  await supabase
    .from('branch_stock')
    .update({ current_stock: newStock })
    .eq('branch_id', branch.id)
    .eq('product_id', product.product_id);

  console.log(`\nStock Updated: ${product.current_stock} → ${newStock} ${product.products.unit}`);

  console.log('\n--- STEP 4: Calculate Expected Cash ---\n');

  const totalSales = sale1Amount + sale2Amount;
  const cashSales = sale1Amount; // Only cash sales
  const mpesaSales = sale2Amount;

  console.log(`Total Sales: KES ${totalSales.toLocaleString()}`);
  console.log(`  - Cash Sales: KES ${cashSales.toLocaleString()}`);
  console.log(`  - M-Pesa Sales: KES ${mpesaSales.toLocaleString()}`);
  console.log(`Expenses: KES ${expenseAmount.toLocaleString()}`);

  const expectedCash = openingCash + cashSales - expenseAmount;
  console.log(`\nExpected Cash in Drawer:`);
  console.log(`  Opening: KES ${openingCash.toLocaleString()}`);
  console.log(`  + Cash Sales: KES ${cashSales.toLocaleString()}`);
  console.log(`  - Expenses: KES ${expenseAmount.toLocaleString()}`);
  console.log(`  = Expected: KES ${expectedCash.toLocaleString()}`);

  console.log('\n--- STEP 5: Cashier Closes with Different Amount ---\n');

  // Cashier counts and submits LESS cash (simulating shortage)
  const actualCash = expectedCash - 200; // 200 KES short
  
  console.log(`Cashier Counted: KES ${actualCash.toLocaleString()}`);
  console.log(`Expected: KES ${expectedCash.toLocaleString()}`);
  console.log(`Difference: KES ${actualCash - expectedCash} (SHORTAGE)`);

  // Update cash register with closing
  await supabase
    .from('cash_register')
    .upsert({
      branch_id: branch.id,
      date: today,
      opening_cash: openingCash,
      closing_cash: actualCash,
      total_cash_sales: cashSales,
      total_mpesa_sales: mpesaSales,
      total_expenses: expenseAmount,
      closed_by: cashier.id
    }, { onConflict: 'branch_id,date' });

  console.log('\n--- STEP 6: Money Variance Calculation ---\n');

  const moneyVariance = actualCash - expectedCash;
  
  console.log('Formula:');
  console.log('  Money Variance = Actual Cash - Expected Cash');
  console.log(`  Money Variance = ${actualCash} - ${expectedCash}`);
  console.log(`  Money Variance = KES ${moneyVariance}`);

  console.log('\n--- INTERPRETATION ---\n');
  
  if (moneyVariance === 0) {
    console.log('✅ NO MONEY VARIANCE');
    console.log('   Cash matches perfectly!');
  } else if (moneyVariance < 0) {
    console.log('⚠️  MONEY SHORTAGE');
    console.log(`   Amount Short: KES ${Math.abs(moneyVariance)}`);
    console.log('   Possible Causes:');
    console.log('     - Cashier gave wrong change');
    console.log('     - Unrecorded expense');
    console.log('     - Theft');
    console.log('     - Counting error');
  } else {
    console.log('⚠️  MONEY SURPLUS');
    console.log(`   Amount Over: KES ${moneyVariance}`);
    console.log('   Possible Causes:');
    console.log('     - Cashier received extra payment');
    console.log('     - Unrecorded sale');
    console.log('     - Counting error');
  }

  console.log('\n--- SUMMARY ---\n');
  console.log(`Opening Cash: KES ${openingCash.toLocaleString()}`);
  console.log(`Cash Sales: KES ${cashSales.toLocaleString()}`);
  console.log(`M-Pesa Sales: KES ${mpesaSales.toLocaleString()}`);
  console.log(`Total Sales: KES ${totalSales.toLocaleString()}`);
  console.log(`Expenses: KES ${expenseAmount.toLocaleString()}`);
  console.log(`Expected Cash: KES ${expectedCash.toLocaleString()}`);
  console.log(`Actual Cash: KES ${actualCash.toLocaleString()}`);
  console.log(`Money Variance: KES ${moneyVariance} ${moneyVariance < 0 ? '(SHORT)' : moneyVariance > 0 ? '(OVER)' : '(PERFECT)'}`);

  console.log('\n--- CLEANUP ---');
  console.log('Deleting test data...');
  
  await supabase.from('transaction_items').delete().eq('transaction_id', transaction1.id);
  await supabase.from('transaction_items').delete().eq('transaction_id', transaction2.id);
  await supabase.from('transactions').delete().eq('id', transaction1.id);
  await supabase.from('transactions').delete().eq('id', transaction2.id);
  await supabase.from('expenses').delete().eq('id', expense.id);
  await supabase.from('cash_register').delete().eq('branch_id', branch.id).eq('date', today);
  await supabase.from('branch_stock').update({ current_stock: product.current_stock }).eq('branch_id', branch.id).eq('product_id', product.product_id);
  
  console.log('✅ Test data cleaned up');

  process.exit(0);
}

testMoneyVariance();
