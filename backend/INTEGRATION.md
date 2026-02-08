# Complete Backend & Database Setup Guide

## ✅ What's Been Created

Your backend has been fully scaffolded with the following structure:

### Backend Directory Structure
```
backend/
├── src/
│   ├── server.js                    # Main Express application
│   ├── db/
│   │   ├── supabase.js              # Supabase client configuration
│   │   ├── schema.sql               # Database schema (tables, indexes, triggers)
│   │   └── seed.sql                 # Initial seed data
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication & authorization
│   │   └── errorHandler.js          # Global error handling
│   ├── routes/                      # API endpoint definitions
│   │   ├── auth.js                  # Authentication routes
│   │   ├── branches.js              # Branch management
│   │   ├── products.js              # Product management
│   │   ├── transactions.js          # POS transactions
│   │   ├── inventory.js             # Stock management
│   │   ├── expenses.js              # Expense tracking
│   │   ├── staff.js                 # Staff management
│   │   └── dashboard.js             # Analytics & reporting
│   └── services/                    # Business logic services
│       ├── authService.js           # User registration, login, JWT
│       ├── branchService.js         # Branch operations
│       ├── productService.js        # Product operations
│       ├── transactionService.js    # Transaction processing
│       ├── expenseService.js        # Expense operations
│       └── inventoryService.js      # Stock operations
├── package.json                     # Dependencies
├── .env                             # Environment variables (your credentials)
├── .env.example                     # Template for .env file
├── README.md                        # Backend documentation
├── API_TESTING.md                   # API testing guide
├── INTEGRATION.md                   # This file - Full integration guide
└── setup.bat / setup.sh             # Setup scripts
```

## 🔧 Installation Steps (Follow in Order)

### Step 1: Install Node.js Dependencies

Open terminal in the `backend` folder and run:

```bash
npm install
```

Or use the setup script:
- **Windows**: Double-click `setup.bat`
- **Mac/Linux**: `bash setup.sh`

### Step 2: Setup Supabase Database

1. **Login to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `toczvlitmnzkyguxjxxn`

2. **Create Database Tables**
   - Navigate to: **SQL Editor** (left sidebar)
   - Click **New Query**
   - Copy entire content from `src/db/schema.sql`
   - Paste it into the SQL editor
   - Click **Run** button

3. **Seed Initial Data** (Optional)
   - Create another new query
   - Copy content from `src/db/seed.sql`
   - Run it

### Step 3: Verify Environment Variables

The `.env` file already has your credentials. Verify it contains:

```
SUPABASE_URL=https://toczvlitmnzkyguxjxxn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_7fuap3GUjL7farXcVp09zw_ohotBiO2
SUPABASE_SERVICE_KEY=[your-service-key-from-env]

JWT_SECRET=your_jwt_secret_key_change_this_in_production_super_secret_123

PORT=5000
NODE_ENV=development

FRONTEND_URL=http://localhost:5173
```

⚠️ **IMPORTANT**: In production, change `JWT_SECRET` to a strong random value!

### Step 4: Start Backend Server

```bash
npm run dev
```

Expected output:
```
🚀 Server running on port 5000
📍 Environment: development
```

The server is now running at: `http://localhost:5000`

## 📡 Database Schema

### Tables Created

| Table | Purpose |
|-------|---------|
| `branches` | Store multi-branch locations |
| `products` | Meat products catalog |
| `branch_stock` | Current stock per branch |
| `stock_history` | Daily opening/closing stock |
| `users` | Staff and access control |
| `transactions` | POS sales records |
| `transaction_items` | Individual items in sales |
| `expenses` | Branch expenses tracking |

All tables include proper:
- ✅ Primary keys (UUID)
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ Timestamps (created_at, updated_at)
- ✅ Triggers for auto-updating timestamps

## 🔐 Authentication & Security

### User Roles & Permissions

**Admin** (`admin`)
- ✅ Full system access
- ✅ Create branches
- ✅ Manage all staff
- ✅ View all reports

**Manager** (`manager`)
- ✅ Create/edit products
- ✅ Manage staff in their branch
- ✅ View branch analytics
- ✅ Process transactions
- ❌ Cannot create branches or access admin settings

**Cashier** (`cashier`)
- ✅ Process sales transactions
- ✅ Record expenses
- ✅ View inventory stock
- ❌ Cannot create products or manage staff

### Authentication Flow

1. User calls `POST /api/auth/register` or `POST /api/auth/login`
2. Backend validates credentials and generates JWT token
3. Client stores token locally
4. Client includes token in all requests: `Authorization: Bearer TOKEN`
5. Backend middleware validates token for protected routes

