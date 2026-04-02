@echo off
echo.
echo ========================================
echo Committing Stock Movements Fix
echo ========================================
echo.

REM Add all new files
git add backend/fix-stock-transfer-requests.sql
git add backend/test-stock-movements.js
git add backend/auto-fix-table.js
git add backend/create-missing-table.js
git add backend/verify-and-fix-schema.js
git add backend/src/db/complete_stock_movements_schema.sql
git add QUICK_FIX.md
git add STOCK_MOVEMENTS_FIX.md

REM Commit with descriptive message
git commit -m "Fix: Add missing stock_transfer_requests table and verification scripts

- Created SQL schema for stock_transfer_requests table
- Added test script to verify all stock movement tables exist
- Created automated fix scripts and documentation
- Added comprehensive fix guides (QUICK_FIX.md and STOCK_MOVEMENTS_FIX.md)

This fixes the error: 'Could not find the table public.stock_transfer_requests in the schema cache'

Tables verified:
- stock_transfer_requests (MISSING - needs to be created)
- stock_transfers (EXISTS)
- external_dispatches (EXISTS)
- stock_additions (EXISTS)

To fix: Run backend/fix-stock-transfer-requests.sql in Supabase SQL Editor"

echo.
echo ✅ Changes committed successfully!
echo.
echo Next steps:
echo 1. Run: git push
echo 2. Follow instructions in QUICK_FIX.md to create the missing table
echo 3. Run: node backend/test-stock-movements.js to verify
echo.
pause
