# Multi-Branch EdenDropInvestment Automated Deployment Script
# Usage: Run in PowerShell from the project root

Write-Host "[1/5] Building frontend..." -ForegroundColor Cyan
cd $PSScriptRoot
npm run build

# Start backend if not running
Write-Host "[2/5] Ensuring backend is running..." -ForegroundColor Cyan
$backendPort = 5000
$backendProcess = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe" -and $_.CommandLine -match "server.js" }
if (-not $backendProcess) {
    Write-Host "Backend not running. Starting backend..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; node ./src/server.js" -WindowStyle Minimized
    Start-Sleep -Seconds 5
} else {
    Write-Host "Backend already running." -ForegroundColor Green
}

# Wait for backend to be ready
$maxTries = 10
$tries = 0
do {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$backendPort/api/branches" -Method Get -TimeoutSec 2 -ErrorAction Stop
        $backendReady = $true
    } catch {
        $backendReady = $false
        Start-Sleep -Seconds 2
    }
    $tries++
} while (-not $backendReady -and $tries -lt $maxTries)

if (-not $backendReady) {
    Write-Host "Backend did not start in time. Please check backend logs." -ForegroundColor Red
    exit 1
}

Write-Host "[3/5] Checking backend branches..." -ForegroundColor Cyan
$branches = Invoke-RestMethod -Uri "http://localhost:$backendPort/api/branches" -Method Get -ErrorAction SilentlyContinue
if ($branches -and $branches.Count -gt 0) {
    Write-Host "Branches already exist in the backend database." -ForegroundColor Green
} else {
    Write-Host "No branches found. Reseeding backend database..." -ForegroundColor Yellow
    cd backend
    node ./src/db/seed.js
    cd ..
}

Write-Host "[4/5] Frontend build complete. Please deploy the 'dist' folder to Vercel." -ForegroundColor Cyan
Write-Host "[5/5] Backend is ready. If deploying backend, push to Render or your server host." -ForegroundColor Cyan

Write-Host "\nAll done! Your system is ready for production.\n" -ForegroundColor Green
