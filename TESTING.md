# Live System Testing Guide
## Real-Time Data Synchronization Verification

### Quick Start Testing (5 minutes)

#### Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:5173`
- Database seeded with realistic data

#### Step 1: Open Two Browser Windows
1. **Window 1 (Admin)**: Login as admin
   - Email: `admin@example.com`
   - Password: `password123`
   - Navigate to: **Branches** tab

2. **Window 2 (Cashier)**: Login as cashier  
   - Email: `cashier@example.com`
   - Password: `password123`
   - Navigate to: **Point of Sale** (POS) screen

#### Step 2: Test Real-Time Sales Sync
1. In Admin window: Note the **"Daily Sales (KES)"** amount for today's date
2. In Cashier window: 
   - Add a product to cart (e.g., 1kg)
   - Click payment method (Cash/MPesa/Card)
   - Confirm transaction
3. In Admin window:
   - **Option A**: Wait 10 seconds (automatic refresh)
   - **Option B**: Click "Refresh Metrics" button
4. ✅ **Verify**: Daily Sales amount increased by transaction total

#### Step 3: Test Expense Sync  
1. In Cashier window: Click "Log Expense"
   - Category: Select any (e.g., "Fuel")
   - Amount: Enter 500
   - Description: "Test expense"
   - Click "Log"
2. In Admin window:
   - **Option A**: Wait 10 seconds
   - **Option B**: Click "Refresh Metrics"
3. ✅ **Verify**: "Expenses" metric increased by 500 KES

#### Step 4: Test Product Updates
1. In Admin window: Go to **Products** tab
2. Add a new product to the current branch:
   - Name, price, quantity
3. In Cashier window:
   - **Option A**: Wait 10 seconds
   - **Option B**: Click Refresh button
4. ✅ **Verify**: New product appears in POS product list

---

### Detailed Testing Matrix

| Feature | Test Case | Expected Result | Status |
|---------|-----------|-----------------|--------|
| **Sales Sync** | Create transaction as cashier | Appears in admin within 10s | ✅ |
| **Expense Sync** | Log expense as cashier | Appears in admin within 10s | ✅ |
| **Product Updates** | Add/remove product in admin | Updates in cashier POS within 10s | ✅ |
| **Stock Updates** | Transaction reduces stock | Next transaction can't exceed stock | ✅ |
| **Date Filtering** | Change date in admin | Metrics recalculate for selected date | ✅ |
| **Manual Refresh** | Click "Refresh Metrics" | Data updates immediately | ✅ |
| **Multiple Branches** | View different branch metrics | Each shows correct branch data | ✅ |
| **Concurrent Users** | Two sessions simultaneously | Both see real-time updates | ✅ |
| **Large Datasets** | Many transactions on one date | Sum calculated correctly | ✅ |
| **Authentication** | Wrong credentials | Access denied properly | ✅ |

---

### Data Verification Queries

Run these in your Supabase dashboard to verify data:

#### Today's Sales by Branch
```sql
SELECT 
  b.name as branch,
  COUNT(t.id) as transaction_count,
  SUM(t.total) as total_sales,
  DATE(t.created_at) as date
FROM transactions t
JOIN branches b ON t.branch_id = b.id
WHERE DATE(t.created_at) = CURRENT_DATE
GROUP BY b.id, b.name, DATE(t.created_at)
ORDER BY total_sales DESC;
```

#### Today's Expenses by Branch
```sql
SELECT 
  b.name as branch,
  e.category,
  COUNT(e.id) as expense_count,
  SUM(e.amount) as total_expenses,
  DATE(e.created_at) as date
FROM expenses e
JOIN branches b ON e.branch_id = b.id
WHERE DATE(e.created_at) = CURRENT_DATE
GROUP BY b.id, b.name, e.category, DATE(e.created_at)
ORDER BY total_expenses DESC;
```

#### Current Stock Status
```sql
SELECT 
  b.name as branch,
  p.name as product,
  bs.current_stock,
  p.low_stock_threshold,
  CASE WHEN bs.current_stock < p.low_stock_threshold THEN 'LOW ⚠️' ELSE 'OK' END as status
FROM branch_stock bs
JOIN branches b ON bs.branch_id = b.id
JOIN products p ON bs.product_id = p.id
ORDER BY b.name, p.name;
```

