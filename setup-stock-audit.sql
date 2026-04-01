-- ============================================================================
-- STOCK AUDIT SCREEN - DATABASE SETUP
-- ============================================================================
-- Run this entire script in your Supabase SQL Editor
-- This creates the stock_additions table needed for the Stock Audit Screen
-- ============================================================================

-- Step 1: Create the stock_additions table
-- This table tracks all mid-shift stock additions with full audit trail
CREATE TABLE IF NOT EXISTS stock_additions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  stock_before DECIMAL(10, 2) NOT NULL,
  stock_after DECIMAL(10, 2) NOT NULL,
  reason TEXT,                          -- e.g. "Delivery from supplier", "Stock correction"
  added_by VARCHAR(255) NOT NULL,       -- Name of cashier/manager/admin who added stock
  added_by_role VARCHAR(50),            -- 'cashier' | 'manager' | 'admin'
  addition_date DATE NOT NULL,          -- Kenya date when stock was added
  added_at TIMESTAMPTZ DEFAULT NOW(),   -- Exact timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_additions_branch ON stock_additions(branch_id);
CREATE INDEX IF NOT EXISTS idx_additions_product ON stock_additions(product_id);
CREATE INDEX IF NOT EXISTS idx_additions_date ON stock_additions(addition_date);
CREATE INDEX IF NOT EXISTS idx_additions_added_by ON stock_additions(added_by);
CREATE INDEX IF NOT EXISTS idx_additions_created_at ON stock_additions(created_at DESC);

-- Step 3: Enable Row Level Security (RLS)
ALTER TABLE stock_additions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- Allow all authenticated users to read stock additions
CREATE POLICY "Allow authenticated users to read stock additions"
  ON stock_additions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert stock additions
CREATE POLICY "Allow authenticated users to insert stock additions"
  ON stock_additions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Step 5: Add helpful comments
COMMENT ON TABLE stock_additions IS 'Audit log of all mid-shift stock additions. Immutable record for compliance and tracking.';
COMMENT ON COLUMN stock_additions.quantity IS 'Amount of stock added (always positive)';
COMMENT ON COLUMN stock_additions.stock_before IS 'Stock level before this addition';
COMMENT ON COLUMN stock_additions.stock_after IS 'Stock level after this addition';
COMMENT ON COLUMN stock_additions.reason IS 'Why stock was added (e.g., supplier delivery, correction)';
COMMENT ON COLUMN stock_additions.added_by IS 'Name of person who added the stock';
COMMENT ON COLUMN stock_additions.added_by_role IS 'Role of person who added stock';
COMMENT ON COLUMN stock_additions.addition_date IS 'Date in Kenya timezone (YYYY-MM-DD)';

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the table was created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_additions'
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'stock_additions';

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'stock_additions';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- If you see results from the queries above, the setup is complete!
-- You can now use the Stock Audit Screen in the application.
-- ============================================================================
