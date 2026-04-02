-- ============================================================================
-- CREATE MISSING stock_transfer_requests TABLE
-- Run this in Supabase SQL Editor to fix the error
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop the table if it exists (to ensure clean creation)
DROP TABLE IF EXISTS stock_transfer_requests CASCADE;

-- Create the stock_transfer_requests table
CREATE TABLE stock_transfer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  to_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  notes TEXT,
  sent_by VARCHAR(255) NOT NULL,
  received_by VARCHAR(255),
  from_stock_before DECIMAL(10, 2) NOT NULL,
  from_stock_after  DECIMAL(10, 2) NOT NULL,
  to_stock_before   DECIMAL(10, 2),
  to_stock_after    DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_transfer_req_from   ON stock_transfer_requests(from_branch_id);
CREATE INDEX idx_transfer_req_to     ON stock_transfer_requests(to_branch_id);
CREATE INDEX idx_transfer_req_status ON stock_transfer_requests(status);
CREATE INDEX idx_transfer_req_product ON stock_transfer_requests(product_id);

-- Verify the table was created
SELECT 'stock_transfer_requests table created successfully!' as status;

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_transfer_requests'
ORDER BY ordinal_position;
