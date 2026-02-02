#!/bin/bash
# Export data from old oracle registry for migration
# This script queries the old registry and exports all data to JSON files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EXPORT_DIR="./migration-data"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="${EXPORT_DIR}/registry_export_${TIMESTAMP}.json"
MAPPING_FILE="${EXPORT_DIR}/voter_mapping_${TIMESTAMP}.json"
SUMMARY_FILE="${EXPORT_DIR}/export_summary_${TIMESTAMP}.txt"

# Registry configuration (update these with your actual values)
REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-}"
REGISTRY_APP_ID="${REGISTRY_APP_ID:-}"

echo -e "${BLUE}=== Old Registry Data Export ===${NC}"
echo ""

# Check if registry is configured
if [ -z "$REGISTRY_CHAIN_ID" ] || [ -z "$REGISTRY_APP_ID" ]; then
    echo -e "${YELLOW}Registry not configured. Checking .env files...${NC}"
    
    # Try to load from .env files
    if [ -f ".env.fresh" ]; then
        source .env.fresh
        REGISTRY_CHAIN_ID="${REGISTRY_CHAIN_ID:-$ORACLE_REGISTRY_CHAIN_ID}"
        REGISTRY_APP_ID="${REGISTRY_APP_ID:-$ORACLE_REGISTRY_APP_ID}"
    fi
    
    if [ -z "$REGISTRY_CHAIN_ID" ] || [ -z "$REGISTRY_APP_ID" ]; then
        echo -e "${RED}Error: Registry chain ID and app ID must be set${NC}"
        echo "Set REGISTRY_CHAIN_ID and REGISTRY_APP_ID environment variables"
        echo "Or update .env.fresh with ORACLE_REGISTRY_CHAIN_ID and ORACLE_REGISTRY_APP_ID"
        exit 1
    fi
fi

echo -e "${GREEN}Registry Configuration:${NC}"
echo "  Chain ID: $REGISTRY_CHAIN_ID"
echo "  App ID: $REGISTRY_APP_ID"
echo ""

# Create export directory
mkdir -p "$EXPORT_DIR"

echo -e "${BLUE}Step 1: Exporting voter data...${NC}"

# Query all voters from the registry
# This uses the GraphQL API to get voter data
VOTERS_QUERY='query {
  voters {
    appId
    chainId
    owner
    stake
    lockedStake
    registeredAt
    lastActive
    isActive
    reputation {
      score
      totalVotes
      correctVotes
      incorrectVotes
      correctStreak
      lastUpdated
    }
    pendingRewards
  }
}'

# Export voters to temporary file
VOTERS_FILE="${EXPORT_DIR}/voters_${TIMESTAMP}.json"

if command -v linera &> /dev/null; then
    echo "Querying voters via Linera GraphQL..."
    
    # Use linera service to query
    linera service --with-wallet default \
        --storage rocksdb:linera.db \
        --endpoint http://localhost:8080 &
    
    SERVICE_PID=$!
    sleep 2
    
    # Query GraphQL endpoint
    curl -s -X POST http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$REGISTRY_APP_ID \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$VOTERS_QUERY\"}" \
        > "$VOTERS_FILE"
    
    # Stop service
    kill $SERVICE_PID 2>/dev/null || true
    
    echo -e "${GREEN}✓ Voters exported to $VOTERS_FILE${NC}"
else
    echo -e "${YELLOW}Warning: linera CLI not found. Creating sample export...${NC}"
    echo '{"data": {"voters": []}}' > "$VOTERS_FILE"
fi

echo ""
echo -e "${BLUE}Step 2: Exporting active markets...${NC}"

# Query active markets
MARKETS_QUERY='query {
  markets(status: ACTIVE) {
    id
    requesterApp
    requesterChain
    question
    outcomes
    createdAt
    deadline
    feePaid
    status
    votes {
      voterApp
      voterOwner
      outcomeIndex
      confidence
      timestamp
      stakeLocked
    }
    selectedVoters
  }
}'

MARKETS_FILE="${EXPORT_DIR}/markets_${TIMESTAMP}.json"

