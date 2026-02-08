# Record 20kg closing stock for all products at Tamasha branch
# Date: 2026-02-08

$API_URL = "http://localhost:5000/api"
$targetDate = "2026-02-08"
$stockAmount = 20
$tamashaBranchId = "092f7071-d8c2-4f4f-baa0-7c4879968374"

Write-Host "=== Tamasha Closing Stock Test ===" -ForegroundColor Cyan
Write-Host ""

# Try logging in as different cashiers to find one for Tamasha
$cashiers = @(
    @{email = "cashier1@butchery.com"; password = "password123"},
    @{email = "cashier2@butchery.com"; password = "password123"},
    @{email = "cashier3@butchery.com"; password = "password123"},
    @{email = "cashier4@butchery.com"; password = "password123"},
    @{email = "cashier5@butchery.com"; password = "password123"},
    @{email = "cashier6@butchery.com"; password = "password123"},
    @{email = "cashier7@butchery.com"; password = "password123"}
)

$foundCashier = $null
foreach ($cred in $cashiers) {
    try {
        $login = $cred | ConvertTo-Json
        $auth = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method POST -Body $login -ContentType "application/json"
        if ($auth.user.branchId -eq $tamashaBranchId) {
            $foundCashier = $auth
            break
        }
    } catch {
        # Try next
    }
}

if (-not $foundCashier) {
    Write-Host "ERROR: Could not find a Tamasha cashier" -ForegroundColor Red
    exit 1
}

$headers = @{ "Authorization" = "Bearer $($foundCashier.token)"; "Content-Type" = "application/json" }

Write-Host "Logged in as: $($foundCashier.user.name)" -ForegroundColor Green
Write-Host "Branch: Tamasha" -ForegroundColor Green
Write-Host ""

# Get products
$products = Invoke-RestMethod -Uri "$API_URL/products" -Method GET -Headers $headers
Write-Host "Found $($products.Count) products" -ForegroundColor Green
Write-Host ""

# Record closing stock
Write-Host "Recording 20kg closing stock..." -ForegroundColor Yellow
$success = 0
$failed = 0

foreach ($prod in $products) {
    $body = @{ 
        productId = $prod.id
        branchId = $tamashaBranchId
        closingStock = $stockAmount
        date = $targetDate
    } | ConvertTo-Json
    
    try {
        $null = Invoke-RestMethod -Uri "$API_URL/inventory/entry/closing" -Method PUT -Body $body -Headers $headers
        Write-Host "  OK: $($prod.name)" -ForegroundColor Green
        $success++
    } catch {
        Write-Host "  FAIL: $($prod.name)" -ForegroundColor Red
        $failed++
    }
    Start-Sleep -Milliseconds 50
}

Write-Host ""
Write-Host "Complete: $success success, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Now check Admin Financials tab:" -ForegroundColor Cyan
Write-Host "  - Branch: Tamasha" -ForegroundColor White
Write-Host "  - Date: 2026-02-08" -ForegroundColor White
Write-Host "  - Expected: All products show 20kg closing stock" -ForegroundColor White
