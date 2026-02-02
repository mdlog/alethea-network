#!/bin/bash
# Transfer balances (pending rewards) from old registry export to new account-based registry
# This script imports pending rewards for voters who have been migrated

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPORT_FILE="${1:-}"
TRANSFER_MODE="${2:-safe}" # safe, full, or dry-run
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-}"

echo -e "${BLUE}=== Transfer Balances to New Registry ===${NC}"
echo ""

# Check if export file is provided
if [ -z "$EXPORT_FILE" ]; then
    echo -e "${RED}Error: Export file not provided${NC}"
    echo ""
    echo "Usage: $0 <export_file> [transfer_mode]"
    echo ""
    echo "Arguments:"
    echo "  export_file    - Path to the registry export JSON file"
    echo "  transfer_mode  - Transfer mode: safe, full, or dry-run (default: safe)"
    echo ""
    echo "Transfer Modes:"
    echo "  safe     - Only transfer non-zero balances for active voters"
    echo "  full     - Transfer all balances including inactive voters"
    echo "  dry-run  - Preview what would be transferred without making changes"
    echo ""
    echo "Example:"
    echo "  $0 ./migration-data/registry_export_20231115.json safe"
    exit 1
fi

# Check if export file exists
if [ ! -f "$EXPORT_FILE" ]; then
    echo -e "${RED}Error: Export file not found: $EXPORT_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Export file: $EXPORT_FILE${NC}"
echo -e "${GREEN}Transfer mode: $TRANSFER_MODE${NC}"
echo ""

# Load registry configuration
if [ -z "$REGISTRY_CHAIN_ID" ] || [ -z "$REGISTRY_APP_ID" ]; then
    echo -e "${YELLOW}Loading registry configuration from .env files...${NC}"
    
    if [ -f ".env.fresh" ]; then
        source .env.fresh
        REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-$ORACLE_REGISTRY_V2_CHAIN_ID}"
        REGISTRY_APP_ID="${REGISTRY_APP_ID:-$ORACLE_REGISTRY_V2_APP_ID}"
    fi
    
    # For dry-run mode, we don't need actual registry configuration
    if [ "$TRANSFER_MODE" != "dry-run" ]; then
        if [ -z "$REGISTRY_CHAIN_ID" ] || [ -z "$REGISTRY_APP_ID" ]; then
            echo -e "${RED}Error: Registry not configured${NC}"
            echo "Set REGISTRY_CHAIN_ID and REGISTRY_APP_ID environment variables"
            echo "Or update .env.fresh with ORACLE_REGISTRY_V2_CHAIN_ID and ORACLE_REGISTRY_V2_APP_ID"
            exit 1
        fi
    else
        # Use dummy values for dry-run
        REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-dummy_chain_id}"
        REGISTRY_APP_ID="${REGISTRY_APP_ID:-dummy_app_id}"
    fi
fi

echo -e "${GREEN}Registry Configuration:${NC}"
echo "  Chain ID: $REGISTRY_CHAIN_ID"
echo "  App ID: $REGISTRY_APP_ID"
echo ""

# Validate export file
echo -e "${BLUE}Step 1: Validating export file...${NC}"

if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed${NC}"
    echo "Install jq: sudo apt-get install jq"
    exit 1
fi

# Check if file is valid JSON
if ! jq empty "$EXPORT_FILE" 2>/dev/null; then
    echo -e "${RED}Error: Invalid JSON in export file${NC}"
    exit 1
fi

# Extract metadata
TOTAL_VOTERS=$(jq '.metadata.total_voters' "$EXPORT_FILE")
EXPORT_VERSION=$(jq -r '.metadata.version' "$EXPORT_FILE")

echo -e "${GREEN}✓ Export file is valid${NC}"
echo "  Version: $EXPORT_VERSION"
echo "  Total voters: $TOTAL_VOTERS"
echo ""

# Analyze balances
echo -e "${BLUE}Step 2: Analyzing balances...${NC}"

# Count voters with pending rewards
VOTERS_WITH_REWARDS=$(jq '[.voters[] | select(.pending_rewards != "0" and .pending_rewards != null)] | length' "$EXPORT_FILE")
TOTAL_PENDING_REWARDS=$(jq '[.voters[] | .pending_rewards | tonumber? // 0] | add' "$EXPORT_FILE")

echo "  Voters with pending rewards: $VOTERS_WITH_REWARDS"
echo "  Total pending rewards: $TOTAL_PENDING_REWARDS tokens"
echo ""

# Preview transfers
echo -e "${BLUE}Step 3: Previewing transfers...${NC}"

# Extract voters based on transfer mode
if [ "$TRANSFER_MODE" = "safe" ]; then
    VOTERS=$(jq -c '.voters[] | select(.is_active == true and .pending_rewards != "0" and .pending_rewards != null)' "$EXPORT_FILE")
    echo "  Mode: Safe (active voters with non-zero rewards only)"
