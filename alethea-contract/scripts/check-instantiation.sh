#!/bin/bash

# ============================================================
# Check Contract Instantiation Status
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
echo -e "${BLUE}║     Check Contract Instantiation Status                    ║${NC}"
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
TOKEN_APP_ID=$(grep "^TOKEN_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

if [ -z "$CHAIN_ID" ] || [ -z "$REGISTRY_APP_ID" ]; then
    echo -e "${RED}❌ Failed to extract CHAIN_ID or REGISTRY_APP_ID from deployment-info.txt${NC}"
    exit 1
fi

echo -e "${YELLOW}Deployment Info:${NC}"
echo "  Chain ID: $CHAIN_ID"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo "  Token App ID: $TOKEN_APP_ID"
echo ""

# Check if linera service is running
LINERA_SERVICE_URL="http://localhost:8080"
echo -e "${YELLOW}[1] Checking Linera service...${NC}"
if curl -s "$LINERA_SERVICE_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Linera service is running${NC}"
else
    echo -e "${RED}✗ Linera service is not running${NC}"
    echo ""
    echo "Please start linera service first:"
    echo "  linera service &"
    exit 1
fi
echo ""

# Method 1: Check via GraphQL query
echo -e "${YELLOW}[2] Checking Registry contract instantiation via GraphQL...${NC}"
REGISTRY_ENDPOINT="$LINERA_SERVICE_URL/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"query": "{ parameters { minStake } }"}' \
    "$REGISTRY_ENDPOINT" 2>&1)

if echo "$RESPONSE" | grep -q "errors"; then
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1)
    if echo "$ERROR_MSG" | grep -q "Failed to load state\|BcsError\|Eof"; then
        echo -e "${RED}✗ Registry contract NOT instantiated yet${NC}"
        echo "  Error: $ERROR_MSG"
        echo ""
        echo "  This means the contract was deployed but instantiate() hasn't completed."
        echo "  Wait a few seconds and try again, or check deployment logs."
    else
        echo -e "${YELLOW}⚠ Registry contract may have issues${NC}"
        echo "  Response: $RESPONSE"
    fi
else
    echo -e "${GREEN}✓ Registry contract is instantiated and working${NC}"
    echo "  Response: $(echo "$RESPONSE" | jq -r '.data.parameters.minStake // "OK"' 2>/dev/null || echo "OK")"
fi
echo ""

# Method 2: Check Token contract
echo -e "${YELLOW}[3] Checking Token contract instantiation via GraphQL...${NC}"
TOKEN_ENDPOINT="$LINERA_SERVICE_URL/chains/$CHAIN_ID/applications/$TOKEN_APP_ID"

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"query": "{ balance(owner: \"0x0000000000000000000000000000000000000000000000000000000000000000\") }"}' \
    "$TOKEN_ENDPOINT" 2>&1)

if echo "$RESPONSE" | grep -q "errors"; then
    ERROR_MSG=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1)
    if echo "$ERROR_MSG" | grep -q "Failed to load state\|BcsError\|Eof"; then
        echo -e "${RED}✗ Token contract NOT instantiated yet${NC}"
        echo "  Error: $ERROR_MSG"
    else
        echo -e "${YELLOW}⚠ Token contract may have issues${NC}"
        echo "  Response: $RESPONSE"
    fi
else
    echo -e "${GREEN}✓ Token contract is instantiated and working${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Summary:${NC}"
echo ""
echo "If you see 'NOT instantiated yet' errors:"
echo "  1. Wait 5-10 seconds after deployment"
echo "  2. Run: linera sync && linera process-inbox"
echo "  3. Try this script again"
echo ""
echo "If errors persist, check deployment logs for instantiation errors."
echo ""
