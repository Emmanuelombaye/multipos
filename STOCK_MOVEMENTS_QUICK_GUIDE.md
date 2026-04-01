# Stock Movements - Quick Reference Guide

## 🎯 Quick Access

### For Cashiers (Reem, Tamasha, etc.)
- **Menu**: Bottom navigation → "Movements" icon
- **Actions**: Send Transfer, Dispatch, Accept/Reject requests

### For Managers
- **Menu**: Top navigation → "Movements"
- **Actions**: Same as cashiers + view branch reports

### For Admin
- **Menu**: Top navigation → "Movements"
- **View**: All transfers, dispatches, and requests across all branches
- **Actions**: Read-only monitoring

---

## 📤 Send Transfer (Branch to Branch)

**When to use**: Moving stock from your branch to another branch

**Steps**:
1. Click "Send Transfer" button
2. Select product from dropdown (shows current stock)
3. Select destination branch
4. Enter quantity in kg
5. Add notes (optional)
6. Click "Send Request"

**What happens**:
- ✅ Stock deducted from your branch immediately
- ✅ Request sent to destination branch
- ⏳ Awaits acceptance/rejection
- ✅ If accepted: Stock added to destination
- ✅ If rejected: Stock returned to your branch

---

## 📥 Receive Transfer (Accept/Reject)

**When to use**: Another branch sent you stock

**Steps**:
1. Go to "Requests" tab (badge shows pending count)
2. View incoming request details
3. Click "Accept" or "Reject"

**Accept**:
- ✅ Stock added to your inventory
- ✅ Transfer completed and logged

**Reject**:
- ✅ Stock returned to sender
- ✅ Request marked as rejected

---

## 🚚 External Dispatch

**When to use**: Sending stock to hotels, schools, villas, restaurants

**Steps**:
1. Click "Dispatch" button
2. Select product from dropdown
3. Enter client name (e.g., "Safari Hotel")
4. Select client type (Hotel/Villa/School/Restaurant/Other)
5. Enter quantity in kg
6. Enter price per kg
7. Select payment status (Pending/Partial/Paid)
8. Select payment method (optional)
9. Add notes (optional)
10. Click "Record Dispatch"

**What happens**:
- ✅ Stock deducted from your branch immediately
- ✅ Dispatch recorded with financial details
- ✅ Appears in "Dispatches" tab

---

## 📊 View Movements

### Transfers Tab
- Shows completed internal transfers
- **Red card** = Stock sent out
- **Green card** = Stock received
- **Purple card** = Admin view (all branches)

### Dispatches Tab
- Shows external dispatches to clients
- **Orange cards** with client details
- Payment status badges (Paid/Partial/Pending)
- Total dispatch value summary

### Requests Tab
- Shows transfer requests
- **Blue card** = Incoming request (can accept/reject)
- **Purple card** = Outgoing request (awaiting response)
- Status badges (Pending/Accepted/Rejected)

---

## 🎨 Color Coding

| Color | Meaning |
|-------|---------|
| 🔴 Red | Outgoing transfer (stock sent) |
| 🟢 Green | Incoming transfer (stock received) |
| 🟠 Orange | External dispatch |
| 🔵 Blue | Incoming request (pending) |
| 🟣 Purple | Outgoing request / Admin view |

---

## ⚠️ Important Notes

1. **Stock Validation**: System prevents over-transfer (can't send more than you have)
2. **Immediate Deduction**: Stock is deducted when request is sent (not when accepted)
3. **Stock in Transit**: Pending requests show stock that's "on the way"
4. **Rejection Returns Stock**: Rejecting a request automatically returns stock to sender
5. **Admin View Only**: Admin can see all movements but cannot send transfers/dispatches
6. **Real-Time Updates**: Click refresh icon to see latest movements

---

## 🔄 Common Workflows

### Workflow 1: Reem → Tamasha Transfer
```
Reem: Send 10kg Beef → Tamasha
  ↓ (Stock: 50kg → 40kg at Reem)
Tamasha: Accept request
  ↓ (Stock: 20kg → 30kg at Tamasha)
✅ Transfer complete
```

### Workflow 2: External Dispatch
```
Reem: Dispatch 15kg Goat → Safari Hotel
  ↓ (Stock: 30kg → 15kg at Reem)
  ↓ (Payment: Pending, 15kg × 800 = 12,000 KES)
✅ Dispatch recorded
```

### Workflow 3: Rejected Transfer
```
Reem: Send 5kg Chicken → Tamasha
  ↓ (Stock: 25kg → 20kg at Reem)
Tamasha: Reject request
  ↓ (Stock: 20kg → 25kg at Reem - restored)
✅ Request rejected, stock returned
```

---

## 📱 Mobile Tips

- **Swipe**: Scroll through cards
- **Tap**: View details
- **Pull down**: Refresh data
- **Bottom sheet**: Forms slide up from bottom
- **Active states**: Buttons scale when pressed

---

## 🆘 Troubleshooting

**Problem**: Can't send transfer
- ✅ Check you have sufficient stock
- ✅ Verify destination branch is different
- ✅ Ensure quantity > 0

**Problem**: Don't see incoming request
- ✅ Click refresh icon
- ✅ Check "Requests" tab
- ✅ Verify request was sent to your branch

**Problem**: Stock not updating
- ✅ Click refresh icon
- ✅ Check internet connection
- ✅ Verify transaction completed successfully

---

## 📞 Support

For issues or questions, contact:
- **Admin**: View all movements in admin panel
- **Technical Support**: Check system logs
- **Training**: Refer to full documentation (STOCK_TRANSFER_SYSTEM.md)
