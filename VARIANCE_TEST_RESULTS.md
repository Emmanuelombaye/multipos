# Variance Detection Test Results

## Test Scenario
- **System Stock**: 800 kg
- **Closing Stock (Cashier counted)**: 799 kg
- **Expected Variance**: 1 kg shortage

## Test Results

### Calculation
```
Variance = Closing Stock - System Stock
Variance = 799 - 800
Variance = -1 kg
```

### Interpretation
- **Absolute Variance**: 1 kg
- **Type**: SHORTAGE (negative variance)
- **Meaning**: Cashier counted 1 kg LESS than system shows

### System Response
✅ **Variance Detected**: 1 kg
⚠️ **Status**: Requires investigation

### What Dashboard Shows
```
Branch: Edendrop Reem
Opening Stock: 169 kg
Live Stock: 885 kg (includes all products)
Variance: 1 kg ⚠️
Status: Variance detected - requires investigation
```

## Variance Logic Confirmed

### When Cashier Submits Closing Stock:
```javascript
const variance = closingStock - currentStock;
// 799 - 800 = -1 kg

if (Math.abs(variance) > 0.1) {
  // VARIANCE DETECTED!
  totalVariance += Math.abs(variance); // Adds 1 kg
}
```

### Result:
- ✅ System correctly identifies 1 kg variance
- ✅ Shows as warning in dashboard
- ✅ Requires investigation before accepting

## Possible Causes of 1 kg Variance

### 1. Counting Error (Most Common)
- Cashier miscounted by 1 kg
- **Solution**: Recount the physical stock

### 2. Recent Transaction Not Processed
- Sale happened but not entered yet
- **Solution**: Check for pending transactions

### 3. System Data Entry Error
- Wrong quantity entered in a transaction
- **Solution**: Audit recent transactions

### 4. Measurement Error
- Scale calibration issue
- **Solution**: Verify scale accuracy

### 5. Small Waste/Spillage
- Minor loss not recorded
- **Solution**: Record as waste if confirmed

## Recommended Actions

### Step 1: Immediate
1. Recount the physical stock
2. Verify the count is actually 799 kg

### Step 2: Investigation
1. Check recent transactions (last 1-2 hours)
2. Verify all sales were entered correctly
3. Check for any pending/incomplete transactions

### Step 3: Resolution
If recount confirms 799 kg:
- Accept physical count as truth
- System will sync to 799 kg
- Document the 1 kg discrepancy

If recount shows 800 kg:
- Update closing stock to 800 kg
- Variance becomes 0 kg
- No further action needed

## System Behavior

### Variance Threshold: 0.1 kg
- Variances less than 0.1 kg are ignored (rounding errors)
- Variances greater than 0.1 kg trigger alerts

### Variance Display
- **Green ✓**: No variance (< 0.1 kg)
- **Amber ⚠️**: Variance detected (> 0.1 kg)
- **Red ❌**: High variance (> 10 kg or > 10% of stock)

## Test Conclusion

✅ **System Working Correctly**
- Detects 1 kg variance accurately
- Shows appropriate warning
- Provides clear indication for investigation
- Variance calculation logic is correct

The system successfully identified the 1 kg difference between:
- System's expectation: 800 kg
- Cashier's physical count: 799 kg

This proves the variance tracking system is working as designed!

## Cleanup

To restore test data:
```bash
cd backend
node -e "import('dotenv/config'); import('./src/db/supabase.js').then(async ({default: supabase}) => {
  await supabase.from('branch_stock').update({current_stock: 83}).eq('branch_id', 'd63d73a2-c039-40c7-8a0b-aea168bcfd3b').eq('product_id', '890a851b-2f42-44ac-bbd2-906e08ba80b3');
  await supabase.from('stock_history').update({closing_stock: 83}).eq('branch_id', 'd63d73a2-c039-40c7-8a0b-aea168bcfd3b').eq('product_id', '890a851b-2f42-44ac-bbd2-906e08ba80b3').eq('date', new Intl.DateTimeFormat('en-CA', {timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()));
  console.log('Test data restored');
  process.exit(0);
});"
```
