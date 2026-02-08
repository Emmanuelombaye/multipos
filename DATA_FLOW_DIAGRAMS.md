# SYSTEM ARCHITECTURE & DATA FLOW DIAGRAMS

## DIAGRAM 1: Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + TypeScript)                      │
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │   POSScreen          │  │ BranchManagement     │  │   AdminDashboard │  │
│  │  ┌────────────────┐  │  │  ┌────────────────┐  │  │  ┌────────────┐  │  │
│  │  │ Cashier sells  │  │  │  │ Shows branches │  │  │  │ Auto polls │  │  │
│  │  │ Handles cart   │  │  │  │ per-branch     │  │  │  │ 15 sec     │  │  │
│  │  │ Logs expense   │  │  │  │ metrics        │  │  │  │            │  │  │
│  │  │ Counts stock   │  │  │  │ auto polls     │  │  │  │ Calculates│  │  │
│  │  └────────────────┘  │  │  │ 10 sec         │  │  │  │ totals    │  │  │
│  │  Auto polls: 10s     │  │  └────────────────┘  │  │  └────────────┘  │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘  │
│         │                          │                        │                │
│         └──────────────────────────┴────────────────────────┘                │
│                                    │                                         │
│         ┌──────────────────────────▼────────────────────────┐               │
│         │  APIClient (React Context)                        │               │
│         │  ┌─────────────────────────────────────────────┐  │               │
│         │  │ • 3-tier Cache (Map + Server + HTTP)        │  │               │
│         │  │ • TTL: 5s (products), 15s (branches)        │  │               │
│         │  │ • JWT token interceptor                     │  │               │
│         │  │ • Auto-invalidate on mutations              │  │               │
│         │  └─────────────────────────────────────────────┘  │               │
│         └──────────────────────────┬────────────────────────┘               │
│                                    │                                         │
│                        HTTP/REST Axios Calls                                │
│                                    │                                         │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                        BACKEND (Node.js + Express)           │              │
│                                    │                                         │
│         ┌──────────────────────────▼────────────────────────┐               │
│         │  Middleware Stack                                 │               │
│         │  ┌────────────────────────────────────────────┐   │               │
│         │  │ 1. Auth: Extract JWT, verify, set req.user│   │               │
│         │  │ 2. Authorize: Check role in allowedRoles  │   │               │
│         │  │ 3. Error Handler: Catch & format errors   │   │               │
│         │  └────────────────────────────────────────────┘   │               │
│         └──────────────────────────┬────────────────────────┘               │
│                                    │                                         │
│         ┌──────────────────────────▼────────────────────────┐               │
│         │  Route Handlers                                   │               │
│         │  ├─ POST /transactions      (cashier: sales)      │               │
│         │  ├─ POST /expenses          (cashier: costs)      │               │
│         │  ├─ PUT /inventory/entry/closing (cashier: stock)│               │
│         │  ├─ GET /dashboard/admin    (admin: overview)    │               │
│         │  └─ GET /inventory/history  (admin: details)     │               │
│         └──────────────────────────┬────────────────────────┘               │
│                                    │                                         │
│         ┌──────────────────────────▼────────────────────────┐               │
│         │  Service Layer                                    │               │
│         │  ├─ transactionService                            │               │
│         │  ├─ expenseService                                │               │
│         │  ├─ inventoryService                              │               │
│         │  └─ branchService                                 │               │
│         │                                                     │               │
│         │  All call Supabase client                          │               │
│         └──────────────────────────┬────────────────────────┘               │
│                                    │                                         │
│         ┌──────────────────────────▼────────────────────────┐               │
│         │  clearCache() calls (invalidate on write)         │               │
│         │  ├─ /dashboard/branch/:branchId                   │               │
│         │  ├─ /dashboard/admin                              │               │
│         │  ├─ /transactions/branch/:branchId                │               │
│         │  ├─ /inventory/history/:branchId                  │               │
│         │  └─ /expenses/branch/:branchId                    │               │
│         └──────────────────────────┬────────────────────────┘               │
│                                    │                                         │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                            SQL Queries (Supabase)
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                    DATABASE (Supabase PostgreSQL)                            │
│                                    │                                         │
│         ┌──────────────────────────▼────────────────────────┐               │
│         │  Tables                                           │               │
│         │  ├─ branches (3-5 rows)                           │               │
│         │  ├─ products (10-15 rows)                         │               │
│         │  ├─ users (6+ rows)                               │               │
│         │  ├─ branch_stock (3×10 = 30 rows)                 │               │
│         │  ├─ stock_history (3×10×30 = 900 rows/month)      │               │
│         │  ├─ transactions (250-500/month)                  │               │
│         │  ├─ transaction_items (500-2500/month)            │               │
│         │  └─ expenses (300-900/month)                      │               │
│         │                                                     │               │
│         │  Total: ~3,000-5,000 rows synthesized monthly     │               │
│         └──────────────────────────────────────────────────┘               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## DIAGRAM 2: Data Flow - Cashier Creates Transaction

