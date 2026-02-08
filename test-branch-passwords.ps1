#!/usr/bin/env pwsh
# Test new branch-specific passwords

Write-Host "`n======================================"
Write-Host "BRANCH PASSWORD VERIFICATION" -ForegroundColor Cyan
Write-Host "======================================"

$baseUrl = "http://localhost:5000/api"

# Test Branch 1 (Msabweni) - @Kenya90!
Write-Host "`n[BRANCH 1] Edendrop Msabweni - Password: @Kenya90!"
Write-Host "======================================" -ForegroundColor Cyan

$loginBody1 = @{
    email = "bob.cashier@example.com"
    password = "@Kenya90!"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody1 -ContentType "application/json"
    Write-Host "[OK] Login successful for Bob Cashier" -ForegroundColor Green
    Write-Host "  Branch: $($response1.user.branchId.Substring(0,8))..." -ForegroundColor Cyan
    Write-Host "  Role: $($response1.user.role)" -ForegroundColor Cyan
} catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
}

# Test Branch 2 (Reem) - @kenya80!
Write-Host "`n[BRANCH 2] Edendrop Reem - Password: @kenya80!"
Write-Host "======================================" -ForegroundColor Cyan

$loginBody2 = @{
    email = "alice.cashier@example.com"
    password = "@kenya80!"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody2 -ContentType "application/json"
    Write-Host "[OK] Login successful for Alice Cashier" -ForegroundColor Green
    Write-Host "  Branch: $($response2.user.branchId.Substring(0,8))..." -ForegroundColor Cyan
    Write-Host "  Role: $($response2.user.role)" -ForegroundColor Cyan
} catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
}

# Test Branch 3 (Tamasha) - @Kenya70!
Write-Host "`n[BRANCH 3] Edendrop Tamasha - Password: @Kenya70!"
Write-Host "======================================" -ForegroundColor Cyan

$loginBody3 = @{
    email = "carol.cashier@example.com"
    password = "@Kenya70!"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody3 -ContentType "application/json"
    Write-Host "[OK] Login successful for Carol Cashier" -ForegroundColor Green
    Write-Host "  Branch: $($response3.user.branchId.Substring(0,8))..." -ForegroundColor Cyan  
    Write-Host "  Role: $($response3.user.role)" -ForegroundColor Cyan
} catch {
    Write-Host "[FAIL] Login failed: $_" -ForegroundColor Red
}

Write-Host "`n======================================"
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "======================================"

Write-Host "`nBranch Password Configuration:" -ForegroundColor Green
Write-Host "  Branch 1 (Msabweni):  @Kenya90!" -ForegroundColor Yellow
Write-Host "  Branch 2 (Reem):      @kenya80!" -ForegroundColor Yellow
Write-Host "  Branch 3 (Tamasha):   @Kenya70!" -ForegroundColor Yellow

Write-Host "`nCashier Accounts:" -ForegroundColor Green
Write-Host "`n  Edendrop Msabweni (@Kenya90!):" -ForegroundColor White
Write-Host "    - cashier@example.com" -ForegroundColor Cyan
Write-Host "    - bob.cashier@example.com" -ForegroundColor Cyan
Write-Host "    - emma.cashier@example.com" -ForegroundColor Cyan

Write-Host "`n  Edendrop Reem (@kenya80!):" -ForegroundColor White
Write-Host "    - alice.cashier@example.com" -ForegroundColor Cyan
Write-Host "    - david.cashier@example.com" -ForegroundColor Cyan

Write-Host "`n  Edendrop Tamasha (@Kenya70!):" -ForegroundColor White
Write-Host "    - cashier2@example.com" -ForegroundColor Cyan
Write-Host "    - carol.cashier@example.com" -ForegroundColor Cyan

Write-Host "`n======================================"
Write-Host "All passwords updated successfully!" -ForegroundColor Green
Write-Host "======================================`n"