## 🚀 API Endpoints Overview

### Public Endpoints (No Auth Required)
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Get authentication token

### Protected Endpoints (Require JWT Token)

#### Branches
```
GET    /api/branches              # List all branches
GET    /api/branches/:id          # Get branch details with stats
POST   /api/branches              # Create branch (admin)
PUT    /api/branches/:id          # Update branch (admin)
```

#### Products
```
GET    /api/products              # List all products
GET    /api/products/:id          # Get product details
GET    /api/products/stock/:branchId # Get products with stock
POST   /api/products              # Create product (admin/manager)
PUT    /api/products/:id          # Update product (admin/manager)
```

#### Transactions (POS)
```
POST   /api/transactions          # Record a sale
GET    /api/transactions/:id      # Get transaction details
GET    /api/transactions/branch/:branchId # Get branch sales history
GET    /api/transactions/branch/:branchId/range?startDate=...&endDate=...
GET    /api/transactions/branch/:branchId/today-sales
```

#### Inventory
```
POST   /api/inventory/entry                    # Record opening stock
PUT    /api/inventory/entry/closing            # Record closing stock
GET    /api/inventory/history/:branchId        # Get stock history
GET    /api/inventory/low-stock/:branchId      # Get low stock alerts
GET    /api/inventory/current/:branchId        # Get current stock
```

#### Expenses
```
POST   /api/expenses                           # Record expense
GET    /api/expenses/branch/:branchId          # Get branch expenses
GET    /api/expenses/branch/:branchId/range    # Get expenses by date
GET    /api/expenses/branch/:branchId/today-expenses
```

#### Reporting
```
GET    /api/dashboard/admin           # System-wide analytics
GET    /api/dashboard/branch/:branchId # Branch analytics
GET    /api/dashboard/metrics/:branchId?startDate=...&endDate=...
```

## 🔗 Connecting Frontend to Backend

### Option 1: Update Frontend Environment

Edit `package.json` in frontend project to use the backend:

```javascript
// Add this to frontend before making API calls
const API_URL = 'http://localhost:5000';

// Example API call
const response = await fetch(`${API_URL}/api/branches`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Option 2: Use Axios/Fetch Client

Create `src/api/client.ts` in frontend:

```typescript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiClient = {
  async get(endpoint: string, token?: string) {
    return fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },
  
  async post(endpoint: string, data: any, token?: string) {
    return fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
  }
};
```

## 📋 Testing Workflow

1. **Start Backend**: `npm run dev`
2. **Test API**: Use Postman or curl (see `API_TESTING.md`)
3. **Register User**: `POST /api/auth/register`
4. **Login**: `POST /api/auth/login` → get token
5. **Test Protected Endpoint**: Include Bearer token

## ⚠️ Important Notes

### Development vs Production

**Development** (current setup)
- ✅ Fast feedback, auto-reload with nodemon
- ✅ Detailed error logging
- ⚠️ Security features relaxed
- ⚠️ CORS allows localhost

**Production** (before deploying)
- Change `NODE_ENV` to `production`
- Use strong `JWT_SECRET`
- Use secure Supabase credentials
- Enable HTTPS
- Proper CORS whitelist
- Error logging to external service

### Supabase Considerations

- Your credentials are in the `.env` file
- Service key should NEVER be exposed to frontend
- Use separate keys for different environments
- Row Level Security (RLS) can be added for extra security
- Backups should be configured in Supabase dashboard

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in .env: PORT=5001
# Or kill process using port 5000
```

### Supabase Connection Error
- Verify credentials in `.env`
- Check Supabase project is active
- Test connection: `curl https://toczvlitmnzkyguxjxxn.supabase.co`

### JWT Token Invalid
- Token may have expired (24 hours)
- Login again to get new token
- Check `JWT_SECRET` is same when generating and verifying

### CORS Errors
- Verify `FRONTEND_URL` in `.env`
- Check headers include `Content-Type: application/json`

## 📚 Next Steps

1. ✅ Backend API created
2. ✅ Supabase integration done
3. 📋 TODO: Update Frontend React components to use backend APIs
4. 📋 TODO: Test end-to-end workflow
5. 📋 TODO: Deploy backend to production (e.g., Vercel, Heroku, Railway)

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Express Docs**: https://expressjs.com
- **JWT Guide**: https://jwt.io
- **Postman Collections**: Export/share API tests

---

**Backend Setup Complete!** 🎉

Your system is now ready for frontend integration. Start the backend with `npm run dev` and begin connecting your React frontend to the API.
