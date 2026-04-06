-- Add unit column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg';

-- Update chicken products to use pieces (case-insensitive: kuku, KUKU, Kuku, KUku, etc.)
UPDATE products SET unit = 'pieces' WHERE LOWER(name) LIKE '%kuku%';

-- Verify the changes
SELECT name, category, unit, price_per_kg FROM products ORDER BY name;
