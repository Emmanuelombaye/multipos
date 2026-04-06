-- Add unit column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg';

-- Update chicken products to use pieces
UPDATE products SET unit = 'pieces' WHERE name ILIKE '%kuku%';

-- Add unit column to branch_stock for display purposes (optional, can derive from products)
-- This is optional as we can join with products table to get the unit

-- Verify the changes
SELECT name, category, unit, price_per_kg FROM products ORDER BY name;
