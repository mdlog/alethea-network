#!/bin/bash

# ============================================================
# Manual Parameter Setting via Dashboard/CLI Instructions
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOYMENT_INFO="$PROJECT_DIR/deployment-info.txt"

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║      MANUAL PARAMETER SETTING INSTRUCTIONS                   ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Read deployment info
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
CHAIN_ID=$(grep "^CHAIN_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
TOKEN_APP_ID=$(grep "^TOKEN_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

if [ -z "$REGISTRY_APP_ID" ] || [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ Error: REGISTRY_APP_ID or CHAIN_ID not found${NC}"
    exit 1
fi

CURRENT_TIMESTAMP=$(date +%s)000000
TOTAL_SUPPLY="1000000000000000000000000000"  # 1B ALTH in attos
EXPECTED_QUERIES=10000

echo -e "${BLUE}Registry App ID:${NC} $REGISTRY_APP_ID"
echo -e "${BLUE}Chain ID:${NC} $CHAIN_ID"
echo -e "${BLUE}Token App ID:${NC} $TOKEN_APP_ID"
echo ""

echo -e "${YELLOW}⚠️  GraphQL mutations for admin operations may not be available${NC}"
echo -e "${YELLOW}   Please use one of these methods:${NC}"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}METHOD 1: Via Dashboard (Recommended)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Open dashboard: http://localhost:5173"
echo "2. Go to Admin section"
echo "3. Set Token Config:"
echo "   - Token App ID: $TOKEN_APP_ID"
echo "   - Token Chain ID: $CHAIN_ID"
echo ""
echo "4. Set Protocol Launch Timestamp:"
echo "   - Timestamp: $CURRENT_TIMESTAMP"
echo ""
echo "5. Update Inflation Control:"
echo "   - Total Supply: $TOTAL_SUPPLY (1B ALTH)"
echo "   - Expected Queries Per Year: $EXPECTED_QUERIES"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}METHOD 2: Via linera request-application${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo "# 1. Set Protocol Launch Timestamp"
echo "linera request-application $REGISTRY_APP_ID \\"
echo "  --operation '{\"SetProtocolLaunchTimestamp\": {\"timestamp\": $CURRENT_TIMESTAMP}}' \\"
echo "  --with-chain-id $CHAIN_ID"
echo ""

echo "# 2. Update Inflation Control"
echo "linera request-application $REGISTRY_APP_ID \\"
echo "  --operation '{\"UpdateInflationControl\": {\"total_supply\": \"$TOTAL_SUPPLY\", \"expected_queries_per_year\": $EXPECTED_QUERIES}}' \\"
echo "  --with-chain-id $CHAIN_ID"
echo ""

echo "# 3. Set Token Config (if not already set)"
echo "linera request-application $REGISTRY_APP_ID \\"
echo "  --operation '{\"SetTokenConfig\": {\"token_app_id\": {\"chain_id\": \"$CHAIN_ID\", \"bytes\": \"$TOKEN_APP_ID\"}, \"token_chain_id\": \"$CHAIN_ID\"}}' \\"
echo "  --with-chain-id $CHAIN_ID"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}METHOD 3: Via GraphQL (if mutations available)${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

GRAPHQL_URL="http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"

echo "# Check available mutations:"
echo "curl -X POST $GRAPHQL_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"query\": \"{ __schema { mutationType { fields { name } } } }\"}'"
echo ""

echo "# Try setting parameters (if mutations exist):"
echo "curl -X POST $GRAPHQL_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"query\": \"mutation { setProtocolLaunchTimestamp(timestamp: $CURRENT_TIMESTAMP) { success message } }\"}'"
echo ""

echo -e "${GREEN}After setting parameters, verify:${NC}"
echo "curl -X POST $GRAPHQL_URL \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"query\": \"{ parameters }\"}'"
echo ""

echo -e "${YELLOW}Note:${NC} Admin operations require admin chain ID. Make sure you're using the correct chain."
echo ""
