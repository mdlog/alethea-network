#!/bin/bash
# Migrate active queries from old registry to new account-based registry
# This script takes an export file and imports active queries into the new registry

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPORT_FILE="${1:-}"
IMPORT_MODE="${2:-safe}" # safe, full, or dry-run
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-}"

echo -e "${BLUE}=== Migrate Active Queries to New Registry ===${NC}"
echo ""

# Check if export file is provided
if [ -z "$EXPORT_FILE" ]; then
    echo -e "${RED}Error: Export file not provided${NC}"
    echo ""
    echo "Usage: $0 <export_file> [import_mode]"
    echo ""
    echo "Arguments:"
    echo "  export_file   - Path to the registry export JSON file"
    echo "  import_mode   - Import mode: safe, full, or dry-run (default: safe)"
    echo ""
    echo "Import Modes:"
    echo "  safe     - Only import active queries with valid deadlines"
    echo "  full     - Import all queries (including expired)"
    echo "  dry-run  - Preview what would be imported without making changes"
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
echo -e "${GREEN}Import mode: $IMPORT_MODE${NC}"
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
    if [ "$IMPORT_MODE" != "dry-run" ]; then
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
TOTAL_MARKETS=$(jq '.metadata.total_active_markets // 0' "$EXPORT_FILE")
EXPORT_VERSION=$(jq -r '.metadata.version // "unknown"' "$EXPORT_FILE")

echo -e "${GREEN}✓ Export file is valid${NC}"
echo "  Version: $EXPORT_VERSION"
echo "  Active markets: $TOTAL_MARKETS"
echo ""

# Preview import
echo -e "${BLUE}Step 2: Previewing query migration...${NC}"

# Get current timestamp for deadline validation
CURRENT_TIME=$(date +%s)

