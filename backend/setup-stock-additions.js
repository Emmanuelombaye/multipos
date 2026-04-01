/**
 * Setup stock_additions table
 * Run: node backend/setup-stock-additions.js
 */

import { supabase } from './src/db/supabase.js';
import fs from 'fs';

async function setupStockAdditions() {
  console.log('🔧 Setting up stock_additions table...\n');

  try {
    // Read the SQL file
    const sql = fs.readFileSync('./src/db/stock_additions.sql', 'utf8');
    
    console.log('📝 Executing SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try direct execution (for local dev)
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split by semicolons and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        const { error: execError } = await supabase.rpc('exec', { query: statement });
        if (execError) {
          console.error(`   ❌ Error:`, execError.message);
        }
      }
    }

    // Verify table exists
    console.log('\n✅ Verifying table creation...');
    const { data, error: verifyError } = await supabase
      .from('stock_additions')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.error('❌ Table verification failed:', verifyError.message);
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(sql);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      process.exit(1);
    }

    console.log('✅ stock_additions table is ready!');
    console.log(`   Current records: ${data?.length || 0}`);
    console.log('\n🎉 Setup complete!\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

setupStockAdditions();
