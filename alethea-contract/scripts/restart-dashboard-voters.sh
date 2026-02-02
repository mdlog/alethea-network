#!/bin/bash

# ============================================================================
# Restart Alethea Dashboard with Voter Features
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Restarting Alethea Dashboard                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Stop existing dashboard
echo -e "${YELLOW}[1] Stopping existing dashboard...${NC}"
pkill -f "next dev" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Dashboard stopped${NC}"
echo ""

# Load environment
echo -e "${YELLOW}[2] Loading environment...${NC}"
if [ -f .env.fresh ]; then
    source .env.fresh
    echo -e "${GREEN}✓ Environment loaded${NC}"
else
    echo -e "${YELLOW}⚠ .env.fresh not found, using defaults${NC}"
fi
echo ""

# Sync environment to dashboard
echo -e "${YELLOW}[3] Syncing environment to dashboard...${NC}"
cat > alethea-dashboard/.env.local << EOF
# Alethea Dashboard Environment
# Auto-generated: $(date)

# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=${CHAIN_ID}
NEXT_PUBLIC_ALETHEA_REGISTRY_ID=${ALETHEA_REGISTRY_ID}
NEXT_PUBLIC_REGISTRY_ID=${ALETHEA_REGISTRY_ID}
NEXT_PUBLIC_MARKET_CHAIN_ID=${MARKET_CHAIN_ID}
NEXT_PUBLIC_VOTER_TEMPLATE_ID=${VOTER_TEMPLATE_ID}
NEXT_PUBLIC_VOTER_1_ID=${VOTER_1_ID}
NEXT_PUBLIC_VOTER_2_ID=${VOTER_2_ID}
NEXT_PUBLIC_VOTER_3_ID=${VOTER_3_ID}

# Endpoints
NEXT_PUBLIC_REGISTRY_URL=http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}
NEXT_PUBLIC_MARKET_CHAIN_URL=http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}
NEXT_PUBLIC_VOTER_URL=http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_1_ID}
EOF

echo -e "${GREEN}✓ Environment synced${NC}"
echo ""

# Start dashboard
echo -e "${YELLOW}[4] Starting dashboard...${NC}"
cd alethea-dashboard

# Start in background
nohup npm run dev > /tmp/dashboard.log 2>&1 &
DASHBOARD_PID=$!

echo -e "${GREEN}✓ Dashboard starting (PID: ${DASHBOARD_PID})${NC}"
echo ""

# Wait for dashboard to be ready
echo -e "${YELLOW}[5] Waiting for dashboard to be ready...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:4000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Dashboard is ready!${NC}"
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

# Display info
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     Dashboard Restarted Successfully! 🎉                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Dashboard URL:${NC}"
echo "  • Main: http://localhost:4000"
echo "  • Voters: http://localhost:4000/voters"
echo "  • Analytics: http://localhost:4000/analytics"
echo ""
echo -e "${BLUE}New Features:${NC}"
echo "  ✅ Voter registration page"
echo "  ✅ Voter leaderboard"
echo "  ✅ Registration modal with step-by-step guide"
echo "  ✅ Benefits and how-it-works sections"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  • View logs: tail -f /tmp/dashboard.log"
echo "  • Stop dashboard: pkill -f 'next dev'"
echo "  • Restart: ./scripts/restart-dashboard-voters.sh"
echo ""
echo -e "${GREEN}Visit http://localhost:4000/voters to see the new voter page!${NC}"
echo ""
