# API Testing Guide

## Quick Start - Test API Endpoints

### Step 1: Register a User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "cashier",
    "branchId": "branch-1"
  }'
```

### Step 2: Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

Response will include a JWT token:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Step 3: Use Token for Protected Endpoints

Replace `TOKEN` with the token from login response:

```bash
curl -X GET http://localhost:5000/api/branches \
  -H "Authorization: Bearer TOKEN"
```

## Postman Collection

Create a new Postman collection with these requests:

### Auth
- **Register**: POST `http://localhost:5000/api/auth/register`
  - Body: `{ "name": "...", "email": "...", "password": "...", "role": "cashier" }`

- **Login**: POST `http://localhost:5000/api/auth/login`
  - Body: `{ "email": "...", "password": "..." }`

### Branches
- **Get All**: GET `http://localhost:5000/api/branches`
- **Get One**: GET `http://localhost:5000/api/branches/{id}`
- **Create**: POST `http://localhost:5000/api/branches`
  - Body: `{ "name": "...", "location": "..." }`

### Products
- **Get All**: GET `http://localhost:5000/api/products`
- **Get with Stock**: GET `http://localhost:5000/api/products/stock/{branchId}`

### Transactions (POS Sale)
- **Create Sale**: POST `http://localhost:5000/api/transactions`
  - Body:
  ```json
  {
    "branchId": "branch-id",
    "items": [
      {
        "productId": "prod-1",
        "quantity": 2.5,
        "pricePerKg": 850,
        "subtotal": 2125
      }
    ],
    "paymentMethod": "cash"
  }
  ```

### Inventory
- **Record Opening Stock**: POST `http://localhost:5000/api/inventory/entry`
  - Body:
  ```json
  {
    "productId": "prod-1",
    "branchId": "branch-1",
    "openingStock": 50,
    "date": "2026-02-07",
    "addedBy": "John Doe"
  }
  ```

- **Get Low Stock**: GET `http://localhost:5000/api/inventory/low-stock/{branchId}`

### Expenses
- **Create Expense**: POST `http://localhost:5000/api/expenses`
  - Body:
  ```json
  {
    "branchId": "branch-1",
    "category": "supplies",
    "amount": 1500,
    "description": "Cleaning supplies"
  }
  ```

### Dashboard
- **Admin Dashboard**: GET `http://localhost:5000/api/dashboard/admin`
- **Branch Dashboard**: GET `http://localhost:5000/api/dashboard/branch/{branchId}`

## Environment Variables Setup

Set these in Postman:
- `base_url`: http://localhost:5000
- `token`: (paste token from login response)

Then use `{{base_url}}` and `Authorization: Bearer {{token}}` in requests.

## Troubleshooting

### 401 Unauthorized
- Token is missing or invalid
- Token has expired (24 hours)
- Solution: Login again to get a new token

### 403 Forbidden
- User role doesn't have permission for this endpoint
- Solution: Use an admin or manager account

### 404 Not Found
- Resource doesn't exist
- Solution: Check the resource ID

### 500 Internal Server Error
- Check backend logs for details
- Ensure Supabase credentials are correct

## Common Workflows

### POS Transaction Workflow
1. Cashier logs in → get token
2. Get products with stock: `GET /api/products/stock/{branchId}`
3. Create transaction: `POST /api/transactions`
4. Record expense (optional): `POST /api/expenses`

### Inventory Management Workflow
1. Manager logs in → get token
2. Record opening stock: `POST /api/inventory/entry`
3. View current stock: `GET /api/inventory/current/{branchId}`
4. Check low stock: `GET /api/inventory/low-stock/{branchId}`
5. Record closing stock: `PUT /api/inventory/entry/closing`

### Reporting Workflow
1. Get dashboard data: `GET /api/dashboard/branch/{branchId}`
2. Get transaction history: `GET /api/transactions/branch/{branchId}`
3. Get metrics: `GET /api/dashboard/metrics/{branchId}?startDate=2026-02-01&endDate=2026-02-07`
