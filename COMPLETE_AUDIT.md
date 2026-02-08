# Complete System Audit - EdenDropInvestment POS

## 1. DATABASE TABLES & SCHEMA

### Core Tables (8 total)

| Table Name | Purpose | Key Fields | Primary Use |
|---|---|---|---|
| **branches** | Store branch locations | id, name, location, status, created_at | Multi-branch management |
| **products** | Product catalog | id, name, category, price_per_kg, low_stock_threshold, image | Inventory & pricing |
| **users** | Staff accounts | id, name, email, role, branch_id, password_hash | Authentication & authorization |
| **branch_stock** | Current stock levels | id, branch_id, product_id, current_stock, updated_at | Real-time stock tracking |
| **stock_history** | Daily opening/closing | id, product_id, branch_id, opening_stock, closing_stock, date | Stock reconciliation |
| **transactions** | Sales records | id, branch_id, cashier_id, payment_method, total, created_at | Revenue tracking |
| **transaction_items** | Sale line items | id, transaction_id, product_id, quantity, price_per_kg, subtotal | Item-level details |
| **expenses** | Operational costs | id, branch_id, category, amount, description, recorded_by, created_at | Expense tracking |

### Indexes Created (for performance)
```sql
idx_branch_stock_branch, idx_branch_stock_product
idx_stock_history_branch, idx_stock_history_product, idx_stock_history_date
idx_transactions_branch, idx_transactions_cashier, idx_transactions_created
idx_transaction_items_transaction, idx_transaction_items_product
idx_expenses_branch, idx_expenses_branch_created
idx_users_branch, idx_users_email
```

---

## 2. CASHIER SIDE MENUS & SCREENS

### Navigation (Cashier Role)
Cashiers see **2 main menu items** in the app:
1. **POS** (Point of Sale) - icon: 🛒
2. **Stock** (Inventory) - icon: 📦

### Screen 1: POS Screen (`POSScreen.tsx`)

**Location:** Bottom left of app when logged in as cashier

**Sections:**
1. **Product Grid** (left side)
   - Shows all products for the branch
   - Displays: Product image/emoji, name, price/kg, stock remaining
   - Click to select product
   - Auto-refreshes every 10 seconds

2. **Quick Weight Selector** (below grid or fixed bottom on mobile)
   - Pre-set buttons: 0.25kg, 0.5kg, 1kg, 1.5kg, 2kg, 2.5kg
   - Custom weight input field
   - Add To Cart button

3. **Cart Panel** (right side or bottom panel)
   - Shows cart items with images
   - Item details: quantity, price/kg
   - Subtotal per item (KES)
   - Buttons: +0.5kg, -0.5kg, delete item
   - Cart total in KES
   - Payment buttons:
     - 💚 Cash Payment
     - 📱 M-Pesa
     - 💳 Card
   - 🖨️ Print Receipt
   - Clear Cart

**Action Buttons (Top Right):**
1. **🔄 Refresh** - Manual refresh of products
2. **📝 Log Expense** - Opens expense dialog
   - Category dropdown: supplies, utilities, petty-cash, maintenance, other
   - Amount (KES) input
   - Description input
3. **📦 Stock Count** - Opens stock counting dialog

### Screen 2: Inventory Screen (`InventoryScreen.tsx`)

**Shows:**
- Current branch stock by product
- Low stock warnings
- Stock adjustments (if manager/admin)

---

## 3. HOW DATA IS COLLECTED (CASHIER SIDE)

### A. Transaction Data Entry

**When Cashier Creates Transaction:**
```
1. Select product from grid → Click
2. Choose weight (quick or custom) → Add to Cart
3. Product added to cart with:
   - productId, productName, pricePerKg, quantity, total
4. Repeat for multiple items
5. Click Payment Method (cash/mpesa/card)
```

**Data Submitted to Backend:**
```javascript
POST /api/transactions
{
  "branchId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2.5,        // in kg
      "pricePerKg": 450,
      "subtotal": 1125
    }
  ],
  "paymentMethod": "cash"
}
```

**Where Stored:** `transactions` table + `transaction_items` table

