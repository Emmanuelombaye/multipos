# After DB migration runs, re-run this to verify everything works
$baseUrl = 'http://localhost:5000'

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "  TILL PAYMENT VERIFICATION TESTS" -ForegroundColor Cyan
Write-Host "=====================================`n" -ForegroundColor Cyan

# Login
$loginBody = '{"email":"cashier@tamasha.com","password":"@Kenya90!"}'
$login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType 'application/json'
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "[AUTH] Logged in as $($login.user.name)" -ForegroundColor Green

# Get branch
$branches = Invoke-RestMethod -Uri "$baseUrl/api/branches" -Method GET
$branch = $branches | Where-Object { $_.id -eq $login.user.branchId }
if (-not $branch) { $branch = $branches[0] }
Write-Host "[BRANCH] $($branch.name)" -ForegroundColor White

# Get products
$products = Invoke-RestMethod -Uri "$baseUrl/api/products/branch/$($branch.id)" -Method GET -Headers $headers
$product = $products[0]
Write-Host "[PRODUCT] $($product.name) | Normal: KES $($product.price_per_kg) | Discount: KES $($product.discount_price_per_kg)`n" -ForegroundColor White

$passed = 0
$failed = 0

function Test-Transaction($method, $price, $label) {
    $body = "{`"branchId`":`"$($branch.id)`",`"paymentMethod`":`"$method`",`"items`":[{`"productId`":`"$($product.id)`",`"quantity`":0.5,`"pricePerKg`":$price,`"subtotal`":$([math]::Round($price * 0.5, 2))}]}"
    try {
        $tx = Invoke-RestMethod -Uri "$baseUrl/api/transactions" -Method POST -Body $body -ContentType 'application/json' -Headers $headers
        Write-Host "[PASS] $label | KES $($tx.total) | method=$($tx.payment_method)" -ForegroundColor Green
        return $true
    } catch {
        $errStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errStream)
        $errBody = $reader.ReadToEnd()
        Write-Host "[FAIL] $label - $errBody" -ForegroundColor Red
        return $false
    }
}

if (Test-Transaction 'cash'          $product.price_per_kg                        'Cash Payment'    ) { $passed++ } else { $failed++ }
if (Test-Transaction 'normal_till'   $product.price_per_kg                        'Normal Till'     ) { $passed++ } else { $failed++ }
if (Test-Transaction 'discount_till' $product.discount_price_per_kg               'Discount Till'   ) { $passed++ } else { $failed++ }
if (Test-Transaction 'loan'          $product.price_per_kg                        'Loan Payment'    ) { $passed++ } else { $failed++ }

Write-Host "`n--- Financial Breakdown Today ---" -ForegroundColor Yellow
$today = (Get-Date).ToString("yyyy-MM-dd")
$txns = Invoke-RestMethod -Uri "$baseUrl/api/transactions/branch/$($branch.id)/range?startDate=$today&endDate=$today" -Method GET -Headers $headers
$methods = 'normal_till','discount_till','cash','loan'
foreach ($m in $methods) {
    $sum = ($txns | Where-Object { $_.payment_method -eq $m } | Measure-Object total -Sum).Sum
    $count = ($txns | Where-Object { $_.payment_method -eq $m }).Count
    if ($sum -gt 0) { Write-Host "  $($m.PadRight(15)) KES $sum  ($count txns)" -ForegroundColor White }
}
$grandTotal = ($txns | Measure-Object total -Sum).Sum
Write-Host "  GRAND TOTAL    KES $grandTotal  ($($txns.Count) txns)" -ForegroundColor Yellow

Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "  PASSED: $passed   FAILED: $failed" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Red' })
Write-Host "====================================`n" -ForegroundColor Cyan
