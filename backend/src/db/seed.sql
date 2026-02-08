-- Seed data for Butchery POS System

-- Insert branches
INSERT INTO branches (name, location, status) VALUES
('Edendrop Tamasha', 'Tamasha Complex', 'open'),
('Edendrop Reem', 'Reem Plaza', 'open'),
('Edendrop Msabweni', 'Msabweni Road', 'open')
ON CONFLICT (name) DO NOTHING;

-- Insert products
INSERT INTO products (name, category, price_per_kg, low_stock_threshold, image) VALUES
('Beef - Premium Cut', 'Beef', 850, 20, '🥩'),
('Goat Meat', 'Goat', 950, 15, '🍖'),
('Chicken Whole', 'Chicken', 450, 30, '🍗')
ON CONFLICT (name) DO NOTHING;

-- Get IDs for relationships
-- This seed file provides the data structure
-- You may also seed users manually or through the registration endpoint
