# Deployment Guide - Multi-Branch Butchery POS System
## Real-Time Data Synchronization System

### System Overview
This is a complete multi-branch butchery management system with **real-time live data synchronization** across admin and cashier views. All branch metrics (closing stock, expenses, daily sales) are calculated from actual database transactions.

---

## Pre-Deployment Checklist

### ✅ Database Setup
- [ ] Supabase PostgreSQL database configured
- [ ] Schema created: `backend/src/db/schema.sql`
- [ ] Realistic seed data generated: `npm run seed:realistic` in backend folder
- [ ] All tables populated:
  - `branches` - Store locations
  - `products` - Item catalog
  - `branch_stock` - Current stock per branch
  - `stock_history` - Daily opening/closing stock
  - `users` - Staff members (admin, manager, cashier)
  - `transactions` - POS sales records
  - `transaction_items` - Line items per transaction
  - `expenses` - Branch expenses log

### ✅ Environment Configuration

#### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

#### Backend (`backend/.env`)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret_change_in_production
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### ✅ Dependencies
```bash
# Root (Frontend)
npm install

# Backend
cd backend
npm install
```

---

## Real-Time Data Architecture

### Data Flow for Live Updates

#### 1. **Admin Branch Management View** (`BranchManagement.tsx`)
Displays real-time metrics for all branches:
- **Daily Sales**: Sum of `transactions.total` for the selected date and branch
- **Expenses Total**: Sum of `expenses.amount` for the selected date and branch
- **Closing Stock**: Sum of `stock_history.closing_stock` for the selected date
- **Opening Stock**: Sum of `stock_history.opening_stock` for the selected date
- **Low Stock Count**: Count of items below low_stock_threshold

**Update Mechanism:**
- Auto-refresh polling: Every 10 seconds
- Manual refresh button: Click "Refresh Metrics" anytime
- Cache invalidation: Clears on any mutation (transaction, expense, product change)

#### 2. **Cashier POS Screen** (`POSScreen.tsx`)
Creates real transactions that appear in admin view:
- Creates `transactions` record with total amount
- Creates `transaction_items` for each product sold
- Updates branch stock quantities
- Clears all caches → triggers admin refresh

**Real-Time Sync:**
- 10-second polling for product availability
- Manual refresh button available
- Automatic stock update after each transaction

#### 3. **Expense Logging**
Cashiers can log expenses that appear in admin dashboard:
- Creates `expenses` record with amount, category, date
- Immediately clears all caches
- Admin sees updated expenses within 10 seconds

### Cache Strategy (3-Tier)
1. **Client Cache**: 5-30 second TTL (reduced from initial values)
   - Transactions: 5s TTL
   - Expenses: 5s TTL  
   - Stock History: 5s TTL
   - Products: 5s TTL

2. **Server Cache**: In-memory, cleared on mutations

3. **HTTP Cache**: Cache-Control headers for browser optimization

---

## Deployment Steps

### Development Setup
```bash
# Terminal 1 - Backend
cd backend
npm run seed:realistic  # Seed database with realistic data
node src/server.js      # Start backend on port 5000

# Terminal 2 - Frontend  
npm run dev             # Start frontend on port 5173
```

### Production Build

#### Backend
```bash
cd backend
npm run build  # If available, or use: node src/server.js
```

#### Frontend
```bash
npm run build
npm run preview  # Test production build locally
```

### Deployment Targets

**Option 1: Local Server**
- Backend: Node.js on port 5000
- Frontend: Vite dev server or static hosting

**Option 2: Docker (Recommended)**
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend .
RUN npm install
EXPOSE 5000
CMD ["node", "src/server.js"]

# Frontend Dockerfile  
FROM node:18-alpine as build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Option 3: Cloud Platforms**
- **Backend**: Render, Railway, Heroku, DigitalOcean
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: Supabase (already cloud-based)

---

## Default Test Credentials

### Admin Account
- Email: `admin@example.com`
- Password: `password123`
- Role: `admin` (access to all branches)
- Access: Branch Management, Product Management, Admin Dashboard, Financials

### Cashier Account  
- Email: `cashier@example.com`
- Password: `password123`
- Role: `cashier` (branch POS only)
- Access: POS Screen, Expense Logging

---

