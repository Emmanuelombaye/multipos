# Stock Audit Screen Setup

## Overview
The **StockAuditScreen** is a comprehensive admin dashboard that shows the complete daily stock flow for all branches:
- Opening stock
- Mid-shift additions
- Transfers in/out
- External dispatches
- Closing stock
- Variance calculation

## Database Setup Required

The `stock_additions` table needs to be created in your Supabase database. This table tracks mid-shift stock additions with full audit trail.

### Step 1: Run this SQL in Supabase SQL Editor

```sql
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
```

### Step 2: Enable RLS (Row Level Security)

```sql
-- Enable RLS
ALTER TABLE stock_additions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read stock additions"
  ON stock_additions FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated users to insert stock additions"
  ON stock_additions FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

### Step 3: Verify Setup

Run this query to verify the table was created:

```sql
SELECT COUNT(*) FROM stock_additions;
```

You should see `0` (zero records) if the table is empty, which is expected for a new setup.

## Features

### 1. Date Selection
- Pick any date to view historical audit data
- Defaults to today (Kenya timezone)

### 2. Summary KPIs
- **Opening**: Total opening stock across all branches
- **Added**: Total mid-shift additions
- **Dispatched**: Total external dispatches
- **Variance**: Closing - Expected (red = loss, blue = gain, green = zero)
- **Pending Close**: Number of products without closing stock recorded

### 3. Per-Branch Collapsible Sections
Each branch shows a detailed table with:

| Column | Description |
|--------|-------------|
| Product | Product name with emoji |
| Opening | Opening stock from `stock_history` |
| +Added | Mid-shift additions from `stock_additions` |
| +In | Transfers received from other branches |
| −Out | Transfers sent to other branches |
| −Dispatch | External dispatches to clients |
| Expected | Calculated: Opening + Added + In − Out − Dispatch |
| Closing | Physical count from `stock_history` |
| Variance | Closing − Expected |

### 4. Color Coding
- **Blue**: Opening stock
- **Green**: Additions/gains
- **Purple**: Transfers in
- **Red**: Transfers out
- **Orange**: Dispatches
- **Red variance**: Stock loss (shrinkage)
- **Blue variance**: Stock gain
- **Green variance**: Perfect match (no variance)

### 5. Branch Totals
Each branch section has a footer row showing totals for all columns.

## Usage

### Admin Access Only
The Stock Audit screen is only available to users with `admin` role.

### Navigation
1. Login as admin
2. Click "Stock Audit" in the navigation menu
3. Select a date (defaults to today)
4. Click refresh icon to reload data
5. Click branch name to expand/collapse details

### Understanding Variance
- **Variance = 0kg**: Perfect match between physical count and expected
- **Variance < 0kg** (red): Stock loss/shrinkage — physical count is less than expected
- **Variance > 0kg** (blue): Stock gain — physical count is more than expected (unusual, may indicate counting error)

### Pending Closing Stock
Products showing "Pending" badge haven't had their closing stock recorded yet. Cashiers need to complete the end-of-day count in the "Close Stock" screen.

## API Endpoints Used

The StockAuditScreen fetches data from these endpoints:

1. `GET /api/branches` — All branches
2. `GET /api/products` — All products
3. `GET /api/inventory/history/:branchId/:date` — Stock history for specific date
4. `GET /api/inventory/additions/:branchId` — Mid-shift additions
5. `GET /api/inventory/transfers?branchId=:id` — Internal transfers
6. `GET /api/inventory/dispatches/:branchId` — External dispatches
7. `GET /api/inventory/current/:branchId` — Current live stock

## Troubleshooting

### "No stock activity found"
- Check if the selected date has any stock history records
- Ensure branches have recorded opening stock for that date
- Try selecting today's date

### "Failed to load audit data"
- Check browser console for errors
- Verify all API endpoints are accessible
- Ensure `stock_additions` table exists in database

### Missing mid-shift additions
- Verify the `stock_additions` table was created (see Step 1 above)
- Check if any additions were recorded for the selected date
- Additions are only shown if they exist in the database

## Future Enhancements

- Export to PDF/Excel
- Filter by product or branch
- Date range comparison
- Variance alerts/notifications
- Drill-down to transaction details
