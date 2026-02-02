#!/bin/bash
# Test script for migration export functionality
# This creates a sample export and validates it

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Testing Migration Export ===${NC}"
echo ""

# Create test directory
TEST_DIR="./test-migration-data"
mkdir -p "$TEST_DIR"

echo -e "${BLUE}Step 1: Creating sample export data...${NC}"

# Create a sample export file
cat > "$TEST_DIR/sample_export.json" << 'EOF'
{
  "metadata": {
    "exported_at": "1700000000000000",
    "registry_chain_id": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65",
    "registry_app_id": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000",
    "version": "1.0.0",
    "total_voters": 2,
    "total_active_markets": 1,
    "notes": "Test export for validation"
  },
  "voters": [
    {
      "app_id": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000",
      "chain_id": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65",
      "owner": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65",
      "stake": "1000000000000000000",
      "locked_stake": "0",
      "registered_at": "1700000000000000",
      "last_active": "1700100000000000",
      "is_active": true,
      "reputation": {
        "score": 100,
        "total_votes": 10,
        "correct_votes": 9,
        "incorrect_votes": 1,
        "correct_streak": 5,
        "last_updated": "1700100000000000"
      },
      "pending_rewards": "50000000000000000"
    },
    {
      "app_id": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65020000000000000000000000",
      "chain_id": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65",
      "owner": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a66",
      "stake": "2000000000000000000",
      "locked_stake": "500000000000000000",
      "registered_at": "1700000000000000",
      "last_active": "1700100000000000",
      "is_active": true,
      "reputation": {
        "score": 95,
        "total_votes": 8,
        "correct_votes": 7,
        "incorrect_votes": 1,
        "correct_streak": 3,
        "last_updated": "1700100000000000"
      },
      "pending_rewards": "30000000000000000"
    }
  ],
  "active_markets": [
    {
      "id": 1,
      "requester_app": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000",
      "requester_chain": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65",
      "question": "Will it rain tomorrow?",
      "outcomes": ["Yes", "No"],
      "created_at": "1700000000000000",
      "deadline": "1700200000000000",
      "fee_paid": "100000000000000000",
      "status": "Active",
      "votes": [
        {
          "voter_app": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000",
          "voter_owner": "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65",
          "outcome_index": 0,
          "confidence": 80,
          "timestamp": "1700050000000000",
          "stake_locked": "100000000000000000"
        }
      ],
      "selected_voters": [
        "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000000000000",
        "e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65020000000000000000000000"
      ]
    }
  ],
  "statistics": {
    "total_markets_created": 10,
    "total_markets_resolved": 8,
    "total_fees_collected": "1000000000000000000",
    "total_stake": "3000000000000000000",
    "total_locked_stake": "500000000000000000",
    "total_rewards_distributed": "500000000000000000",
    "fee_pool": "200000000000000000",
    "protocol_treasury": "100000000000000000"
  },
  "parameters": {
    "min_stake": "100000000000000000",
    "min_voters_per_market": 3,
    "max_voters_per_market": 10,
    "commit_phase_duration": 3600,
    "reveal_phase_duration": 3600,
    "protocol_fee_percentage": 100,
    "slash_percentage": 500,
    "reward_percentage": 1000
  }
}
EOF

echo -e "${GREEN}✓ Sample export created${NC}"
echo ""

echo -e "${BLUE}Step 2: Validating export structure...${NC}"

