#!/bin/bash

# Script to update min_votes_default in Registry without redeploying
# Usage: ./update-min-votes.sh [min_votes] [registry_app_id] [chain_id]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MIN_VOTES="${1:-2}"
REGISTRY_APP_ID="${2:-f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990}"
CHAIN_ID="${3:-9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec}"
SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"

REGISTRY_URL="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Update min_votes_default in Registry${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Registry App ID: ${REGISTRY_APP_ID:0:16}..."
echo "  Chain ID: ${CHAIN_ID:0:16}..."
echo "  New min_votes_default: ${MIN_VOTES}"
echo ""

# Get current parameters first via GraphQL
echo -e "${BLUE}Step 1: Getting current parameters...${NC}"
PARAMS_QUERY='{ parameters }'

PARAMS_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg query "$PARAMS_QUERY" '{query: $query}')" 2>&1)

if echo "$PARAMS_RESPONSE" | jq -e '.errors' > /dev/null 2>&1; then
    echo -e "${RED}❌ Could not fetch current parameters${NC}"
    echo "$PARAMS_RESPONSE" | jq '.errors' 2>/dev/null || echo "$PARAMS_RESPONSE"
    exit 1
fi

CURRENT_PARAMS=$(echo "$PARAMS_RESPONSE" | jq -r '.data.parameters' 2>/dev/null || echo "")
echo -e "${GREEN}✅ Current parameters retrieved${NC}"
if [ -n "$CURRENT_PARAMS" ]; then
    echo "  $CURRENT_PARAMS"
fi
echo ""

# Parse current parameter values from the string format
# Format: ProtocolParameters { min_stake: Amount(...), min_votes_default: 3, ... }
CURRENT_MIN_STAKE=$(echo "$CURRENT_PARAMS" | grep -oP 'min_stake: Amount\(\K[0-9]+' || echo "100000000000000000000")
CURRENT_DURATION=$(echo "$CURRENT_PARAMS" | grep -oP 'default_query_duration: \K[0-9]+' || echo "300")
CURRENT_REWARD_PCT=$(echo "$CURRENT_PARAMS" | grep -oP 'reward_percentage: \K[0-9]+' || echo "1000")
CURRENT_SLASH_PCT=$(echo "$CURRENT_PARAMS" | grep -oP 'slash_percentage: \K[0-9]+' || echo "500")
CURRENT_FEE=$(echo "$CURRENT_PARAMS" | grep -oP 'protocol_fee: \K[0-9]+' || echo "100")
CURRENT_TOTAL_SUPPLY=$(echo "$CURRENT_PARAMS" | grep -oP 'total_supply: Amount\(\K[0-9]+' || echo "1000000000000000000000000000")
CURRENT_EXPECTED_QUERIES=$(echo "$CURRENT_PARAMS" | grep -oP 'expected_queries_per_year: \K[0-9]+' || echo "10000")
CURRENT_QUERIES_YEAR=$(echo "$CURRENT_PARAMS" | grep -oP 'queries_this_year: \K[0-9]+' || echo "0")
CURRENT_MIN_SERVICE_FEE=$(echo "$CURRENT_PARAMS" | grep -oP 'min_service_fee: Amount\(\K[0-9]+' || echo "10000000000000000000")

# Extract protocol_launch_timestamp (may be None)
CURRENT_LAUNCH_TS=$(echo "$CURRENT_PARAMS" | grep -oP 'protocol_launch_timestamp: \K[0-9]+' || echo "0")
if echo "$CURRENT_PARAMS" | grep -q "protocol_launch_timestamp: None"; then
    CURRENT_LAUNCH_TS="0"
fi

# Extract last_reset_year (may be None)
CURRENT_RESET_YEAR=$(echo "$CURRENT_PARAMS" | grep -oP 'last_reset_year: \K[0-9]+' || echo "2025")
if echo "$CURRENT_PARAMS" | grep -q "last_reset_year: None"; then
    CURRENT_RESET_YEAR="2025"
fi

echo -e "${BLUE}Step 2: Updating min_votes_default to ${MIN_VOTES}...${NC}"
echo "  Using current parameter values and only changing min_votes_default"
echo ""