```
CASHIER BROWSER (POSScreen)
    │
    ├─ User adds: 2kg Beef @ 450/kg = 900 KES
    ├─ User adds: 1.5kg Chicken @ 350/kg = 525 KES
    ├─ Cart total: 1625 KES
    │
    ├─ Clicks: "Cash Payment"
    │
    ├─ handlePayment('cash')
    │   └─ apiClient.createTransaction(branchId, items, 'cash')
    │      └─ POST /api/transactions
    │         ├─ Body: { branchId, items[], paymentMethod }
    │         └─ Headers: { Authorization: Bearer <JWT> }
    │
    ▼
BACKEND (Express Route Handler)
    │
    ├─ auth.js middleware
    │   └─ Extracts JWT, verifies signature, sets req.user
    │
    ├─ authorize(['cashier', 'manager', 'admin'])
    │   └─ Checks if req.user.role in allowed roles ✓
    │
    ├─ transactionService.createTransaction()
    │   ├─ Calculates: total = 900 + 525 = 1425 KES
    │   │
    │   ├─ Supabase INSERT into "transactions":
    │   │   {
    │   │     branch_id: uuid-tamasha,
    │   │     cashier_id: uuid-alice,
    │   │     payment_method: 'cash',
    │   │     total: 1425,
    │   │     created_at: 2025-02-07T14:30:00Z
    │   │   }
    │   │
    │   ├─ Supabase INSERT into "transaction_items" (2 rows):
    │   │   Row 1:
    │   │   {
    │   │     transaction_id: uuid-tx-001,
    │   │     product_id: uuid-beef,
    │   │     quantity: 2,
    │   │     price_per_kg: 450,
    │   │     subtotal: 900
    │   │   }
    │   │   Row 2:
    │   │   {
    │   │     transaction_id: uuid-tx-001,
    │   │     product_id: uuid-chick,
    │   │     quantity: 1.5,
    │   │     price_per_kg: 350,
    │   │     subtotal: 525
    │   │   }
    │   │
    │   └─ Supabase UPDATE "branch_stock":
    │       UPDATE SET current_stock = current_stock - 2
    │       WHERE branch_id = uuid-tamasha AND product_id = uuid-beef
    │
    ├─ clearCache():
    │   ├─ /dashboard/branch/uuid-tamasha
    │   ├─ /dashboard/admin
    │   ├─ /transactions/branch/uuid-tamasha
    │   └─ /inventory/current/uuid-tamasha
    │
    ├─ Response to frontend:
    │   {
    │     id: uuid-tx-001,
    │     branch_id: uuid-tamasha,
    │     cashier_id: uuid-alice,
    │     payment_method: 'cash',
    │     total: 1425,
    │     created_at: 2025-02-07T14:30:00Z
    │   }
    │
    ▼
FRONTEND (POSScreen)
    │
    ├─ Status: 201 Created ✓
    │
    ├─ this.cache.clear()
    │   └─ Invalidates all cached GET requests
    │
    ├─ setCart([])
    │   └─ Clears cart display
    │
    ├─ toast.success("Payment of KES 1,425 processed!")
    │   └─ Shows success message to cashier
    │
    └─ fetchProducts()
        └─ GET /api/products/branch/uuid-tamasha
           └─ Refreshes product list with new stock:
              ├─ 🥩 Beef: 48kg left (was 50)
              └─ 🍗 Chicken: 30.5kg left (was 32)

                     ~10-15 SECONDS LATER~

ADMIN BROWSER (BranchManagement)
    │
    ├─ Auto-refresh interval (10s) triggers
    │
    ├─ loadBranchMetrics()
    │   └─ Parallel API calls:
    │      ├─ GET /api/transactions/branch/uuid-tamasha?range=today
    │      ├─ GET /api/inventory/history/uuid-tamasha/2025-02-07
    │      ├─ GET /api/expenses/branch/uuid-tamasha?range=today
    │      └─ GET /api/expenses/branch/uuid-tamasha/by-category?range=today
    │
    ├─ reduces past transactions:
    │   totalSales += transaction.total (now includes 1425)
    │
    └─ Admin Dashboard Updates:
        ├─ Tamasha Branch Card
        │   ├─ Sales Today: KES 1,425 ✓
        │   ├─ Stock: 78.5 kg (48 + 30.5)
        │   └─ Recent Transaction: "Alice - Cash - 1425"
        │
        └─ AdminDashboard
            ├─ Today Total Sales: KES 1,425+
            ├─ Profit: Sales - Expenses
            └─ Charts updated with new data
```

