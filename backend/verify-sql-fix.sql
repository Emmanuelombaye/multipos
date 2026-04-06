-- ========================================
-- VERIFICATION SCRIPT
-- Check if reduce_branch_stock function exists
-- ========================================

-- 1. Check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'reduce_branch_stock';

-- 2. If function exists, show its definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'reduce_branch_stock';

-- 3. Test the function with a dummy call (won't affect real data)
DO $$
BEGIN
  -- This will fail gracefully if IDs don't exist
  PERFORM reduce_branch_stock(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000000'::UUID,
    0.0
  );
  RAISE NOTICE '✅ Function reduce_branch_stock exists and is callable';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Function test failed: %', SQLERRM;
END $$;

-- 4. Show result
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'reduce_branch_stock'
    ) 
    THEN '✅ reduce_branch_stock function EXISTS - Stock deduction should work!'
    ELSE '❌ reduce_branch_stock function MISSING - Run fix_stock_deduction.sql first!'
  END as status;
