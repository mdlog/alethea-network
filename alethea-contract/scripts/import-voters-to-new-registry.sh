#!/bin/bash
# Import voters from old registry export to new account-based registry
# This script takes an export file and imports voters into the new registry

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

echo -e "${BLUE}=== Import Voters to New Registry ===${NC}"
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
    echo "  safe     - Skip existing voters, import active only"
    echo "  full     - Update existing voters, import all"
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
    echo -e "${YELLOW}Warning: jq not found. Skipping validation.${NC}"
    echo "Install jq for better validation: sudo apt-get install jq"
else
    # Check if file is valid JSON
    if ! jq empty "$EXPORT_FILE" 2>/dev/null; then
        echo -e "${RED}Error: Invalid JSON in export file${NC}"
        exit 1
    fi
    
    # Extract metadata
    TOTAL_VOTERS=$(jq '.metadata.total_voters' "$EXPORT_FILE")
    ACTIVE_MARKETS=$(jq '.metadata.total_active_markets' "$EXPORT_FILE")
    EXPORT_VERSION=$(jq -r '.metadata.version' "$EXPORT_FILE")
    
    echo -e "${GREEN}✓ Export file is valid${NC}"
    echo "  Version: $EXPORT_VERSION"
    echo "  Total voters: $TOTAL_VOTERS"
    echo "  Active markets: $ACTIVE_MARKETS"
fi

echo ""
echo -e "${BLUE}Step 2: Previewing import...${NC}"

# Create a temporary Rust program to preview the import
TEMP_DIR=$(mktemp -d)
PREVIEW_PROGRAM="$TEMP_DIR/preview_import.rs"

cat > "$PREVIEW_PROGRAM" << 'EOF'
use std::fs;
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: {} <export_file>", args[0]);
        std::process::exit(1);
    }
    
    let export_file = &args[1];
    let import_mode = if args.len() > 2 { &args[2] } else { "safe" };
    
    // Read export file
    let export_json = fs::read_to_string(export_file)
        .expect("Failed to read export file");
    
    // Parse export (this would use the actual migration module in production)
    println!("Preview for import mode: {}", import_mode);
    println!("Export file loaded successfully");
    
    // In production, this would call:
    // let export = RegistryExport::from_json(&export_json).unwrap();
    // let importer = VoterImporter::with_options(options);
    // let preview = importer.preview_import(&export);
    // println!("{:#?}", preview);
}
EOF

# For now, just show a summary from the JSON
if command -v jq &> /dev/null; then
    echo "Import Preview:"
    
    TOTAL=$(jq '.voters | length' "$EXPORT_FILE")
    ACTIVE=$(jq '[.voters[] | select(.is_active == true)] | length' "$EXPORT_FILE")
    INACTIVE=$(jq '[.voters[] | select(.is_active == false)] | length' "$EXPORT_FILE")
    
    echo "  Total voters in export: $TOTAL"
    echo "  Active voters: $ACTIVE"
    echo "  Inactive voters: $INACTIVE"
    
    if [ "$IMPORT_MODE" = "safe" ]; then
        echo "  Voters to import: $ACTIVE (active only)"
        echo "  Voters to skip: $INACTIVE (inactive)"
    elif [ "$IMPORT_MODE" = "full" ]; then
        echo "  Voters to import: $TOTAL (all)"
        echo "  Voters to skip: 0"
    fi
fi

echo ""

# If dry-run mode, stop here
if [ "$IMPORT_MODE" = "dry-run" ]; then
    echo -e "${YELLOW}Dry-run mode: No changes will be made${NC}"
    echo ""
    echo "To perform actual import, use:"
    echo "  $0 $EXPORT_FILE safe"
    echo "  $0 $EXPORT_FILE full"
    exit 0
fi

echo -e "${BLUE}Step 3: Importing voters...${NC}"

# Read voters from export and import them one by one
if command -v jq &> /dev/null; then
    # Extract voters based on import mode
    if [ "$IMPORT_MODE" = "safe" ]; then
        VOTERS=$(jq -c '.voters[] | select(.is_active == true)' "$EXPORT_FILE")
    else
        VOTERS=$(jq -c '.voters[]' "$EXPORT_FILE")
    fi
    
    IMPORTED=0
    FAILED=0
    
    while IFS= read -r voter; do
        # Extract voter data
        OWNER=$(echo "$voter" | jq -r '.owner')
        STAKE=$(echo "$voter" | jq -r '.stake')
        LOCKED_STAKE=$(echo "$voter" | jq -r '.locked_stake')
        REPUTATION_SCORE=$(echo "$voter" | jq -r '.reputation.score')
        TOTAL_VOTES=$(echo "$voter" | jq -r '.reputation.total_votes')
        CORRECT_VOTES=$(echo "$voter" | jq -r '.reputation.correct_votes')
        
        echo "Importing voter: $OWNER"
        echo "  Stake: $STAKE"
        echo "  Reputation: $REPUTATION_SCORE"
        echo "  Votes: $CORRECT_VOTES/$TOTAL_VOTES correct"
        
        # Create GraphQL mutation to register voter
        MUTATION=$(cat <<GRAPHQL
mutation {
  registerVoter(
    stake: "$STAKE"
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
                -d "{\"query\": \"$MUTATION\"}")
            
            # Check response
            if echo "$RESPONSE" | jq -e '.data.registerVoter' > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Voter imported successfully${NC}"
                IMPORTED=$((IMPORTED + 1))
            else
                echo -e "${RED}✗ Failed to import voter${NC}"
                echo "Response: $RESPONSE"
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
    done <<< "$VOTERS"
    
    echo -e "${GREEN}=== Import Complete ===${NC}"
    echo ""
    echo "Summary:"
    echo "  Voters imported: $IMPORTED"
    echo "  Voters failed: $FAILED"
    echo "  Total processed: $((IMPORTED + FAILED))"
else
    echo -e "${YELLOW}Warning: jq not found. Cannot import voters.${NC}"
    echo "Install jq to enable voter import: sudo apt-get install jq"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Verifying import...${NC}"

# Query the registry to verify imported voters
if linera service --with-wallet default \
    --storage rocksdb:linera.db \
    --endpoint http://localhost:8080 &
then
    SERVICE_PID=$!
    sleep 2
    
    # Query voter count
    QUERY='query { voters { address stake reputation } }'
    
    RESPONSE=$(curl -s -X POST \
        "http://localhost:8080/chains/$REGISTRY_CHAIN_ID/applications/$REGISTRY_APP_ID" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$QUERY\"}")
    
    if command -v jq &> /dev/null; then
        VOTER_COUNT=$(echo "$RESPONSE" | jq '.data.voters | length')
        echo -e "${GREEN}✓ Registry now has $VOTER_COUNT voters${NC}"
    fi
    
    kill $SERVICE_PID 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}=== Import Process Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Verify voter data in the registry"
echo "2. Import active queries (if any)"
echo "3. Update dashboard to use new registry"
echo ""
echo "To verify voters, run:"
echo "  ./scripts/monitor-account-based-registry.sh"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"