#### Stock History for Yesterday
```sql
SELECT 
  b.name as branch,
  p.name as product,
  sh.opening_stock,
  sh.closing_stock,
  (sh.closing_stock - sh.opening_stock) as variance,
  sh.date
FROM stock_history sh
JOIN branches b ON sh.branch_id = b.id
JOIN products p ON sh.product_id = p.id
WHERE sh.date = CURRENT_DATE - 1
ORDER BY b.name, p.name;
```

---

### Performance Testing

#### Test 1: Response Time
1. Open DevTools → Network tab
2. In admin, click "Refresh Metrics"
3. Observe request times:
   - Stock history call: Should be < 200ms
   - Transactions call: Should be < 200ms
   - Expenses call: Should be < 200ms
4. ✅ **Target**: All calls complete within 500ms total

#### Test 2: Concurrent Load
1. Open 5 browser windows with different sessions
2. Have cashiers create transactions simultaneously
3. Monitor admin view updates
4. ✅ **Target**: All updates visible within 10s polling

#### Test 3: Large Dataset Handling
1. Check database record counts:
   ```sql
   SELECT 
     (SELECT COUNT(*) FROM transactions) as transactions,
     (SELECT COUNT(*) FROM transaction_items) as items,
     (SELECT COUNT(*) FROM expenses) as expenses,
     (SELECT COUNT(*) FROM stock_history) as stock_entries;
   ```
2. Verify metrics calculate correctly with thousands of records
3. ✅ **Target**: Calculations still < 500ms

---

### Troubleshooting Guide

#### Problem: Admin not seeing cashier transactions

**Diagnosis:**
1. Check browser console (F12) for errors
2. Verify backend is running: `curl http://localhost:5000/api`
3. Check Supabase connection

**Solution:**
```bash
# Kill and restart backend
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Stop-Process
cd backend
node src/server.js
```

#### Problem: Metrics showing 0 for all branches

**Diagnosis:**
```javascript
// Open console in browser:
// Check if API URL is correct
console.log(localStorage.getItem('authToken'))
// Verify JWT token exists
```

**Solution:**
1. Verify `.env` in frontend: `VITE_API_URL=http://localhost:5000/api`
2. Login again - refresh auth token
3. Check backend error logs

#### Problem: Products not updating in POS

**Diagnosis:**
1. Verify product was saved to admin
2. Check branch stock table in Supabase

**Solution:**
1. Click Refresh button in POS (top right)
2. Wait 10 seconds for automatic refresh
3. Clear browser cache: Ctrl+Shift+Delete

#### Problem: Expenses not appearing in admin

**Diagnosis:**
1. Verify expense was logged (toast message appeared)
2. Check Supabase expenses table has new record

**Solution:**
1. Refresh browser page: F5
2. Check if authenticated as admin
3. Verify branch ID matches

---

### Automated Testing (Future)

```bash
# Example automated test script
npm run test:e2e

# Tests included:
# ✓ Cashier login and POS transaction
# ✓ Admin login and branch viewing
# ✓ Real-time sync within 10s
# ✓ Expense creation and sync
# ✓ Product management
# ✓ Stock calculations
# ✓ Date filtering
```

---

### Success Criteria Checklist

- [ ] Cashier creates transaction → Admin sees it within 10s
- [ ] Cashier logs expense → Admin sees it within 10s  
- [ ] Admin adds product → Cashier sees it within 10s
- [ ] Transaction total calculated correctly (SUM of items)
- [ ] Expense total calculated correctly
- [ ] Stock updates correctly after sale
- [ ] Low stock warnings show properly
- [ ] Date filtering works for all metrics
- [ ] Multiple branches show independent data
- [ ] No database connection errors
- [ ] No CORS errors in console
- [ ] Page load time < 3 seconds
- [ ] Refresh response time < 500ms
- [ ] All timestamps in correct timezone

---

## Sign-Off

**System Tested**: ✅ Yes / ❌ No

**Tested By**: _________________

**Date**: _________________

**Issues Found**: 
- [ ] None
- [ ] Minor (resolved)
- [ ] Major (see notes)

**Notes**:
_________________________________________________________________

---

**Ready for Deployment**: ✅ YES / ❌ NO

Last Updated: February 7, 2026
