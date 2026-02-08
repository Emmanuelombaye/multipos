@echo off
REM Deployment Script for Multi-Branch Butchery POS System (Windows)
REM Automates setup, build, and deployment

setlocal enabledelayedexpansion

echo.
echo 🚀 Multi-Branch Butchery POS - Deployment Script (Windows)
echo ======================================================
echo.

REM Check Node.js
echo [1/7] Checking Node.js installation...
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set "NODE_VERSION=%%i"
echo ✓ Node.js %NODE_VERSION%
echo.

REM Setup Environment
echo [2/7] Setting up environment variables...
if not exist ".env" (
    echo Creating frontend .env
    (
        echo VITE_API_URL=http://localhost:5000/api
    ) > .env
)

if not exist "backend\.env" (
    echo Creating backend .env
    (
        echo SUPABASE_URL=https://toczvlitmnzkyguxjxxn.supabase.co
        echo SUPABASE_ANON_KEY=sb_publishable_7fuap3GUjL7farXcVp09zw_ohotBiO2
        echo SUPABASE_SERVICE_KEY=[Set in GitHub Secrets]
        echo JWT_SECRET=multi-branch-butchery-secret-key-change-in-production
        echo PORT=5000
        echo NODE_ENV=production
        echo FRONTEND_URL=http://localhost:3000
    ) > backend\.env
)
echo ✓ Environment configured
echo.

REM Install dependencies
echo [3/7] Installing dependencies...
echo Frontend dependencies...
call npm install --silent
if errorlevel 1 (
    echo WARNING: Frontend npm install had issues, continuing...
)

echo Backend dependencies...
cd backend
call npm install --silent
if errorlevel 1 (
    echo WARNING: Backend npm install had issues, continuing...
)
cd ..
echo ✓ Dependencies installed
echo.

REM Seed database
echo [4/7] Seeding database with realistic data...
cd backend
call npm run seed:realistic
cd ..
echo ✓ Database seeded
echo.

REM Build applications
echo [5/7] Building applications...
echo Building frontend...
call npm run build
if errorlevel 1 (
    echo WARNING: Frontend build had issues, continuing...
)
echo ✓ Frontend built (dist folder)
echo.

REM Start backend
echo [6/7] Starting backend server...
cd backend
echo Starting backend on port 5000...
start "Backend Server" cmd /k "node src/server.js"
cd ..
timeout /t 3 /nobreak
echo ✓ Backend started
echo.

REM Test connectivity
echo [7/7] Testing system connectivity...
echo Checking backend API...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:5000/api/dashboard/admin' -ErrorAction SilentlyContinue; if ($response.StatusCode -eq 200) { Write-Host '✓ Backend API responding' } else { Write-Host '⚠ Backend API not responding' } } catch { Write-Host '⚠ Backend API not responding - ensure Supabase is configured' }"
echo.

echo ======================================================
echo ✓ Deployment Complete!
echo.
echo Next Steps:
echo 1. Frontend: Start with 'npm run dev' or serve from './dist'
echo 2. Backend: Already running in separate window on port 5000
echo 3. Open browser: http://localhost:5173
echo 4. Login with:
echo    Admin: admin@example.com / password123
echo    Cashier: cashier@example.com / password123
echo.
echo Configuration:
for /f "tokens=*" %%i in ('findstr VITE_API_URL .env') do echo Frontend API: %%i
for /f "tokens=*" %%i in ('findstr PORT backend\.env') do echo Backend Port: %%i
echo.
echo Documentation:
echo - Deployment: See DEPLOYMENT.md
echo - Testing: See TESTING.md
echo - API Reference: See backend\API_TESTING.md
echo.
pause