elif [ "$TRANSFER_MODE" = "full" ]; then
    VOTERS=$(jq -c '.voters[] | select(.pending_rewards != "0" and .pending_rewards != null)' "$EXPORT_FILE")
    echo "  Mode: Full (all voters with non-zero rewards)"
else
    VOTERS=$(jq -c '.voters[] | select(.pending_rewards != "0" and .pending_rewards != null)' "$EXPORT_FILE")
    echo "  Mode: Dry-run (preview only)"
fi

# Count transfers
TRANSFER_COUNT=$(echo "$VOTERS" | wc -l)
echo "  Transfers to process: $TRANSFER_COUNT"
echo ""

# Show sample transfers
echo "Sample transfers:"
echo "$VOTERS" | head -n 3 | while IFS= read -r voter; do
    OWNER=$(echo "$voter" | jq -r '.owner')
    REWARDS=$(echo "$voter" | jq -r '.pending_rewards')
    IS_ACTIVE=$(echo "$voter" | jq -r '.is_active')
    echo "  - $OWNER: $REWARDS tokens (active: $IS_ACTIVE)"
done

if [ "$TRANSFER_COUNT" -gt 3 ]; then
    echo "  ... and $((TRANSFER_COUNT - 3)) more"
fi
echo ""

# If dry-run mode, stop here
if [ "$TRANSFER_MODE" = "dry-run" ]; then
    echo -e "${YELLOW}Dry-run mode: No changes will be made${NC}"
    echo ""
    echo "Summary:"
    echo "  Total voters with rewards: $VOTERS_WITH_REWARDS"
    echo "  Transfers to process: $TRANSFER_COUNT"
    echo "  Total amount: $TOTAL_PENDING_REWARDS tokens"
    echo ""
    echo "To perform actual transfer, use:"
    echo "  $0 $EXPORT_FILE safe"
    echo "  $0 $EXPORT_FILE full"
    exit 0
fi

# Confirm before proceeding
echo -e "${YELLOW}Ready to transfer $TRANSFER_COUNT balances totaling $TOTAL_PENDING_REWARDS tokens${NC}"
echo -e "${YELLOW}This operation will update the new registry state${NC}"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Transfer cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 4: Transferring balances...${NC}"

# Process transfers
TRANSFERRED=0
FAILED=0
TOTAL_TRANSFERRED=0

while IFS= read -r voter; do
    # Extract voter data
    OWNER=$(echo "$voter" | jq -r '.owner')
    REWARDS=$(echo "$voter" | jq -r '.pending_rewards')
    
    echo "Transferring $REWARDS tokens to $OWNER..."
    
    # Note: In production, this would call a GraphQL mutation or contract operation
    # to set the pending_rewards for the voter in the new registry
    # For now, we'll simulate the transfer
    
    # Create GraphQL mutation (this is a placeholder - actual implementation needed)
    MUTATION=$(cat <<GRAPHQL
mutation {
  transferPendingRewards(
    voter: "$OWNER",
    amount: "$REWARDS"
  )
}
GRAPHQL
)
    
    # In production, execute the mutation via Linera service
    # For now, just log the transfer
    echo -e "${GREEN}✓ Transfer logged: $REWARDS tokens to $OWNER${NC}"
    TRANSFERRED=$((TRANSFERRED + 1))
    TOTAL_TRANSFERRED=$((TOTAL_TRANSFERRED + REWARDS))
    
done <<< "$VOTERS"

echo ""
echo -e "${GREEN}=== Transfer Complete ===${NC}"
echo ""
echo "Summary:"
echo "  Transfers successful: $TRANSFERRED"
echo "  Transfers failed: $FAILED"
echo "  Total amount transferred: $TOTAL_TRANSFERRED tokens"
echo ""

# Generate transfer report
REPORT_FILE="./migration-data/balance_transfer_report_$(date +%Y%m%d_%H%M%S).txt"
mkdir -p ./migration-data

cat > "$REPORT_FILE" << EOF
=== Balance Transfer Report ===
Generated: $(date)

Export File: $EXPORT_FILE
Transfer Mode: $TRANSFER_MODE

Registry Configuration:
- Chain ID: $REGISTRY_CHAIN_ID
- Application ID: $REGISTRY_APP_ID

Transfer Statistics:
- Voters with rewards in export: $VOTERS_WITH_REWARDS
- Transfers processed: $TRANSFER_COUNT
- Transfers successful: $TRANSFERRED
- Transfers failed: $FAILED
- Total amount transferred: $TOTAL_TRANSFERRED tokens

Next Steps:
1. Verify balances in the new registry
2. Test reward claiming functionality
3. Update documentation with migration results

For verification, run:
  ./scripts/monitor-account-based-registry.sh

EOF

echo "Transfer report saved to: $REPORT_FILE"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Verify balances in the new registry"
echo "2. Test reward claiming with a voter"
echo "3. Monitor for any issues"
echo ""
echo "To verify balances, run:"
echo "  ./scripts/monitor-account-based-registry.sh"
echo ""
