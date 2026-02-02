#!/bin/bash
# Quick Fix for Contract Instantiation
# Run this after deployment to ensure contract is instantiated

set -e

echo "🔧 Quick Fix: Ensuring contract instantiation..."
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

# Check if linera service is running
LINERA_SERVICE_RUNNING=false
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    LINERA_SERVICE_RUNNING=true
    echo "⚠️  Linera service is running (this locks the wallet database)"
    echo ""
    echo "We need to temporarily stop it to process inbox..."
    echo ""
    read -p "Stop linera service now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping linera service..."
        pkill -f "linera service" || true
        sleep 2
        echo "✅ Linera service stopped"
    else
        echo "⚠️  Cannot proceed - linera service must be stopped to process inbox"
        echo ""
        echo "Please run manually:"
        echo "  1. Stop linera service: pkill -f 'linera service'"
        echo "  2. Run: linera sync && linera process-inbox"
        echo "  3. Start linera service again: linera service &"
        exit 1
    fi
fi

# Step 1: Sync
echo ""
echo "[1/4] Syncing chain..."
if linera sync 2>&1; then
    echo "✅ Sync successful"
else
    echo "⚠️  Sync had errors (may be OK if already synced)"
fi
echo ""

# Step 2: Process inbox
echo "[2/4] Processing inbox (CRITICAL for instantiation)..."
if linera process-inbox 2>&1; then
    echo "✅ Inbox processed successfully"
else
    echo "⚠️  Process inbox had errors"
    # Check if it's just "no messages" which is OK
    if linera process-inbox 2>&1 | grep -qi "no.*message\|empty\|nothing"; then
        echo "ℹ️  No messages to process (this is OK if already processed)"
    fi
fi
echo ""

# Step 3: Wait
echo "[3/4] Waiting for state to save..."
sleep 5
echo ""

# Step 4: Restart linera service if it was running
if [ "$LINERA_SERVICE_RUNNING" = true ]; then
    echo "[4/5] Restarting linera service..."
    linera service --port 8080 > /tmp/linera-service.log 2>&1 &
    SERVICE_PID=$!
    sleep 5
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
        echo "✅ Linera service restarted (PID: $SERVICE_PID)"
    else
        echo "⚠️  Linera service may not have started"
        echo "   Check logs: tail -20 /tmp/linera-service.log"
        echo "   Or start manually: linera service --port 8080"
    fi
    echo ""
fi

# Step 5: Test
echo "[5/5] Testing contract..."
if curl -s -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}' 2>&1 | grep -q "minStake"; then
    echo "✅ Contract is instantiated and working!"
    echo ""
    echo "You can now use the contract via GraphQL at:"
    echo "  http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"
else
    echo "❌ Contract still not instantiated"
    echo ""
    echo "Possible issues:"
    echo "  1. Instantiation message not in inbox"
    echo "  2. Contract deployment failed"
    echo "  3. Need to wait longer"
    echo ""
    echo "Try:"
    echo "  1. Check deployment logs"
    echo "  2. Run: linera wallet show | grep '$REGISTRY_APP_ID'"
    echo "  3. Redeploy if needed: ./deploy-complete-system.sh"
fi
