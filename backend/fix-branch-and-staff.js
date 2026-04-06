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

async function fixBranchAndStaff() {
  console.log('🔄 Fixing branch name and staff structure...\n');

  try {
    // Step 1: Fix branch name from Msabweni to Msambweni
    console.log('⏳ Step 1: Correcting branch name...');
    const { data: branches, error: fetchError } = await supabase
      .from('branches')
      .select('id, name')
      .ilike('name', '%msabweni%');

    if (fetchError) throw fetchError;

    if (branches && branches.length > 0) {
      const branch = branches[0];
      const { error: updateError } = await supabase
        .from('branches')
        .update({ name: 'Edendrop Msambweni' })
        .eq('id', branch.id);

      if (updateError) throw updateError;
      console.log(`✅ Updated: ${branch.name} → Edendrop Msambweni\n`);
    } else {
      console.log('⚠️  Branch "Msabweni" not found, skipping...\n');
    }

    // Step 2: Get all branches
    console.log('⏳ Step 2: Fetching all branches...');
    const { data: allBranches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name');

    if (branchesError) throw branchesError;
    console.log(`✅ Found ${allBranches.length} branches\n`);

    // Step 3: Get all users
    console.log('⏳ Step 3: Analyzing staff structure...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('role');

    if (usersError) throw usersError;

    console.log('\n📊 Current Staff Structure:\n');
    console.log('Admin:');
    users.filter(u => u.role === 'admin').forEach(u => {
      console.log(`   - ${u.name || u.email} (${u.email})`);
    });

    console.log('\nManagers:');
    users.filter(u => u.role === 'manager').forEach(u => {
      const branchName = allBranches.find(b => b.id === u.branch_id)?.name || 'No branch';
      console.log(`   - ${u.name || u.email} (${u.email}) - ${branchName}`);
    });

    console.log('\nCashiers:');
    users.filter(u => u.role === 'cashier').forEach(u => {
      const branchName = allBranches.find(b => b.id === u.branch_id)?.name || 'No branch';
      console.log(`   - ${u.name || u.email} (${u.email}) - ${branchName}`);
    });

    console.log('\n📋 Recommended Staff Structure:');
    console.log('   1 Admin (overall system access)');
    console.log('   1 Manager (oversees all branches)');
    console.log(`   ${allBranches.length} Cashiers (one per branch)`);

    console.log('\n✅ Branch name corrected!');
    console.log('\n💡 Note: Staff management has been removed from the UI.');
    console.log('   You can manage users directly in the database if needed.\n');

  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

fixBranchAndStaff();
