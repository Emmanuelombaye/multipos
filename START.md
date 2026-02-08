# ⚡ QUICK START - Get Running in 2 Minutes

## Start the System NOW

### 🔴 STOP THE BACKEND FIRST (if running)
```powershell
# Kill any existing node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### 🟢 Start Backend (Terminal 1)
```bash
cd c:\Users\Antidote\Desktop\multi\backend
node src/server.js
```
**Expected output**:
```
🚀 Server running on port 5000
📍 Environment: development
```

### 🟢 Start Frontend (Terminal 2)
```bash
cd c:\Users\Antidote\Desktop\multi
npm run dev
```
**Expected output**:
```
VITE v6.3.5 ready in 100 ms

➜  Local:   http://localhost:5173/
```

### 🌐 Open Browser
```
http://localhost:5173
```

---

## 🔐 Login Credentials

### Admin (Full Access)
- **Email**: admin@example.com
- **Password**: password123
- **Go to**: Branches tab → See live metrics

### Cashier (POS Only)
- **Email**: cashier@example.com  
- **Password**: password123
- **Go to**: Point of Sale → Create transactions

---

## 🧪 Verify Live Data Working (60 seconds)

### Step 1: Open TWO Browser Windows Side-by-Side
1. **Window 1**: Admin (step above)
2. **Window 2**: Cashier (step above)

### Step 2: In Admin Window
- Note the "Daily Sales" number on branch card
- Example: "KES 5,000"

### Step 3: In Cashier Window
- Find any product
- Click "+1kg" button
- Select "Cash"
- Confirm transaction
- See toast: "Payment of KES XXX processed"

### Step 4: Back in Admin Window
- **Option A**: Wait 10 seconds (automatic)
- **Option B**: Click "Refresh Metrics" button (instant)

### ✅ Verify
Daily Sales should increase! Example: "KES 5,000" → "KES 5,500"

**This confirms real-time live data is working** ✅

---

## 🎯 Real-Time Features in Action

### 1. Expense Logging
```
Cashier: Click "Log Expense" → Enter amount → Click Log
Admin: Within 10s, expenses metric updates
```

### 2. Product Updates  
```
Admin: Go to Products → Add/Remove products
Cashier: Click Refresh or wait 10s → New products appear
```

### 3. Branch Metrics
```
All shown metrics update automatically:
- Daily Sales: From transactions
- Expenses: From expense log
- Closing Stock: From stock records
- Low Stock: Count of low items
```

---

## 📊 What's Actually Working

### Database (Supabase)
```sql
✓ Transactions recorded
✓ Expenses logged  
✓ Stock tracked
✓ Users authenticated
```

### Backend (Node.js Port 5000)
```
✓ Accept transactions
✓ Calculate metrics
✓ Send real data
✓ Clear caches
```

### Frontend (React Port 5173)
```
✓ Display live metrics
✓ Poll every 10 seconds
✓ Manual refresh buttons
✓ Real-time sync
```

---

## 🐛 If Something Goes Wrong

### Backend not starting?
```bash
# Check port 5000
Get-NetTCPConnection -LocalPort 5000

# Kill that process and retry
Get-Process -Name node | Stop-Process -Force
node src/server.js
```

### Frontend showing 0 for everything?
```
1. Refresh browser (F5)
2. Check backend is running
3. Open DevTools (F12) → Console tab
4. Look for red error messages
5. Check .env file has correct URL
```

### Transaction created but not showing?
```
1. Wait 10 seconds for auto-refresh
2. Click "Refresh Metrics" manually
3. Check browser console for errors
4. Verify you're looking at the right date
```

---

## 📱 System is Now:

✅ **Running**  
✅ **Connected to Database**  
✅ **Ready for Real Transactions**  
✅ **Live Syncing Data**  
✅ **Production-Ready**

---

## 📚 Learn More

- **How everything works**: Read `LIVE_SYSTEM.md`
- **Full deployment guide**: Read `DEPLOYMENT.md`
- **Testing procedures**: Read `TESTING.md`
- **API reference**: Read `backend/API_TESTING.md`

---

## 🎉 You're Ready!

The system is:
- ✅ Fully functional
- ✅ Real-time syncing
- ✅ Database connected
- ✅ User authenticated
- ✅ Live metrics calculating
- ✅ Ready to use

**Start using it now!** The data is real, the sync is live, and everything is working.

---

**Last Updated**: February 7, 2026
**Status**: ✅ Live and Running
