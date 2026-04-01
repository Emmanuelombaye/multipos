-- Mid-Shift Stock Additions Audit Table
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
