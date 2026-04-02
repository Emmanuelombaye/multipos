import { supabase } from './src/db/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyAndFixSchema() {
  console.log('🔍 Verifying database schema...\n');

  try {
    // Check if stock_transfer_requests table exists
    const { data: transferRequests, error: trError } = await supabase
      .from('stock_transfer_requests')
      .select('*')
      .limit(1);

    if (trError && trError.message.includes('does not exist')) {
      console.log('❌ stock_transfer_requests table missing');
      console.log('📝 Creating stock_transfer_requests table...');
      
      const sqlFile = fs.readFileSync(
        path.join(__dirname, 'src/db/stock_transfer_requests.sql'),
        'utf8'
      );
      
      // Execute the SQL (note: Supabase client doesn't support raw SQL directly)
      // You'll need to run this in Supabase SQL Editor or use a different approach
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:\n');
      console.log(sqlFile);
      console.log('\n');
    } else if (trError) {
      console.log('❌ Error checking stock_transfer_requests:', trError.message);
    } else {
      console.log('✅ stock_transfer_requests table exists');
    }

    // Check stock_transfers table
    const { data: transfers, error: tError } = await supabase
      .from('stock_transfers')
      .select('*')
      .limit(1);

    if (tError && tError.message.includes('does not exist')) {
      console.log('❌ stock_transfers table missing');
      console.log('📝 Creating stock_transfers table...');
      
      const sqlFile = fs.readFileSync(
        path.join(__dirname, 'src/db/stock_transfers.sql'),
        'utf8'
      );
      
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:\n');
      console.log(sqlFile);
      console.log('\n');
    } else if (tError) {
      console.log('❌ Error checking stock_transfers:', tError.message);
    } else {
      console.log('✅ stock_transfers table exists');
    }

    // Check external_dispatches table
    const { data: dispatches, error: dError } = await supabase
      .from('external_dispatches')
      .select('*')
      .limit(1);

    if (dError && dError.message.includes('does not exist')) {
      console.log('❌ external_dispatches table missing');
      console.log('📝 Creating external_dispatches table...');
      
      const sqlFile = fs.readFileSync(
        path.join(__dirname, 'src/db/external_dispatches.sql'),
        'utf8'
      );
      
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:\n');
      console.log(sqlFile);
      console.log('\n');
    } else if (dError) {
      console.log('❌ Error checking external_dispatches:', dError.message);
    } else {
      console.log('✅ external_dispatches table exists');
    }

    // Check stock_additions table
    const { data: additions, error: aError } = await supabase
      .from('stock_additions')
      .select('*')
      .limit(1);

    if (aError && aError.message.includes('does not exist')) {
      console.log('❌ stock_additions table missing');
      console.log('📝 Creating stock_additions table...');
      
      const sqlFile = fs.readFileSync(
        path.join(__dirname, 'src/db/stock_additions.sql'),
        'utf8'
      );
      
      console.log('\n⚠️  Please run the following SQL in your Supabase SQL Editor:\n');
      console.log(sqlFile);
      console.log('\n');
    } else if (aError) {
      console.log('❌ Error checking stock_additions:', aError.message);
    } else {
      console.log('✅ stock_additions table exists');
    }

    console.log('\n✅ Schema verification complete!');
    console.log('\nIf any tables were missing, please:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the SQL statements shown above');
    console.log('4. Re-run this script to verify\n');

  } catch (error) {
    console.error('❌ Error during schema verification:', error.message);
  }
}

verifyAndFixSchema();
