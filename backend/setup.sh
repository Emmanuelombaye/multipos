#!/bin/bash
# Quick setup script for butchery-pos backend

echo "🚀 Butchery POS Backend Setup"
echo "============================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env file with your Supabase credentials"
echo "2. Run database schema from src/db/schema.sql in Supabase SQL Editor"
echo "3. Run 'npm run dev' to start the backend"
echo "4. API will be available at http://localhost:5000"
echo ""
echo "For more info, see README.md and API_TESTING.md"
