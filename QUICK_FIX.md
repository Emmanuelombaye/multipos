# QUICK FIX - Stock Transfer Requests Table Missing

## The Error
```
Could not find the table 'public.stock_transfer_requests' in the schema cache
```

## The Fix (2 minutes)

### Option 1: Run SQL in Supabase Dashboard (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste this SQL:**

```sql
-- Create the missing table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transfer_req_from ON stock_transfer_requests(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfer_req_to ON stock_transfer_requests(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfer_req_status ON stock_transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_req_product ON stock_transfer_requests(product_id);

-- Verify
SELECT 'Table created successfully!' as status;
```

4. **Click "Run" (or press Ctrl+Enter)**

5. **Verify the fix:**
   ```bash
   cd backend
   node test-stock-movements.js
   ```

   You should see:
   ```
   ✅ PASSED: stock_transfer_requests table exists
   ```

6. **Test the app:**
   - Restart your backend server
   - Refresh the frontend
   - Open Movements screen - error should be gone!

### Option 2: Use the SQL File

If you prefer to use a file:

1. Open Supabase SQL Editor
2. Click "New Query"
3. Copy contents from: `backend/fix-stock-transfer-requests.sql`
4. Paste and Run

## Verify Everything Works

After running the SQL:

```bash
# Test the database
cd backend
node test-stock-movements.js

# Should show all green checkmarks ✅
```

## What This Table Does

The `stock_transfer_requests` table manages the workflow when one branch sends stock to another:

1. **Cashier sends request** → Stock deducted from sender (in transit)
2. **Receiver sees pending request** → Can accept or reject
3. **On accept** → Stock added to receiver
4. **On reject** → Stock returned to sender

## Troubleshooting

### Still seeing the error?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart backend: `npm run dev`
3. Hard refresh frontend (Ctrl+Shift+R)

### SQL fails to run?
- Make sure you're using the Service Role key
- Check you have admin permissions in Supabase
- Try running each CREATE statement separately

### Table exists but still errors?
```sql
-- Drop and recreate
DROP TABLE IF EXISTS stock_transfer_requests CASCADE;
-- Then run the CREATE TABLE statement again
```

## Done!

After running the SQL, your Movements screen should work perfectly. You'll be able to:
- ✅ Send transfer requests between branches
- ✅ Accept/reject incoming requests
- ✅ View transfer history
- ✅ Create external dispatches

---

**Time to fix:** ~2 minutes  
**Difficulty:** Easy (just copy-paste SQL)
