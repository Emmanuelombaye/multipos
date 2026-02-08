@echo off
REM Quick setup script for butchery-pos backend (Windows)

echo.
echo 🚀 Butchery POS Backend Setup
echo =============================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo ✅ Node.js version:
node --version
echo ✅ NPM version:
npm --version
echo.

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% equ 0 (
    echo.
    echo ✅ Dependencies installed successfully!
) else (
    echo.
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update .env file with your Supabase credentials
echo 2. Run database schema from src/db/schema.sql in Supabase SQL Editor
echo 3. Run 'npm run dev' to start the backend
echo 4. API will be available at http://localhost:5000
echo.
echo For more info, see README.md and API_TESTING.md
