#!/bin/bash
# Diagnose Deployment and Instantiation Status

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Diagnose Deployment and Instantiation Status         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load deployment info
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_INFO="$SCRIPT_DIR/../deployment-info.txt"

if [ ! -f "$DEPLOYMENT_INFO" ]; then
    echo -e "${RED}❌ deployment-info.txt not found${NC}"
    echo "Please run deployment script first: ./deploy-complete-system.sh"
    exit 1
fi

CHAIN_ID=$(grep "^CHAIN_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
TOKEN_APP_ID=$(grep "^TOKEN_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

echo -e "${YELLOW}Deployment Info:${NC}"
echo "  Chain ID: $CHAIN_ID"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo "  Token App ID: $TOKEN_APP_ID"
echo ""

# Check 1: Is contract in wallet?
echo -e "${YELLOW}[1] Checking if contract is in wallet...${NC}"
WALLET_OUTPUT=$(linera wallet show 2>&1)

# Show current wallet info
echo "  Current wallet chains:"
echo "$WALLET_OUTPUT" | grep -E "^│ [a-f0-9]{64}" | head -5 | while read line; do
    CHAIN_IN_WALLET=$(echo "$line" | awk '{print $2}')
    echo "    - $CHAIN_IN_WALLET"
done
echo ""

# Check if registry app ID exists
if echo "$WALLET_OUTPUT" | grep -q "$REGISTRY_APP_ID"; then
    echo -e "${GREEN}✓ Registry contract found in wallet${NC}"
    echo "$WALLET_OUTPUT" | grep -A 5 "$REGISTRY_APP_ID" | head -10
    CONTRACT_FOUND=true
else
    echo -e "${RED}✗ Registry contract NOT found in wallet${NC}"
    echo ""
    echo "  Expected App ID: $REGISTRY_APP_ID"
    echo "  Expected Chain ID: $CHAIN_ID"
    echo ""
    
    # Check if expected chain ID is in wallet
    if echo "$WALLET_OUTPUT" | grep -q "$CHAIN_ID"; then
        echo -e "${YELLOW}⚠ Expected chain ID found in wallet, but contract not found${NC}"
        echo "  This might mean:"
        echo "  - Contract was deployed but not properly registered"
        echo "  - Contract was deployed on a different chain"
        echo "  - Need to sync wallet"
    else
        echo -e "${YELLOW}⚠ Expected chain ID NOT found in wallet${NC}"
        echo "  This might mean:"
        echo "  - Using different wallet than deployment"
        echo "  - Chain was reset or recreated"
        echo "  - Need to check deployment logs"
    fi
    
    CONTRACT_FOUND=false
fi
echo ""

# If contract not found, provide options
if [ "$CONTRACT_FOUND" = false ]; then
    echo -e "${YELLOW}Options:${NC}"
    echo ""
    echo "1. Check if contract exists on the chain (even if not in wallet):"
    echo "   linera service --port 8080 &"
    echo "   sleep 5"
    echo "   curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \\"
    echo "     -H 'Content-Type: application/json' \\"
    echo "     -d '{\"query\": \"{ parameters { minStake } }\"}'"
    echo ""
    echo "2. Redeploy the contract:"
    echo "   cd alethea-contract/scripts"
    echo "   ./deploy-complete-system.sh"
    echo ""
    echo "3. Check deployment logs:"
    echo "   Check the output from previous deployment"
    echo ""
    read -p "Continue with diagnosis? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check 2: Stop service and check inbox
echo -e "${YELLOW}[2] Checking inbox for instantiation messages...${NC}"
pkill -f "linera service" 2>/dev/null || true
sleep 2

# Sync first
echo "  Syncing chain..."
linera sync > /dev/null 2>&1 || true

# Process inbox and check output
echo "  Processing inbox..."
INBOX_OUTPUT=$(linera process-inbox 2>&1)
echo "$INBOX_OUTPUT"

if echo "$INBOX_OUTPUT" | grep -q "Processed incoming messages with [1-9]"; then
    echo -e "${GREEN}✓ Found messages in inbox and processed them${NC}"
    INSTANTIATION_PROCESSED=true
elif echo "$INBOX_OUTPUT" | grep -q "0 blocks"; then
    echo -e "${YELLOW}⚠ No messages in inbox (0 blocks)${NC}"
    INSTANTIATION_PROCESSED=false
else
    INSTANTIATION_PROCESSED=false
fi
echo ""

# Check 3: Start service and test
echo -e "${YELLOW}[3] Starting service and testing contract...${NC}"
linera service --port 8080 > /tmp/linera-service.log 2>&1 &
SERVICE_PID=$!
sleep 5

if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Check logs: tail -20 /tmp/linera-service.log"
    exit 1
fi

echo "  Service started (PID: $SERVICE_PID)"
echo "  Testing contract..."

REGISTRY_ENDPOINT="http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"
RESPONSE=$(curl -s -X POST "$REGISTRY_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}')

if echo "$RESPONSE" | grep -q "minStake"; then
    echo -e "${GREEN}✓ Contract is instantiated and working!${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo -e "${GREEN}✅ All checks passed! Contract is ready to use.${NC}"
    exit 0
elif echo "$RESPONSE" | grep -q "Failed to load state\|BcsError\|Eof\|unreachable"; then
    echo -e "${RED}✗ Contract NOT instantiated${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    
    # Diagnosis
    echo -e "${YELLOW}Diagnosis:${NC}"
    echo ""
    
    if [ "$INSTANTIATION_PROCESSED" = false ]; then
        echo "1. No instantiation messages found in inbox"
        echo "   This means instantiation message was never created during deployment"
        echo ""
        echo "2. Possible causes:"
        echo "   - Deployment script didn't create instantiation message"
        echo "   - publish-and-create failed silently"
        echo "   - Contract was deployed but instantiate() was never called"
        echo ""
        echo "3. Solution: Redeploy the contract"
        echo ""
        echo "   Steps:"
        echo "   a. Stop service: pkill -f 'linera service'"
        echo "   b. Redeploy: cd alethea-contract/scripts && ./deploy-complete-system.sh"
        echo "   c. After deployment, run:"
        echo "      pkill -f 'linera service'"
        echo "      linera sync"
        echo "      linera process-inbox"
        echo "      linera service --port 8080 &"
        echo "      sleep 5"
        echo "      ./start-service-and-test.sh"
    else
        echo "1. Instantiation messages were processed, but contract still not instantiated"
        echo "   This means instantiation failed or state wasn't saved"
        echo ""
        echo "2. Possible causes:"
        echo "   - Instantiation failed during execution"
        echo "   - State save failed"
        echo "   - Contract code has bugs"
        echo ""
        echo "3. Solution: Check deployment logs and redeploy if needed"
    fi
    
    exit 1
else
    echo -e "${YELLOW}⚠ Unexpected response:${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi
