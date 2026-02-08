#!/bin/bash
# Deployment Script for Multi-Branch Butchery POS System
# Automates setup, build, and deployment

set -e  # Exit on error

echo "🚀 Multi-Branch Butchery POS - Deployment Script"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}[1/7] Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Setup Environment
echo -e "${BLUE}[2/7] Setting up environment variables...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating frontend .env${NC}"
    cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF
fi

if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}Creating backend .env${NC}"
    cat > backend/.env << EOF
SUPABASE_URL=https://toczvlitmnzkyguxjxxn.supabase.co
SUPABASE_ANON_KEY=sb_publishable_7fuap3GUjL7farXcVp09zw_ohotBiO2
SUPABASE_SERVICE_KEY=[Set in GitHub Secrets]
JWT_SECRET=multi-branch-butchery-secret-key-change-in-production
PORT=5000
NODE_ENV=production
FRONTEND_URL=http://localhost:3000
EOF
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Install dependencies
echo -e "${BLUE}[3/7] Installing dependencies...${NC}"
echo "Frontend dependencies..."
npm install --silent

echo "Backend dependencies..."
cd backend
npm install --silent
cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Seed database
echo -e "${BLUE}[4/7] Seeding database with realistic data...${NC}"
cd backend
npm run seed:realistic
cd ..
echo -e "${GREEN}✓ Database seeded${NC}"

# Build applications
echo -e "${BLUE}[5/7] Building applications...${NC}"
echo "Building frontend..."
npm run build > /dev/null 2>&1
echo -e "${GREEN}✓ Frontend built (./dist)${NC}"

echo -e "${BLUE}[6/7] Starting backend server...${NC}"
cd backend
# Start backend in background
node src/server.js &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
sleep 2

# Test connectivity
echo -e "${BLUE}[7/7] Testing system connectivity...${NC}"
if curl -s http://localhost:5000/api/dashboard/admin > /dev/null; then
    echo -e "${GREEN}✓ Backend API responding${NC}"
else
    echo -e "${YELLOW}⚠ Backend API not responding - ensure Supabase is configured${NC}"
fi

echo -e "${GREEN}=================================================="
echo "✓ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Frontend: Start with 'npm run dev' or serve from './dist'"
echo "2. Backend: Already running on port 5000"
echo "3. Open browser: http://localhost:5173"
echo "4. Login with:"
echo "   Admin: admin@example.com / password123"
echo "   Cashier: cashier@example.com / password123"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "Frontend API: $(grep VITE_API_URL .env)"
echo "Backend Port: $(grep PORT backend/.env)"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "- Deployment: See DEPLOYMENT.md"
echo "- Testing: See TESTING.md"
echo "- API Reference: See backend/API_TESTING.md"