# Create UpdateParameters operation using CURRENT values
UPDATE_OP=$(cat <<EOF
{
  "UpdateParameters": {
    "params": {
      "min_stake": "${CURRENT_MIN_STAKE}",
      "min_votes_default": ${MIN_VOTES},
      "default_query_duration": ${CURRENT_DURATION},
      "reward_percentage": ${CURRENT_REWARD_PCT},
      "slash_percentage": ${CURRENT_SLASH_PCT},
      "protocol_fee": ${CURRENT_FEE},
      "protocol_launch_timestamp": ${CURRENT_LAUNCH_TS},
      "total_supply": "${CURRENT_TOTAL_SUPPLY}",
      "expected_queries_per_year": ${CURRENT_EXPECTED_QUERIES},
      "queries_this_year": ${CURRENT_QUERIES_YEAR},
      "last_reset_year": ${CURRENT_RESET_YEAR},
      "min_service_fee": "${CURRENT_MIN_SERVICE_FEE}"
    }
  }
}
EOF
)

echo "Operation (using current parameter values):"
echo "$UPDATE_OP" | jq '.' 2>/dev/null || echo "$UPDATE_OP"
echo ""
echo -e "${BLUE}Parameter changes:${NC}"
echo "  min_votes_default: 3 → ${MIN_VOTES}"
echo "  (all other parameters remain unchanged)"
echo ""

# Execute update via linera CLI
echo -e "${BLUE}Step 3: Executing update operation...${NC}"
echo -e "${YELLOW}Note: This requires admin privileges (must be called from admin chain)${NC}"
echo ""

# Save operation to temp file for better handling
TEMP_OP_FILE=$(mktemp)
echo "$UPDATE_OP" > "$TEMP_OP_FILE"

# Execute update with timeout
echo "Running: linera project run-operation --application-id $REGISTRY_APP_ID --operation ..."
echo ""

# Use timeout to prevent hanging (30 seconds)
RESULT=$(timeout 30 linera project run-operation \
    --application-id "$REGISTRY_APP_ID" \
    --operation "$(cat "$TEMP_OP_FILE")" 2>&1)
EXIT_CODE=$?

# Clean up temp file
rm -f "$TEMP_OP_FILE"

# Check result
echo "Command exit code: $EXIT_CODE"
echo "Command output:"
echo "$RESULT"
echo ""

# Check if command timed out
if [ $EXIT_CODE -eq 124 ]; then
    echo -e "${RED}❌ Command timed out after 30 seconds${NC}"
    echo -e "${YELLOW}This may mean:${NC}"
    echo "  1. Operation is still processing (check linera service logs)"
    echo "  2. Network/connection issue"
    echo "  3. Operation requires manual confirmation"
    exit 1
fi

# Check if command failed
if [ $EXIT_CODE -ne 0 ]; then
    echo -e "${RED}❌ Command failed with exit code $EXIT_CODE${NC}"
    if echo "$RESULT" | grep -qiE "unauthorized|permission|admin"; then
        echo -e "${YELLOW}Error: Operation requires admin privileges${NC}"
        echo "  Make sure you're calling from the admin chain"
        echo "  Admin chain is the chain used when deploying Registry"
    fi
    exit 1
fi

# Check for success indicators
if echo "$RESULT" | grep -qiE "success|successfully|Protocol parameters updated|OperationResponse.*success"; then
    echo -e "${GREEN}✅ min_votes_default updated successfully to ${MIN_VOTES}${NC}"
    
    # Verify update via GraphQL
    echo ""
    echo -e "${BLUE}Step 4: Verifying update...${NC}"
    sleep 2
    VERIFY_RESPONSE=$(curl -s -X POST "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "$(jq -n --arg query "$PARAMS_QUERY" '{query: $query}')" 2>&1)
    
    if echo "$VERIFY_RESPONSE" | jq -e '.data.parameters' > /dev/null 2>&1; then
        NEW_PARAMS=$(echo "$VERIFY_RESPONSE" | jq -r '.data.parameters' 2>/dev/null)
        if echo "$NEW_PARAMS" | grep -q "min_votes_default.*${MIN_VOTES}"; then
            echo -e "${GREEN}✅ Verification successful: min_votes_default is now ${MIN_VOTES}${NC}"
        else
            echo -e "${YELLOW}⚠️  Update may have succeeded but verification unclear${NC}"
            echo "  Parameters: $NEW_PARAMS"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not verify update (may need to wait a few seconds)${NC}"
    fi
else
    echo -e "${RED}❌ Failed to update parameters${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Ensure you're calling from the admin chain"
    echo "  2. Check if Registry is paused (use UnpauseProtocol if needed)"
    echo "  3. Verify Registry App ID and Chain ID are correct"
    echo "  4. Check linera service logs for detailed error messages"
    exit 1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Parameter update complete${NC}"
echo ""
echo -e "${BLUE}Note:${NC} If you have different parameter values in your Registry,"
echo "      you may need to adjust the script with your actual values."
echo ""
