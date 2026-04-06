# Stock Variance Tracking System

## Overview
The variance tracking system ensures all stock movements are properly accounted for and identifies discrepancies between physical counts and system records.

## How Variance is Calculated

### Scenario 1: Cashier Has Submitted Closing Stock (Physical Count)
**Variance = Closing Stock (Physical Count) - Current Stock (System)**

- **Variance = 0**: Physical count matches system → Everything correct ✅
- **Variance ≠ 0**: Data entry error or system bug → Investigate immediately ⚠️

**Example:**
- Cashier counted: 50 kg
- System shows: 50 kg
- **Variance: 0 kg** ✅

### Scenario 2: No Closing Stock Submitted Yet
**Variance = Current Stock (System) - Expected Stock (Calculated)**

**Expected Stock Formula:**
```
Expected = Opening Stock 
         + Transfers IN 
         - Sales 
         - Transfers OUT 
         - External Dispatches
```

**Note:** Stock additions are NOT added here because they're already included in opening stock.

- **Variance = 0**: All movements tracked correctly ✅
- **Variance ≠ 0**: Unrecorded movement (theft, spoilage, unrecorded sale) ⚠️

**Example:**
- Opening: 200 kg
- Transfers IN: 0 kg
- Sales: 50 kg
- Transfers OUT: 50 kg
- Dispatches: 50 kg
- **Expected: 200 - 50 - 50 - 50 = 50 kg**
- System shows: 50 kg
- **Variance: 0 kg** ✅

## Stock Movement Types

### 1. Opening Stock
- Set at start of day by cashier
- Includes previous day's closing stock
- **Mid-shift additions are added to opening stock** (not counted separately in variance)

### 2. Stock Additions (Mid-Shift)
- Supplier deliveries during the day
- Automatically updates opening stock
- Example: Opening 100 kg + Addition 100 kg = New Opening 200 kg

### 3. Sales
- Customer purchases through POS
- Automatically deducts from stock
- Tracked in `transactions` and `transaction_items` tables

### 4. Transfers OUT
- Stock sent to another branch
- Deducts from sender, adds to receiver
- **NOT variance** - legitimate documented movement
- Tracked in `stock_transfers` table

### 5. Transfers IN
- Stock received from another branch
- Adds to receiver's stock
- **NOT variance** - legitimate documented movement
- Tracked in `stock_transfers` table

### 6. External Dispatches
- Stock sent to external clients (hotels, restaurants)
- Deducts from stock
- Tracked in `external_dispatches` table

### 7. Closing Stock
- Physical count by cashier at end of day
- Becomes the "truth" for variance calculation
- Tracked in `stock_history.closing_stock`

## Complete Example: Msambweni Matumbo

### Timeline:
1. **Start of Day**: 100 kg
2. **7:29 PM - Addition**: +100 kg → Opening updated to 200 kg
3. **7:30 PM - Sale**: -50 kg → 150 kg
4. **7:32 PM - Dispatch**: -50 kg → 100 kg
5. **8:09 PM - Transfer to Tamasha**: -50 kg → 50 kg
6. **End of Day - Cashier Count**: 50 kg

### Variance Calculation:
```
Expected = 200 (opening) + 0 (transfers in) - 50 (sales) - 50 (transfers out) - 50 (dispatches)
Expected = 50 kg

System Stock = 50 kg
Cashier Count = 50 kg

Variance = 50 - 50 = 0 kg ✅
```

**Result:** All movements properly tracked, no variance!

## Why This Approach?

### Traditional Approach (WRONG):
```
Variance = Actual - (Opening + Additions + Transfers IN - Sales - Transfers OUT - Dispatches)
```
**Problem:** Double-counts additions (they're already in opening stock)

### Our Approach (CORRECT):
```
When closing stock submitted:
  Variance = Closing Stock - System Stock
  (Physical count is truth, system should match)

When no closing stock:
  Variance = System Stock - (Opening + Transfers IN - Sales - Transfers OUT - Dispatches)
  (Additions already in opening, don't add again)
```

## Database Tables Involved

1. **branch_stock**: Current live stock levels
2. **stock_history**: Daily opening/closing stock records
3. **stock_additions**: Mid-shift stock additions
4. **stock_transfers**: Inter-branch transfers
5. **external_dispatches**: Dispatches to external clients
6. **transaction_items**: Sales transactions
7. **transactions**: Transaction headers

## API Endpoints

- `GET /api/branches/:id` - Returns branch with variance stats
- `POST /api/inventory/add-stock` - Add stock mid-shift
- `POST /api/inventory/transfer` - Transfer between branches
- `POST /api/inventory/dispatch` - Dispatch to external client
- `POST /api/inventory/closing-stock` - Submit closing stock

## Testing

Run comprehensive variance test:
```bash
cd backend
node test-variance-tracking.js
```

This will show:
- All movements for each product
- Expected vs actual stock
- Variance calculation
- Whether all movements are tracked

## Key Principles

1. **Cashier's physical count is the truth** - When submitted, variance compares against system
2. **Transfers are NOT variance** - They're legitimate documented movements
3. **Additions are included in opening stock** - Don't double-count in variance
4. **Variance = 0 is the goal** - Means all movements are tracked correctly
5. **Variance ≠ 0 requires investigation** - Something is missing or wrong

## Troubleshooting

### High Variance?
1. Check if all sales were recorded
2. Check if all dispatches were recorded
3. Check if transfers were completed properly
4. Check for theft or spoilage
5. Verify opening stock was set correctly

### Negative Variance?
- System has less than expected
- Possible unrecorded outbound movement
- Check for missing sales/dispatch records

### Positive Variance?
- System has more than expected
- Possible unrecorded inbound movement
- Check for missing transfer IN or addition records

## Summary

✅ **Variance = 0**: Everything tracked correctly
⚠️ **Variance ≠ 0**: Investigation needed
🎯 **Goal**: Maintain zero variance through proper recording of all movements
