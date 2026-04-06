-- Migration: Update products to only have 7 specific products
-- This will clear existing products and create the 7 required products

-- Step 1: Clear existing products (this will cascade to branch_stock and other related tables)
TRUNCATE TABLE products CASCADE;

-- Step 2: Insert the 7 specific products
INSERT INTO products (id, name, category, image, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Beef', 'Meat', '🥩', NOW(), NOW()),
  (gen_random_uuid(), 'Goat', 'Meat', '🐐', NOW(), NOW()),
  (gen_random_uuid(), 'Matumbo', 'Offal', '🫘', NOW(), NOW()),
  (gen_random_uuid(), 'Kuku Broiler', 'Poultry', '🐔', NOW(), NOW()),
  (gen_random_uuid(), 'Kuku Kienyeji', 'Poultry', '🐓', NOW(), NOW()),
  (gen_random_uuid(), 'Fillets', 'Processed', '🥓', NOW(), NOW()),
  (gen_random_uuid(), 'Minced Meat', 'Processed', '🍖', NOW(), NOW());

-- Step 3: Add these products to all existing branches with default pricing
-- Get all branch IDs and add products with default values
INSERT INTO branch_stock (id, branch_id, product_id, current_stock, low_stock_threshold, price_per_kg, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  b.id,
  p.id,
  0, -- initial stock
  CASE 
    WHEN p.name IN ('Beef', 'Goat') THEN 20
    WHEN p.name IN ('Kuku Broiler', 'Kuku Kienyeji') THEN 15
    ELSE 10
  END, -- low stock threshold
  CASE 
    WHEN p.name = 'Beef' THEN 850
    WHEN p.name = 'Goat' THEN 900
    WHEN p.name = 'Matumbo' THEN 450
    WHEN p.name = 'Kuku Broiler' THEN 550
    WHEN p.name = 'Kuku Kienyeji' THEN 750
    WHEN p.name = 'Fillets' THEN 950
    WHEN p.name = 'Minced Meat' THEN 700
    ELSE 500
  END, -- price per kg
  NOW(),
  NOW()
FROM branches b
CROSS JOIN products p;

-- Verification query (optional - comment out if running as migration)
-- SELECT 
--   b.name as branch_name,
--   p.name as product_name,
--   p.category,
--   bs.price_per_kg,
--   bs.current_stock,
--   bs.low_stock_threshold
-- FROM branch_stock bs
-- JOIN branches b ON bs.branch_id = b.id
-- JOIN products p ON bs.product_id = p.id
-- ORDER BY b.name, p.name;
