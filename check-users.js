
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY are required in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log('🔍 Checking Users in Database...\n');

  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      role,
      branch_id,
      status,
      created_at
    `);

  if (error) {
    console.error('Error fetching users:', error.message);
    return;
  }

  if (users.length === 0) {
    console.log('❌ No users found in the database.');
    return;
  }

  console.log('✅ Found ' + users.length + ' users:\n');
  
  // Get branches to map names
  const { data: branches } = await supabase.from('branches').select('id, name');
  const branchMap = {};
  if (branches) {
    branches.forEach(b => branchMap[b.id] = b.name);
  }

  console.table(users.map(u => ({
    Name: u.name,
    Email: u.email,
    Role: u.role,
    Branch: branchMap[u.branch_id] || u.branch_id || 'None', 
    Status: u.status
  })));

  console.log('\n💡 EXPECTED CREDENTIALS FROM SEED.JS:');
  console.log('------------------------------------------------');
  console.log('cashier@tamasha.com  / @Kenya90!');
  console.log('cashier@reem.com     / @Kenya80!');
  console.log('cashier@msabweni.com / @Kenya70!');
  console.log('------------------------------------------------');
  console.log('If the user "cashier@example.com" is NOT in the list above, login will fail with that email.');
}

checkUsers();