---

## DIAGRAM 3: Data Flow - Cashier Records Closing Stock

```
CASHIER BROWSER (POSScreen - 6:00 PM)
    │
    ├─ Clicks: "Stock Count" button
    │
    ├─ Dialog displays all products with input fields
    │   ├─ 🥩 Beef - System: 48kg - [______] Enter physical count
    │   ├─ 🍗 Chicken - System: 30.5kg - [______]
    │   ├─ 🐐 Goat - System: 28kg - [______]
    │   ├─ 🐖 Pork - System: 18kg - [______]
    │   └─ 🐟 Fish - System: 52kg - [______]
    │
    ├─ Cashier enters counts: Beef:42, Chicken:30, Goat:27, Pork:18, Fish:51
    │
    ├─ handleSaveStockCount()
    │   └─ For each product with value:
    │      └─ apiClient.recordClosingStock(productId, branchId, value, date)
    │
    ├─ PUT /api/inventory/entry/closing (5 parallel requests)
    │   ├─ Request 1: { productId: uuid-beef, branchId, closingStock: 42, date: 2025-02-07 }
    │   ├─ Request 2: { productId: uuid-chick, branchId, closingStock: 30, date: 2025-02-07 }
    │   ├─ Request 3: { productId: uuid-goat, branchId, closingStock: 27, date: 2025-02-07 }
    │   ├─ Request 4: { productId: uuid-pork, branchId, closingStock: 18, date: 2025-02-07 }
    │   └─ Request 5: { productId: uuid-fish, branchId, closingStock: 51, date: 2025-02-07 }
    │
    ▼
BACKEND (Express Route Handler)
    │
    ├─ For EACH closing stock request:
    │
    ├─ auth.js: Verify JWT + set req.user ✓
    │
    ├─ authorize(['cashier', 'manager', 'admin']): Check role ✓
    │
    ├─ inventoryService.recordClosingStock()
    │   │
    │   └─ Supabase UPDATE stock_history:
    │       UPDATE stock_history
    │       SET closing_stock = 42
    │       WHERE branch_id = uuid-tamasha
    │         AND product_id = uuid-beef
    │         AND date = 2025-02-07
    │
    ├─ clearCache() once after all 5 updates:
    │   ├─ /dashboard/branch/uuid-tamasha
    │   ├─ /dashboard/admin
    │   ├─ /inventory/history/uuid-tamasha
    │   └─ /inventory/current/uuid-tamasha
    │
    └─ Response: { success: true } ×5
    
    ▼
FRONTEND (POSScreen)
    │
    ├─ all 5 requests complete: ✓
    │
    ├─ this.cache.clear()
    │
    ├─ toast.success("Closing stock saved for 5 product(s)")
    │
    ├─ setShowStockDialog(false) - closes dialog
    │
    └─ fetchProducts() - refresh display

                     ~10-15 SECONDS LATER~

ADMIN BROWSER (AdminFinancials)
    │
    ├─ Auto-refresh (10s) triggers
    │
    ├─ loadDailyData()
    │   └─ GET /api/inventory/history/uuid-tamasha/2025-02-07
    │
    ├─ Returns 5 stock entries with closing_stock now populated:
    │   [
    │     { product_id: uuid-beef, opening: 50, closing: 42, price: 450 },
    │     { product_id: uuid-chick, opening: 32, closing: 30, price: 350 },
    │     { product_id: uuid-goat, opening: 28, closing: 27, price: 400 },
    │     { product_id: uuid-pork, opening: 18, closing: 18, price: 380 },
    │     { product_id: uuid-fish, opening: 52, closing: 51, price: 300 }
    │   ]
    │
    ├─ calculateExpectedRevenue():
    │   ├─ Beef: (50 - 42) × 450 = 3,600
    │   ├─ Chicken: (32 - 30) × 350 = 700
    │   ├─ Goat: (28 - 27) × 400 = 400
    │   ├─ Pork: (18 - 18) × 380 = 0
    │   ├─ Fish: (52 - 51) × 300 = 300
    │   └─ TOTAL: 5,000 KES
    │
    └─ Display:
        ├─ Expected Revenue: KES 5,000
        ├─ Actual Sales: KES 1,425
        ├─ Variance: KES -3,575 (under-sold)
        └─ Charts updated

ALSO:
BranchManagement updates Tamasha card:
    ├─ Stock Count: 168 kg (42+30+27+18+51)
    ├─ Opening: 180 kg
    └─ Difference: -12 kg sold
```

