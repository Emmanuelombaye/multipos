import { supabase } from './src/db/supabase.js';
import fs from 'fs';

console.log('🔧 Fixing stock_transfer_requests table...\n');

async function createMissingTable() {
  try {
    // Read the SQL file
    const sql = fs.readFileSync('./fix-stock-transfer-requests.sql', 'utf8');
    
    console.log('📝 SQL to execute:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('\n⚠️  Note: Supabase JS client cannot execute raw SQL directly.');
    console.log('Please copy the SQL above and run it in your Supabase SQL Editor.\n');
    
    console.log('📍 Steps to fix:');
    console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('2. Click "New Query"');
    console.log('3. Paste the SQL from above');
    console.log('4. Click "Run" or press Ctrl+Enter');
    console.log('5. Run: node test-stock-movements.js to verify\n');
    
    // Try to check if table exists
    console.log('🔍 Checking current status...');
    const { data, error } = await supabase
      .from('stock_transfer_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Table does NOT exist - please run the SQL above\n');
      } else {
        console.log('❌ Error:', error.message, '\n');
      }
    } else {
      console.log('✅ Table already exists! No action needed.\n');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createMissingTable();