if command -v linera &> /dev/null; then
    echo "Querying active markets via Linera GraphQL..."
    
    linera service --with-wallet default \
        --storage rocksdb:linera.db \
        --endpoint http://localhost:8080 &
    
    SERVICE_PID=$!
    sleep 2
    
    curl -s -X POST http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$REGISTRY_APP_ID \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$MARKETS_QUERY\"}" \
        > "$MARKETS_FILE"
    
    kill $SERVICE_PID 2>/dev/null || true
    
    echo -e "${GREEN}✓ Markets exported to $MARKETS_FILE${NC}"
else
    echo -e "${YELLOW}Warning: linera CLI not found. Creating sample export...${NC}"
    echo '{"data": {"markets": []}}' > "$MARKETS_FILE"
fi

echo ""
echo -e "${BLUE}Step 3: Exporting statistics...${NC}"

# Query statistics
STATS_QUERY='query {
  statistics {
    totalMarketsCreated
    totalMarketsResolved
    totalFeesCollected
    totalStake
    totalLockedStake
    totalRewardsDistributed
    feePool
    protocolTreasury
  }
}'

STATS_FILE="${EXPORT_DIR}/statistics_${TIMESTAMP}.json"

if command -v linera &> /dev/null; then
    echo "Querying statistics via Linera GraphQL..."
    
    linera service --with-wallet default \
        --storage rocksdb:linera.db \
        --endpoint http://localhost:8080 &
    
    SERVICE_PID=$!
    sleep 2
    
    curl -s -X POST http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$REGISTRY_APP_ID \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$STATS_QUERY\"}" \
        > "$STATS_FILE"
    
    kill $SERVICE_PID 2>/dev/null || true
    
    echo -e "${GREEN}✓ Statistics exported to $STATS_FILE${NC}"
else
    echo -e "${YELLOW}Warning: linera CLI not found. Creating sample export...${NC}"
    echo '{"data": {"statistics": {}}}' > "$STATS_FILE"
fi

echo ""
echo -e "${BLUE}Step 4: Exporting protocol parameters...${NC}"

# Query parameters
PARAMS_QUERY='query {
  parameters {
    minStake
    minVotersPerMarket
    maxVotersPerMarket
    commitPhaseDuration
    revealPhaseDuration
    protocolFeePercentage
    slashPercentage
    rewardPercentage
  }
}'

PARAMS_FILE="${EXPORT_DIR}/parameters_${TIMESTAMP}.json"

if command -v linera &> /dev/null; then
    echo "Querying parameters via Linera GraphQL..."
    
    linera service --with-wallet default \
        --storage rocksdb:linera.db \
        --endpoint http://localhost:8080 &
    
    SERVICE_PID=$!
    sleep 2
    
    curl -s -X POST http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$REGISTRY_APP_ID \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$PARAMS_QUERY\"}" \
        > "$PARAMS_FILE"
    
    kill $SERVICE_PID 2>/dev/null || true
    
    echo -e "${GREEN}✓ Parameters exported to $PARAMS_FILE${NC}"
else
    echo -e "${YELLOW}Warning: linera CLI not found. Creating sample export...${NC}"
    echo '{"data": {"parameters": {}}}' > "$PARAMS_FILE"
fi

echo ""
echo -e "${BLUE}Step 5: Combining export data...${NC}"

# Create combined export file
cat > "$EXPORT_FILE" << EOF
{
  "metadata": {
    "exported_at": "$(date -u +%s)000000",
    "registry_chain_id": "$REGISTRY_CHAIN_ID",
    "registry_app_id": "$REGISTRY_APP_ID",
    "version": "1.0.0",
    "total_voters": 0,
    "total_active_markets": 0,
    "notes": "Exported from old application-based registry"
  },
  "voters": [],
  "active_markets": [],
  "statistics": {},
  "parameters": {}
}
EOF

