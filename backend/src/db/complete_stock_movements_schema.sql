-- ============================================================================
-- STOCK MOVEMENTS COMPLETE SCHEMA
-- Run this in Supabase SQL Editor to create all missing tables
-- ============================================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. STOCK TRANSFER REQUESTS TABLE
-- ============================================================================
-- Supports the full send → receive workflow between branches.
-- When a cashier sends stock:
--   1. Stock is deducted from sender immediately (in_transit)
--   2. Receiver sees a pending request and accepts or rejects
--   3. On accept: stock added to receiver, status = accepted
--   4. On reject: stock returned to sender, status = rejected

CREATE TABLE IF NOT EXISTS stock_transfer_requests (
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

CREATE INDEX IF NOT EXISTS idx_transfer_req_from   ON stock_transfer_requests(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfer_req_to     ON stock_transfer_requests(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfer_req_status ON stock_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_req_product ON stock_transfer_requests(product_id);

-- ============================================================================
-- 2. STOCK TRANSFERS AUDIT TABLE
-- ============================================================================
-- Permanent, immutable record of every internal branch-to-branch stock transfer.
-- Never deleted. Used for full audit trail and reconciliation.

CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  to_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  from_stock_before DECIMAL(10, 2) NOT NULL,   -- source stock before transfer
  from_stock_after  DECIMAL(10, 2) NOT NULL,   -- source stock after transfer
  to_stock_before   DECIMAL(10, 2) NOT NULL,   -- destination stock before transfer
  to_stock_after    DECIMAL(10, 2) NOT NULL,   -- destination stock after transfer
  transferred_by VARCHAR(255) NOT NULL,
  transfer_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_branch ON stock_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_branch   ON stock_transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_product     ON stock_transfers(product_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date        ON stock_transfers(transfer_date);

-- ============================================================================
-- 3. EXTERNAL DISPATCHES TABLE
-- ============================================================================
-- Records stock sent out to external clients (hotels, villas, schools, etc.)
-- This is NOT a branch transfer — stock leaves the system entirely and revenue is tracked.

CREATE TABLE IF NOT EXISTS external_dispatches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,           -- e.g. "Serena Hotel", "Brookhouse School"
  client_type VARCHAR(50) NOT NULL CHECK (client_type IN ('hotel', 'villa', 'school', 'restaurant', 'other')),
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  price_per_kg DECIMAL(10, 2) NOT NULL,        -- agreed price for this dispatch (may differ from retail)
  total_value DECIMAL(10, 2) NOT NULL,         -- quantity * price_per_kg
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'mpesa', 'card', 'invoice', 'other')),
  notes TEXT,
  dispatched_by VARCHAR(255) NOT NULL,
  dispatch_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatches_branch ON external_dispatches(branch_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_product ON external_dispatches(product_id);
CREATE INDEX IF NOT EXISTS idx_dispatches_date ON external_dispatches(dispatch_date);
CREATE INDEX IF NOT EXISTS idx_dispatches_client ON external_dispatches(client_name);
CREATE INDEX IF NOT EXISTS idx_dispatches_branch_date ON external_dispatches(branch_id, dispatch_date DESC);

-- ============================================================================
-- 4. STOCK ADDITIONS AUDIT TABLE
-- ============================================================================
-- Every time stock is added during a shift (by cashier, manager, or admin),
-- a permanent record is written here. Never deleted.

CREATE TABLE IF NOT EXISTS stock_additions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  stock_before DECIMAL(10, 2) NOT NULL,
  stock_after  DECIMAL(10, 2) NOT NULL,
  reason TEXT,                          -- e.g. "Delivery from supplier", "Transfer received"
  added_by VARCHAR(255) NOT NULL,       -- name of cashier / manager / admin
  added_by_role VARCHAR(50),            -- 'cashier' | 'manager' | 'admin'
  addition_date DATE NOT NULL,          -- Kenya date
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_additions_branch   ON stock_additions(branch_id);
CREATE INDEX IF NOT EXISTS idx_additions_product  ON stock_additions(product_id);
CREATE INDEX IF NOT EXISTS idx_additions_date     ON stock_additions(addition_date);
CREATE INDEX IF NOT EXISTS idx_additions_added_by ON stock_additions(added_by);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify all tables were created successfully:

-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('stock_transfer_requests', 'stock_transfers', 'external_dispatches', 'stock_additions')
-- ORDER BY table_name;

-- ============================================================================
-- COMPLETE!
-- ============================================================================
