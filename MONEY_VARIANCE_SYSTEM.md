# Money Variance System

## Overview
Money variance tracks the difference between expected cash and actual cash counted by the cashier at end of shift.

## Test Results

### Test Scenario
- **Opening Cash**: KES 0
- **Cash Sales**: KES 1,460 (2 kg Beef @ 730/kg)
- **M-Pesa Sales**: KES 2,190 (3 kg Beef @ 730/kg)
- **Expenses**: KES 500 (supplies)
- **Expected Cash**: KES 960
- **Actual Cash Counted**: KES 760
- **Money Variance**: **KES -200 (SHORTAGE)**

## Money Variance Formula

```
Expected Cash = Opening Cash + Cash Sales - Expenses

Money Variance = Actual Cash - Expected Cash
```

### Detailed Calculation

```
Opening Cash:        KES 0
+ Cash Sales:        KES 1,460
- Expenses:          KES 500
= Expected Cash:     KES 960

Actual Cash Counted: KES 760
Expected Cash:       KES 960
Money Variance:      KES -200 (SHORT)
```

## Important Notes

### What Counts Towards Cash?
✅ **Cash Sales** - Added to drawer
✅ **Expenses** - Removed from drawer
❌ **M-Pesa Sales** - NOT in cash drawer (electronic payment)
❌ **Bank Deposits** - NOT in cash drawer (already deposited)

### Variance Types

#### 1. No Variance (Perfect Match)
```
Actual Cash = Expected Cash
Variance = 0
Status: ✅ Perfect
```

#### 2. Cash Shortage (Negative Variance)
```
Actual Cash < Expected Cash
Variance < 0
Status: ⚠️ Money Missing
```

**Possible Causes:**
- Cashier gave wrong change (gave too much)
- Unrecorded expense (money taken out)
- Theft
- Counting error
- Cash sale not recorded

#### 3. Cash Surplus (Positive Variance)
```
Actual Cash > Expected Cash
Variance > 0
Status: ⚠️ Extra Money
```

**Possible Causes:**
- Cashier received extra payment
- Unrecorded cash sale
- Wrong change given (gave too little)
- Counting error
- Previous day's cash mixed in

## Complete Example

### Scenario: Full Day Operations

**Morning:**
- Opening Cash: KES 5,000

**During Day:**
- Cash Sale 1: KES 1,500
- Cash Sale 2: KES 2,300
- M-Pesa Sale: KES 3,000 (not cash)
- Expense 1: KES 800 (supplies)
- Expense 2: KES 300 (petty cash)
- Cash Sale 3: KES 1,800

**Expected Cash Calculation:**
```
Opening:           KES 5,000
+ Cash Sales:      KES 5,600 (1,500 + 2,300 + 1,800)
- Expenses:        KES 1,100 (800 + 300)
= Expected:        KES 9,500
```

**End of Day:**
- Cashier Counts: KES 9,300
- Expected: KES 9,500
- **Variance: KES -200 (SHORT)**

## Database Tables

### cash_register
Stores daily cash tracking:
```sql
{
  branch_id: uuid,
  date: date,
  opening_cash: decimal,
  closing_cash: decimal,
  total_cash_sales: decimal,
  total_mpesa_sales: decimal,
  total_expenses: decimal,
  closed_by: uuid
}
```

### Variance Calculation in System
```javascript
const expectedCash = opening_cash + total_cash_sales - total_expenses;
const moneyVariance = closing_cash - expectedCash;
```

## How to Use

### 1. Start of Day
Cashier sets opening cash:
```
POST /api/cash-register/open
{
  branch_id: "xxx",
  opening_cash: 5000
}
```

### 2. During Day
- Sales automatically tracked (cash vs mpesa)
- Expenses recorded as they happen
- System calculates running expected cash

### 3. End of Day
Cashier counts and submits closing cash:
```
POST /api/cash-register/close
{
  branch_id: "xxx",
  closing_cash: 9300
}
```

System calculates variance automatically.

## Variance Thresholds

### Acceptable Variance
- **< KES 50**: Minor (rounding, small change errors)
- **Status**: ✅ Acceptable

### Warning Variance
- **KES 50 - 500**: Moderate
- **Status**: ⚠️ Requires review

### Critical Variance
- **> KES 500**: High
- **Status**: ❌ Requires immediate investigation

## Troubleshooting

### High Cash Shortage?
1. Recount the cash
2. Check if all cash sales were recorded
3. Verify all expenses were recorded
4. Check for unrecorded withdrawals
5. Review CCTV if available

### Cash Surplus?
1. Recount the cash
2. Check for unrecorded cash sales
3. Verify opening cash was correct
4. Check if previous day's cash was included
5. Review all transactions

### Frequent Small Variances?
- Train cashiers on proper change-giving
- Use cash counting machines
- Implement dual-count system
- Regular cash audits

## Best Practices

### 1. Daily Reconciliation
- Count cash at end of every shift
- Record variance immediately
- Investigate same day

### 2. Dual Verification
- Manager verifies cashier's count
- Both sign off on closing

### 3. Documentation
- Document reason for variance
- Keep records for audit trail
- Track patterns over time

### 4. Prevention
- Proper training on cash handling
- Clear procedures for expenses
- Regular surprise audits
- Use cash counting machines

## API Endpoints

### Open Cash Register
```
POST /api/cash-register/open
Body: { branch_id, opening_cash }
```

### Close Cash Register
```
POST /api/cash-register/close
Body: { branch_id, closing_cash }
```

### Get Cash Register Status
```
GET /api/cash-register/:branch_id/:date
Returns: { opening_cash, expected_cash, closing_cash, variance }
```

## Test Script

Run money variance test:
```bash
cd backend
node test-money-variance.js
```

This will:
1. Set opening cash
2. Add expenses
3. Make cash and M-Pesa sales
4. Calculate expected cash
5. Submit closing cash (with intentional shortage)
6. Show variance calculation
7. Clean up test data

## Summary

✅ **Money Variance = Actual Cash - Expected Cash**
✅ **Expected Cash = Opening + Cash Sales - Expenses**
✅ **M-Pesa sales NOT included in cash**
✅ **Variance shows cash handling accuracy**
✅ **Negative = Shortage, Positive = Surplus**
✅ **Test confirmed: System correctly detects KES 200 shortage**

The money variance system is working correctly and helps identify cash handling issues!