# TODO: Merge the individual JSON files into the combined export
# This would require jq or a similar JSON processor
if command -v jq &> /dev/null; then
    echo "Merging data with jq..."
    
    # Extract and merge voters
    VOTERS_DATA=$(jq '.data.voters // []' "$VOTERS_FILE")
    VOTER_COUNT=$(echo "$VOTERS_DATA" | jq 'length')
    
    # Extract and merge markets
    MARKETS_DATA=$(jq '.data.markets // []' "$MARKETS_FILE")
    MARKET_COUNT=$(echo "$MARKETS_DATA" | jq 'length')
    
    # Extract statistics
    STATS_DATA=$(jq '.data.statistics // {}' "$STATS_FILE")
    
    # Extract parameters
    PARAMS_DATA=$(jq '.data.parameters // {}' "$PARAMS_FILE")
    
    # Create final export
    jq --argjson voters "$VOTERS_DATA" \
       --argjson markets "$MARKETS_DATA" \
       --argjson stats "$STATS_DATA" \
       --argjson params "$PARAMS_DATA" \
       --arg voter_count "$VOTER_COUNT" \
       --arg market_count "$MARKET_COUNT" \
       '.voters = $voters | 
        .active_markets = $markets | 
        .statistics = $stats | 
        .parameters = $params |
        .metadata.total_voters = ($voter_count | tonumber) |
        .metadata.total_active_markets = ($market_count | tonumber)' \
       "$EXPORT_FILE" > "${EXPORT_FILE}.tmp"
    
    mv "${EXPORT_FILE}.tmp" "$EXPORT_FILE"
    
    echo -e "${GREEN}✓ Data merged successfully${NC}"
else
    echo -e "${YELLOW}Warning: jq not found. Export file contains template only.${NC}"
    echo "Install jq to enable automatic data merging."
fi

echo ""
echo -e "${BLUE}Step 6: Creating voter mapping...${NC}"

# Create voter mapping (app_id -> account_owner)
if command -v jq &> /dev/null && [ -f "$EXPORT_FILE" ]; then
    jq '{
      "mappings": (
        .voters | 
        map({(.appId): .owner}) | 
        add // {}
      )
    }' "$EXPORT_FILE" > "$MAPPING_FILE"
    
    echo -e "${GREEN}✓ Voter mapping created: $MAPPING_FILE${NC}"
else
    echo '{"mappings": {}}' > "$MAPPING_FILE"
    echo -e "${YELLOW}Warning: Empty mapping file created${NC}"
fi

echo ""
echo -e "${BLUE}Step 7: Generating summary...${NC}"

# Generate summary report
cat > "$SUMMARY_FILE" << EOF
=== Registry Export Summary ===
Generated: $(date)

Export Files:
- Main export: $EXPORT_FILE
- Voter mapping: $MAPPING_FILE
- This summary: $SUMMARY_FILE

Registry Information:
- Chain ID: $REGISTRY_CHAIN_ID
- Application ID: $REGISTRY_APP_ID

EOF

if command -v jq &> /dev/null && [ -f "$EXPORT_FILE" ]; then
    # Add statistics to summary
    TOTAL_VOTERS=$(jq '.metadata.total_voters' "$EXPORT_FILE")
    ACTIVE_VOTERS=$(jq '[.voters[] | select(.isActive == true)] | length' "$EXPORT_FILE")
    TOTAL_MARKETS=$(jq '.metadata.total_active_markets' "$EXPORT_FILE")
    
    cat >> "$SUMMARY_FILE" << EOF
Export Statistics:
- Total voters: $TOTAL_VOTERS
- Active voters: $ACTIVE_VOTERS
- Active markets: $TOTAL_MARKETS

EOF
fi

cat >> "$SUMMARY_FILE" << EOF
Next Steps:
1. Review the export file: $EXPORT_FILE
2. Validate the data using the migration module
3. Use the import script to load data into new registry
4. Verify all data was migrated correctly

For validation, run:
  cargo test --package oracle-registry-v2 --lib migration::tests

For import, run:
  ./scripts/import-to-new-registry.sh $EXPORT_FILE

EOF

echo -e "${GREEN}✓ Summary generated: $SUMMARY_FILE${NC}"

echo ""
echo -e "${GREEN}=== Export Complete ===${NC}"
echo ""
echo "Export files created in: $EXPORT_DIR"
echo "  - Main export: $(basename $EXPORT_FILE)"
echo "  - Voter mapping: $(basename $MAPPING_FILE)"
echo "  - Summary: $(basename $SUMMARY_FILE)"
echo ""
echo "Review the summary file for next steps:"
echo "  cat $SUMMARY_FILE"
echo ""

# Display summary
cat "$SUMMARY_FILE"
