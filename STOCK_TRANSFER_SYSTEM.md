# Stock Transfer System - Complete Integration Guide

## Overview
The Multi-Branch EdenDropInvestment System now has a fully integrated stock transfer system that allows seamless stock movement between branches and external dispatches, with proper stock tracking and admin oversight.

## Key Features

### 1. **Internal Branch-to-Branch Transfers**
- **Request-Based System**: Cashiers/Managers can send transfer requests to other branches
- **Accept/Reject Flow**: Receiving branch can accept or reject incoming requests
- **Stock Deduction**: Stock is deducted from sender immediately when request is sent (stock in transit)
- **Stock Addition**: Stock is added to receiver only when request is accepted
- **Stock Restoration**: If rejected, stock is returned to sender automatically

### 2. **External Dispatches**
- **Client Types**: Hotel, Villa, School, Restaurant, Other
- **Payment Tracking**: Pending, Partial, Paid status
- **Stock Deduction**: Stock is deducted immediately upon dispatch
- **Financial Tracking**: Price per kg and total value recorded

### 3. **Admin Oversight**
- **View All Transfers**: Admin can see all transfers across all branches
- **View All Dispatches**: Admin can see all external dispatches
- **View All Requests**: Admin can see all pending/accepted/rejected transfer requests
- **No Action Buttons**: Admin views are read-only for monitoring purposes

## User Roles & Permissions

### Cashier (e.g., Reem, Tamasha)
- ✅ Send transfer requests to other branches
- ✅ Accept/Reject incoming transfer requests
- ✅ Create external dispatches
- ✅ View own branch transfers and dispatches
- ✅ Access via "Movements" menu in bottom navigation

### Manager
- ✅ All cashier permissions
- ✅ View branch dashboard
- ✅ Access inventory management
- ✅ Access via "Movements" menu in top navigation

### Admin
- ✅ View ALL transfers across ALL branches
- ✅ View ALL dispatches across ALL branches
- ✅ View ALL transfer requests (pending/accepted/rejected)
- ✅ Monitor stock movements system-wide
- ✅ Access via "Movements" menu in top navigation
- ❌ Cannot send transfers or dispatches (monitoring only)

## How It Works

### Scenario 1: Reem Sends Stock to Tamasha

1. **Reem (Cashier at Reem Branch)**:
   - Opens "Movements" screen
   - Clicks "Send Transfer" button
   - Selects product (e.g., Beef Fillet - 50kg available)
   - Selects "Tamasha Branch" as destination
   - Enters quantity (e.g., 10kg)
   - Adds optional notes
   - Clicks "Send Request"

2. **System Actions**:
   - ✅ Validates Reem has 50kg available
   - ✅ Deducts 10kg from Reem's stock (now 40kg)
   - ✅ Creates transfer request with status "pending"
   - ✅ Updates Reem's stock_history closing_stock to 40kg
   - ✅ Stock is now "in transit"

3. **Tamasha (Cashier at Tamasha Branch)**:
   - Opens "Movements" screen
   - Sees "Requests" tab with badge showing "1"
   - Views incoming request from Reem (10kg Beef Fillet)
   - Has two options:
     - **Accept**: Stock is added to Tamasha's inventory
     - **Reject**: Stock is returned to Reem's inventory

4. **If Tamasha Accepts**:
   - ✅ 10kg added to Tamasha's stock
   - ✅ Transfer request marked as "accepted"
   - ✅ Transfer recorded in stock_transfers audit log
   - ✅ Tamasha's stock_history opening_stock increased by 10kg
   - ✅ Both branches see completed transfer in "Transfers" tab

5. **If Tamasha Rejects**:
   - ✅ 10kg returned to Reem's stock (back to 50kg)
   - ✅ Transfer request marked as "rejected"
   - ✅ Reem's stock_history closing_stock restored to 50kg
   - ✅ No transfer recorded in audit log

### Scenario 2: Reem Dispatches to External Client

1. **Reem (Cashier at Reem Branch)**:
   - Opens "Movements" screen
   - Clicks "Dispatch" button
   - Selects product (e.g., Goat Meat - 30kg available)
   - Enters client name (e.g., "Safari Hotel")
   - Selects client type (Hotel)
   - Enters quantity (e.g., 15kg)
   - Enters price per kg (e.g., 800 KES)
   - Selects payment status (Pending/Partial/Paid)
   - Adds optional notes
   - Clicks "Record Dispatch"

2. **System Actions**:
   - ✅ Validates Reem has 30kg available
   - ✅ Deducts 15kg from Reem's stock (now 15kg)
   - ✅ Calculates total value (15kg × 800 = 12,000 KES)
   - ✅ Records dispatch in external_dispatches table
   - ✅ Updates Reem's stock_history closing_stock to 15kg
   - ✅ Dispatch appears in "Dispatches" tab

### Scenario 3: Admin Monitors All Movements

