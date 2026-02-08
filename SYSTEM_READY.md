# EdenDropInvestment System - Real-Time Setup Guide

## ✅ System Status

Your EdenDropInvestment management system is now fully integrated with:
- **Frontend**: React + Vite (integrated with real API)
- **Backend**: Express.js + Supabase PostgreSQL (real data)
- **Database**: 3 months of realistic business data
- **Logo**: Fully integrated across web and installable app

## 🚀 Start the System

From the project root directory:

```bash
npm run start:all
```

This starts both frontend and backend concurrently:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api

## 🔐 Login Credentials

All accounts have password: `password123`

### Admin Account
- Email: `admin@example.com`
- Role: Full system access, view all branches, analytics, reporting

### Manager Accounts
- `sarah.manager@example.com` - Tamasha Branch
- `john.manager@example.com` - Reem Branch
- `mike.manager@example.com` - Lavington Branch

### Cashier Accounts
- `alice.cashier@example.com` or `cashier@example.com` - Tamasha Branch
- `carol.cashier@example.com` - Reem Branch
- `emma.cashier@example.com` - Lavington Branch

## 📊 Real-Time Data Available

When you log in as Admin, you'll see:

### Dashboard (Real-time metrics)
- Total sales (3-month aggregated)
- Active branches status
- Staff headcount
- Low stock alerts
- Sales & expense trends
- Expense breakdown by category
- Recent transactions
- Branch performance metrics

### Data Behind the Scenes
- **Transactions**: Spread across 3 months, 2-5 per day per branch
- **Products**: 28 meat/processed products with real pricing
- **Stock**: Daily opening/closing counts for each product per branch
- **Expenses**: Daily operational expenses (supplies, utilities, maintenance, staff)
- **Staff**: Multiple cashiers per branch, managers, admin user

## 🎯 What to Try First

1. **Login as Admin**
   - See real business metrics over 3 months
   - View dashboard with actual sales data
   - Check low stock alerts
   - View branch performance

2. **Login as Manager**
   - See branch-specific dashboard
   - View local transactions
   - Check inventory for your branch
   - Log expenses

3. **Login as Cashier**
   - Use POS system to create new transactions
   - Select from real products
   - Process payments (cash/M-Pesa/card)
   - View local inventory

4. **Try Admin Features**
   - View financials across all branches
   - Check inventory levels
   - Review reports and analytics
   - Monitor expenses by category

## 🌐 Installable PWA

The app can be installed on any device as a Progressive Web App:
- Logo appears on home screen
- Works offline (with service worker)
- Fast loading and smooth experience

## 📱 Real-Time System

All data flows from:
1. **Supabase PostgreSQL** - Real database with 3 months of data
2. **Express API** - Routes and business logic
3. **React Frontend** - Real-time UI displaying live data

Every screen displays actual database values:
- Admin Dashboard: Aggregate metrics from all branches
- POSScreen: Real product inventory
- Reports: Historical data from transactions
- Inventory: Stock history and current levels

## 🔄 System Architecture

```
Frontend (React/Vite)
    ↓ (API calls via axios)
Backend (Express)
    ↓ (SQL queries)
Supabase PostgreSQL
    ↓ (Real data)
Multiple Branches Data
    ↓ (3 months history)
Real-time Analytics & Reports
```

## ⚙️ Managing Data

To regenerate data, run:
```bash
cd backend
npm run seed:realistic  # Generate 3 months of realistic data
```

The seed script creates:
- Varied transaction amounts (KES 2,000 - 25,000)
- Realistic payment methods distribution
- Daily expense entries
- Stock movements reflecting sales

## 🎓 Development Tips

- Admin can see cross-branch analytics
- Managers see only their branch
- Cashiers see only POS and local inventory
- All timestamps are realistic within the 3-month range
- Expenses and stock counts are auto-generated to match transactions

## ✨ Next Steps

1. Run `npm run start:all`
2. Login with admin@example.com / password123
3. Explore the dashboard - all data is real!
4. Create a test transaction as cashier
5. See it reflected in admin analytics immediately
