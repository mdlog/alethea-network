#!/bin/bash
# Start Linera Service and Test Contract

set -e

echo "🔧 Starting Linera Service and Testing Contract..."
echo ""

# Load IDs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_INFO="$SCRIPT_DIR/../deployment-info.txt"

if [ ! -f "$DEPLOYMENT_INFO" ]; then
    echo "❌ deployment-info.txt not found"
    exit 1
fi

CHAIN_ID=$(grep "^CHAIN_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

echo "Chain ID: $CHAIN_ID"
echo "Registry App ID: $REGISTRY_APP_ID"
echo ""

# Check if port 8080 is already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port 8080 is already in use"
    echo "   This might be linera service already running"
    echo ""
    read -p "Kill existing process and restart? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "linera service" || true
        sleep 2
    else
        echo "Using existing service..."
    fi
fi

# Start linera service
echo "[1/3] Starting linera service..."
linera service --port 8080 > /tmp/linera-service.log 2>&1 &
SERVICE_PID=$!
echo "   Service PID: $SERVICE_PID"
echo "   Log file: /tmp/linera-service.log"
echo "   Port: 8080"
echo ""

# Wait for service to start
echo "[2/3] Waiting for service to start..."
for i in {1..10}; do
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "   ✅ Service is running!"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "   ❌ Service failed to start after 10 seconds"
        echo ""
        echo "   Check logs:"
        tail -20 /tmp/linera-service.log
        echo ""
        echo "   Common issues:"
        echo "   - Port 8080 already in use"
        echo "   - Wallet database locked"
        echo "   - Missing dependencies"
        exit 1
    fi
    sleep 1
done
echo ""

# Test contract
echo "[3/3] Testing contract..."
REGISTRY_ENDPOINT="http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"

RESPONSE=$(curl -s -X POST "$REGISTRY_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}')

if echo "$RESPONSE" | grep -q "minStake"; then
    echo "   ✅ Contract is instantiated and working!"
    echo ""
    echo "   Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "   ✅ All checks passed!"
elif echo "$RESPONSE" | grep -q "Failed to load state\|BcsError\|Eof\|unreachable"; then
    echo "   ❌ Contract NOT instantiated yet"
    echo ""
    echo "   Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "   This means:"
    echo "   - Contract was deployed but instantiate() was never called"
    echo "   - Or instantiation message was never created"
    echo ""
    echo "   Solutions:"
    echo "   1. Check if contract was deployed correctly:"
    echo "      linera wallet show | grep '$REGISTRY_APP_ID'"
    echo ""
    echo "   2. Redeploy the contract:"
    echo "      cd alethea-contract/scripts"
    echo "      ./deploy-complete-system.sh"
    echo ""
    echo "   3. After redeploy, make sure to:"
    echo "      pkill -f 'linera service'"
    echo "      linera sync"
    echo "      linera process-inbox"
    echo "      ./start-service-and-test.sh"
else
    echo "   ⚠️  Unexpected response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi

echo ""
echo "Service is running in background (PID: $SERVICE_PID)"
echo "To stop: pkill -f 'linera service'"
echo "To view logs: tail -f /tmp/linera-service.log"
