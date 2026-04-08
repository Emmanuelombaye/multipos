# Offline Mode Capabilities

## ✅ What Works Offline (After Initial Online Login)

### Authentication
- **Login** - Works with cached credentials (up to 30 days)
- **Logout** - Works (credentials remain cached for next offline login)
- **Stay Logged In** - Session persists offline

### POS Operations (Cashier/Manager)
- **Make Sales** - All transactions queued and synced when online
- **View Products** - From IndexedDB cache
- **View Prices** - From cached product data
- **Select Payment Method** - Cash, M-Pesa, Card
- **Print Receipts** - Works offline

### Stock Management
- **Add Stock Mid-Shift** - Queued and synced when online
- **View Current Stock** - From cached data
- **Close Stock** - Queued and synced when online
- **View Stock History** - From cached data (may be stale)

### Expenses
- **Record Expenses** - All expenses queued and synced when online
- **View Expense Categories** - Works offline

### Dashboard
- **View Dashboard** - Shows cached data (may be stale)
- **View Branch Info** - From cached data

### Data Viewing
- **View Branches** - From IndexedDB cache
- **View Products** - From IndexedDB cache
- **View Transactions** - Recent cached transactions

## ⚠️ Limited Offline (Requires Internet Eventually)

### Stock Transfers
- **Request Transfer** - Needs online (requires coordination between branches)
- **Accept/Reject Transfer** - Needs online

### Reports & Analytics
- **Generate Reports** - Needs online (server calculations)
- **View Analytics** - Needs online

### Admin Operations
- **Add New Products** - Needs online
- **Edit Products** - Needs online
- **Manage Branches** - Needs online
- **Manage Users** - Needs online

## 🔄 Auto-Sync Features

### When Internet Returns
1. **Automatic Sync** - All queued actions sync automatically
2. **Manual Sync Button** - Force sync with button in bottom-right
3. **Sync Status Indicator** - Shows "X pending sync" 
4. **Sync Order** - Transactions → Expenses → Stock Changes → Stock Additions

### Queued Actions (Up to 7 Days)
- POS Transactions
- Expenses
- Closing Stock
- Stock Additions

## 📱 Offline Indicators

### Visual Feedback
- **Offline Banner** - Top of screen shows "Offline Mode • Last online: X days ago"
- **Sync Status Badge** - Bottom-right shows pending items count
- **Toast Messages** - "📴 Offline login: Welcome..." when logging in offline

## 🔒 Security & Limits

### Offline Duration
- **Maximum:** 30 days offline
- **After 30 days:** Must login online to refresh credentials

### Data Storage
- **IndexedDB:** 50MB+ for products, branches, transactions
- **LocalStorage:** 5MB for credentials, queue, settings
- **Queue Limit:** 7 days of offline actions

### Credentials
- **Cached After:** First successful online login
- **Persist After:** Logout (for offline re-login)
- **Cleared When:** Manual cache clear or 30+ days offline

## 📋 Typical Offline Workflow

### Day 1 (Online)
1. Login with WiFi → Credentials cached
2. Work normally → Data cached
3. Logout at end of day

### Day 2-4 (Offline - No WiFi/Data)
1. Login offline with same credentials ✅
2. Make sales → Queued (e.g., 50 transactions)
3. Record expenses → Queued (e.g., 10 expenses)
4. Add stock → Queued (e.g., 5 additions)
5. Close stock → Queued
6. Logout

### Day 5 (Back Online)
1. Login online
2. **Auto-sync starts** → All 65+ actions sync
3. Sync status shows: "Synced 65 items successfully"
4. Dashboard updates with real data
5. Continue working normally

## 🎯 Best Practices

### For Cashiers
- Login online at least once every 30 days
- Check sync status when internet returns
- Don't clear browser cache/data

### For Managers
- Ensure staff login online before going to remote areas
- Monitor sync status after returning online
- Review queued transactions after sync

### For Admins
- Products/branches should be set up online first
- Check all branches synced after connectivity issues
- Review variance reports after offline periods

## 🚀 Use Cases

### Remote Locations
- Market stalls without WiFi
- Mobile butchery trucks
- Pop-up shops
- Rural branches

### Connectivity Issues
- Power outages affecting internet
- ISP downtime
- Mobile data exhaustion
- Network congestion

### Cost Savings
- Work without constant data connection
- Reduce mobile data costs
- Continue operations during outages

## ⚡ Performance

### Offline Speed
- **Login:** Instant (no server call)
- **POS Sales:** Instant (local queue)
- **View Products:** Instant (IndexedDB)
- **Add Stock:** Instant (optimistic update)

### Online Sync Speed
- **Per Transaction:** ~100-200ms
- **50 Transactions:** ~5-10 seconds
- **100+ Items:** ~15-30 seconds

## 🔧 Troubleshooting

### "Offline login failed"
- **Cause:** Never logged in online first
- **Fix:** Login with internet once to cache credentials

### "Wrong credentials"
- **Cause:** Using different email/password than cached
- **Fix:** Use same credentials as first online login

### Sync not working
- **Cause:** Still offline or server down
- **Fix:** Check internet connection, try manual sync button

### Old data showing
- **Cause:** Viewing cached data while offline
- **Fix:** Normal - data updates when back online

## 📊 Storage Usage

### Typical Branch (1 Month)
- **Products:** ~50KB (100 products)
- **Transactions:** ~500KB (1000 transactions)
- **Branches:** ~10KB (10 branches)
- **Queue:** ~100KB (50 pending actions)
- **Total:** ~660KB (plenty of space)

### Maximum Capacity
- **IndexedDB:** 50MB+ (thousands of transactions)
- **LocalStorage:** 5MB (hundreds of queued actions)

---

**Summary:** Users can work completely offline for up to 30 days after initial online login. All critical operations (sales, expenses, stock) work offline and sync automatically when internet returns.