# Extract active queries based on import mode
if [ "$IMPORT_MODE" = "safe" ]; then
    # Only import queries that are active and have future deadlines
    QUERIES=$(jq -c --arg now "$CURRENT_TIME" '
        .active_markets[] | 
        select(.status == "ACTIVE" or .status == "Active") |
        select((.deadline | tonumber) > ($now | tonumber))
    ' "$EXPORT_FILE" 2>/dev/null || echo "")
else
    # Import all active queries
    QUERIES=$(jq -c '
        .active_markets[] | 
        select(.status == "ACTIVE" or .status == "Active")
    ' "$EXPORT_FILE" 2>/dev/null || echo "")
fi

# Count queries to import
QUERY_COUNT=$(echo "$QUERIES" | grep -c . || echo "0")

echo "Import Preview:"
echo "  Total active queries in export: $TOTAL_MARKETS"
echo "  Queries to import: $QUERY_COUNT"

if [ "$QUERY_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No queries to import${NC}"
    exit 0
fi

echo ""

# If dry-run mode, stop here
if [ "$IMPORT_MODE" = "dry-run" ]; then
    echo -e "${YELLOW}Dry-run mode: Showing queries that would be imported${NC}"
    echo ""
    
    echo "$QUERIES" | while IFS= read -r query; do
        if [ -n "$query" ]; then
            QUERY_ID=$(echo "$query" | jq -r '.id')
            QUESTION=$(echo "$query" | jq -r '.question')
            DEADLINE=$(echo "$query" | jq -r '.deadline')
            OUTCOMES=$(echo "$query" | jq -r '.outcomes | join(", ")')
            
            echo "Query $QUERY_ID:"
            echo "  Question: $QUESTION"
            echo "  Outcomes: $OUTCOMES"
            echo "  Deadline: $DEADLINE"
            echo ""
        fi
    done
    
    echo "To perform actual import, use:"
    echo "  $0 $EXPORT_FILE safe"
    echo "  $0 $EXPORT_FILE full"
    exit 0
fi

# Import queries
echo -e "${BLUE}Step 3: Importing queries...${NC}"
echo ""

IMPORTED=0
FAILED=0
SKIPPED=0

echo "$QUERIES" | while IFS= read -r query; do
    if [ -z "$query" ]; then
        continue
    fi
    
    # Extract query data
    QUERY_ID=$(echo "$query" | jq -r '.id')
    QUESTION=$(echo "$query" | jq -r '.question // .description')
    OUTCOMES=$(echo "$query" | jq -r '.outcomes')
    DEADLINE=$(echo "$query" | jq -r '.deadline')
    FEE_PAID=$(echo "$query" | jq -r '.feePaid // .reward_amount // "0"')
    CREATOR=$(echo "$query" | jq -r '.requesterChain // .creator // "unknown"')
    
    # Convert outcomes array to GraphQL format
    OUTCOMES_ARRAY=$(echo "$OUTCOMES" | jq -r 'map("\"" + . + "\"") | join(", ")')
    
    echo "Importing query $QUERY_ID:"
    echo "  Question: $QUESTION"
    echo "  Outcomes: $OUTCOMES_ARRAY"
    echo "  Deadline: $DEADLINE"
    echo "  Reward: $FEE_PAID"
    
    # Create GraphQL mutation to create query
    MUTATION=$(cat <<GRAPHQL
mutation {
  createQuery(
    description: "$QUESTION",
    outcomes: [$OUTCOMES_ARRAY],
    strategy: Majority,
    minVotes: 3,
    rewardAmount: "$FEE_PAID",
    deadline: $DEADLINE
  )
}
GRAPHQL
)
    
    # Execute mutation via Linera service
    if linera service --with-wallet default \
        --storage rocksdb:linera.db \
        --endpoint http://localhost:8080 &
    then
        SERVICE_PID=$!
        sleep 2
        
        # Send mutation
        RESPONSE=$(curl -s -X POST \
            "http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$REGISTRY_APP_ID" \
            -H "Content-Type: application/json" \
            -d "{\"query\": \"$MUTATION\"}" 2>/dev/null)
        
        # Check response
        if echo "$RESPONSE" | jq -e '.data.createQuery' > /dev/null 2>&1; then
            NEW_QUERY_ID=$(echo "$RESPONSE" | jq -r '.data.createQuery')
            echo -e "${GREEN}✓ Query imported successfully (new ID: $NEW_QUERY_ID)${NC}"
            IMPORTED=$((IMPORTED + 1))
        else
            ERROR_MSG=$(echo "$RESPONSE" | jq -r '.errors[0].message // "Unknown error"')
            echo -e "${RED}✗ Failed to import query: $ERROR_MSG${NC}"
            FAILED=$((FAILED + 1))
        fi
        
        # Stop service
        kill $SERVICE_PID 2>/dev/null || true
        sleep 1
    else
        echo -e "${RED}✗ Failed to start Linera service${NC}"
        FAILED=$((FAILED + 1))
    fi
    
    echo ""
done

echo -e "${GREEN}=== Migration Complete ===${NC}"
echo ""
echo "Summary:"
echo "  Queries imported: $IMPORTED"
echo "  Queries failed: $FAILED"
echo "  Queries skipped: $SKIPPED"
echo "  Total processed: $((IMPORTED + FAILED + SKIPPED))"
echo ""

# Verify import
echo -e "${BLUE}Step 4: Verifying migration...${NC}"

if linera service --with-wallet default \
    --storage rocksdb:linera.db \
    --endpoint http://localhost:8080 &
then
    SERVICE_PID=$!
    sleep 2
    
    # Query active queries count
    QUERY='query { activeQueries }'
    
    RESPONSE=$(curl -s -X POST \
        "http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$REGISTRY_APP_ID" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$QUERY\"}" 2>/dev/null)
    
    if command -v jq &> /dev/null; then
        ACTIVE_COUNT=$(echo "$RESPONSE" | jq '.data.activeQueries | length' 2>/dev/null || echo "0")
        echo -e "${GREEN}✓ Registry now has $ACTIVE_COUNT active queries${NC}"
    fi
    
    kill $SERVICE_PID 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}=== Query Migration Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Verify query data in the registry"
echo "2. Migrate votes for active queries (if needed)"
echo "3. Update dashboard to display migrated queries"
echo ""
echo "To verify queries, run:"
echo "  ./scripts/monitor-account-based-registry.sh"
echo ""
