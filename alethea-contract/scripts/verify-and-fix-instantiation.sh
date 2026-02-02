#!/bin/bash

# ============================================================
# Verify and Fix Contract Instantiation
# ============================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Verify and Fix Contract Instantiation                 ║${NC}"
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

# Extract IDs
CHAIN_ID=$(grep "^CHAIN_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

if [ -z "$CHAIN_ID" ] || [ -z "$REGISTRY_APP_ID" ]; then
    echo -e "${RED}❌ Failed to extract CHAIN_ID or REGISTRY_APP_ID${NC}"
    exit 1
fi

echo -e "${YELLOW}Deployment Info:${NC}"
echo "  Chain ID: $CHAIN_ID"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo ""

# Step 1: Sync chain
echo -e "${YELLOW}[1] Syncing chain...${NC}"
SYNC_OUTPUT=$(linera sync 2>&1)
SYNC_EXIT=$?
echo "$SYNC_OUTPUT"
if [ $SYNC_EXIT -ne 0 ]; then
    echo -e "${YELLOW}⚠ Sync had errors, but continuing...${NC}"
fi
echo ""

# Step 2: Process inbox (CRITICAL for instantiation!)
echo -e "${YELLOW}[2] Processing inbox (CRITICAL for instantiation)...${NC}"
PROCESS_OUTPUT=$(linera process-inbox 2>&1)
PROCESS_EXIT=$?
echo "$PROCESS_OUTPUT"
if [ $PROCESS_EXIT -ne 0 ]; then
    echo -e "${YELLOW}⚠ Process inbox had errors, but continuing...${NC}"
    # Check if it's just a warning about no messages
    if echo "$PROCESS_OUTPUT" | grep -qi "no.*message\|empty\|nothing"; then
        echo -e "${BLUE}ℹ No messages to process (this is OK if already processed)${NC}"
    fi
fi
echo ""

# Step 3: Wait a bit for state to be saved
echo -e "${YELLOW}[3] Waiting for state to be saved...${NC}"
sleep 3
echo ""

# Step 4: Check if linera service is running
LINERA_SERVICE_URL="http://localhost:8080"
echo -e "${YELLOW}[4] Checking Linera service...${NC}"
if ! curl -s "$LINERA_SERVICE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Linera service is not running${NC}"
    echo ""
    echo "Please start linera service first:"
    echo "  linera service &"
    echo ""
    echo "Then run this script again."
    exit 1
fi
echo -e "${GREEN}✓ Linera service is running${NC}"
echo ""

# Step 5: Test GraphQL query
echo -e "${YELLOW}[5] Testing Registry contract via GraphQL...${NC}"
REGISTRY_ENDPOINT="$LINERA_SERVICE_URL/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"query": "{ parameters { minStake } }"}' \
    "$REGISTRY_ENDPOINT" 2>&1)

if echo "$RESPONSE" | grep -q "Failed to load state\|BcsError\|Eof\|unreachable"; then
    echo -e "${RED}✗ Registry contract NOT instantiated or state not saved${NC}"
    echo ""
    echo -e "${YELLOW}Possible solutions:${NC}"
    echo ""
    echo "1. Wait longer (instantiation may still be processing):"
    echo "   sleep 10"
    echo "   ./verify-and-fix-instantiation.sh"
    echo ""
    echo "2. Check if contract was actually instantiated:"
    echo "   linera wallet show | grep -A 10 '$REGISTRY_APP_ID'"
    echo ""
    echo "3. If contract was deployed but not instantiated, you may need to:"
    echo "   - Check deployment logs for instantiation errors"
    echo "   - Redeploy the contract"
    echo ""
    echo "4. If instantiation completed but state not saved:"
    echo "   - Check if 'linera process-inbox' completed successfully"
    echo "   - Try running 'linera sync' again"
    echo ""
    exit 1
elif echo "$RESPONSE" | grep -q "errors"; then
    echo -e "${YELLOW}⚠ Registry contract responded but with errors:${NC}"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
else
    echo -e "${GREEN}✓ Registry contract is instantiated and working!${NC}"
    echo "  Response: $(echo "$RESPONSE" | jq -r '.data.parameters.minStake // "OK"' 2>/dev/null || echo "OK")"
    echo ""
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Verification complete!${NC}"
echo ""