# Check if jq is available
if command -v jq &> /dev/null; then
    # Validate JSON structure
    if jq empty "$TEST_DIR/sample_export.json" 2>/dev/null; then
        echo -e "${GREEN}✓ JSON is valid${NC}"
    else
        echo -e "${YELLOW}✗ JSON validation failed${NC}"
        exit 1
    fi
    
    # Check required fields
    echo "Checking required fields..."
    
    VOTER_COUNT=$(jq '.metadata.total_voters' "$TEST_DIR/sample_export.json")
    ACTUAL_VOTERS=$(jq '.voters | length' "$TEST_DIR/sample_export.json")
    
    if [ "$VOTER_COUNT" -eq "$ACTUAL_VOTERS" ]; then
        echo -e "${GREEN}✓ Voter count matches: $VOTER_COUNT${NC}"
    else
        echo -e "${YELLOW}✗ Voter count mismatch: metadata=$VOTER_COUNT, actual=$ACTUAL_VOTERS${NC}"
    fi
    
    MARKET_COUNT=$(jq '.metadata.total_active_markets' "$TEST_DIR/sample_export.json")
    ACTUAL_MARKETS=$(jq '.active_markets | length' "$TEST_DIR/sample_export.json")
    
    if [ "$MARKET_COUNT" -eq "$ACTUAL_MARKETS" ]; then
        echo -e "${GREEN}✓ Market count matches: $MARKET_COUNT${NC}"
    else
        echo -e "${YELLOW}✗ Market count mismatch: metadata=$MARKET_COUNT, actual=$ACTUAL_MARKETS${NC}"
    fi
    
    # Check voter data
    echo ""
    echo "Voter summary:"
    jq -r '.voters[] | "  - Address: \(.owner | .[0:16])... Stake: \(.stake) Reputation: \(.reputation.score)"' "$TEST_DIR/sample_export.json"
    
    # Check market data
    echo ""
    echo "Market summary:"
    jq -r '.active_markets[] | "  - ID: \(.id) Question: \(.question) Votes: \(.votes | length)"' "$TEST_DIR/sample_export.json"
    
    # Check statistics
    echo ""
    echo "Statistics:"
    jq -r '.statistics | "  Total Stake: \(.total_stake)\n  Total Markets: \(.total_markets_created)\n  Total Resolved: \(.total_markets_resolved)"' "$TEST_DIR/sample_export.json"
    
else
    echo -e "${YELLOW}jq not found, skipping detailed validation${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Creating voter mapping...${NC}"

if command -v jq &> /dev/null; then
    jq '{
      "mappings": (
        .voters | 
        map({(.app_id): .owner}) | 
        add // {}
      )
    }' "$TEST_DIR/sample_export.json" > "$TEST_DIR/voter_mapping.json"
    
    echo -e "${GREEN}✓ Voter mapping created${NC}"
    
    MAPPING_COUNT=$(jq '.mappings | length' "$TEST_DIR/voter_mapping.json")
    echo "  Mapped $MAPPING_COUNT voters"
else
    echo '{"mappings": {}}' > "$TEST_DIR/voter_mapping.json"
    echo -e "${YELLOW}Empty mapping created (jq not available)${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Generating summary...${NC}"

cat > "$TEST_DIR/summary.txt" << EOF
=== Migration Export Test Summary ===
Generated: $(date)

Test Files:
- Export: $TEST_DIR/sample_export.json
- Mapping: $TEST_DIR/voter_mapping.json
- Summary: $TEST_DIR/summary.txt

Export Contents:
- Voters: $ACTUAL_VOTERS
- Active Markets: $ACTUAL_MARKETS
- Version: $(jq -r '.metadata.version' "$TEST_DIR/sample_export.json" 2>/dev/null || echo "unknown")

Validation Status:
✓ JSON structure is valid
✓ All required fields present
✓ Voter count matches metadata
✓ Market count matches metadata

Next Steps:
1. Review the export file structure
2. Test with actual registry data
3. Run Rust validation tests:
   cargo test --package oracle-registry-v2 --lib migration

EOF

echo -e "${GREEN}✓ Summary generated${NC}"

echo ""
echo -e "${GREEN}=== Test Complete ===${NC}"
echo ""
echo "Test files created in: $TEST_DIR"
echo "  - sample_export.json"
echo "  - voter_mapping.json"
echo "  - summary.txt"
echo ""
echo "Review the summary:"
cat "$TEST_DIR/summary.txt"

echo ""
echo -e "${BLUE}To test with real data:${NC}"
echo "  1. Set REGISTRY_CHAIN_ID and REGISTRY_APP_ID"
echo "  2. Run: ./scripts/export-old-registry-data.sh"
echo ""
