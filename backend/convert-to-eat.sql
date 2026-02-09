-- =====================================================
-- CONVERT ALL TIMESTAMPS TO EAST AFRICA TIME (EAT/UTC+3)
-- =====================================================
-- Run this script in your Supabase SQL Editor
-- This will convert all existing UTC timestamps to EAT

-- 1. Convert transactions table
UPDATE transactions
SET created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi';

-- 2. Convert expenses table
UPDATE expenses
SET created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi';

-- 3. Convert stock_history table
UPDATE stock_history
SET created_at = created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi';

-- 4. Convert branch_stock table (uses updated_at)
UPDATE branch_stock
SET updated_at = updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Nairobi'
WHERE updated_at IS NOT NULL;

-- 5. Set database timezone to EAT for all future operations
ALTER DATABASE postgres SET timezone TO 'Africa/Nairobi';

-- 6. Verify the conversion (check a few records)
SELECT id, created_at, total FROM transactions ORDER BY created_at DESC LIMIT 5;
SELECT id, created_at, amount FROM expenses ORDER BY created_at DESC LIMIT 5;

-- =====================================================
-- NOTES:
-- - This conversion is IRREVERSIBLE. Make a backup first!
-- - All timestamps will be shifted +3 hours
-- - Future inserts will automatically use EAT
-- =====================================================
