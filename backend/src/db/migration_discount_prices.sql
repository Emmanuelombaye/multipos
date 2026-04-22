-- ============================================================
-- MIGRATION: Add Normal Till & Discount Till support
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- STEP 1: Add discount_price_per_kg to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS discount_price_per_kg DECIMAL(10, 2) DEFAULT 0;

-- STEP 2: Add discount_price_per_kg to branch_stock table (branch overrides)
ALTER TABLE branch_stock 
  ADD COLUMN IF NOT EXISTS discount_price_per_kg DECIMAL(10, 2);

-- STEP 3: Update the payment_method constraint on transactions table
-- First drop the old constraint
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

-- Add new constraint with normal_till and discount_till replacing mpesa/card
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_payment_method_check 
  CHECK (payment_method IN ('cash', 'normal_till', 'discount_till', 'loan'));

-- STEP 4: Initialise discount prices on existing products
-- Sets discount_price_per_kg = price_per_kg for existing rows (no-zero-discount default)
UPDATE products 
  SET discount_price_per_kg = price_per_kg 
  WHERE discount_price_per_kg = 0 OR discount_price_per_kg IS NULL;

UPDATE branch_stock 
  SET discount_price_per_kg = price_per_kg 
  WHERE discount_price_per_kg IS NULL;

-- STEP 5: Verify the migration worked
SELECT 
  'products' as table_name,
  COUNT(*) as rows,
  COUNT(discount_price_per_kg) as has_discount_price
FROM products
UNION ALL
SELECT 
  'branch_stock',
  COUNT(*),
  COUNT(discount_price_per_kg)
FROM branch_stock;
