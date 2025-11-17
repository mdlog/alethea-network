#!/bin/bash

# Restart Alethea Dashboard on Port 4000
# This script stops any existing process and starts a fresh one

set -e

echo "=========================================="
echo "Restarting Alethea Dashboard (Port 4000)"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Stop existing processes
echo -e "${BLUE}Step 1: Stopping existing processes...${NC}"
pkill -f "next dev -p 4000" 2>/dev/null || true
sleep 2

# Verify stopped
if ps aux | grep -E "next.*4000" | grep -v grep > /dev/null; then
    echo -e "${RED}Warning: Some processes still running. Force killing...${NC}"
    pkill -9 -f "next dev -p 4000" 2>/dev/null || true
    sleep 2
fi

echo -e "${GREEN}✓ All processes stopped${NC}"
echo ""

# Step 2: Check environment
echo -e "${BLUE}Step 2: Checking environment...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local found${NC}"
    echo ""
    echo "Current configuration:"
    grep "NEXT_PUBLIC_CHAIN_ID" .env.local
    grep "NEXT_PUBLIC_REGISTRY_ID" .env.local
    echo ""
else
    echo -e "${RED}✗ .env.local not found${NC}"
    exit 1
fi

# Step 3: Clean build artifacts (optional)
echo -e "${BLUE}Step 3: Cleaning build artifacts...${NC}"
rm -rf .next/cache 2>/dev/null || true
echo -e "${GREEN}✓ Cache cleaned${NC}"
echo ""

# Step 4: Start dashboard
echo -e "${BLUE}Step 4: Starting dashboard on port 4000...${NC}"
echo ""
echo -e "${YELLOW}Dashboard will be available at:${NC}"
echo -e "${GREEN}http://localhost:4000${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""
echo "=========================================="
echo ""

# Start the server
npm run dev -- -p 4000
