# EdenDropInvestment Backend API

A Node.js + Express backend for the Multi-Branch EdenDropInvestment system, integrated with Supabase PostgreSQL.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env` and update with your Supabase credentials:

```bash
SUPABASE_URL=https://toczvlitmnzkyguxjxxn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_7fuap3GUjL7farXcVp09zw_ohotBiO2
SUPABASE_SERVICE_KEY=[your-service-key-from-env]

JWT_SECRET=your_jwt_secret_key_change_this_in_production

PORT=5000
NODE_ENV=development

FRONTEND_URL=http://localhost:5173
```

### 3. Setup Database Schema

Run the SQL provided in `src/db/schema.sql` in your Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the schema.sql content
4. Execute

### 4. Seed Initial Data

Initial data will be created in the database. You can run the backend and make API calls to seed branches, products, etc.

### 5. Start the Server

#### Development (with auto-reload):
```bash
npm run dev
```

#### Production:
```bash
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Branches
- `GET /api/branches` - Get all branches
- `GET /api/branches/:id` - Get branch with stats
- `POST /api/branches` - Create branch (admin only)
- `PUT /api/branches/:id` - Update branch (admin only)

### Products
- `GET /api/products` - Get all products
- `GET /api/products/stock/:branchId` - Get products with stock for branch
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (admin/manager)
- `PUT /api/products/:id` - Update product (admin/manager)

### Transactions (POS)
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction details
- `GET /api/transactions/branch/:branchId` - Get branch transactions
- `GET /api/transactions/branch/:branchId/range?startDate=2026-02-01&endDate=2026-02-07` - Get transactions by date range
- `GET /api/transactions/branch/:branchId/today-sales` - Get today's sales

### Inventory
- `POST /api/inventory/entry` - Record stock entry
- `PUT /api/inventory/entry/closing` - Record closing stock
- `GET /api/inventory/history/:branchId` - Get stock history
- `GET /api/inventory/history/:branchId/:date` - Get stock history for date
- `GET /api/inventory/low-stock/:branchId` - Get low stock products
- `GET /api/inventory/current/:branchId` - Get current stock

### Expenses
- `POST /api/expenses` - Create expense
- `GET /api/expenses/branch/:branchId` - Get branch expenses
- `GET /api/expenses/branch/:branchId/range` - Get expenses by date range
- `GET /api/expenses/branch/:branchId/today-expenses` - Get today's expenses
- `GET /api/expenses/branch/:branchId/by-category` - Get expenses by category

### Staff
- `GET /api/staff` - Get all staff
- `GET /api/staff/branch/:branchId` - Get staff for branch
- `GET /api/staff/:id` - Get staff by ID
- `PUT /api/staff/:id` - Update staff (admin/manager)

### Dashboard
- `GET /api/dashboard/admin` - Get admin dashboard (all branches)
- `GET /api/dashboard/branch/:branchId` - Get branch dashboard
- `GET /api/dashboard/metrics/:branchId?startDate=2026-02-01&endDate=2026-02-07` - Get metrics for date range

## Authentication

All requests to protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Token is obtained from login endpoint and expires in 24 hours.

## Roles & Permissions

- **Admin**: Full access to all endpoints
- **Manager**: Can create/update products, manage staff, view branch data
- **Cashier**: Can process transactions and expenses

## Project Structure

```
backend/
├── src/
│   ├── server.js              # Main Express app
│   ├── db/
│   │   ├── supabase.js        # Supabase client
│   │   └── schema.sql         # Database schema
│   ├── middleware/
│   │   ├── auth.js            # Authentication middleware
│   │   └── errorHandler.js    # Error handling
│   ├── routes/                # API route handlers
│   ├── services/              # Business logic
│   └── controllers/           # Request handlers
├── package.json
├── .env                       # Environment variables
└── .gitignore
```

## Next Steps

1. ✅ Backend API setup
2. ✅ Supabase integration
3. Next: Connect frontend React app to backend API
