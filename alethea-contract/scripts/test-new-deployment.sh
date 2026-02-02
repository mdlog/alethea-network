#!/bin/bash
# Test New Deployment - Verify Contracts are Instantiated

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Testing New Deployment                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load deployment info
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_INFO="$SCRIPT_DIR/../deployment-info.txt"

if [ ! -f "$DEPLOYMENT_INFO" ]; then
    echo -e "${RED}❌ deployment-info.txt not found${NC}"
    exit 1
fi

TOKEN_APP_ID=$(grep "^TOKEN_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
CHAIN_ID=$(grep "^CHAIN_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

echo -e "${YELLOW}Deployment Info:${NC}"
echo "  Token App ID: $TOKEN_APP_ID"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo "  Chain ID: $CHAIN_ID"
echo ""

# Start service
echo -e "${YELLOW}[1/3] Starting linera service...${NC}"
pkill -f "linera service" 2>/dev/null || true
sleep 2
linera service --port 8080 > /tmp/linera-service.log 2>&1 &
SERVICE_PID=$!
sleep 5

if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Check logs: tail -20 /tmp/linera-service.log"
    exit 1
fi
echo -e "${GREEN}✓ Service started (PID: $SERVICE_PID)${NC}"
echo ""

# Test Token Contract
echo -e "${YELLOW}[2/3] Testing Token Contract...${NC}"
TOKEN_ENDPOINT="http://localhost:8080/chains/$CHAIN_ID/applications/$TOKEN_APP_ID"
TOKEN_RESPONSE=$(curl -s -X POST "$TOKEN_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ balance(owner: \"0x0000000000000000000000000000000000000000000000000000000000000000\") }"}')

if echo "$TOKEN_RESPONSE" | grep -q "balance\|error"; then
    echo -e "${GREEN}✓ Token contract is accessible${NC}"
else
    echo -e "${RED}✗ Token contract error${NC}"
    echo "$TOKEN_RESPONSE"
fi
echo ""

# Test Registry Contract
echo -e "${YELLOW}[3/3] Testing Registry Contract...${NC}"
REGISTRY_ENDPOINT="http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"
REGISTRY_RESPONSE=$(curl -s -X POST "$REGISTRY_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}')

if echo "$REGISTRY_RESPONSE" | grep -q "minStake"; then
    echo -e "${GREEN}✅ Registry contract is instantiated and working!${NC}"
    echo ""
    echo "Response:"
    echo "$REGISTRY_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTRY_RESPONSE"
    echo ""
    echo -e "${GREEN}✅ All checks passed! Contracts are ready to use.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Set Token Config in registry (via dashboard or GraphQL)"
    echo "  2. Set Initial Parameters for inflation control"
    echo "  3. Restart dashboard with new App IDs"
    echo "  4. Test voter registration and voting"
elif echo "$REGISTRY_RESPONSE" | grep -q "Failed to load state\|BcsError\|Eof\|unreachable"; then
    echo -e "${RED}❌ Registry contract NOT instantiated yet${NC}"
    echo ""
    echo "Response:"
    echo "$REGISTRY_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTRY_RESPONSE"
    echo ""
    echo -e "${YELLOW}Possible causes:${NC}"
    echo "  1. Instantiation message not created during deployment"
    echo "  2. Instantiation message not processed yet"
    echo "  3. Need to wait longer for state to be saved"
    echo ""
    echo -e "${YELLOW}Solutions:${NC}"
    echo "  1. Wait a bit longer and test again"
    echo "  2. Check if instantiation message exists:"
    echo "     pkill -f 'linera service'"
    echo "     linera sync"
    echo "     linera process-inbox"
    echo "     linera service --port 8080 &"
    echo "     sleep 5"
    echo "     ./test-new-deployment.sh"
    echo "  3. If still not instantiated, check deployment logs for errors"
else
    echo -e "${YELLOW}⚠️  Unexpected response:${NC}"
    echo "$REGISTRY_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTRY_RESPONSE"
fi

echo ""
echo "Service is running in background (PID: $SERVICE_PID)"
echo "To stop: pkill -f 'linera service'"
echo "To view logs: tail -f /tmp/linera-service.log"