**Cashier ID:** Automatically captured from JWT token (`req.user.id`)
**Timestamp:** Automatic (`created_at`)

### B. Expense Data Entry

**When Cashier Logs Expense:**
```
1. Click "Log Expense" button
2. Select Category: supplies | utilities | petty-cash | maintenance | other
3. Enter Amount (KES)
4. Enter Description
5. Click Submit
```

**Data Submitted:**
```javascript
POST /api/expenses
{
  "branchId": "uuid",
  "category": "supplies",
  "amount": 2500,
  "description": "Cleaning detergent"
}
```

**Where Stored:** `expenses` table
**Recorded By:** Automatically captured from JWT token
**Timestamp:** Automatic

### C. Closing Stock Data Entry

**When Cashier Does Stock Count:**
```
1. Click "Stock Count" button
2. Dialog shows all products for branch
3. For each product: Enter physical count (kg)
4. Click "Save Closing Stock"
```

**Data Submitted (per product):**
```javascript
PUT /api/inventory/entry/closing
{
  "productId": "uuid",
  "branchId": "uuid",
  "closingStock": 45.5,        // physical count
  "date": "2025-02-07"
}
```

**Where Stored:** `stock_history` table
**Update Operation:** Updates existing row with matching (branch_id, product_id, date)
**Sets:** `closing_stock` field

---

## 4. HOW DATA IS COLLECTED (BACKEND SIDE)

### Entry Points (API Routes)

#### Transactions Endpoint
```
POST   /api/transactions                    → Create sale (any role)
GET    /api/transactions/:id                → Get single transaction
GET    /api/transactions/branch/:branchId   → Get branch transactions
GET    /api/transactions/branch/:branchId/range 
GET    /api/transactions/branch/:branchId/today-sales
```

#### Expenses Endpoint
```
POST   /api/expenses                        → Log expense (any role)
GET    /api/expenses/branch/:branchId       → Get expenses
GET    /api/expenses/branch/:branchId/range
GET    /api/expenses/branch/:branchId/by-category
GET    /api/expenses/branch/:branchId/today-expenses
```

#### Inventory Endpoint
```
POST   /api/inventory/entry                → Record opening stock (manager/admin)
PUT    /api/inventory/entry/closing        → Record closing stock (any role)
GET    /api/inventory/history/:branchId
GET    /api/inventory/history/:branchId/:date → Get stock for specific day
GET    /api/inventory/current/:branchId    → Current stock per product
GET    /api/inventory/low-stock/:branchId
```

#### Dashboard Endpoint
```
GET    /api/dashboard/admin                → Admin overview (all branches)
GET    /api/dashboard/branch/:branchId     → Branch overview
GET    /api/dashboard/metrics/:branchId    → Charts data
```

### Authorization Rules

| Endpoint | Allowed Roles | Purpose |
|---|---|---|
| `POST /transactions` | cashier, manager, admin | Record sales |
| `POST /expenses` | cashier, manager, admin | Log expenses |
| `PUT /inventory/entry/closing` | cashier, manager, admin | Record closing stock |
| `POST /inventory/entry` | manager, admin | Record opening stock |
| `GET` (all reads) | Any authenticated user | Fetch data |

---

## 5. HOW ADMIN FETCHES DATA

### Admin Screens & Data Flow

#### Dashboard (`AdminDashboard.tsx`)
```
Loads every 15 seconds:

1. GET /api/dashboard/admin
   Returns: {
     totalBranches, activeBranches,
     totalSalestoday, totalExpensestoday,
     profit, recentTransactions, branches[]
   }

2. GET /api/branches
   Returns: All branch info

3. GET /api/inventory/low-stock/:branchId
   Returns: Products below threshold

4. GET /api/metrics/:branchId
   Returns: Chart data (sales/expenses by date)

5. GET /api/expenses/branch/:branchId/by-category
   Returns: {
     supplies: 5000,
     utilities: 2000,
     petty-cash: 1500,
     maintenance: 3000,
     other: 500
   }
```

