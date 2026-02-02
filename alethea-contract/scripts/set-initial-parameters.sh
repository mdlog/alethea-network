#!/bin/bash

# ============================================================
# Set Initial Parameters for Oracle Registry V2
# Sets protocol_launch_timestamp and total_supply for inflation control
# ============================================================

set -e

# Colors
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
echo -e "${CYAN}║      SET INITIAL PARAMETERS FOR ORACLE REGISTRY V2            ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load deployment info
if [ ! -f "$DEPLOYMENT_INFO" ]; then
    echo -e "${RED}❌ Error: deployment-info.txt not found${NC}"
    echo "   Please run deploy-complete-system.sh first"
    exit 1
fi

# Read deployment info without sourcing (to avoid command execution)
REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
CHAIN_ID=$(grep "^CHAIN_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

if [ -z "$REGISTRY_APP_ID" ] || [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ Error: REGISTRY_APP_ID or CHAIN_ID not found in deployment-info.txt${NC}"
    exit 1
fi

echo -e "${BLUE}Registry App ID:${NC} $REGISTRY_APP_ID"
echo -e "${BLUE}Chain ID:${NC} $CHAIN_ID"
echo ""

# Check if linera service is running
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Linera service detected${NC}"
    USE_GRAPHQL=true
else
    echo -e "${YELLOW}⚠ Linera service not detected at http://localhost:8080${NC}"
    echo -e "${YELLOW}  Will use linera execute-operation instead${NC}"
    USE_GRAPHQL=false
fi

echo ""

# Get current timestamp (in microseconds since Unix epoch)
CURRENT_TIMESTAMP=$(date +%s)000000  # Convert to microseconds
TOTAL_SUPPLY="1000000000000000000000000000"  # 1B ALTH in attos (1B * 10^18)
EXPECTED_QUERIES_PER_YEAR=10000

echo -e "${BLUE}[1/3] Setting protocol launch timestamp...${NC}"

if [ "$USE_GRAPHQL" = true ]; then
    # Use GraphQL mutation
    MUTATION=$(cat <<EOF
mutation {
    setProtocolLaunchTimestamp(
        timestamp: "$CURRENT_TIMESTAMP"
    ) {
        success
        message
    }
}
EOF
)
    
    RESPONSE=$(curl -s -X POST http://localhost:8080 \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$(echo "$MUTATION" | tr '\n' ' ' | sed 's/"/\\"/g')\"}")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Protocol launch timestamp set successfully${NC}"
    else
        echo -e "${RED}❌ Failed to set protocol launch timestamp${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
else
    # Use linera execute-operation
    echo -e "${YELLOW}Using linera execute-operation...${NC}"
    
    OPERATION_JSON=$(cat <<EOF
{
    "SetProtocolLaunchTimestamp": {
        "timestamp": $CURRENT_TIMESTAMP
    }
}
EOF
)
    
    linera service query-block "$CHAIN_ID" > /dev/null 2>&1 || {
        echo -e "${YELLOW}⚠ Chain not synced, syncing now...${NC}"
        linera service sync-block "$CHAIN_ID" || true
    }
    
    linera service execute-operation \
        --application-id "$REGISTRY_APP_ID" \
        --operation "$OPERATION_JSON" \
        --chain-id "$CHAIN_ID" || {
        echo -e "${RED}❌ Failed to set protocol launch timestamp${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Protocol launch timestamp set successfully${NC}"
fi

echo ""

echo -e "${BLUE}[2/3] Updating inflation control parameters...${NC}"

if [ "$USE_GRAPHQL" = true ]; then
    # Use GraphQL mutation
    MUTATION=$(cat <<EOF
mutation {
    updateInflationControl(
        totalSupply: "$TOTAL_SUPPLY"
        expectedQueriesPerYear: $EXPECTED_QUERIES_PER_YEAR
    ) {
        success
        message
    }
}
EOF
)
    
    RESPONSE=$(curl -s -X POST http://localhost:8080 \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$(echo "$MUTATION" | tr '\n' ' ' | sed 's/"/\\"/g')\"}")
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ Inflation control parameters updated successfully${NC}"
    else
        echo -e "${RED}❌ Failed to update inflation control parameters${NC}"
        echo "Response: $RESPONSE"
        exit 1
    fi
else
    # Use linera execute-operation
    echo -e "${YELLOW}Using linera execute-operation...${NC}"
    
    OPERATION_JSON=$(cat <<EOF
{
    "UpdateInflationControl": {
        "total_supply": "$TOTAL_SUPPLY",
        "expected_queries_per_year": $EXPECTED_QUERIES_PER_YEAR
    }
}
EOF
)
    
    linera service execute-operation \
        --application-id "$REGISTRY_APP_ID" \
        --operation "$OPERATION_JSON" \
        --chain-id "$CHAIN_ID" || {
        echo -e "${RED}❌ Failed to update inflation control parameters${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Inflation control parameters updated successfully${NC}"
fi

echo ""

echo -e "${BLUE}[3/3] Verifying parameters...${NC}"

if [ "$USE_GRAPHQL" = true ]; then
    QUERY='{ parameters }'
    RESPONSE=$(curl -s -X POST http://localhost:8080 \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$QUERY\"}")
    
    echo -e "${GREEN}✓ Parameters verified${NC}"
    echo ""
    echo -e "${CYAN}Current Parameters:${NC}"
    echo "$RESPONSE" | jq -r '.data.parameters' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${YELLOW}⚠ GraphQL not available for verification${NC}"
    echo -e "${YELLOW}  Parameters should be set. Check via dashboard or GraphQL when service is running.${NC}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              PARAMETERS SET SUCCESSFULLY!                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Summary:${NC}"
echo "  • Protocol Launch Timestamp: $(date -d @$((CURRENT_TIMESTAMP / 1000000)) 2>/dev/null || echo "$CURRENT_TIMESTAMP")"
echo "  • Total Supply: 1,000,000,000 ALTH"
echo "  • Expected Queries Per Year: $EXPECTED_QUERIES_PER_YEAR"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Test query creation with bond + service fee"
echo "  2. Verify service fee is collected to protocol treasury"
echo "  3. Test query resolution and verify rate-based reward calculation"
echo ""
