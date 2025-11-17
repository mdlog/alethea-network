#!/bin/bash

echo "=========================================="
echo "Testing Polling UI Implementation"
echo "=========================================="
echo ""

# Check if services are running
echo "1. Checking services..."
echo ""

# Check linera service
if curl -s http://localhost:8080 > /dev/null 2>&1; then
    echo "   ✅ Linera service running on port 8080"
else
    echo "   ❌ Linera service NOT running"
    echo "   Starting linera service..."
    cd ..
    source .env.fresh
    linera service --port 8080 > /tmp/linera-service.log 2>&1 &
    sleep 3
    cd alethea-dashboard
    echo "   ✅ Linera service started"
fi

# Check backend
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Backend running on port 3001"
else
    echo "   ❌ Backend NOT running"
    echo "   Starting backend..."
    cd ..
    source .env.fresh
    CHAIN_ID="$CHAIN_ID" \
    APP_ID="$APP_ID" \
    WALLET_PATH="$WALLET_PATH" \
    STORAGE_PATH="$STORAGE_PATH" \
    PORT="3001" \
    RUST_LOG="info" \
    cargo run --release -p oracle-api-backend > /tmp/backend.log 2>&1 &
    sleep 5
    cd alethea-dashboard
    echo "   ✅ Backend started"
fi

echo ""

# Check dashboard
echo "2. Checking dashboard..."
if [ -d "node_modules" ]; then
    echo "   ✅ Dependencies installed"
else
    echo "   ❌ Dependencies not installed"
    echo "   Installing..."
    npm install
fi

echo ""

# Start dashboard
echo "3. Starting dashboard..."
echo ""
echo "   Dashboard will start on http://localhost:3000"
echo "   Test page: http://localhost:3000/test-polling"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
