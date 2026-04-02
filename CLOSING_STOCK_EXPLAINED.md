# How Closing Stock Works - Complete Explanation

## Overview

The closing stock system is designed to handle **physical stock counts** at the end of each day. It's flexible and handles various scenarios including when cashiers forget to submit.

## The Flow

### 1. **Daily Stock History Record**

Every day, for each product at each branch, there's a `stock_history` record with:
- `opening_stock` - Stock at start of day
- `closing_stock` - Physical count at end of day (can be NULL)
- `date` - The specific date
- `added_by` - Who recorded it

### 2. **Auto-Initialization (Smart System)**

When ANY operation happens (sale, transfer, dispatch), the system automatically calls `ensureDailyHistory()`:

```javascript
export const ensureDailyHistory = async (productId, branchId, date) => {
  // Check if record exists for today
  const existing = await supabase
    .from('stock_history')
    .select('*')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .eq('date', date)
    .maybeSingle();

  if (existing) return existing; // Already exists

  // Auto-create with smart opening stock
  // 1. Try to use yesterday's closing stock
  const lastHistory = await supabase
    .from('stock_history')
    .select('closing_stock')
    .eq('branch_id', branchId)
    .eq('product_id', productId)
    .lt('date', date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  let openingStock;
  if (lastHistory && lastHistory.closing_stock !== null) {
    // Use yesterday's closing as today's opening
    openingStock = lastHistory.closing_stock;
  } else {
    // Fallback to current live stock
    const branchStock = await supabase
      .from('branch_stock')
      .select('current_stock')
      .eq('branch_id', branchId)
      .eq('product_id', productId)
      .maybeSingle();
    openingStock = branchStock?.current_stock || 0;
  }

  // Create the record
  await supabase
    .from('stock_history')
    .insert({
      product_id: productId,
      branch_id: branchId,
      date,
      opening_stock: openingStock,
      added_by: 'System (Auto-Init)'
    });
}
```

## Scenarios

### Scenario 1: Cashier Submits Closing Stock (Normal Flow)

**Day 1 - Monday:**
- Opening: 100kg (from system)
- Sales: 30kg
- Cashier submits closing: 70kg ✅
- System updates:
  - `stock_history.closing_stock = 70kg`
  - `branch_stock.current_stock = 70kg`
  - `added_by = "John (Cashier)"`

