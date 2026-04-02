import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔧 Automated Fix for stock_transfer_requests Table\n');
console.log('='.repeat(60));

async function fixTable() {
  try {
    // Step 1: Check if table exists
    console.log('\n📋 Step 1: Checking if table exists...');
    const { data: checkData, error: checkError } = await supabase
      .from('stock_transfer_requests')
      .select('*')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Table already exists! No fix needed.');
      console.log('\n🎉 System is ready to use.\n');
      return true;
    }
    
    if (!checkError.message.includes('does not exist')) {
      console.log('❌ Unexpected error:', checkError.message);
      return false;
    }
    
    console.log('⚠️  Table does not exist. Creating it now...');
    
    // Step 2: Create the table using SQL
    console.log('\n📋 Step 2: Creating table via SQL...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS stock_transfer_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        from_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        to_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'accepted', 'rejected')),
        notes TEXT,
        sent_by VARCHAR(255) NOT NULL,
        received_by VARCHAR(255),
        from_stock_before DECIMAL(10, 2) NOT NULL,
        from_stock_after  DECIMAL(10, 2) NOT NULL,
        to_stock_before   DECIMAL(10, 2),
        to_stock_after    DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_transfer_req_from ON stock_transfer_requests(from_branch_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_req_to ON stock_transfer_requests(to_branch_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_req_status ON stock_transfer_requests(status);
      CREATE INDEX IF NOT EXISTS idx_transfer_req_product ON stock_transfer_requests(product_id);
    `;
    
    // Use Supabase RPC to execute SQL
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { 
      sql: createTableSQL 
    });
    
    if (rpcError) {
      console.log('⚠️  Direct SQL execution not available.');
      console.log('   This is normal - Supabase requires SQL to be run in the dashboard.\n');
      console.log('📝 MANUAL FIX REQUIRED:');
      console.log('─'.repeat(60));
      console.log('1. Open your Supabase Dashboard');
      console.log('2. Go to SQL Editor');
      console.log('3. Run this file: backend/fix-stock-transfer-requests.sql');
      console.log('4. Or copy-paste this SQL:\n');
      console.log(createTableSQL);
      console.log('─'.repeat(60));
      console.log('\n5. After running the SQL, run: node test-stock-movements.js\n');
      return false;
    }
    
    console.log('✅ Table created successfully!');
    
    // Step 3: Verify
    console.log('\n📋 Step 3: Verifying table creation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('stock_transfer_requests')
      .select('*')
      .limit(1);
    
    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
      return false;
    }
    
    console.log('✅ Table verified successfully!');
    console.log('\n🎉 Fix complete! System is ready to use.\n');
    return true;
    
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    return false;
  }
}

fixTable()
  .then(success => {
    console.log('='.repeat(60));
    if (success) {
      console.log('✅ ALL DONE! You can now use the Movements screen.\n');
      process.exit(0);
    } else {
      console.log('⚠️  Manual intervention required. See instructions above.\n');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
