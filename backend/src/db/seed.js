import { supabase } from './supabase.js';
import bcrypt from 'bcryptjs';

async function seed() {
  try {

    // Delete all users
    console.log('🧹 Deleting all users...');
    await supabase.from('users').delete().neq('id', '');
    console.log('✓ All users deleted.');


    // Query branch IDs by name
    const { data: tamashaBranch } = await supabase.from('branches').select('id').eq('name', 'Edendrop Tamasha').single();
    const { data: reemBranch } = await supabase.from('branches').select('id').eq('name', 'Edendrop Reem').single();
    const { data: msabweniBranch } = await supabase.from('branches').select('id').eq('name', 'Edendrop Msabweni').single();

    const upsertUsers = [
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
        branch_id: tamashaBranch?.id || null
      },
      {
        name: 'Cashier Tamasha',
        email: 'cashier@tamasha.com',
        password_hash: await bcrypt.hash('@Kenya90!', 10),
        role: 'cashier',
        branch_id: tamashaBranch?.id || null
      },
      {
        name: 'Cashier Reem',
        email: 'cashier@reem.com',
        password_hash: await bcrypt.hash('@Kenya80!', 10),
        role: 'cashier',
        branch_id: reemBranch?.id || null
      },
      {
        name: 'Cashier Msabweni',
        email: 'cashier@msabweni.com',
        password_hash: await bcrypt.hash('@Kenya70!', 10),
        role: 'cashier',
        branch_id: msabweniBranch?.id || null
      }
    ];

    for (const user of upsertUsers) {
      // Upsert by email: if exists, update password_hash, role, branch_id, name
      const { error } = await supabase
        .from('users')
        .upsert(user, { onConflict: ['email'] });
      if (error) console.error('User error:', error);
      else console.log(`✓ Upserted user: ${user.email} (${user.role})`);
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
