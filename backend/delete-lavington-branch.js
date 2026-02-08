import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function deleteLavingtonBranch() {
  const branchId = 'b1ffeada-3b45-42df-8a2b-9f29cefc070c';
  const branchName = 'Edendrop Lavington';

  console.log(`Checking for related data for ${branchName}...\n`);

  // Check for users (staff)
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name')
    .eq('branch_id', branchId);

  if (usersError) {
    console.error('Error checking users:', usersError);
    return;
  }

  console.log(`Users/Staff: ${users.length}`);
  if (users.length > 0) {
    console.log('Found users:');
    users.forEach(u => console.log(`  - ${u.name}`));
  }

  // Check for transactions
  const { count: txCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .eq('branch_id', branchId);

  console.log(`Transactions: ${txCount}`);

  // Check for expenses
  const { count: expenseCount } = await supabase
    .from('expenses')
    .select('id', { count: 'exact' })
    .eq('branch_id', branchId);

  console.log(`Expenses: ${expenseCount}`);

  // Check for stock history
  const { count: stockCount } = await supabase
    .from('stock_history')
    .select('id', { count: 'exact' })
    .eq('branch_id', branchId);

  console.log(`Stock history records: ${stockCount}`);

  console.log('\n--- Deleting Lavington Branch ---\n');

  // Delete users first (if any)
  if (users.length > 0) {
    console.log('Deleting users/staff...');
    const { error: deleteUsersError } = await supabase
      .from('users')
      .delete()
      .eq('branch_id', branchId);

    if (deleteUsersError) {
      console.error('Error deleting users:', deleteUsersError);
      return;
    }
    console.log(`✓ Deleted ${users.length} user(s)`);
  }

  // Delete stock history (if any)
  if (stockCount > 0) {
    console.log('Deleting stock history...');
    const { error: deleteStockError } = await supabase
      .from('stock_history')
      .delete()
      .eq('branch_id', branchId);

    if (deleteStockError) {
      console.error('Error deleting stock history:', deleteStockError);
      return;
    }
    console.log(`✓ Deleted ${stockCount} stock history record(s)`);
  }

  // Delete expenses (if any)
  if (expenseCount > 0) {
    console.log('Deleting expenses...');
    const { error: deleteExpenseError } = await supabase
      .from('expenses')
      .delete()
      .eq('branch_id', branchId);

    if (deleteExpenseError) {
      console.error('Error deleting expenses:', deleteExpenseError);
      return;
    }
    console.log(`✓ Deleted ${expenseCount} expense(s)`);
  }

  // Finally, delete the branch
  console.log('Deleting branch...');
  const { error: deleteBranchError } = await supabase
    .from('branches')
    .delete()
    .eq('id', branchId);

  if (deleteBranchError) {
    console.error('Error deleting branch:', deleteBranchError);
    return;
  }

  console.log(`\n✅ Successfully deleted ${branchName} branch!`);

  // Verify deletion
  const { data: remainingBranches } = await supabase
    .from('branches')
    .select('name')
    .order('name');

  console.log(`\nRemaining branches: ${remainingBranches.length}`);
  remainingBranches.forEach((b, i) => console.log(`  ${i + 1}. ${b.name}`));

  process.exit(0);
}

deleteLavingtonBranch();
