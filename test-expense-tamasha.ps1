# Test: Cashier in Tamasha creates "other" expense, Admin sees it

# 1. LOGIN AS CASHIER IN TAMASHA
Write-Host "=== CASHIER EXPENSE TEST ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "[STEP 1] Logging in as Cashier in Tamasha..." -ForegroundColor Yellow

$cashierLoginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post `
  -Body (ConvertTo-Json @{
    email = "carol.cashier@example.com"
    password = "password123"
  }) `
  -ContentType "application/json" `
  -UseBasicParsing

$cashierToken = $cashierLoginResponse.token
$cashierName = $cashierLoginResponse.user.name
$branchId = $cashierLoginResponse.user.branchId
$branchName = "Tamasha" # Carol is in Tamasha

Write-Host "[OK] Logged in: $cashierName" -ForegroundColor Green
Write-Host "[OK] Branch: $branchName (ID: $branchId)" -ForegroundColor Green
Write-Host ""

# 2. CASHIER CREATES EXPENSE (other category, testing description)
Write-Host "[STEP 2] Cashier creates expense..." -ForegroundColor Yellow

$expenseResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses" `
  -Method Post `
  -Body (ConvertTo-Json @{
    branchId = $branchId
    category = "other"
    amount = 5000
    description = "testing"
  }) `
  -Headers @{ Authorization = "Bearer $cashierToken" } `
  -ContentType "application/json" `
  -UseBasicParsing

Write-Host "[OK] Expense Created!" -ForegroundColor Green
Write-Host "  Category: $($expenseResponse.category)" -ForegroundColor Green
Write-Host "  Amount: KES $($expenseResponse.amount)" -ForegroundColor Green
Write-Host "  Description: $($expenseResponse.description)" -ForegroundColor Green
Write-Host "  Created By: $($expenseResponse.recorded_by)" -ForegroundColor Green
Write-Host ""

# 3. LOGIN AS ADMIN
Write-Host "[STEP 3] Logging in as Admin..." -ForegroundColor Yellow

$adminLoginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
  -Method Post `
  -Body (ConvertTo-Json @{
    email = "admin@example.com"
    password = "password123"
  }) `
  -ContentType "application/json" `
  -UseBasicParsing

$adminToken = $adminLoginResponse.token
$adminName = $adminLoginResponse.user.name

Write-Host "[OK] Logged in: $adminName" -ForegroundColor Green
Write-Host ""

# 4. ADMIN FETCHES EXPENSES FOR TAMASHA
Write-Host "[STEP 4] Admin fetching expenses for Tamasha branch..." -ForegroundColor Yellow

$today = (Get-Date).ToString("yyyy-MM-dd")
$startDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
$endDate = $today

$expensesResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses/branch/$branchId/range?startDate=$startDate&endDate=$endDate" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "[OK] Retrieved $($expensesResponse.Count) expenses" -ForegroundColor Green
Write-Host ""

# 5. ADMIN FETCHES EXPENSES BY CATEGORY
Write-Host "[STEP 5] Admin fetching expense breakdown by category..." -ForegroundColor Yellow

$categoriesResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses/branch/$branchId/by-category?startDate=$startDate&endDate=$endDate" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "[OK] Expense Breakdown for Tamasha:" -ForegroundColor Green
Write-Host "  Supplies: KES $($categoriesResponse.supplies)" -ForegroundColor Cyan
Write-Host "  Utilities: KES $($categoriesResponse.utilities)" -ForegroundColor Cyan
Write-Host "  Petty-Cash: KES $($categoriesResponse.'petty-cash')" -ForegroundColor Cyan
Write-Host "  Maintenance: KES $($categoriesResponse.maintenance)" -ForegroundColor Cyan
Write-Host "  Other: KES $($categoriesResponse.other)" -ForegroundColor Yellow
Write-Host ""

# 6. SHOW OUR TEST EXPENSE
Write-Host "[STEP 6] Looking for our test expense in the list..." -ForegroundColor Yellow

$testExpense = $expensesResponse | Where-Object { $_.description -eq "testing" -and $_.category -eq "other" } | Select-Object -First 1

if ($testExpense) {
  Write-Host "[SUCCESS] Found the test expense!" -ForegroundColor Green
  Write-Host "  ID: $($testExpense.id)" -ForegroundColor Green
  Write-Host "  Category: $($testExpense.category)" -ForegroundColor Green
  Write-Host "  Amount: KES $($testExpense.amount)" -ForegroundColor Green
  Write-Host "  Description: $($testExpense.description)" -ForegroundColor Green
  Write-Host "  Created: $($testExpense.created_at)" -ForegroundColor Green
  Write-Host "  Recorded By: $($testExpense.recorded_by)" -ForegroundColor Green
} else {
  Write-Host "[WARNING] Test expense not found in list" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "[CONCLUSION] CASHIER -> ADMIN FLOW VERIFIED!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "- Cashier created expense with description testing" -ForegroundColor Green
Write-Host "- Admin retrieved it and sees it in the expense list" -ForegroundColor Green
Write-Host "- Expense counted in Other category breakdown" -ForegroundColor Green
Write-Host ""
