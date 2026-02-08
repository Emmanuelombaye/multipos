# Get JWT tokens first
$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post `
  -Body (ConvertTo-Json @{
    email = "alice.cashier@example.com"
    password = "password123"
  }) `
  -ContentType "application/json" `
  -UseBasicParsing

$cashierToken = $loginResponse.token
$cashierId = $loginResponse.user.id
$branchId = $loginResponse.user.branchId

Write-Host "[OK] Cashier logged in: $($loginResponse.user.name)"
Write-Host "[BRANCH] Branch ID: $branchId"
Write-Host ""

# Get products first
Write-Host "[PRODUCTS] Fetching products..."
$products = Invoke-RestMethod -Uri "http://localhost:5000/api/products/branch/$branchId" `
  -Headers @{ Authorization = "Bearer $cashierToken" } `
  -UseBasicParsing

Write-Host "Found $($products.Count) products"
Write-Host ""

# 1. CREATE TRANSACTION
Write-Host "[TRANSACTION] Creating transaction..."
$items = @(
  @{
    productId = $products[0].id
    quantity = 2.5
    pricePerKg = $products[0].price_per_kg
    subtotal = 2.5 * $products[0].price_per_kg
  },
  @{
    productId = $products[1].id
    quantity = 1.5
    pricePerKg = $products[1].price_per_kg
    subtotal = 1.5 * $products[1].price_per_kg
  }
)

$txResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/transactions" `
  -Method Post `
  -Body (ConvertTo-Json @{
    branchId = $branchId
    items = $items
    paymentMethod = "cash"
  }) `
  -Headers @{ Authorization = "Bearer $cashierToken" } `
  -ContentType "application/json" `
  -UseBasicParsing

Write-Host "[OK] Transaction created: KES $($txResponse.total)"
Write-Host ""

# 2. LOG EXPENSE
Write-Host "[EXPENSE] Logging expense..."
$expResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses" `
  -Method Post `
  -Body (ConvertTo-Json @{
    branchId = $branchId
    category = "supplies"
    amount = 3500
    description = "Test cleaning supplies and detergent"
  }) `
  -Headers @{ Authorization = "Bearer $cashierToken" } `
  -ContentType "application/json" `
  -UseBasicParsing

Write-Host "[OK] Expense logged: KES $($expResponse.amount) - $($expResponse.category)"
Write-Host ""

# 3. RECORD CLOSING STOCK
Write-Host "[STOCK] Recording closing stock..."
$today = (Get-Date).ToString("yyyy-MM-dd")

foreach ($i in 0..2) {
  $stockResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/inventory/entry/closing" `
    -Method Put `
    -Body (ConvertTo-Json @{
      productId = $products[$i].id
      branchId = $branchId
      closingStock = 40 + $i
      date = $today
    }) `
    -Headers @{ Authorization = "Bearer $cashierToken" } `
    -ContentType "application/json" `
    -UseBasicParsing
}

Write-Host "[OK] Closing stock recorded for 3 products"
Write-Host ""

# NOW LOGIN AS ADMIN AND CHECK
Write-Host "[AUTH] Logging in as admin..."
$adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post `
  -Body (ConvertTo-Json @{
    email = "admin@example.com"
    password = "password123"
  }) `
  -ContentType "application/json" `
  -UseBasicParsing

$adminToken = $adminLogin.token

Write-Host "[OK] Admin logged in: $($adminLogin.user.name)"
Write-Host ""

# CHECK ADMIN DASHBOARD
Write-Host "[DASHBOARD] ADMIN DASHBOARD DATA:"
$dashboard = Invoke-RestMethod -Uri "http://localhost:5000/api/dashboard/admin" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "Total Sales Today: KES $($dashboard.totalSalestoday)"
Write-Host "Total Expenses Today: KES $($dashboard.totalExpensestoday)"
Write-Host "Profit: KES $($dashboard.profit)"
Write-Host ""

# CHECK BRANCH METRICS
Write-Host "[BRANCH METRICS] BRANCH METRICS:"
$branchMetrics = Invoke-RestMethod -Uri "http://localhost:5000/api/transactions/branch/$branchId" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "Recent Transactions: $($branchMetrics.Count)"
if ($branchMetrics.Count -gt 0) {
  Write-Host "  Latest: KES $($branchMetrics[0].total) via $($branchMetrics[0].payment_method)"
}
Write-Host ""

# CHECK EXPENSES BY CATEGORY
Write-Host "[EXPENSES] EXPENSES BY CATEGORY:"
$expensesCat = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses/branch/$branchId/by-category?startDate=$today&endDate=$today" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "Supplies: KES $($expensesCat.supplies)"
Write-Host "Utilities: KES $($expensesCat.utilities)"
Write-Host ""

# CHECK STOCK HISTORY
Write-Host "[STOCK] CLOSING STOCK RECORDED:"
$stockHistory = Invoke-RestMethod -Uri "http://localhost:5000/api/inventory/history/$branchId/$today" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "Stock entries with closing: $($stockHistory.Count)"
foreach ($entry in $stockHistory) {
  if ($entry.closing_stock) {
    Write-Host "  $($entry.name): $($entry.closing_stock)kg (opened: $($entry.opening_stock)kg)"
  }
}

Write-Host ""
Write-Host "OK - TEST COMPLETE!"