## API Endpoints for Real-Time Metrics

### Stock History
```
GET /api/inventory/history/:branchId/:date
Response: [{ product_id, opening_stock, closing_stock, ... }]
```

### Transactions by Date
```
GET /api/transactions/branch/:branchId/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Response: [{ id, total, created_at, ... }]
Calculation: SUM(total)
```

### Expenses by Date
```
GET /api/expenses/branch/:branchId/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Response: [{ id, amount, created_at, ... }]
Calculation: SUM(amount)
```

### Branch Products
```
GET /api/products/branch/:branchId
Response: [{ product_id, name, price_per_kg, current_stock, ... }]
```

---

## Monitoring & Troubleshooting

### Verify Real-Time Updates Working

1. **Check Console for Errors**
   ```javascript
   // Open browser DevTools → Console tab
   // Should see no CORS or API errors
   ```

2. **Test Sync Flow**
   - Cashier: Create a transaction
   - Admin: Wait 10s or click "Refresh Metrics"
   - Admin: Should see updated sales amount

3. **Verify Database**
   ```sql
   -- Check transactions created
   SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '1 day';
   
   -- Check expenses
   SELECT COUNT(*) FROM expenses WHERE created_at >= NOW() - INTERVAL '1 day';
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| Sales not showing in admin | Verify `transaction.total` field (not `total_amount`) |
| Expenses not syncing | Check cache is clearing: `this.cache.clear()` called |
| Products not updating | Ensure 10s poll interval is running |
| Port 5000 in use | Kill process: `Get-NetTCPConnection -LocalPort 5000 \| Stop-Process` |
| CORS errors | Verify `FRONTEND_URL` in backend `.env` |

---

## Performance Considerations

### Optimization for Production

1. **Reduce Polling Interval** (if needed)
   - Current: 10 seconds (balances responsiveness vs load)
   - Can adjust in `BranchManagement.tsx` and `POSScreen.tsx`

2. **Database Indexes**
   ```sql
   CREATE INDEX idx_transactions_branch_date ON transactions(branch_id, created_at);
   CREATE INDEX idx_expenses_branch_date ON expenses(branch_id, created_at);
   CREATE INDEX idx_stock_history_branch_date ON stock_history(branch_id, date);
   ```

3. **Server Load Balancing**
   - Deploy multiple backend instances
   - Share Supabase database connection

4. **Frontend Optimization**
   - Code splitting: Already configured in `vite.config.ts`
   - Lazy loading: Components load only when needed

---

## Maintenance

### Daily Tasks
- Monitor error logs
- Verify real-time sync is working
- Check database backup status

### Weekly Tasks
- Review transaction volumes
- Verify all branches are syncing data
- Check for any performance degradation

### Monthly Tasks
- Archive old transactions (>90 days)
- Update seed data if needed
- Review and optimize slow queries

---

## Deployment Checklist

- [ ] Environment variables set in all .env files
- [ ] Database seeded with realistic data
- [ ] Backend server running and accessible
- [ ] Frontend connects to correct API URL
- [ ] Admin can see real transaction data
- [ ] Cashier transactions appear in admin within 10s
- [ ] Branch metrics show accurate totals
- [ ] Refresh buttons work correctly
- [ ] No console errors in browser
- [ ] All authentication working properly
- [ ] Database backups configured
- [ ] Error monitoring/logging set up
- [ ] SSL certificates configured (production)
- [ ] Domain names configured

---

## Live System Status Commands

```bash
# Check backend status
curl http://localhost:5000/api/dashboard/admin

# Check branch data
curl http://localhost:5000/api/dashboard/branch/[branchId]

# Verify stock history
curl "http://localhost:5000/api/inventory/history/[branchId]/2026-02-07"

# Check recent transactions
curl "http://localhost:5000/api/transactions/branch/[branchId]?limit=10"
```

---

## Support & Documentation

- API Testing: See `backend/API_TESTING.md`
- Architecture Details: See `backend/ARCHITECTURE.md`
- Backend Summary: See `BACKEND_SUMMARY.md`
- Quick Reference: See `backend/QUICK_REFERENCE.md`

---

**System Status**: ✅ Ready for Deployment
**Last Updated**: February 7, 2026
**Version**: 1.0.0 Production Ready
