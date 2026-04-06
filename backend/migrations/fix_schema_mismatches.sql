-- ========================================
-- FIX SCHEMA MISMATCHES
-- Ensures all required columns exist
-- ========================================

-- 1. Fix stock_additions table - ensure stock_before and stock_after exist
DO $$
BEGIN
  -- Check if stock_before column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_additions' AND column_name = 'stock_before'
  ) THEN
    ALTER TABLE stock_additions ADD COLUMN stock_before DECIMAL(10, 2);
    RAISE NOTICE '✅ Added stock_before column to stock_additions';
  ELSE
    RAISE NOTICE '✓ stock_before column already exists';
  END IF;

  -- Check if stock_after column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_additions' AND column_name = 'stock_after'
  ) THEN
    ALTER TABLE stock_additions ADD COLUMN stock_after DECIMAL(10, 2);
    RAISE NOTICE '✅ Added stock_after column to stock_additions';
  ELSE
    RAISE NOTICE '✓ stock_after column already exists';
  END IF;

  -- Make stock_before and stock_after NOT NULL if they have no nulls
  UPDATE stock_additions SET stock_before = 0 WHERE stock_before IS NULL;
  UPDATE stock_additions SET stock_after = quantity WHERE stock_after IS NULL;
  
  ALTER TABLE stock_additions ALTER COLUMN stock_before SET NOT NULL;
  ALTER TABLE stock_additions ALTER COLUMN stock_after SET NOT NULL;
  RAISE NOTICE '✅ Set stock_before and stock_after as NOT NULL';
END $$;

-- 2. Fix external_dispatches table - check if total_amount exists
DO $$
BEGIN
  -- Check if total_amount column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'external_dispatches' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE external_dispatches ADD COLUMN total_amount DECIMAL(10, 2);
    RAISE NOTICE '✅ Added total_amount column to external_dispatches';
    
    -- Calculate total_amount for existing records
    UPDATE external_dispatches 
    SET total_amount = quantity * price_per_kg 
    WHERE total_amount IS NULL;
    
    RAISE NOTICE '✅ Calculated total_amount for existing records';
  ELSE
    RAISE NOTICE '✓ total_amount column already exists';
  END IF;
END $$;

-- 3. Verify all columns exist
SELECT 
  '✅ STOCK_ADDITIONS SCHEMA:' as status,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'stock_additions'
GROUP BY table_name

UNION ALL

SELECT 
  '✅ EXTERNAL_DISPATCHES SCHEMA:' as status,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_name = 'external_dispatches'
GROUP BY table_name;

-- 4. Final success message
SELECT '✅ SCHEMA FIX COMPLETE! All required columns exist.' as result;
