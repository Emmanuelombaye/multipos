-- Stock Transfers Audit Table
-- Permanent, immutable record of every internal branch-to-branch stock transfer.
-- Never deleted. Used for full audit trail and reconciliation.

CREATE TABLE stock_transfers (
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

CREATE INDEX idx_transfers_from_branch ON stock_transfers(from_branch_id);
CREATE INDEX idx_transfers_to_branch   ON stock_transfers(to_branch_id);
CREATE INDEX idx_transfers_product     ON stock_transfers(product_id);
CREATE INDEX idx_transfers_date        ON stock_transfers(transfer_date);