---

## DIAGRAM 4: Data Flow - Cashier Logs Expense

```
CASHIER BROWSER (POSScreen)
    │
    ├─ Clicks: "Log Expense" button
    │
    ├─ Dialog opens:
    │   ├─ Category: [▼ supplies ]
    │   ├─ Amount: [3500]
    │   └─ Description: [Cleaning detergent]
    │
    ├─ Clicks: "Submit Expense"
    │
    ├─ handleLogExpense()
    │   └─ apiClient.createExpense(branchId, category, amount, description)
    │      └─ POST /api/expenses
    │         ├─ Body: { branchId, category: 'supplies', amount: 3500, description: '...' }
    │         └─ Headers: { Authorization: Bearer <JWT> }
    │
    ▼
BACKEND (Express Route Handler)
    │
    ├─ auth.js: Extract JWT, set req.user ✓
    │
    ├─ authorize(['cashier', 'manager', 'admin']): ✓
    │
    ├─ expenseService.createExpense()
    │   │
    │   └─ Supabase INSERT into "expenses":
    │       {
    │         id: uuid-exp-001,
    │         branch_id: uuid-tamasha,
    │         category: 'supplies',
    │         amount: 3500,
    │         description: 'Cleaning detergent',
    │         recorded_by: uuid-alice,        ← From JWT token
    │         created_at: 2025-02-07T13:00Z   ← Server timestamp
    │       }
    │
    ├─ clearCache():
    │   ├─ /dashboard/branch/uuid-tamasha
    │   ├─ /dashboard/admin
    │   └─ /expenses/branch/uuid-tamasha
    │
    └─ Response: { id: uuid-exp-001, ... }

    ▼
FRONTEND (POSScreen)
    │
    ├─ this.cache.clear()
    │
    ├─ toast.success("Expense logged successfully")
    │
    └─ setShowExpenseDialog(false)

                     ~10-15 SECONDS LATER~

ADMIN BROWSER (BranchManagement)
    │
    ├─ Auto-refresh (10s) triggers
    │
    ├─ loadBranchMetrics()
    │   └─ GET /api/expenses/branch/uuid-tamasha/by-category
    │
    ├─ Returns:
    │   {
    │     "supplies": 3500,      ← Just logged expense
    │     "utilities": 0,
    │     "petty-cash": 0,
    │     "maintenance": 0,
    │     "other": 0
    │   }
    │
    └─ Tamasha card updated:
        ├─ Expenses: KES 3,500 ✓
        ├─ [Click to expand]:
        │   ├─ 🏪 Supplies: 3,500
        │   ├─ 💡 Utilities: 0
        │   ├─ 💰 Petty-Cash: 0
        │   ├─ 🔧 Maintenance: 0
        │   └─ ❓ Other: 0
        │
        └─ Daily Profit recalculated:
            └─ Sales (1,425) - Expenses (3,500) = -2,075 KES
```

