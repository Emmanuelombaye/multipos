# 🎴 Quick Reference Card

## 🚀 Ports & URLs

```
Frontend:   http://localhost:5173  (React + Vite)
Backend:    http://localhost:5000  (Express API)
Database:   Supabase Cloud         (PostgreSQL)
```

---

## 🔑 Your Credentials

**Supabase Project ID**: `toczvlitmnzkyguxjxxn`

**Service Secret Key**: `[See .env file - KEEP SECRET]`

**Publishable Key**: `sb_publishable_7fuap3GUjL7farXcVp09zw_ohotBiO2`

**JWT Secret**: `your_jwt_secret_key_change_this_in_production_super_secret_123`

*(All in `.env` file)*

---

## 📡 API Base URL

```
http://localhost:5000/api
```

---

## 🔓 Public Endpoints (No Auth Required)

```
POST /api/auth/register     → Create account
POST /api/auth/login        → Get JWT token
GET  /health                → Health check
```

---

## 🔒 Protected Endpoints (Require JWT Token)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/branches
```

---

## 📋 Common Requests

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"John Doe",
    "email":"john@test.com",
    "password":"password123",
    "role":"cashier"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@test.com",
    "password":"password123"
  }'
```

**Response includes**:
```json
{
  "token": "eyJ0eXAi...",
  "user": {
    "id": "...",
    "email": "john@test.com",
    "name": "John Doe",
    "role": "cashier"
  }
}
```

### Get Branches
```bash
TOKEN="paste_token_here"
curl http://localhost:5000/api/branches \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Endpoint Categories

| Category | Count | Base URL |
|----------|-------|----------|
| Authentication | 2 | `/api/auth/*` |
| Branches | 4 | `/api/branches/*` |
| Products | 5 | `/api/products/*` |
| Transactions | 6 | `/api/transactions/*` |
| Inventory | 6 | `/api/inventory/*` |
| Expenses | 5 | `/api/expenses/*` |
| Staff | 4 | `/api/staff/*` |
| Dashboard | 22 | `/api/dashboard/*` |
| Total | **54** | |

---

## 🛡️ HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | GET request worked |
| 201 | Created | POST created resource |
| 400 | Bad Request | Invalid data sent |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Backend error |

---

## 👥 User Roles

| Role | Permissions | Can Do |
|------|-------------|--------|
| **admin** | Full access | Everything |
| **manager** | Branch limited | Create products, manage staff |
| **cashier** | Transaction only | Process sales, expenses |

---

## 🗄️ Database Tables

```
branches
├─ id, name, location, status, created_at, updated_at

products
├─ id, name, category, price_per_kg, stock_threshold

branch_stock
├─ branch_id, product_id, current_stock

stock_history
├─ product_id, branch_id, opening_stock, closing_stock, date

users
├─ id, email, password_hash, role, branch_id

transactions
├─ id, branch_id, cashier_id, total, payment_method

transaction_items
├─ transaction_id, product_id, quantity, price

expenses
├─ id, branch_id, amount, category, description
```

---

## 📚 Documentation

| File | Read When |
|------|-----------|
| START.md | First thing! |
| README.md | Need API details |
| INTEGRATION.md | Connecting frontend |
| ARCHITECTURE.md | Understanding design |
| API_TESTING.md | Testing endpoints |

---

## 🎮 Quick Test Workflows

### 1. Test Authentication
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123"}'

# Copy token from response
```

### 2. Test with Token
```bash
TOKEN="your_token_here"

# Get all branches
curl http://localhost:5000/api/branches \
  -H "Authorization: Bearer $TOKEN"

# Get products
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create Transaction
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId":"branch-1",
    "items":[{"productId":"prod-1","quantity":2.5,"pricePerKg":850,"subtotal":2125}],
    "paymentMethod":"cash"
  }'
```

---

## 🔧 Configuration

### Start Backend
```bash
cd backend
npm run dev
```

### Verify Installation
```bash
npm list  # See all packages
```

### Environment Variables
```
SUPABASE_URL=...
SUPABASE_KEY=...
JWT_SECRET=...
PORT=5000
NODE_ENV=development
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 5000 in use | Change PORT in .env |
| Cannot connect DB | Check Supabase credentials |
| Invalid token | Login again to get new token |
| Permission denied | Check user role |

---

## 🚀 Deployment Commands

```bash
# Build
npm run build

# Start production
NODE_ENV=production npm start

# Alternative
npm run dev  # Development with auto-reload
```

---

## 📱 Frontend Integration

**Replace mockData with API calls**:

```typescript
// Before (mockData)
import { branches } from '../data/mockData';

// After (API)
const response = await fetch('http://localhost:5000/api/branches', {
  headers: { Authorization: `Bearer ${token}` }
});
const branches = await response.json();
```

---

## 🎯 Key Files

- **Start here**: `backend/START.md`
- **Test API**: Use Postman or curl (see commands above)
- **Connect frontend**: See `backend/INTEGRATION.md`
- **Check schema**: `backend/src/db/schema.sql`

---

## ✅ Status

✅ Backend created
✅ Database schema ready  
✅ API endpoints ready
✅ Authentication ready
✅ Documentation complete
✅ Dependencies installed

🚀 **Ready to deploy!**

---

## 📞 Need Help?

1. Check documentation files
2. Use API_TESTING.md for examples
3. Run curl commands to test
4. Check browser network tab
5. Read error messages carefully

---

**Everything is ready to use!** 🎉

Time to build an amazing POS system! 💪

