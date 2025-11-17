#!/bin/bash

# Restart Dashboard with New Deployment (November 17, 2025)
# This script restarts the dashboard with the latest deployment IDs

set -e

echo "🔄 Restarting Alethea Dashboard with New Deployment"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CHAIN_ID="8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef"
APP_ID="9936172d5d1f3fb3ae65ea2bb51391afc561d9f8b80927c9e8e32c1efe9380d2"
GRAPHQL_URL="http://localhost:8080"
BACKEND_URL="http://localhost:3001"

echo -e "${BLUE}📋 Deployment Information:${NC}"
echo "  Chain ID: $CHAIN_ID"
echo "  App ID:   $APP_ID"
echo "  GraphQL:  $GRAPHQL_URL"
echo "  Backend:  $BACKEND_URL"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found, creating...${NC}"
    cat > .env.local << EOF
# Frontend Configuration
NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID
NEXT_PUBLIC_APP_ID=$APP_ID
NEXT_PUBLIC_GRAPHQL_URL=$GRAPHQL_URL
NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL
EOF
    echo -e "${GREEN}✓ Created .env.local${NC}"
else
    echo -e "${GREEN}✓ .env.local exists${NC}"
fi

# Verify configuration
echo ""
echo -e "${BLUE}🔍 Verifying Configuration:${NC}"

if grep -q "$CHAIN_ID" .env.local; then
    echo -e "${GREEN}✓ Chain ID matches${NC}"
else
    echo -e "${YELLOW}⚠️  Chain ID mismatch in .env.local${NC}"
fi

if grep -q "$APP_ID" .env.local; then
    echo -e "${GREEN}✓ App ID matches${NC}"
else
    echo -e "${YELLOW}⚠️  App ID mismatch in .env.local${NC}"
fi

# Check if GraphQL endpoint is accessible
echo ""
echo -e "${BLUE}🔗 Testing GraphQL Endpoint:${NC}"
GRAPHQL_ENDPOINT="$GRAPHQL_URL/chains/$CHAIN_ID/applications/$APP_ID"

if curl -s -X POST "$GRAPHQL_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"query": "{ voterCount }"}' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ GraphQL endpoint accessible${NC}"
else
    echo -e "${YELLOW}⚠️  GraphQL endpoint not accessible (service may not be running)${NC}"
fi

# Kill existing Next.js processes
echo ""
echo -e "${BLUE}🛑 Stopping existing processes:${NC}"
pkill -f "next dev" || echo "  No existing Next.js process found"
pkill -f "node.*next" || true
sleep 2

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo -e "${BLUE}📦 Installing dependencies:${NC}"
    npm install
fi

# Start dashboard
echo ""
echo -e "${BLUE}🚀 Starting Dashboard:${NC}"
echo ""

# Try port 3000 first, then 4000
PORT=3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port 3000 is busy, trying 4000...${NC}"
    PORT=4000
fi

if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $PORT is busy, killing process...${NC}"
    lsof -ti:$PORT | xargs kill -9 || true
    sleep 2
fi

# Start in background
PORT=$PORT npm run dev > dashboard.log 2>&1 &
DASHBOARD_PID=$!

echo -e "${GREEN}✓ Dashboard starting (PID: $DASHBOARD_PID)${NC}"
echo ""
echo "Waiting for dashboard to be ready..."

# Wait for dashboard to be ready
for i in {1..30}; do
    if curl -s http://localhost:$PORT > /dev/null 2>&1; then
        echo ""
        echo -e "${GREEN}✅ Dashboard is ready!${NC}"
        echo ""
        echo "=================================================="
        echo -e "${GREEN}🎉 Dashboard Started Successfully!${NC}"
        echo "=================================================="
        echo ""
        echo "📍 Access Points:"
        echo "  Dashboard: http://localhost:$PORT"
        echo "  GraphQL:   $GRAPHQL_ENDPOINT"
        echo "  Backend:   $BACKEND_URL"
        echo ""
        echo "📋 Quick Links:"
        echo "  Home:      http://localhost:$PORT"
        echo "  Voters:    http://localhost:$PORT/voters"
        echo "  Register:  http://localhost:$PORT/register"
        echo ""
        echo "📊 Logs:"
        echo "  tail -f dashboard.log"
        echo ""
        echo "🛑 To stop:"
        echo "  kill $DASHBOARD_PID"
        echo ""
        exit 0
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${YELLOW}⚠️  Dashboard did not respond within 30 seconds${NC}"
echo "Check logs: tail -f dashboard.log"
echo ""
