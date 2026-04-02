# Stock Movements Error Fix

## Problem
When opening the Movements screen on cashier, you see the error:
```
Could not find the table 'public.stock_transfer_requests' in the schema cache
```

## Root Cause
The `stock_transfer_requests` table (and possibly other stock movement tables) are missing from your Supabase database. These tables were defined in separate SQL files but may not have been created during initial setup.

## Solution

### Step 1: Run the Complete Schema SQL

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the contents of `backend/src/db/complete_stock_movements_schema.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

This will create all missing tables:
- `stock_transfer_requests` - For branch-to-branch transfer requests
- `stock_transfers` - Audit log of completed transfers
- `external_dispatches` - For dispatches to hotels, schools, etc.
- `stock_additions` - Audit log of mid-shift stock additions

### Step 2: Verify the Fix

Run the test script to verify all tables were created:

```bash
cd backend
node test-stock-movements.js
```

You should see:
```
✅ PASSED: stock_transfer_requests table exists
✅ PASSED: stock_transfers table exists
✅ PASSED: external_dispatches table exists
✅ PASSED: stock_additions table exists
```

### Step 3: Test the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd ..
   npm run dev
   ```

3. Login as a cashier
4. Navigate to **Movements** screen
5. Verify no errors appear

## What Each Table Does

### stock_transfer_requests
- Manages the send → receive workflow between branches
- When a cashier sends stock, it's deducted immediately (in transit)
- Receiver can accept or reject the request
- Status: pending, accepted, rejected

### stock_transfers
- Immutable audit log of all completed transfers
- Records before/after stock levels for both branches
- Never deleted - permanent record for reconciliation

### external_dispatches
- Records stock sent to external clients (hotels, villas, schools)
- Tracks payment status and revenue
- Different from internal transfers - stock leaves the system

### stock_additions
- Audit log of mid-shift stock additions
- Records who added stock, when, and why
- Tracks before/after stock levels

## Verification Queries

After running the schema, you can verify in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'stock_transfer_requests', 
  'stock_transfers', 
  'external_dispatches', 
  'stock_additions'
)
ORDER BY table_name;

-- Check table structures
SELECT * FROM stock_transfer_requests LIMIT 1;
SELECT * FROM stock_transfers LIMIT 1;
SELECT * FROM external_dispatches LIMIT 1;
SELECT * FROM stock_additions LIMIT 1;
```

## Troubleshooting

### Error: "relation does not exist"
- The table wasn't created. Re-run the SQL schema file.

### Error: "permission denied"
- Your Supabase user doesn't have permission. Use the service role key or run as admin.

### Error: "column does not exist"
- The table structure is outdated. Drop the table and recreate:
  ```sql
  DROP TABLE IF EXISTS stock_transfer_requests CASCADE;
  -- Then re-run the complete schema
  ```

### Frontend still shows error
1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart the backend server
3. Hard refresh the frontend (Ctrl+Shift+R)

## Files Created

- `backend/src/db/complete_stock_movements_schema.sql` - Complete SQL schema
- `backend/test-stock-movements.js` - Test script to verify tables
- `backend/verify-and-fix-schema.js` - Schema verification utility

## Next Steps

After fixing the schema:
1. Test all stock movement features:
   - Send transfer request
   - Accept/reject transfers
   - Create external dispatch
   - View transfer history
2. Verify data appears correctly in all views
3. Check that stock levels update properly

## Support

If you continue to experience issues:
1. Check the backend logs for detailed error messages
2. Verify your Supabase connection in `.env`
3. Ensure all environment variables are set correctly
4. Run the test script to identify specific failures
