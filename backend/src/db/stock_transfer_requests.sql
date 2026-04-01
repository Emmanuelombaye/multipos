-- Stock Transfer Requests Table
-- Supports the full send → receive workflow between branches.
-- When a cashier sends stock:
--   1. Stock is deducted from sender immediately (in_transit)
--   2. Receiver sees a pending request and accepts or rejects
--   3. On accept: stock added to receiver, status = accepted
--   4. On reject: stock returned to sender, status = rejected

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

CREATE INDEX idx_transfer_req_from   ON stock_transfer_requests(from_branch_id);
CREATE INDEX idx_transfer_req_to     ON stock_transfer_requests(to_branch_id);
CREATE INDEX idx_transfer_req_status ON stock_transfer_requests(status);
CREATE INDEX idx_transfer_req_product ON stock_transfer_requests(product_id);
