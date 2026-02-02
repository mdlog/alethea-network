#!/bin/bash
# Clean wallet dan start fresh dengan Conway testnet
# Backup wallet lama dan create fresh wallet dengan 1 chain saja

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧹 Clean Wallet & Fresh Start${NC}\n"

# Step 1: Stop service
echo -e "${YELLOW}Step 1: Stopping service...${NC}"
pkill -9 -f "linera" 2>/dev/null || echo "  No service running"
sleep 2

# Step 2: Backup old wallet
echo -e "${YELLOW}Step 2: Backing up old wallet (32 chains)...${NC}"
BACKUP_DIR="$HOME/.config/linera/backup_32chains_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$HOME/.config/linera/"* "$BACKUP_DIR/" 2>/dev/null || true
echo "  Backup: $BACKUP_DIR"

# Step 3: Remove old wallet
echo -e "${YELLOW}Step 3: Removing old wallet...${NC}"
rm -rf "$HOME/.config/linera/wallet.json"
rm -rf "$HOME/.config/linera/keystore.json"
rm -rf "$HOME/.config/linera/client.db"
rm -rf /tmp/.tmp*
echo "  Old wallet removed"

# Step 4: Create fresh wallet
echo -e "${YELLOW}Step 4: Creating fresh wallet...${NC}"
echo "  Initializing with Conway faucet..."
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Step 5: Get new chain ID
echo -e "${YELLOW}Step 5: Getting new chain ID...${NC}"
NEW_CHAIN_ID=$(linera wallet show 2>&1 | grep -E "^│ [0-9a-f]{64}" | head -1 | awk '{print $2}')
echo "  New Chain ID: $NEW_CHAIN_ID"

# Step 6: Verify only 1 chain
CHAIN_COUNT=$(linera wallet show 2>&1 | grep -E "^│ [0-9a-f]{64}" | wc -l)
echo "  Total chains: $CHAIN_COUNT (should be 1)"

if [ "$CHAIN_COUNT" -ne "1" ]; then
    echo -e "${RED}❌ Warning: More than 1 chain detected${NC}"
fi

# Step 7: Start service
echo -e "${YELLOW}Step 7: Starting service with fresh wallet...${NC}"
rm -f /tmp/linera-service.log
nohup linera service --port 8080 > /tmp/linera-service.log 2>&1 &
SERVICE_PID=$!
echo "  Service PID: $SERVICE_PID"

# Step 8: Wait for service
echo -e "${YELLOW}Step 8: Waiting for service (60 seconds)...${NC}"
MAX_WAIT=60
WAITED=0
SERVICE_READY=false

while [ $WAITED -lt $MAX_WAIT ]; do
    if ! kill -0 $SERVICE_PID 2>/dev/null; then
        echo -e "${RED}❌ Service died${NC}"
        break
    fi
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:8080" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Service ready! (HTTP $HTTP_CODE)${NC}"
        SERVICE_READY=true
        break
    fi
    
    # Check for errors
    if [ -f /tmp/linera-service.log ]; then
        if tail -5 /tmp/linera-service.log | grep -q "NetworkDescription not found\|Blobs not found"; then
            echo "  Still has errors... ($WAITED/$MAX_WAIT)"
        else
            echo "  Starting... HTTP $HTTP_CODE ($WAITED/$MAX_WAIT)"
        fi
    fi
    
    sleep 5
    WAITED=$((WAITED + 5))
done

# Step 9: Final status
echo -e "${YELLOW}Step 9: Final status...${NC}"
if [ "$SERVICE_READY" = true ]; then
    echo -e "${GREEN}✅ SUCCESS! Fresh wallet working${NC}"
    echo ""
    echo "New Wallet Info:"
    echo "  Chain ID: $NEW_CHAIN_ID"
    echo "  Total Chains: $CHAIN_COUNT"
    echo "  GraphiQL: http://localhost:8080"
    echo ""
    echo "Old Wallet Backup:"
    echo "  Location: $BACKUP_DIR"
    echo "  Chains: 32"
    echo ""
    echo -e "${BLUE}Next: Deploy contracts to fresh chain${NC}"
    echo "  bash scripts/deploy-to-conway.sh"
else
    echo -e "${RED}❌ Service still has issues${NC}"
    echo ""
    echo "Recent logs:"
    tail -10 /tmp/linera-service.log 2>/dev/null
    echo ""
    if tail -10 /tmp/linera-service.log 2>/dev/null | grep -q "NetworkDescription not found\|Blobs not found"; then
        echo -e "${YELLOW}⚠️  Still has blob/network errors${NC}"
        echo "  Conway testnet might still be down"
        echo "  Try local testnet: bash scripts/setup-local-testnet.sh"
    fi
fi

echo ""
echo -e "${BLUE}✅ Clean wallet complete!${NC}"
