#!/bin/bash
# Restart Alethea Dashboard with Fresh Configuration

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔄 Restarting Alethea Dashboard                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Stop existing dashboard process on port 4000
echo -e "${YELLOW}🛑 Stopping existing dashboard...${NC}"
PID=$(lsof -ti:4000 2>/dev/null || echo "")
if [ -n "$PID" ]; then
    kill -9 $PID 2>/dev/null || true
    echo -e "${GREEN}✓ Stopped process on port 4000${NC}"
else
    echo -e "${GREEN}✓ No process running on port 4000${NC}"
fi

sleep 2

# Navigate to dashboard directory
cd alethea-dashboard

# Verify .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Configuration file found${NC}\n"

# Show current configuration
echo -e "${BLUE}Current Configuration:${NC}"
echo "Chain ID: $(grep NEXT_PUBLIC_CHAIN_ID .env.local | cut -d'=' -f2)"
echo "Registry: $(grep NEXT_PUBLIC_REGISTRY_ID .env.local | head -1 | cut -d'=' -f2)"
echo "Market Chain: $(grep NEXT_PUBLIC_MARKET_CHAIN_ID .env.local | cut -d'=' -f2)"
echo ""

# Start dashboard
echo -e "${YELLOW}🚀 Starting dashboard on port 4000...${NC}"
echo -e "${BLUE}Dashboard will be available at: http://localhost:4000${NC}\n"

# Run in development mode
npm run dev

