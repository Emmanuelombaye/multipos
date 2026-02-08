# Backend Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│              (Multi-Branch POS System UI)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST
                    (JWT Token)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                  Express.js Backend                         │
│                    Port 5000                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │   Middleware     │  │   Routes         │                │
│  ├──────────────────┤  ├──────────────────┤                │
│  │ • Auth (JWT)     │  │ • /api/auth      │                │
│  │ • Error Handler  │  │ • /api/branches  │                │
│  │ • CORS           │  │ • /api/products  │                │
│  │ • JSON Parser    │  │ • /api/trans...  │                │
│  │                  │  │ • /api/inventory │                │
│  │                  │  │ • /api/expenses  │                │
│  │                  │  │ • /api/staff     │                │
│  │                  │  │ • /api/dashboard │                │
│  └──────────────────┘  └────────┬─────────┘                │
│                                  │                          │
│                    ┌─────────────▼──────────────┐           │
│                    │   Services (Business      │           │
│                    │   Logic Layer)            │           │
│                    ├──────────────────────────┤           │
│                    │ • authService            │           │
│                    │ • branchService          │           │
│                    │ • productService         │           │
│                    │ • transactionService     │           │
│                    │ • expenseService         │           │
│                    │ • inventoryService       │           │
│                    └──────────┬───────────────┘           │
│                               │                            │
│                    ┌──────────▼──────────────┐             │
│                    │  Supabase Client        │             │
│                    │  (@supabase/js)         │             │
│                    └──────────┬──────────────┘             │
│                               │                            │
└───────────────────────────────┼────────────────────────────┘
                                │
                        PostgreSQL/HTTPS
                                │
            ┌───────────────────▼────────────────────┐
            │     Supabase Cloud Database            │
            │  (PostgreSQL with RLS & Triggers)     │
            ├────────────────────────────────────────┤
            │ Tables:                                │
            │ • branches                             │
            │ • products                             │
            │ • branch_stock                         │
            │ • stock_history                        │
            │ • users                                │
            │ • transactions                         │
            │ • transaction_items                    │
            │ • expenses                             │
            └────────────────────────────────────────┘
```

## API Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Express Router                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────────┤
│  │  POST /api/auth/register                               │
│  │  POST /api/auth/login                                  │
│  │  ❌ No auth required                                    │
│  └─────────────────────────────────────────────────────────┤
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┤
│  │  Middleware: authenticate(JWT token)                    │
│  │  Middleware: authorize(role-based)                      │
│  └─────────────────────────────────────────────────────────┤
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┤
│  │  Protected Routes (require token):                      │
│  │                                                          │
│  │  GET    /api/branches           → getAllBranches()     │
│  │  POST   /api/branches           → createBranch()       │
│  │  PUT    /api/branches/:id       → updateBranch()       │
│  │                                                          │
│  │  GET    /api/products           → getAllProducts()     │
│  │  POST   /api/products           → createProduct()      │
│  │                                                          │
│  │  POST   /api/transactions       → createTransaction()  │
│  │  GET    /api/transactions/...   → getTransactions()    │
│  │                                                          │
│  │  POST   /api/inventory/entry    → recordStockEntry()   │
│  │  GET    /api/inventory/...      → getStockHistory()    │
│  │                                                          │
│  │  POST   /api/expenses           → createExpense()      │
│  │  GET    /api/expenses/...       → getExpenses()        │
│  │                                                          │
│  │  POST   /api/staff              → (admin)              │
│  │  GET    /api/staff/...          → getStaff()           │
│  │                                                          │
│  │  GET    /api/dashboard/admin    → getAdminDash()       │
│  │  GET    /api/dashboard/branch   → getBranchDash()      │
│  └─────────────────────────────────────────────────────────┤
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┤
│  │  Business Logic (Services)                              │
│  │  - Data validation                                      │
│  │  - Business rules                                       │
│  │  - Transaction processing                               │
│  │  - Analytics calculations                               │
│  └─────────────────────────────────────────────────────────┤
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┤
│  │  Supabase Client - Database Operations                  │
│  │  - Fetch data                                           │
│  │  - Insert records                                       │
│  │  - Update records                                       │
│  │  - Delete records                                       │
│  │  - Query aggregations                                   │
│  └─────────────────────────────────────────────────────────┤
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┤
│  │  Error Handler Middleware                               │
│  │  - Catch all errors                                     │
│  │  - Return proper HTTP status codes                      │
│  │  - Log errors for debugging                             │
│  └─────────────────────────────────────────────────────────┤
│                                                              │
└──────────────────────────────────────────────────────────────┘
              ▲
              │
        HTTP Response
   (JSON with status code)
              │
        ┌─────┴──────┐
        ▼             ▼
    Success      Error (with message)
    Data         Status code (401/403/500)
```

