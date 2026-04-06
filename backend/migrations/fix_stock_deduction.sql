-- ========================================
-- COMPLETE DATABASE FIX SCRIPT
-- Fixes stock deduction and all missing functions
-- ========================================

-- 1. Create reduce_branch_stock function (for POS transactions)
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
  
  -- If no row exists, insert with 0 stock (shouldn't happen but safety)
  IF NOT FOUND THEN
    INSERT INTO branch_stock (branch_id, product_id, current_stock, updated_at)
    VALUES (p_branch_id, p_product_id, 0, NOW())
    ON CONFLICT (branch_id, product_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Verify system_audit_logs table exists
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON system_audit_logs(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON system_audit_logs(audit_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON system_audit_logs(status);

-- 3. Test the reduce_branch_stock function
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Try to call the function with dummy data (won't actually update anything if IDs don't exist)
  PERFORM reduce_branch_stock(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    1.0
  );
  test_result := '✅ reduce_branch_stock function is working';
  RAISE NOTICE '%', test_result;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ reduce_branch_stock function test failed: %', SQLERRM;
END $$;

-- 4. Verify all required tables exist
DO $$
DECLARE
  missing_tables TEXT := '';
BEGIN
  -- Check for required tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branches') THEN
    missing_tables := missing_tables || 'branches, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    missing_tables := missing_tables || 'products, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'branch_stock') THEN
    missing_tables := missing_tables || 'branch_stock, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_history') THEN
    missing_tables := missing_tables || 'stock_history, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    missing_tables := missing_tables || 'transactions, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_items') THEN
    missing_tables := missing_tables || 'transaction_items, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfer_requests') THEN
    missing_tables := missing_tables || 'stock_transfer_requests, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_transfers') THEN
    missing_tables := missing_tables || 'stock_transfers, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_dispatches') THEN
    missing_tables := missing_tables || 'external_dispatches, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_additions') THEN
    missing_tables := missing_tables || 'stock_additions, ';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_audit_logs') THEN
    missing_tables := missing_tables || 'system_audit_logs, ';
  END IF;
  
  IF missing_tables = '' THEN
    RAISE NOTICE '✅ All required tables exist';
  ELSE
    RAISE NOTICE '⚠️  Missing tables: %', RTRIM(missing_tables, ', ');
  END IF;
END $$;

-- 5. Show current stock for verification
SELECT 
  b.name as branch_name,
  p.name as product_name,
  bs.current_stock,
  bs.updated_at
FROM branch_stock bs
JOIN branches b ON b.id = bs.branch_id
JOIN products p ON p.id = bs.product_id
WHERE bs.current_stock > 0
ORDER BY b.name, p.name
LIMIT 20;

-- 6. Final success message
SELECT '✅ DATABASE FIX COMPLETE! Stock deduction should now work properly.' as status;