#### Branch Management (`BranchManagement.tsx`)
```
Loads every 10 seconds (per branch):

For each branch, fetches:

1. GET /api/inventory/history/:branchId/:date
   Returns: Array of stock entries with:
   {
     product_id, product_name, opening_stock,
     closing_stock, price_per_kg, date
   }
   Admin calculates: closingStockSum = sum(entry.closing_stock)

2. GET /api/transactions/branch/:branchId/range
   Returns: List of transactions
   Admin calculates: totalSales = sum(transaction.total)

3. GET /api/expenses/branch/:branchId/range
   Returns: List of expenses
   Admin calculates: totalExpenses = sum(expense.amount)

4. GET /api/expenses/branch/:branchId/by-category
   Returns: Breakdown by category
   Displays: Supplies, Utilities, Petty-Cash, Maintenance, Other
```

#### Admin Financials (`AdminFinancials.tsx`)
```
Loads every 10 seconds:

1. GET /api/inventory/history/:branchId/:date
   Returns: Stock entries

2. GET /api/products
   Returns: Product prices

3. CALCULATIONS:
   For each stock entry:
     soldQty = opening_stock - closing_stock
     expectedRevenue += soldQty × product.price_per_kg
   
   Display:
     Expected Revenue: KES X
     Actual Sales: KES Y
     Variance: KES (Y-X)
```

### Caching Strategy

**Frontend Cache (client.ts):**
- `getBranches()`: 15 second TTL
- `getBranchProducts()`: 5 second TTL
- `getStockHistoryByDate()`: 5 second TTL
- `getExpensesByCategory()`: 5 second TTL

**Cache Invalidation:**
When data is written (transaction/expense/closing stock):
- `this.cache.clear()` → Clears entire frontend cache
- Backend also clears relevant cached endpoints

---

## 6. REAL DATA BEING SEEDED

### Seed Data Script: `seed-realistic.js`

**Generates 1 month of realistic data:**

#### Branches
```javascript
// Gets existing branches from database:
- Edendrop Tamasha
- Edendrop Reem
- Edendrop Westlands
(and any others in database)
```

#### Products
```javascript
// Gets existing products:
- Beef cuts, Chicken, Goat, Pork, Fish, etc.
// For each branch, creates branch_stock records:
- initial_stock: 30-100 kg per product per branch
```

#### Transactions (1 Month)
```
For each day in past 30 days:
  For random branches (1-3 per day):
    Generate 2-5 transactions per branch per day
    
    Each transaction:
      - 2-5 random products selected
      - Quantity: 1-5 kg per product
      - Payment method: cash | mpesa | card (random)
      - Cashier: Random cashier from that branch
      - Timestamp: Random time during that day
    
    Example:
      {
        branch_id: "uuid",
        cashier_id: "uuid",
        payment_method: "cash",
        total: 2500,
        created_at: "2025-01-30T14:23:45Z"
      }
      
      transaction_items:
      {
        product_id: "uuid",          // e.g., Beef
        quantity: 2.5,               // kg
        price_per_kg: 450,
        subtotal: 1125
      }
```

#### Stock History (Daily)
```
For each day in past 30 days:
  For each branch:
    For each product:
      opening_stock: 20-100 kg (random)
      closing_stock: max(5, opening_stock - 0-30)
      date: Today's date
      
      Example:
      {
        product_id: "uuid",
        branch_id: "uuid",
        opening_stock: 75,
        closing_stock: 52,
        date: "2025-02-07"
      }
```

#### Expenses (Daily)
```
For each day in past 30 days:
  For each branch:
    Generate 1-3 expenses per day
    
    Each expense:
      category: supplies | utilities | petty-cash | maintenance | other
      amount: 500-5000 KES (random)
      description: Pre-defined examples per category
      recorded_by: Random manager/admin
      created_at: Random time during that day
      
      Example descriptions:
      - supplies: "Cleaning supplies", "Packaging materials", "Plastic bags"
      - utilities: "Water bill", "Electricity bill", "Internet"
      - petty-cash: "Staff meal", "Transport", "Miscellaneous"
      - maintenance: "Freezer maintenance", "Equipment repair"
```

### Total Data Generated

