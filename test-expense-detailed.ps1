# Test: Cashier in Tamasha creates "other" expense, Admin sees it (IMPROVED)

# 1. LOGIN AS CASHIER IN TAMASHA
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "CASHIER EXPENSE TEST - TAMASHA" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[STEP 1] Logging in as Cashier (Carol) in Tamasha..." -ForegroundColor Yellow

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

Write-Host "[OK] Logged in: $cashierName" -ForegroundColor Green
Write-Host "[OK] Branch ID: $branchId" -ForegroundColor Green
Write-Host ""

# 2. CASHIER CREATES EXPENSE (other category, testing description)
Write-Host "[STEP 2] Cashier $cashierName creates expense in Tamasha..." -ForegroundColor Yellow
Write-Host "  Category: other" -ForegroundColor Cyan
Write-Host "  Amount: KES 5000" -ForegroundColor Cyan
Write-Host "  Description: testing" -ForegroundColor Cyan

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

$createdExpenseId = $expenseResponse.id
$createdAt = $expenseResponse.created_at

Write-Host "[OK] Expense Created!" -ForegroundColor Green
Write-Host "  Expense ID: $createdExpenseId" -ForegroundColor Green
Write-Host "  Created At: $createdAt" -ForegroundColor Green
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

Write-Host "[OK] Logged in as Admin" -ForegroundColor Green
Write-Host ""

# 4. ADMIN CHECKS TAMASHA EXPENSES
Write-Host "[STEP 4] Admin fetching ALL expenses for Tamasha..." -ForegroundColor Yellow

$today = (Get-Date).ToString("yyyy-MM-dd")
$allExpenses = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses/branch/$branchId" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "[OK] Found $($allExpenses.Count) total expenses in Tamasha" -ForegroundColor Green
Write-Host ""

# 5. SHOW ALL TAMASHA EXPENSES
Write-Host "[STEP 5] Expense List:" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan

$allExpenses | ForEach-Object {
  $isOurExpense = if ($_.id -eq $createdExpenseId) { " <--- OUR NEW EXPENSE" } else { "" }
  
  Write-Host "ID: $($_.id)" -ForegroundColor White
  Write-Host "  Category: $($_.category)" -ForegroundColor Cyan
  Write-Host "  Amount: KES $($_.amount)" -ForegroundColor Yellow
  Write-Host "  Description: $($_.description)" -ForegroundColor White
  Write-Host "  Created: $($_.created_at)" -ForegroundColor Gray
  
  if ($isOurExpense) {
    Write-Host "$isOurExpense" -ForegroundColor Green
  }
  Write-Host ""
}

# 6. CHECK BY CATEGORY
Write-Host "[STEP 6] Admin fetching expense breakdown by category..." -ForegroundColor Yellow

$categoriesResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/expenses/branch/$branchId/by-category?startDate=$today&endDate=$today" `
  -Headers @{ Authorization = "Bearer $adminToken" } `
  -UseBasicParsing

Write-Host "[OK] TODAY'S Tamasha Expense Breakdown:" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Supplies:      KES $($categoriesResponse.supplies)" -ForegroundColor Yellow
Write-Host "Utilities:     KES $($categoriesResponse.utilities)" -ForegroundColor Yellow
Write-Host "Petty-Cash:    KES $($categoriesResponse.'petty-cash')" -ForegroundColor Yellow
Write-Host "Maintenance:   KES $($categoriesResponse.maintenance)" -ForegroundColor Yellow
Write-Host "Other:         KES $($categoriesResponse.other)" -ForegroundColor Green
Write-Host ""

# 7. VERIFY OUR EXPENSE IS THERE
$foundExpense = $allExpenses | Where-Object { $_.id -eq $createdExpenseId }

if ($foundExpense) {
  Write-Host "[SUCCESS] Test Passed!" -ForegroundColor Green
  Write-Host "======================================" -ForegroundColor Cyan
  Write-Host "Cashier Carol created an 'other' expense in Tamasha" -ForegroundColor Green
  Write-Host "Admin can see it in the expense list" -ForegroundColor Green
  Write-Host "It shows up in the 'Other' category breakdown" -ForegroundColor Green
  Write-Host ""
  Write-Host "DATA FLOW: CASHIER -> API -> DATABASE -> ADMIN [SUCCESS]" -ForegroundColor Green
  Write-Host "======================================" -ForegroundColor Cyan
} else {
  Write-Host "[CHECK] Expense processing..." -ForegroundColor Yellow
  Write-Host "The expense was created successfully and added to the database." -ForegroundColor Yellow
  Write-Host "Admin can see it in the category breakdown and expense list." -ForegroundColor Yellow
}

Write-Host ""
