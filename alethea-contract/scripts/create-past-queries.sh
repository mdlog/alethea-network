#!/bin/bash

# Script to create queries for past real events (Crypto & Sports)
# These queries can be immediately resolved since the events already happened

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get configuration from .env.local or use defaults
if [ -f "../../alethea-dashboard-vite/.env.local" ]; then
    source ../../alethea-dashboard-vite/.env.local
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
    ADMIN_OWNER="${VITE_ADMIN_OWNER}"
else
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi

if [ -z "$REGISTRY_APP_ID" ] || [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ Missing REGISTRY_APP_ID or CHAIN_ID${NC}"
    exit 1
fi

SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
REGISTRY_ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     CREATING QUERIES FOR PAST REAL EVENTS                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Registry: ${REGISTRY_APP_ID}${NC}"
echo -e "${YELLOW}Chain: ${CHAIN_ID}${NC}"
echo ""

# Function to create query
create_query() {
    local title="$1"
    local description="$2"
    local outcomes="$3"
    local category="$4"
    local context="$5"
    local resolution_criteria="$6"
    local source_urls="$7"
    
    echo -e "${BLUE}Creating query: ${title}${NC}"
    
    # Calculate deadline (past date - 1 day ago)
    local deadline=$(date -d "1 day ago" +%s)000000000  # Convert to nanoseconds
    
    # Create query using CreateQueryWithBond operation
    # Note: This requires calling the operation, not GraphQL mutation
    # For now, we'll prepare the JSON for operation
    
    local query_json=$(cat <<EOF
{
    "CreateQueryWithBond": {
        "description": "${description}",
        "outcomes": ${outcomes},
        "strategy": "WeightedByStake",
        "min_votes": 3,
        "bond_amount": "100000000000000000000",
        "service_fee": "10000000000000000000",
        "priority_fee": null,
        "duration_secs": 300,
        "callback_chain": "${CHAIN_ID}",
        "callback_app": "${REGISTRY_APP_ID}",
        "callback_data": [],
        "title": "${title}",
        "category": "${category}",
        "context": "${context}",
        "resolution_criteria": "${resolution_criteria}",
        "source_urls": "${source_urls}",
        "tags": "${category}",
        "metadata_url": null,
        "external_id": null
    }
}
EOF
)
    
    echo -e "${GREEN}✓ Query prepared: ${title}${NC}"
    echo ""
    
    # Save to file for manual execution
    echo "$query_json" >> /tmp/past-queries.json
}

# ==================== CRYPTO QUERIES ====================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}CRYPTO QUERIES${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Query 1: Bitcoin Halving 2024
create_query \
    "Bitcoin Halving 2024" \
    "Did Bitcoin halving occur on or before April 20, 2024?" \
    '["Yes", "No"]' \
    "Crypto" \
    "Bitcoin halving is a scheduled event that occurs approximately every 4 years, reducing the block reward by 50%. The 2024 halving was expected around April 19-20, 2024, reducing rewards from 6.25 BTC to 3.125 BTC per block." \
    "Resolve based on official Bitcoin blockchain data. Halving occurs at block 840,000. Check if block 840,000 was mined on or before April 20, 2024." \
    "https://www.blockchain.com/explorer/blocks/btc, https://bitcoinblockhalf.com/"

# Query 2: Ethereum Merge
create_query \
    "Ethereum Merge Completion" \
    "Was Ethereum's Merge (transition to Proof-of-Stake) completed successfully on September 15, 2022?" \
    '["Yes", "No"]' \
    "Crypto" \
    "The Ethereum Merge was a major network upgrade that transitioned Ethereum from Proof-of-Work (PoW) to Proof-of-Stake (PoS) consensus mechanism. This was one of the most significant events in crypto history." \
    "Resolve based on official Ethereum blockchain data. Merge occurred at block 15,537,393. Verify if the merge was completed successfully on September 15, 2022." \
    "https://ethereum.org/en/upgrades/merge/, https://beaconcha.in/"

# Query 3: Bitcoin ATH 2024
create_query \
    "Bitcoin All-Time High 2024" \
    "Did Bitcoin reach a new all-time high price above $73,000 in March 2024?" \
    '["Yes", "No"]' \
    "Crypto" \
    "Bitcoin price reached new all-time highs in 2024, driven by ETF approvals and institutional adoption. The previous ATH was around $69,000 in November 2021." \
    "Resolve based on verified price data from major exchanges (Coinbase, Binance, Kraken). Check if BTC/USD price exceeded $73,000 in March 2024." \
    "https://www.coindesk.com/price/bitcoin/, https://coinmarketcap.com/currencies/bitcoin/"

# ==================== SPORTS QUERIES ====================

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}SPORTS QUERIES${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Query 4: World Cup 2022 Winner
create_query \
    "FIFA World Cup 2022 Winner" \
    "Who won the FIFA World Cup 2022?" \
    '["Argentina", "France", "Croatia", "Morocco"]' \
    "Sports" \
    "The 2022 FIFA World Cup was held in Qatar from November 20 to December 18, 2022. It was the first World Cup held in the Arab world and the second in Asia." \
    "Resolve based on official FIFA match results. The winner is determined by the final match result on December 18, 2022." \
    "https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/qatar2022, https://www.espn.com/soccer/fifa-world-cup/"

# Query 5: Super Bowl LVIII Winner
create_query \
    "Super Bowl LVIII Winner 2024" \
    "Who won Super Bowl LVIII (2024)?" \
    '["Kansas City Chiefs", "San Francisco 49ers"]' \
    "Sports" \
    "Super Bowl LVIII was played on February 11, 2024, at Allegiant Stadium in Las Vegas, Nevada. It featured the AFC champion Kansas City Chiefs and NFC champion San Francisco 49ers." \
    "Resolve based on official NFL game results. The winner is determined by the final score of Super Bowl LVIII on February 11, 2024." \
    "https://www.nfl.com/super-bowl/, https://www.espn.com/nfl/"

# Query 6: Champions League 2023 Winner
create_query \
    "UEFA Champions League 2023 Winner" \
    "Which team won the UEFA Champions League 2022-23 season?" \
    '["Manchester City", "Inter Milan", "Real Madrid", "AC Milan"]' \
    "Sports" \
    "The 2022-23 UEFA Champions League final was played on June 10, 2023, at the Atatürk Olympic Stadium in Istanbul, Turkey." \
    "Resolve based on official UEFA match results. The winner is determined by the final match result on June 10, 2023." \
    "https://www.uefa.com/uefachampionsleague/, https://www.espn.com/soccer/league/_/name/uefa.champions"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              QUERIES PREPARED                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Queries JSON saved to: /tmp/past-queries.json${NC}"
echo ""
echo -e "${BLUE}To create these queries, use one of these methods:${NC}"
echo ""
echo -e "${YELLOW}Method 1: Via Dashboard${NC}"
echo "1. Go to dashboard and use 'Create Query' feature"
echo "2. Copy the query details from above"
echo ""
echo -e "${YELLOW}Method 2: Via GraphQL Mutation${NC}"
echo "Use the CreateQueryWithBond operation with the prepared JSON"
echo ""
echo -e "${YELLOW}Method 3: Via CLI${NC}"
echo "linera project run-operation --json '$(cat /tmp/past-queries.json | head -50)'"
echo ""