```
Summary after seed:

📍 Branches: N (from database)
🥩 Products: M (from database)
👥 Users: K (from database)
💰 Transactions: ~250-500 (2-5 per branch per day × days × branches)
📦 Transaction Items: ~500-2500 (2-5 items per transaction)
📊 Stock History Entries: ~N×M×30 (every product daily for 30 days)
💸 Expense Entries: ~250-500 (1-3 per branch per day × 30 days)

Date Range: Past 30 days to today
```

### Login Credentials for Testing

```
Admin:    admin@example.com           / password123
Manager:  sarah.manager@example.com   / password123
Cashier:  alice.cashier@example.com   / password123
```

---

## 7. COMPLETE DATA FLOW DIAGRAM

```
CASHIER SIDE
============

POSScreen Component
  ↓
User selects product → weight → clicks "Add to Cart"
  ↓
Cart displays item
  ↓
User clicks Payment (Cash/MPesa/Card)
  ↓
handlePayment() function
  ↓
apiClient.createTransaction(branchId, items, paymentMethod)
  ↓
POST /api/transactions (backend)
  ↓
transactionService.createTransaction()
  ↓
Supabase: INSERT into "transactions" + "transaction_items"
  ↓
clearCache() called for dashboard endpoints
  ↓
Response sent to frontend
  ↓
Frontend: this.cache.clear() - empties local cache
  ↓
Toast: "Payment processed"
  ↓
Cart cleared, products refreshed


STOCK COUNT FLOW
================

POSScreen Component
  ↓
User clicks "Stock Count" button
  ↓
Dialog opens showing all products + input fields
  ↓
User enters physical count for each product
  ↓
Clicks "Save Closing Stock"
  ↓
handleSaveStockCount() loops through each entry
  ↓
apiClient.recordClosingStock(productId, branchId, closingStock, date)
  ↓
PUT /api/inventory/entry/closing (backend)
  ↓
inventoryService.recordClosingStock()
  ↓
Supabase: UPDATE "stock_history" 
  WHERE branch_id=? AND product_id=? AND date=?
  SET closing_stock=?
  ↓
clearCache() called for inventory/dashboard endpoints
  ↓
Response sent to frontend
  ↓
Frontend: this.cache.clear()
  ↓
Toast: "Closing stock saved for X product(s)"
  ↓
Dialog closes, products refreshed


EXPENSE LOGGING FLOW
====================

POSScreen Component
  ↓
User clicks "Log Expense" button
  ↓
Dialog opens with category dropdown + amount + description
  ↓
User fills in and clicks "Submit Expense"
  ↓
handleLogExpense() function
  ↓
apiClient.createExpense(branchId, category, amount, description)
  ↓
POST /api/expenses (backend)
  ↓
expenseService.createExpense()
  ↓
Supabase: INSERT into "expenses"
  ↓
clearCache() called
  ↓
Response sent, toast shown
  ↓
Dialog closes


ADMIN SIDE - DATA FETCH
=======================

AdminDashboard Component (refreshes every 15 seconds)
  ↓
loadDashboardData() function
  ↓
Parallel calls:
  ├─ apiClient.getAdminDashboard()
  │   └─ GET /api/dashboard/admin
  │
  ├─ apiClient.getBranches()
  │   └─ GET /api/branches
  │
  ├─ apiClient.getLowStockProducts(branchId[0])
  │   └─ GET /api/inventory/low-stock/:branchId
  │
  ├─ apiClient.getTransactionsByBranch(branchId[0])
  │   └─ GET /api/transactions/branch/:branchId
  │
  └─ apiClient.getMetrics(branchId[0], startDate, endDate)
     └─ GET /api/dashboard/metrics/:branchId


BranchManagement Component (refreshes every 10 seconds)
  ↓
For each branch:
  ├─ apiClient.getStockHistoryByDate(branchId, date)
  │   └─ GET /api/inventory/history/:branchId/:date
  │       Returns: [{ product_id, opening_stock, closing_stock, ... }]
  │       Admin sums: closingStockSum = Σ closing_stock
  │
  ├─ apiClient.getTransactionsByDateRange(branchId, today, today)
  │   └─ GET /api/transactions/branch/:branchId/range?startDate=&endDate=
  │       Admin sums: totalSales = Σ transaction.total
  │
  ├─ apiClient.getExpensesByDateRange(branchId, today, today)
  │   └─ GET /api/expenses/branch/:branchId/range?startDate=&endDate=
  │       Admin sums: totalExpenses = Σ expense.amount
  │
  └─ apiClient.getExpensesByCategory(branchId, today, today)
     └─ GET /api/expenses/branch/:branchId/by-category?startDate=&endDate=
         Returns: { supplies: X, utilities: Y, etc. }
         Admin displays expandable breakdown


AdminFinancials Component (refreshes every 10 seconds)
  ↓
apiClient.getStockHistoryByDate(branchId, date)
  ↓
apiClient.getProducts()
  ↓
Calculate Expected Revenue:
  FOR EACH stock entry (where closing_stock is not null):
    soldQty = opening_stock - closing_stock
    expectedRevenue += soldQty × product.price_per_kg
  ↓
Display: Expected | Actual Sales | Variance
```

