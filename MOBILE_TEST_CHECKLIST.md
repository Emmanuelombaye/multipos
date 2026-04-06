📱 MOBILE TESTING CHECKLIST
========================================

Test this on your phone: https://edendrop001pos.vercel.app

TEST 1: STOCK DEDUCTION AFTER SALE ✅
----------------------------------------
1. Login as cashier for any branch
2. Go to POS screen
3. Note the current stock of a product (e.g., "Kuku: 25kg")
4. Add 2kg to cart
5. Complete the sale (pay with cash)
6. Wait 2 seconds
7. Check the product stock again
   
   ✅ PASS: Stock decreased by 2kg (now shows 23kg)
   ❌ FAIL: Stock still shows 25kg (not decreasing)

TEST 2: NO CACHING ISSUE ✅
----------------------------------------
1. After completing a sale, pull down to refresh
2. Check if stock still shows the updated amount
   
   ✅ PASS: Stock remains at 23kg (no cache)
   ❌ FAIL: Stock jumps back to 25kg (caching issue)

TEST 3: CART BUTTON VISIBLE ✅
----------------------------------------
1. On POS screen, scroll down to bottom
2. Check if cart button is visible above bottom navigation
   
   ✅ PASS: Cart button visible (z-60)
   ❌ FAIL: Cart button hidden behind tabs

TEST 4: STOCK MOVEMENTS SCREEN ✅
----------------------------------------
1. Tap "Movements" tab at bottom
2. Check if all tabs load:
   - Transfer Requests
   - Transfer History
   - External Dispatches
   - Stock Additions
   
   ✅ PASS: All tabs show data or "No records"
   ❌ FAIL: Tabs show errors or won't load

TEST 5: CLOSE STOCK SCREEN ✅
----------------------------------------
1. Tap "Close Stock" tab at bottom
2. Check if products list loads
3. Try entering closing stock for one product
4. Submit
   
   ✅ PASS: Closing stock saved successfully
   ❌ FAIL: Error or double submission

TEST 6: LOADING STATES ✅
----------------------------------------
1. When completing a sale, check if:
   - Button shows spinner
   - Button is disabled during processing
   - Can't double-click to submit twice
   
   ✅ PASS: Loading states work, no double submission
   ❌ FAIL: Can click multiple times, creates duplicate sales

========================================
CRITICAL TESTS: #1 and #2
If these fail, the SQL fix didn't work properly.

REPORT RESULTS:
Tell me which tests PASSED ✅ and which FAILED ❌
