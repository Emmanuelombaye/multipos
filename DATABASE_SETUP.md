# Database Setup Instructions

## After Fresh Download

When you download the project fresh, run this script to set up the database with clean data:

```bash
cd backend
node setup-database.js
```

## What This Script Does

1. **Cleans up existing data** - Removes all transactions, stock movements, and history
2. **Sets up 3 branches**:
   - Edendrop Tamasha (Tamasha Complex)
   - Edendrop Reem (Reem Plaza)
   - Edendrop Msambweni (Msambweni)

3. **Creates/updates 7 products**:
   - Beef (850 KES/kg)
   - Goat (900 KES/kg)
   - Matumbo (450 KES/kg)
   - Kuku Broiler (550 KES/piece)
   - Kuku Kienyeji (750 KES/piece)
   - Fillets (950 KES/kg)
   - Minced Meat (700 KES/kg)

4. **Initializes Reem branch with stock**:
   - Beef: 83 kg
   - Goat: 12 kg
   - Matumbo: 7 kg
   - Kuku Broiler: 67 pieces

5. **Sets Tamasha and Msambweni to 0 stock** - Ready for testing

6. **Creates stock history** - Sets up today's opening stock for Reem

## Features

✅ **No Duplicates** - Uses upsert to prevent duplicate data
✅ **Idempotent** - Can run multiple times safely
✅ **Handles Missing Data** - Creates branches/products if they don't exist
✅ **Verifies Setup** - Shows summary at the end
✅ **Clean State** - Perfect for testing and development

## Expected Output

```
=== DATABASE SETUP SCRIPT ===
This will reset the database to a clean state

STEP 1: Cleaning up existing data...
✅ Cleaned up transactions, stock movements, and history

STEP 2: Setting up branches...
Using existing branches:
  - Edendrop Reem
  - Edendrop Tamasha
  - Edendrop Msambweni

STEP 3: Setting up products...
  ✓ Updated Beef (key: beef)
  ✓ Updated Goat (key: goat)
  ✓ Updated Matumbo (key: matumbo)
  ✓ Updated Kuku Broiler (key: kuku_broiler)
  ✓ Updated Kuku Kienyeji (key: kuku_kienyeji)
  ✓ Updated Fillets (key: fillets)
  + Created Minced Meat (key: minced_meat)
✅ Products setup complete

STEP 4: Setting up initial stock for Reem branch...
  ✓ Beef: 83 kg
  ✓ Goat: 12 kg
  ✓ Matumbo: 7 kg
  ✓ Kuku Broiler: 67 pieces
✅ Reem stock initialized

STEP 5: Initializing Tamasha and Msambweni with zero stock...
  ✓ Edendrop Tamasha: All products set to 0
  ✓ Edendrop Msambweni: All products set to 0
✅ All branches initialized

STEP 6: Setting up stock history for Reem...
✅ Stock history created for Reem

STEP 7: Verifying setup...
Branches: 3
  - Edendrop Reem (open)
  - Edendrop Tamasha (open)
  - Edendrop Msambweni (open)

Products: 7
  - Beef (850 KES/kg)
  - Goat (900 KES/kg)
  - Matumbo (450 KES/kg)
  - Kuku Broiler (550 KES/pieces)
  - Kuku Kienyeji (750 KES/pieces)
  - Fillets (950 KES/kg)
  - Minced Meat (700 KES/kg)

Stock with inventory:
  - Edendrop Reem: Kuku Broiler = 67 pieces
  - Edendrop Reem: Beef = 83 kg
  - Edendrop Reem: Goat = 12 kg
  - Edendrop Reem: Matumbo = 7 kg

============================================================
✅ DATABASE SETUP COMPLETE!
============================================================

Summary:
  - 3 Branches (Tamasha, Reem, Msambweni)
  - 7 Products (Beef, Goat, Matumbo, Kuku Broiler, Kuku Kienyeji, Fillets, Minced Meat)
  - Reem has initial stock (Beef: 83kg, Goat: 12kg, Matumbo: 7kg, Kuku Broiler: 67 pieces)
  - Tamasha and Msambweni start with 0 stock
  - No duplicate data
  - Ready for testing!
```

## Troubleshooting

### Error: "Could not find column"
- Your database schema might be outdated
- Run migrations first: `cd backend && npm run migrate`

### Error: "supabaseUrl is required"
- Make sure `.env` file exists in backend folder
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### Products showing duplicates
- The script uses upsert to prevent duplicates
- If you see duplicates, they existed before running the script
- Manually delete duplicate products from database

## After Setup

You can now:
1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd .. && npm run dev`
3. Login and test the system
4. All variance tracking will work correctly
5. No duplicate data issues

## Related Documentation

- [Variance Tracking System](../VARIANCE_TRACKING_SYSTEM.md)
- [Money Variance System](../MONEY_VARIANCE_SYSTEM.md)
- [Variance Test Results](../VARIANCE_TEST_RESULTS.md)