---

## 8. AUTHORIZATION MATRIX

### Who Can Do What?

| Action | Admin | Manager | Cashier |
|--------|-------|---------|---------|
| Record Transaction | ✅ | ✅ | ✅ |
| Log Expense | ✅ | ✅ | ✅ |
| Record Closing Stock | ✅ | ✅ | ✅ |
| Record Opening Stock | ✅ | ✅ | ❌ |
| Update Branch Stock | ✅ | ❌ | ❌ |
| View Admin Dashboard | ✅ | ❌ | ❌ |
| View Branch Management | ✅ | ❌ | ❌ |
| View Financials | ✅ | ❌ | ❌ |
| View Inventory | ✅ | ✅ | ✅ |
| View POS | ✅ | ✅ | ✅ |

---

## 9. KEY API ENDPOINTS REFERENCE

### Transaction Management
```
POST   /api/transactions
GET    /api/transactions/:id
GET    /api/transactions/branch/:branchId
GET    /api/transactions/branch/:branchId/range
GET    /api/transactions/branch/:branchId/today-sales
```

### Inventory Management
```
POST   /api/inventory/entry                  (Manager/Admin)
PUT    /api/inventory/entry/closing          (Any role)
GET    /api/inventory/history/:branchId
GET    /api/inventory/history/:branchId/:date
GET    /api/inventory/current/:branchId
GET    /api/inventory/low-stock/:branchId
PUT    /api/inventory/stock/:branchId/:productId (Admin)
```

### Expense Management
```
POST   /api/expenses
GET    /api/expenses/branch/:branchId
GET    /api/expenses/branch/:branchId/range
GET    /api/expenses/branch/:branchId/today-expenses
GET    /api/expenses/branch/:branchId/by-category
```

### Dashboard
```
GET    /api/dashboard/admin
GET    /api/dashboard/branch/:branchId
GET    /api/dashboard/metrics/:branchId
```

### Products & Branches
```
GET    /api/products
GET    /api/products/branch/:branchId
GET    /api/products/stock/:branchId
GET    /api/branches
GET    /api/branches/:id
```

---

## 10. EXPENSE CATEGORIES

Valid expense categories (must be one of):
- `supplies` - Cleaning, packaging, office supplies
- `utilities` - Water, electricity, internet, phone
- `petty-cash` - Staff meals, transport, misc
- `maintenance` - Equipment repair, freezer maintenance
- `other` - Ad placement, licenses, training

---

## 11. SYSTEM SUMMARY

**Total Tables:** 8
**Total API Endpoints:** 30+
**Cache Strategy:** 3-tier (client TTL, server in-memory, HTTP headers)
**Real-Time Updates:** 10-15 second polling intervals
**Data Consistency:** Automatic cache invalidation on mutations
**Authentication:** JWT tokens with role-based access control
**Database:** Supabase PostgreSQL
**Frontend Build:** 925 KB (gzip)

**Ports:**
- Backend: 5000
- Frontend: 5173

---

Generated: February 7, 2025
