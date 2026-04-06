# Product Units Implementation - Chicken in Pieces

## Overview
Chicken products (Kuku Broiler, Kuku Kienyeji) should be displayed and sold in **pieces** instead of **kg**.

## Current Status
- ✅ Utility functions created in `src/app/utils/productUnits.ts`
- ✅ Database migration SQL created in `backend/migrations/add_unit_field.sql`
- ⏳ Database column needs to be added manually
- ⏳ Frontend components need to import and use the utility functions

## Database Changes Required

### Step 1: Add Unit Column to Products Table
Run this SQL in Supabase SQL Editor:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'kg';
UPDATE products SET unit = 'pieces' WHERE name ILIKE '%kuku%';
```

### Step 2: Verify
```sql
SELECT name, category, unit, price_per_kg FROM products ORDER BY name;
```

## Frontend Implementation

### Utility Functions (Already Created)
File: `src/app/utils/productUnits.ts`

```typescript
export const getProductUnit = (productName) => {
  const name = (productName || '').toLowerCase();
  
  if (name.includes('kuku')) {
    return {
      unit: 'pieces',
      unitLabel: 'pieces',
      priceLabel: 'Price per Piece',
      stockLabel: 'Stock (pieces)',
      quantityLabel: 'Quantity (pieces)'
    };
  }
  
  return {
    unit: 'kg',
    unitLabel: 'kg',
    priceLabel: 'Price per Kg',
    stockLabel: 'Stock (kg)',
    quantityLabel: 'Quantity (kg)'
  };
};

export const formatQuantity = (quantity, productName) => {
  const { unitLabel } = getProductUnit(productName);
  const value = parseFloat(quantity || 0);
  
  if (unitLabel === 'pieces') {
    return `${Math.round(value)} ${unitLabel}`;
  }
  
  return `${value.toFixed(2)} ${unitLabel}`;
};

export const formatPrice = (price, productName) => {
  const { priceLabel } = getProductUnit(productName);
  return `KES ${parseFloat(price || 0).toLocaleString()}/${priceLabel.includes('Piece') ? 'pc' : 'kg'}`;
};
```

### Components to Update

#### 1. POSScreen.tsx
Replace hardcoded "kg" with dynamic unit:

```typescript
import { getProductUnit, formatQuantity, formatPrice } from '../utils/productUnits';

// In product display:
const { unitLabel } = getProductUnit(product.name);
<Badge>{product.stock} {unitLabel} left</Badge>

// In cart:
{formatQuantity(item.quantity, item.productName)}

// In price display:
{formatPrice(product.price_per_kg, product.name)}
```

#### 2. ProductManagement.tsx
Update stock display and input labels:

```typescript
import { getProductUnit, formatQuantity } from '../utils/productUnits';

const { unitLabel, stockLabel } = getProductUnit(product.name);
<span>{formatQuantity(product.current_stock, product.name)}</span>
```

#### 3. InventoryScreen.tsx
Update stock displays:

```typescript
import { formatQuantity } from '../utils/productUnits';
<span>{formatQuantity(stock, productName)}</span>
```

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Verify unit column exists and chicken products have 'pieces'
- [ ] Update POSScreen to use utility functions
- [ ] Update ProductManagement to use utility functions
- [ ] Update InventoryScreen to use utility functions
- [ ] Test selling chicken products - should show pieces
- [ ] Test stock management - should show pieces for chicken
- [ ] Test reports - should show pieces for chicken

## Notes

- The system internally still uses numeric values (can be decimal)
- For chicken, display rounds to whole numbers (pieces)
- For other products, display shows 2 decimal places (kg)
- Price field name remains `price_per_kg` in database but displays as "per piece" for chicken
- Stock calculations remain the same, only display changes
