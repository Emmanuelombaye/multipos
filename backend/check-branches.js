import 'dotenv/config';
import supabase from './src/db/supabase.js';

async function checkBranches() {
  console.log('Fetching all branches...\n');
  
  const { data: branches, error } = await supabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total Branches: ${branches.length}\n`);
  
  branches.forEach((branch, index) => {
    console.log(`${index + 1}. ${branch.name}`);
    console.log(`   ID: ${branch.id}`);
    console.log(`   Location: ${branch.location}`);
    console.log(`   Status: ${branch.status}`);
    console.log(`   Created: ${new Date(branch.created_at).toLocaleString()}`);
    console.log('');
  });

  // Check transaction counts per branch
  console.log('Transaction counts per branch:\n');
  for (const branch of branches) {
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact' })
      .eq('branch_id', branch.id);
    console.log(`${branch.name}: ${count} transactions`);
  }

  process.exit(0);
}

checkBranches();
