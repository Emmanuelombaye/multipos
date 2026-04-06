-- ========================================
-- COMPLETE DATABASE MIGRATION
-- Run this ONCE in Supabase SQL Editor
-- ========================================
-- This script includes:
-- 1. reduce_branch_stock function (for stock deduction)
-- 2. system_audit_logs table
-- 3. Schema fixes for stock_additions and external_dispatches
-- ========================================

-- ========================================
-- PART 1: CREATE reduce_branch_stock FUNCTION
-- ========================================
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

-- ========================================
-- PART 2: CREATE system_audit_logs TABLE
-- ========================================
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

-- ========================================
-- PART 3: FIX stock_additions TABLE
-- ========================================
DO $$
BEGIN
  -- Add stock_before column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_additions' AND column_name = 'stock_before'
  ) THEN
    ALTER TABLE stock_additions ADD COLUMN stock_before DECIMAL(10, 2);
    RAISE NOTICE '✅ Added stock_before column';
  END IF;

  -- Add stock_after column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_additions' AND column_name = 'stock_after'
  ) THEN
    ALTER TABLE stock_additions ADD COLUMN stock_after DECIMAL(10, 2);
    RAISE NOTICE '✅ Added stock_after column';
  END IF;

  -- Fill in missing values
  UPDATE stock_additions SET stock_before = 0 WHERE stock_before IS NULL;
  UPDATE stock_additions SET stock_after = quantity WHERE stock_after IS NULL;
  
  -- Make columns NOT NULL
  ALTER TABLE stock_additions ALTER COLUMN stock_before SET NOT NULL;
  ALTER TABLE stock_additions ALTER COLUMN stock_after SET NOT NULL;
  
  RAISE NOTICE '✅ stock_additions table fixed';
END $$;

-- ========================================
-- PART 4: FIX external_dispatches TABLE
-- ========================================
DO $$
BEGIN
  -- Add total_amount column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_dispatches' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE external_dispatches ADD COLUMN total_amount DECIMAL(10, 2);
    RAISE NOTICE '✅ Added total_amount column';
    
    -- Calculate total_amount for existing records
    UPDATE external_dispatches 
    SET total_amount = quantity * price_per_kg 
    WHERE total_amount IS NULL;
    
    RAISE NOTICE '✅ Calculated total_amount for existing records';
  END IF;
END $$;

-- ========================================
-- VERIFICATION
-- ========================================

-- Test reduce_branch_stock function
DO $$
BEGIN
  PERFORM reduce_branch_stock(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    0.0
  );
  RAISE NOTICE '✅ reduce_branch_stock function works';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Function test failed: %', SQLERRM;
END $$;

-- Show table schemas
SELECT 
  'stock_additions' as table_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'stock_additions'
GROUP BY table_name

UNION ALL

SELECT 
  'external_dispatches' as table_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'external_dispatches'
GROUP BY table_name

UNION ALL

SELECT 
  'system_audit_logs' as table_name,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'system_audit_logs'
GROUP BY table_name;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
SELECT '🎉 COMPLETE DATABASE MIGRATION SUCCESSFUL!' as status;
SELECT '✅ reduce_branch_stock function created' as step_1;
SELECT '✅ system_audit_logs table created' as step_2;
SELECT '✅ stock_additions schema fixed' as step_3;
SELECT '✅ external_dispatches schema fixed' as step_4;
SELECT '👉 Your system is now ready!' as next_step;
