# ✅ MVP System Verification Checklist

Run this before considering the system ready for production.

---

## 🔴 CRITICAL (Must Work)

### Backend & Database
- [ ] Backend starts without errors: `cd backend && npm run dev`
- [ ] API responds: `http://localhost:5000/api/branches`
- [ ] Database connects: Check console for "Supabase connected"
- [ ] 951 transactions loaded: Verify in database
- [ ] 28 products available: Check products in database
- [ ] 3 branches exist: Tamasha, Reem, Msabweni

### Frontend & Authentication
- [ ] Frontend loads: `http://localhost:5173`
- [ ] Login works with admin@example.com / password123
- [ ] Not logged out after page refresh
- [ ] Can logout and login again
- [ ] Role-based sidebar appears (Admin/Manager/Cashier)

### POS System (Cashier Role)
- [ ] Can view products in cart
- [ ] Can add items to cart by typing quantity
- [ ] Can adjust quantities (+/- buttons work)
- [ ] Can remove items from cart
- [ ] Total updates correctly
- [ ] Payment methods visible (Cash, M-Pesa, Card)
- [ ] Can complete a sale without errors
- [ ] Receipt shows/prints
- [ ] Sale appears in Admin Dashboard within 5 seconds

### Admin Dashboard
- [ ] Shows KPI cards with real numbers
- [ ] Total Sales > 50,000 KES
- [ ] Shows all 3 branches
- [ ] Charts display data (not white/blank)
- [ ] Recent transactions table has data
- [ ] Low stock alerts showing
- [ ] No console errors

### Branch Management
- [ ] All 3 branch cards visible
- [ ] Each card shows: Sales, Staff, Expenses, Stock
- [ ] Numbers are > 0 (not zeroes)
- [ ] Can click each branch card
- [ ] Branch details page loads

---

## 🟡 IMPORTANT (Should Work)

### Mobile Responsiveness
- [ ] Open DevTools (F12) and toggle mobile view
- [ ] No horizontal scrolling at 390px width
- [ ] POS cart items stack vertically
- [ ] Buttons are large enough to tap (44px+)
- [ ] Text is readable at default zoom
- [ ] Touch inputs work on real phone

### Data Accuracy
- [ ] Branch 1 (Tamasha): 16+ transactions shown
- [ ] Branch 2 (Reem): 13+ transactions shown
- [ ] Branch 3 (Msabweni): 5+ transactions shown
- [ ] Expenses show categories (Utilities, Supplies, etc.)
- [ ] Stock shows opening/closing kg
- [ ] Staff count per branch is correct

### Real-Time Updates
- [ ] Log a new sale, see it appear in dashboard
- [ ] Log expense, verified in branch management
- [ ] Change product quantity, reflected in next load
- [ ] No data cached/delayed (< 1 second updates)

### All User Roles
- [ ] Admin can see dashboard
- [ ] Manager can see branch data
- [ ] Cashier can process sales
- [ ] Cannot access other roles' screens
- [ ] Password changes work

---

## 🟢 NICE TO HAVE

### Performance
- [ ] Page loads in < 3 seconds
- [ ] No console warnings/errors
- [ ] Charts render smoothly
- [ ] Responsive to user input (< 500ms)
- [ ] Can handle 100+ products

### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

### Edge Cases
- [ ] Can logout and login multiple times
- [ ] Can refresh page without losing session
- [ ] Can open on 2 tabs simultaneously
- [ ] Delete branch doesn't break system
- [ ] Add new product shows in POS

---

## 🧪 Test Script (Do This First)

```bash
# 1. Start backend
cd backend
npm run dev

# In another terminal:

# 2. Start frontend
npm run dev

# 3. Run verification
npm run test:mvp
# OR
node backend/mvp-readiness-test.js

# Expected output:
# ✅ RUNNING backend
# ✅ RUNNING frontend
# ✅ CONNECTED database
# ✅ POS System: 5/5 features
# ✅ Admin Dashboard: 5/5 features
# ✅ Branch Management: 5/5 features
```