1. **Admin**:
   - Opens "Movements" screen
   - Sees summary of ALL transfers, dispatches, and requests
   - Views "Transfers" tab:
     - All completed transfers between all branches
     - Shows "Branch A → Branch B" format
     - Purple color coding for admin view
   - Views "Dispatches" tab:
     - All external dispatches from all branches
     - Shows branch name for each dispatch
     - Total dispatch value summary
   - Views "Requests" tab:
     - All pending/accepted/rejected requests
     - Shows "Branch A → Branch B" format
     - Status badges (pending/accepted/rejected)

## Database Tables

### stock_transfer_requests
- Stores pending/accepted/rejected transfer requests
- Fields: from_branch_id, to_branch_id, product_id, quantity, status, notes
- Stock tracking: from_stock_before, from_stock_after, to_stock_before, to_stock_after

### stock_transfers
- Immutable audit log of completed transfers
- Only created when request is accepted
- Fields: from_branch_id, to_branch_id, product_id, quantity, transferred_by, transfer_date

### external_dispatches
- Records all external dispatches to clients
- Fields: branch_id, product_id, client_name, client_type, quantity, price_per_kg, total_value, payment_status

### branch_stock
- Live current stock for each product at each branch
- Updated in real-time for all stock movements
- Fields: branch_id, product_id, current_stock

### stock_history
- Daily stock records (opening_stock, closing_stock)
- Updated to reflect transfers and dispatches
- Used for reconciliation and reporting

## API Endpoints

### Transfer Requests
- `POST /api/inventory/transfer-request` - Send transfer request
- `POST /api/inventory/transfer-request/:id/accept` - Accept request
- `POST /api/inventory/transfer-request/:id/reject` - Reject request
- `GET /api/inventory/transfer-requests/:branchId` - Get requests for branch
- `GET /api/inventory/transfer-requests/all` - Get all requests (admin)

### Transfers
- `GET /api/inventory/transfers?branchId=:id` - Get transfers for branch
- `GET /api/inventory/transfers` - Get all transfers (admin)

### Dispatches
- `POST /api/inventory/dispatch` - Create external dispatch
- `GET /api/inventory/dispatches/:branchId` - Get dispatches for branch
- `GET /api/inventory/dispatches/all` - Get all dispatches (admin)

## Stock Flow Validation

### Before Transfer Request
1. Check sender has sufficient stock
2. Validate quantity > 0
3. Validate from_branch ≠ to_branch

### On Accept
1. Verify request is still pending
2. Add stock to receiver
3. Mark request as accepted
4. Create audit log entry

### On Reject
1. Verify request is still pending
2. Return stock to sender
3. Mark request as rejected
4. No audit log entry

### Before Dispatch
1. Check branch has sufficient stock
2. Validate quantity > 0
3. Validate price_per_kg > 0

## UI Components

### StockMovementsScreen
- **Location**: `src/app/components/StockMovementsScreen.tsx`
- **Props**: branchId, branchName, isAdmin
- **Tabs**: Transfers, Dispatches, Requests
- **Forms**: Send Transfer, External Dispatch
- **Actions**: Accept, Reject (for incoming requests)

### Mobile-First Design
- Bottom sheet modals for forms
- Touch-friendly buttons with active states
- Responsive grid layouts
- Compact summary cards
- Color-coded cards (red=transfers, orange=dispatches, blue=requests)

## Testing Scenarios

### Test 1: Successful Transfer
1. Login as Reem cashier
2. Send 10kg Beef to Tamasha
3. Verify Reem's stock decreased by 10kg
4. Login as Tamasha cashier
5. Accept the request
6. Verify Tamasha's stock increased by 10kg
7. Login as Admin
8. Verify transfer appears in admin movements view

### Test 2: Rejected Transfer
1. Login as Reem cashier
2. Send 5kg Goat to Tamasha
3. Verify Reem's stock decreased by 5kg
4. Login as Tamasha cashier
5. Reject the request
6. Login as Reem cashier
7. Verify Reem's stock restored to original amount

### Test 3: External Dispatch
1. Login as Reem cashier
2. Create dispatch to "Safari Hotel" (15kg @ 800 KES)
3. Verify Reem's stock decreased by 15kg
4. Verify dispatch appears in Dispatches tab
5. Login as Admin
6. Verify dispatch appears in admin movements view with branch name

## Benefits

1. **Real-Time Stock Tracking**: All stock movements are tracked in real-time
2. **Audit Trail**: Complete history of all transfers and dispatches
3. **Stock Accuracy**: Stock is always accurate across all branches
4. **Admin Oversight**: Admin can monitor all stock movements system-wide
5. **User-Friendly**: Simple, mobile-first interface for cashiers
6. **Validation**: Prevents over-transfer and invalid operations
7. **Reconciliation**: Daily stock history for reconciliation and reporting

## Future Enhancements

- [ ] Transfer request notifications (push/email)
- [ ] Bulk transfers (multiple products at once)
- [ ] Transfer scheduling (future-dated transfers)
- [ ] Transfer approval workflow (manager approval required)
- [ ] Transfer cost tracking (transportation costs)
- [ ] Transfer analytics (most transferred products, busiest routes)
- [ ] QR code scanning for transfer verification
- [ ] Photo upload for dispatch proof of delivery
