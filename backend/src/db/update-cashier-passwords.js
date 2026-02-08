import { supabase } from './supabase.js';
import bcrypt from 'bcryptjs';

async function updateCashierPasswords() {
  try {
    console.log('🔐 Updating cashier passwords...\n');

    // Get all branches
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (branchError) {
      console.error('Failed to fetch branches:', branchError);
      return;
    }

    console.log(`Found ${branches.length} branches:`);
    branches.forEach((branch, index) => {
      console.log(`  ${index + 1}. ${branch.name} (ID: ${branch.id})`);
    });

    // Define password mapping by branch
    // Branch 1 (first): @Kenya90!
    // Branch 2 (second): @kenya80!
    // Branch 3 (third): @Kenya70!
    const passwordsByBranch = {
      0: '@Kenya90!',  // First branch
      1: '@kenya80!',  // Second branch  
      2: '@Kenya70!'   // Third branch
    };

    console.log('\n👥 Updating cashier passwords by branch...');

    // Get all cashiers
    const { data: cashiers, error: cashierError } = await supabase
      .from('users')
      .select('*, branches(name)')
      .eq('role', 'cashier');

    if (cashierError) {
      console.error('Failed to fetch cashiers:', cashierError);
      return;
    }

    console.log(`\nFound ${cashiers.length} cashiers\n`);

    let updateCount = 0;

    for (const cashier of cashiers) {
      // Find which branch index this cashier belongs to
      const branchIndex = branches.findIndex(b => b.id === cashier.branch_id);
      
      if (branchIndex === -1 || branchIndex > 2) {
        console.log(`⚠️  ${cashier.name} (${cashier.email}): No matching branch or branch > 3`);
        continue;
      }

      const newPassword = passwordsByBranch[branchIndex];
      const branchName = cashier.branches?.name || 'Unknown Branch';
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', cashier.id);

      if (updateError) {
        console.log(`❌ Failed to update ${cashier.name}:`, updateError.message);
      } else {
        console.log(`✅ ${cashier.name} (${branchName}): ${newPassword}`);
        updateCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Password update complete!');
    console.log(`   Updated ${updateCount} cashier passwords`);
    console.log('='.repeat(60));

    console.log('\n📝 LOGIN CREDENTIALS:\n');
    
    branches.forEach((branch, index) => {
      if (index < 3) {
        const branchCashiers = cashiers.filter(c => c.branch_id === branch.id);
        console.log(`${branch.name}:`);
        branchCashiers.forEach(cashier => {
          console.log(`  Email: ${cashier.email}`);
          console.log(`  Password: ${passwordsByBranch[index]}`);
        });
        console.log('');
      }
    });

  } catch (error) {
    console.error('❌ Update failed:', error);
  }
}

updateCashierPasswords();