## Data Flow: POS Transaction Example

```
1. Cashier Login
   POST /api/auth/login
   → authService.login()
   → Generate JWT token
   ← { token: "...", user: {...} }

2. Get Products for Branch
   GET /api/products/stock/branch-1
   (Header: Authorization: Bearer {token})
   → productService.getProductsWithStock()
   → Query products + branch_stock
   ← [ { id, name, stock, price }, ... ]

3. Process Sale
   POST /api/transactions
   {
     "branchId": "branch-1",
     "items": [ { productId, quantity, price } ],
     "paymentMethod": "cash"
   }
   → authenticate (verify JWT)
   → transactionService.createTransaction()
      ├─ Create transaction record
      ├─ Insert transaction items
      ├─ Update branch_stock (deduct quantity)
      └─ Return transaction
   ← { id: "...", total: 2500, items: [...] }

4. Record Expense
   POST /api/expenses
   {
     "branchId": "branch-1",
     "category": "supplies",
     "amount": 1500
   }
   → expenseService.createExpense()
   ← { id: "...", amount: 1500, ... }

5. View Dashboard
   GET /api/dashboard/branch/branch-1
   → dashboardService.getBranchDashboard()
      ├─ Get today's sales
      ├─ Get today's expenses
      ├─ Get low stock products
      ├─ Get recent transactions
      └─ Calculate profit
   ← {
       todaySales: 45800,
       todayExpenses: 2000,
       profit: 43800,
       lowStockProducts: [...],
       recentTransactions: [...]
     }
```

## Database Schema Relationships

```
┌─────────────────┐
│    branches     │
├─────────────────┤
│ id (UUID) [PK]  │
│ name            │ ──┐
│ location        │    │
│ status          │    │
└─────────────────┘    │
       ▲               │
       │ branch_id     │
  ┌────┴────┐          │
  │          │          │
  │  1:M     │          │
  │          │          │
  └──────────┴──────────┘
       │
  ┌────┴─────────────────────────┬─────────────────────┐
  │                              │                     │
  ▼                              ▼                     ▼
┌──────────────────┐    ┌──────────────────┐   ┌──────────────┐
│  branch_stock    │    │      users       │   │  expenses    │
├──────────────────┤    ├──────────────────┤   ├──────────────┤
│ branch_id [FK]   │    │ id (UUID) [PK]   │   │ id [PK]      │
│ product_id [FK]◄─┼────┤ branch_id [FK]   │   │ branch_id◄───┤
│ current_stock    │    │ email [UNIQUE]   │   │ category     │
└──────────────────┘    │ password_hash    │   │ amount       │
  │                     │ role             │   │ recorded_by◄─┤
  │                     └────┬────┬────────┘   │ [FK to users]│
  │                          │    │            └──────────────┘
  │   product_id [FK]        │    │
  │   │                      │    │
  │   ▼                      │    │
  └─►┌──────────────┐        │    │
     │   products   │        │    │
     ├──────────────┤        │    │
     │ id (UUID)    │        │    │
     │ name         │        │    │
     │ category     │        │    │
     │ price_per_kg │        │    │
     └──┬──────┬────┘        │    │
        │      │            │    │
        │      └────────────►┤    │
        │  transaction_items │    │
        │         ◄──────────┴────┤
        │         product_id      │
        │                cashier_id
        │                    │
        │  ┌──────────────────┘
        │  │
        │  ▼
        └──┐
           ▼
     ┌──────────────────┐
     │  transactions    │
     ├──────────────────┤
     │ id (UUID)        │
     │ branch_id [FK]   │
     │ cashier_id [FK]  │
     │ total            │
     │ payment_method   │
     │ created_at       │
     └──────────────────┘
          │
          │ transaction_id [FK]
          ▼
     ┌──────────────────────┐
     │ transaction_items    │
     ├──────────────────────┤
     │ transaction_id [FK]  │
     │ product_id [FK]◄─────┤
     │ quantity             │
     │ price_per_kg         │
     │ subtotal             │
     └──────────────────────┘
```

