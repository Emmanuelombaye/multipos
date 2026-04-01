-- External Dispatches Table
-- Records stock sent out to external clients (hotels, villas, schools, etc.)
-- This is NOT a branch transfer — stock leaves the system entirely and revenue is tracked.

CREATE TABLE external_dispatches (
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

CREATE INDEX idx_dispatches_branch ON external_dispatches(branch_id);
CREATE INDEX idx_dispatches_product ON external_dispatches(product_id);
CREATE INDEX idx_dispatches_date ON external_dispatches(dispatch_date);
CREATE INDEX idx_dispatches_client ON external_dispatches(client_name);
CREATE INDEX idx_dispatches_branch_date ON external_dispatches(branch_id, dispatch_date DESC);
