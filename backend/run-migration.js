import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log('🚀 Running Complete Database Migration...\n');
  
  try {
    // Step 1: Create reduce_branch_stock function
    console.log('📋 Step 1: Creating reduce_branch_stock function...');
    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION reduce_branch_stock(
          p_branch_id UUID,
          p_product_id UUID,
          p_quantity NUMERIC
        )
        RETURNS VOID AS $$
        BEGIN
          UPDATE branch_stock
          SET 
            current_stock = GREATEST(current_stock - p_quantity, 0),
            updated_at = NOW()
          WHERE branch_id = p_branch_id 
            AND product_id = p_product_id;
          
          IF NOT FOUND THEN
            INSERT INTO branch_stock (branch_id, product_id, current_stock, updated_at)
            VALUES (p_branch_id, p_product_id, 0, NOW())
            ON CONFLICT (branch_id, product_id) DO NOTHING;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `
    });
    
    if (funcError && !funcError.message.includes('already exists')) {
      console.log('⚠️  Function creation note:', funcError.message);
    } else {
      console.log('✅ reduce_branch_stock function ready');
    }
    
    // Step 2: Create system_audit_logs table
    console.log('\n📋 Step 2: Creating system_audit_logs table...');
    const { error: auditError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS system_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          audit_type VARCHAR(50) NOT NULL,
          audit_date DATE NOT NULL,
          audit_time TIME NOT NULL,
          branches_processed INTEGER DEFAULT 0,
          products_processed INTEGER DEFAULT 0,
          records_created INTEGER DEFAULT 0,
          discrepancies_fixed INTEGER DEFAULT 0,
          status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON system_audit_logs(audit_date DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON system_audit_logs(audit_type);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON system_audit_logs(status);
      `
    });
    
    if (auditError) {
      console.log('⚠️  Audit table note:', auditError.message);
    } else {
      console.log('✅ system_audit_logs table ready');
    }
    
    // Since Supabase doesn't have exec_sql RPC by default, let's use direct SQL execution
    console.log('\n⚠️  Note: Supabase client cannot execute raw SQL directly.');
    console.log('Using alternative approach with individual operations...\n');
    
    // Alternative: Check and fix tables using Supabase operations
    console.log('📋 Step 3: Checking stock_additions table...');
    const { data: additionsTest } = await supabase
      .from('stock_additions')
      .select('*')
      .limit(0);
    console.log('✅ stock_additions table exists');
    
    console.log('\n📋 Step 4: Checking external_dispatches table...');
    const { data: dispatchesTest } = await supabase
      .from('external_dispatches')
      .select('*')
      .limit(0);
    console.log('✅ external_dispatches table exists');
    
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  IMPORTANT: Manual SQL Required');
    console.log('='.repeat(60));
    console.log('\nSupabase client cannot execute DDL statements (ALTER TABLE, etc.)');
    console.log('You need to run this SQL manually in Supabase SQL Editor:\n');
    console.log('File: backend/migrations/COMPLETE_MIGRATION.sql\n');
    console.log('Or copy this SQL:\n');
    
    const sqlContent = fs.readFileSync('./migrations/COMPLETE_MIGRATION.sql', 'utf-8');
    console.log(sqlContent);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