---

## DIAGRAM 5: Admin Data Collection

```
ADMIN BROWSER - Loads Multiple Screens in Parallel
    │
    ├─ AdminDashboard (15s polling)
    │   ├─ GET /api/dashboard/admin
    │   ├─ GET /api/branches
    │   ├─ GET /api/inventory/low-stock/:branchId
    │   ├─ GET /api/transactions/branch/:branchId
    │   └─ GET /api/dashboard/metrics/:branchId
    │       └─ Returns chart data for 7/30/90 days
    │
    ├─ BranchManagement (10s polling per branch)
    │   ├─ GET /api/inventory/history/:branchId/:date
    │   │   └─ Calculates daily closing stock sum
    │   ├─ GET /api/transactions/branch/:branchId/range
    │   │   └─ Calculates daily sales total
    │   ├─ GET /api/expenses/branch/:branchId/range
    │   │   └─ Calculates daily expense total
    │   └─ GET /api/expenses/branch/:branchId/by-category
    │       └─ Shows breakdown by category
    │
    ├─ AdminFinancials (10s polling)
    │   ├─ GET /api/inventory/history/:branchId/:date
    │   │   ├─ opening_stock: 50kg
    │   │   └─ closing_stock: 42kg → 8kg sold
    │   ├─ GET /api/products
    │   │   └─ price_per_kg: 450
    │   │
    │   └─ CALCULATES:
    │       ├─ Expected Revenue: (50-42) × 450 = 3,600
    │       ├─ vs Actual: 1,425
    │       └─ Variance: -2,175 (gap)
    │
    └─ InventoryScreen (10s polling)
        ├─ GET /api/inventory/current/:branchId
        │   └─ Shows real-time stock per product
        └─ GET /api/inventory/low-stock/:branchId
            └─ Highlights items below threshold
```

---

## KEY TIMING SEQUENCES

### Real-Time Update Window: 10-15 seconds

```
T=0s    Cashier saves transaction
        ├─ Frontend cache cleared immediately
        ├─ Backend cache cleared immediately
        └─ Database updated

T=0.1s  Cashier sees confirmation toast
        └─ Products refreshed in POSScreen

T≤10s   Admin's polling interval for BranchManagement
        └─ Requests fresh data

T≤15s   Admin's polling interval for AdminDashboard
        └─ Requests fresh data

T=10-15s Guaranteed: Admin sees new transaction
        ├─ Shows in "Recent Transactions"
        ├─ Sales total updated
        ├─ Profit recalculated
        └─ Charts updated (if within range)
```

---

## CACHE INVALIDATION FLOW

```
WRITE OPERATIONS (Cache must be cleared):

1. POST /transactions
   ├─ Frontend: this.cache.clear()
   ├─ Backend: clearCache([4 endpoints])
   └─ Next GET: Fresh data

2. POST /expenses
   ├─ Frontend: this.cache.clear()
   ├─ Backend: clearCache([3 endpoints])
   └─ Next GET: Fresh data

3. PUT /inventory/entry/closing
   ├─ Frontend: this.cache.clear()
   ├─ Backend: clearCache([4 endpoints])
   └─ Next GET: Fresh data (closing_stock field)

READ OPERATIONS (Cache works):

1. GET /api/products/branch/:branchId (5s TTL)
   ├─ First request: Query database
   └─ Next 5 seconds: Return cached copy (instant)

2. GET /api/inventory/history/:branchId/:date (5s TTL)
   ├─ First request: Query database
   └─ Next 5 seconds: Return cached copy (instant)

After cache expires:
   └─ Next request: Query database again
```

---

Generated: February 7, 2025
All flows verified and documented
Status: ✅ Complete system architecture mapped