**Day 2 - Tuesday:**
- System auto-creates record with `opening_stock = 70kg` (from Monday's closing)
- Sales: 20kg
- Cashier submits closing: 50kg ✅
- Perfect continuity!

---

### Scenario 2: Cashier Forgets to Submit Closing Stock

**Day 1 - Monday:**
- Opening: 100kg
- Sales: 30kg
- **Cashier forgets to submit closing** ❌
- `stock_history.closing_stock = NULL`
- `branch_stock.current_stock = 70kg` (updated by sales)

**Day 2 - Tuesday Morning:**
- System auto-creates record
- Since Monday's closing is NULL, uses `branch_stock.current_stock = 70kg`
- Opening: 70kg ✅ (Still correct!)
- Sales: 20kg
- Cashier submits closing: 50kg ✅

**Result**: System self-heals! The live `branch_stock` acts as a safety net.

---

### Scenario 3: Multiple Days Without Closing Stock

**Day 1 - Monday:**
- Opening: 100kg
- Sales: 30kg
- No closing submitted ❌
- `branch_stock = 70kg`

**Day 2 - Tuesday:**
- Auto-opening: 70kg (from branch_stock)
- Sales: 20kg
- No closing submitted ❌
- `branch_stock = 50kg`

**Day 3 - Wednesday:**
- Auto-opening: 50kg (from branch_stock)
- Sales: 10kg
- **Cashier finally submits closing: 40kg** ✅
- System syncs everything

**Result**: System continues working! Each day uses the live stock as fallback.

---

### Scenario 4: Discrepancy Between System and Physical Count

**Day 1 - Monday:**
- Opening: 100kg
- Sales: 30kg
- System thinks: 70kg
- **Cashier counts physically: 65kg** (5kg missing - theft/waste/error)
- Cashier submits: 65kg ✅

**What Happens:**
```javascript
export const recordClosingStock = async (productId, branchId, closingStock, date, submittedBy) => {
  // 1. Update stock_history
  await supabase
    .from('stock_history')
    .update({
      closing_stock: closingStock, // 65kg (physical count)
      added_by: submittedBy
    })
    .eq('id', history.id);

  // 2. Sync branch_stock to physical reality
  await supabase
    .from('branch_stock')
    .upsert({
      branch_id: branchId,
      product_id: productId,
      current_stock: closingStock, // 65kg (corrected!)
      updated_at: new Date().toISOString()
    });
}
```

**Result**: 
- System corrects itself to match physical reality
- Tomorrow's opening will be 65kg (the correct physical count)
- The 5kg discrepancy is visible in reports (70kg expected vs 65kg actual)

---

## Key Features

### 1. **Self-Healing System**
- If closing stock not submitted, system uses live `branch_stock`
- No data loss or corruption
- Business continues operating

### 2. **Physical Count is King**
- When cashier submits closing stock, it overrides system calculations
- Corrects any discrepancies (theft, waste, errors)
- Syncs `branch_stock` to match physical reality

### 3. **Audit Trail**
- Every closing stock submission recorded with:
  - Who submitted it
  - When it was submitted
  - What the value was
- Can track who forgot to submit

### 4. **Automatic Continuity**
- Yesterday's closing → Today's opening
- If no closing, uses live stock
- Seamless day-to-day operation

## Admin View

Admin can see in stock history:

```
Date       | Product  | Opening | Closing | Added By
-----------|----------|---------|---------|------------------
2025-01-20 | Beef     | 100kg   | 70kg    | John (Cashier)
2025-01-21 | Beef     | 70kg    | NULL    | System (Auto-Init) ⚠️
2025-01-22 | Beef     | 70kg    | 50kg    | Mary (Cashier)
```

Admin can see:
- ✅ Which days have closing stock submitted
- ⚠️ Which days are missing closing stock
- 👤 Who submitted each closing stock
- 📊 Discrepancies between expected and actual

## What Happens During the Day

### Sales Transaction
```javascript
// When cashier makes a sale
1. Deduct from branch_stock: 70kg → 67kg
2. Auto-ensure today's history exists
3. Update closing_stock in history: 67kg
4. Record transaction
```

### Stock Transfer Out
```javascript
// When branch sends stock to another branch
1. Deduct from branch_stock: 70kg → 60kg
2. Auto-ensure today's history exists
3. Update closing_stock in history: 60kg
4. Create transfer record
```

### External Dispatch
```javascript
// When branch dispatches to hotel/school
1. Deduct from branch_stock: 70kg → 50kg
2. Auto-ensure today's history exists
3. Update closing_stock in history: 50kg
4. Create dispatch record
```

**Key Point**: Every operation updates both `branch_stock` (live) and `stock_history.closing_stock` (daily record).

## End of Day Process

### If Cashier Submits Closing Stock:
1. Cashier physically counts: 48kg
2. Submits via POS "Stock Count" button
3. System updates:
   - `stock_history.closing_stock = 48kg`
   - `branch_stock.current_stock = 48kg`
   - `added_by = "Cashier Name"`
4. Tomorrow's opening will be 48kg ✅

### If Cashier Forgets:
1. No manual submission
2. `stock_history.closing_stock = NULL`
3. `branch_stock.current_stock = 50kg` (from last operation)
4. Tomorrow's opening will be 50kg (from branch_stock) ✅
5. System continues working normally

## Benefits of This Design

### 1. **Resilient**
- System doesn't break if cashier forgets
- Business operations continue
- No data corruption

### 2. **Accurate**
- Physical counts override system calculations
- Catches theft, waste, errors
- Self-correcting

### 3. **Auditable**
- Full history of who submitted what
- Can identify patterns (which cashiers forget)
- Discrepancy tracking

### 4. **Flexible**
- Works with or without closing stock
- Handles multiple days of missing data
- Graceful degradation

## Best Practices

### For Cashiers:
1. **Always submit closing stock** at end of day
2. Count physically, don't trust system numbers
3. Report discrepancies immediately
4. Use the "Stock Count" button in POS

### For Managers:
1. Check daily which cashiers submitted closing stock
2. Follow up on missing submissions
3. Investigate large discrepancies
4. Review stock history reports weekly

### For Admin:
1. Monitor closing stock submission rates
2. Identify branches with frequent missing data
3. Analyze discrepancy patterns
4. Provide training where needed

## Technical Implementation

### Database Schema
```sql
CREATE TABLE stock_history (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  opening_stock DECIMAL(10, 2) NOT NULL,
  closing_stock DECIMAL(10, 2),  -- Can be NULL
  date DATE NOT NULL,
  added_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(branch_id, product_id, date)
);
```

### Key Functions
1. `ensureDailyHistory()` - Auto-creates daily records
2. `recordClosingStock()` - Cashier submission
3. `getStockHistoryByBranch()` - Admin reports

## Summary

**The closing stock system is intelligent and forgiving:**

✅ **Works perfectly** when cashiers submit closing stock  
✅ **Still works** when cashiers forget  
✅ **Self-corrects** when there are discrepancies  
✅ **Provides audit trail** for accountability  
✅ **Maintains continuity** across days  

**Bottom line**: The system is designed to keep the business running smoothly whether or not cashiers remember to submit closing stock, while still encouraging best practices through visibility and accountability.
