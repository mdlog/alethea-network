#!/bin/bash

# Restart Dashboard with New Chain ID and APP ID
# Date: November 17, 2025

echo "=========================================="
echo "Restart Dashboard with New IDs"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Check .env.local
echo "Step 1: Checking .env.local..."
if [ ! -f .env.local ]; then
    echo -e "${RED}✗${NC} .env.local not found!"
    echo "Creating from parent .env.fresh..."
    
    if [ -f ../.env.fresh ]; then
        source ../.env.fresh
        cat > .env.local << EOF
# Frontend Configuration
NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID
NEXT_PUBLIC_APP_ID=$APP_ID
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
EOF
        echo -e "${GREEN}✓${NC} .env.local created"
    else
        echo -e "${RED}✗${NC} ../.env.fresh not found!"
        exit 1
    fi
fi

# Display current config
echo ""
echo "Current Configuration:"
source .env.local 2>/dev/null || true
echo "  CHAIN_ID: ${NEXT_PUBLIC_CHAIN_ID:-Not set}"
echo "  APP_ID: ${NEXT_PUBLIC_APP_ID:-Not set}"
echo "  GraphQL: ${NEXT_PUBLIC_GRAPHQL_URL:-Not set}"
echo "  Backend: ${NEXT_PUBLIC_BACKEND_URL:-Not set}"

# Step 2: Clear build cache
echo ""
echo "Step 2: Clearing build cache..."
if [ -d .next ]; then
    rm -rf .next
    echo -e "${GREEN}✓${NC} Build cache cleared"
else
    echo -e "${YELLOW}⚠${NC} No build cache found"
fi

# Step 3: Check dependencies
echo ""
echo "Step 3: Checking dependencies..."
if [ -d node_modules ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Installing dependencies..."
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
fi

# Step 4: Start dashboard
echo ""
echo "Step 4: Starting dashboard..."
echo ""
echo "Dashboard will start on http://localhost:3000"
echo "Press Ctrl+C to stop"
echo ""

npm run dev