---

## 💻 Manual Testing Steps

### Step 1: Login as Admin (5 min)
```
1. Open http://localhost:5173
2. Enter: admin@example.com
3. Enter: password123
4. Click Login
5. Verify: Admin Dashboard loads
```

### Step 2: Check Dashboard (5 min)
```
1. Look at KPI cards at top
2. Verify numbers show (not blank/white)
3. Check charts have lines/bars
4. Scroll down - see transactions table
5. See low stock alerts section
```

### Step 3: Test Branch Management (5 min)
```
1. Click "Branch Management" in left menu
2. Verify 3 branch cards visible
3. Each card shows numbers for: Sales, Staff, Expenses
4. Click a branch card
5. See detailed metrics
```

### Step 4: Test POS System (10 min)
```
1. Logout (click admin → Logout)
2. Login as: cashier1@tamasha.com / @Kenya70!
3. Click POS in left sidebar
4. Type "5" in any product quantity
5. Click Add to Cart
6. Verify item appears in cart
7. Click "Complete Sale"
8. Select "Cash" payment
9. Click "Complete"
10. See receipt
11. Close receipt
12. Logout
13. Login as admin again
14. Check dashboard - new transaction added
```

### Step 5: Test Mobile (5 min)
```
1. Press F12 (open DevTools)
2. Click device toggle icon (mobile phone)
3. Select: iPhone 12 or common size
4. Refresh page (F5)
5. Login as cashier
6. Click POS
7. Try adding items
8. Verify cursor can tap buttons
9. Try swiping cart items
10. No horizontal scroll
```

---

## ✅ Sign-Off Checklist

**Developer Name:** ________________  
**Date:** ________________  
**Environment:** ☐ Local (PC) ☐ Local (Mobile) ☐ Server

### Systems Verified
- ☐ Backend running and responding
- ☐ Frontend loading correctly
- ☐ Database connected with real data
- ☐ Authentication working (login/logout)
- ☐ POS system functional
- ☐ Admin dashboard accurate
- ☐ Branch management showing data
- ☐ Mobile responsive
- ☐ No critical errors in console

### Data Verified
- ☐ 3 branches with data
- ☐ 951 transactions present
- ☐ 28 products available
- ☐ Expense categories working
- ☐ Stock levels tracking
- ☐ User accounts created

### Testing Status
- ☐ Cashier workflow tested
- ☐ Admin workflow tested
- ☐ Logout/login cycle works
- ☐ No data loss observed
- ☐ Mobile view works

### Sign-Off
```
SYSTEM IS: ☐ READY FOR PRODUCTION ☐ NEEDS FIXES

Issues Remaining (if any):
1. _________________________________
2. _________________________________
3. _________________________________

Approved by: _________________________________
```

---

## 🚨 If Something Doesn't Work

**Backend issues:**
```bash
# Restart backend
cd backend
npm run dev
# Should see: "Server running on port 5000"
```

**Frontend issues:**
```bash
# Restart frontend
npm run dev
# Should see: "VITE v... ready in ... ms"
```

**Database issues:**
```bash
# Check .env has correct credentials
# Verify Supabase project is active
# Check internet connection
```

**Login issues:**
```bash
# Clear cache: Ctrl+Shift+Delete
# Try incognito window
# Verify admin user exists in database
# Check password in users table
```

**Data issues:**
```bash
# Check database has branches
# Verify transactions table populated
# Ensure products have prices
# Check stock_history has data
```

---

## Expected System Output

When everything is working:

**Backend Console (npm run dev in backend/):**
```
Server running on port 5000 ✓
Supabase connected ✓
Database initialized ✓
```

**Frontend Console (should have NO errors, only maybe warnings):**
```
✓ Vite loaded
✓ React mounted
✓ API client ready
```

**Browser Console (F12):**
```
No red errors ✓
No network failures (404/500) ✓
All API calls return 200 ✓
```

---

**System is ready when ALL CRITICAL items are checked! ✅**
