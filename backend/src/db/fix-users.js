import { supabase } from './supabase.js';

async function fixUsers() {
  try {
    console.log('Fetching branches and users...');
    
    // Get all branches
    const { data: branches } = await supabase
      .from('branches')
      .select('*');
    
    // Get all users
    const { data: users } = await supabase
      .from('users')
      .select('*');
    
    console.log(`Found ${branches.length} branches and ${users.length} users`);
    
    // Assign users to branches (round-robin)
    let branchIndex = 0;
    for (const user of users) {
      const branch = branches[branchIndex % branches.length];
      
      const { error } = await supabase
        .from('users')
        .update({ branch_id: branch.id })
        .eq('id', user.id);
      
      if (error) {
        console.error(`Error updating user ${user.email}:`, error);
      } else {
        console.log(`Updated ${user.name} -> ${branch.name}`);
      }
      
      branchIndex++;
    }
    
    console.log('All users assigned to branches!');
    
    // Display summary
    console.log('\nUsers now:');
    const { data: updatedUsers } = await supabase
      .from('users')
      .select('name, email, role, branches(name)');
    
    updatedUsers?.forEach(u => {
      console.log(`  ${u.name} (${u.role}) -> ${u.branches?.name || 'No branch'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUsers();