## Authentication & Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│            Unauthenticated User                             │
│            (No JWT Token)                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ POST /api/auth/register or login
                 ▼
        ┌────────────────────┐
        │  Verify Credentials│
        ├────────────────────┤
        │ Email already used?│ ──→ 409 Conflict
        │ Invalid password?  │ ──→ 401 Unauthorized
        └────┬───────────────┘
             │
             ▼ Valid
        ┌────────────────────┐
        │ Generate JWT Token │
        │ (expires in 24h)   │
        └────┬───────────────┘
             │
             ▼
    ┌─────────────────────────────────────┐
    │  Return Token + User Info           │
    │  {                                  │
    │    token: "eyJ...",                 │
    │    user: { id, email, role }        │
    │  }                                  │
    └────────┬────────────────────────────┘
             │
             │ Store token locally (localStorage/sessionStorage)
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            Authenticated User                               │
│         (Has JWT Token)                                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ Protected Route Request
                  │ (Include: Authorization: Bearer {token})
                  │
                  ▼
         ┌─────────────────────┐
         │ authenticate()      │
         │ Middleware          │
         ├─────────────────────┤
         │ Token present?      │ ──→ 401 No token
         │ Token valid?        │ ──→ 401 Invalid
         │ Token expired?      │ ──→ 401 Expired
         └────┬────────────────┘
              │
              ▼ Valid
         ┌──────────────────────┐
         │ Decode JWT           │
         │ Extract user info:   │
         │ - id                 │
         │ - email              │
         │ - role (admin/       │
         │         manager/     │
         │         cashier)     │
         └────┬─────────────────┘
              │
              ▼
         ┌──────────────────────┐
         │ authorize()          │
         │ Middleware           │
         ├──────────────────────┤
         │ User has required    │
         │ role?                │ ──→ 403 Forbidden
         │ Can access resource? │ ──→ 403 Forbidden
         └────┬─────────────────┘
              │
              ▼ Authorized
         ┌──────────────────────┐
         │ Execute Route        │
         │ Handler              │
         └────┬─────────────────┘
              │
              ▼
         ┌──────────────────────┐
         │ Call Service         │
         │ Business Logic       │
         └────┬─────────────────┘
              │
              ▼
         ┌──────────────────────┐
         │ Database Operation   │
         │ (Supabase)           │
         └────┬─────────────────┘
              │
              ▼
    ┌────────────────────────────┐
    │ Return Response             │
    │ (JSON + HTTP Status Code)   │
    │ 200 - Success               │
    │ 201 - Created               │
    │ 400 - Bad Request           │
    │ 401 - Unauthorized          │
    │ 403 - Forbidden             │
    │ 404 - Not Found             │
    │ 500 - Server Error          │
    └─────────────────────────────┘
```

## Deployment Ready

The backend is production-ready and can be deployed to:
- **Vercel** (Node.js)
- **Heroku**
- **Railway**
- **AWS Lambda**
- **Google Cloud Run**
- **DigitalOcean**

All secrets and credentials are managed via environment variables for security.
