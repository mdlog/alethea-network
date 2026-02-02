#!/bin/bash

# Example script to create a query for a past event
# This creates a query about Bitcoin Halving 2024 (already happened)

set -e

# Load config
if [ -f "../../alethea-dashboard-vite/.env.local" ]; then
    source ../../alethea-dashboard-vite/.env.local
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
else
    REGISTRY_APP_ID="bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae"
    CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
fi

SERVICE_URL="http://localhost:8080"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo "Creating query: Bitcoin Halving 2024"
echo "Endpoint: ${ENDPOINT}"
echo ""

# Create query using CreateQueryWithBond
# Note: This requires calling the operation via linera CLI or dashboard
# For GraphQL, we need to use mutation format

QUERY_MUTATION=$(cat <<EOF
mutation {
  createQueryWithBond(
    description: "Did Bitcoin halving occur on or before April 20, 2024?"
    outcomes: ["Yes", "No"]
    strategy: WeightedByStake
    minVotes: 3
    bondAmount: "100000000000000000000"
    serviceFee: "10000000000000000000"
    durationSecs: 300
    callbackChain: "${CHAIN_ID}"
    callbackApp: "${REGISTRY_APP_ID}"
    callbackData: []
    title: "Bitcoin Halving 2024"
    category: "Crypto"
    context: "Bitcoin halving is a scheduled event that occurs approximately every 4 years, reducing the block reward by 50%. The 2024 halving was expected around April 19-20, 2024."
    resolutionCriteria: "Resolve based on official Bitcoin blockchain data. Halving occurs at block 840,000."
    sourceUrls: "https://www.blockchain.com/explorer/blocks/btc"
  ) {
    success
    message
    data {
      queryId
    }
  }
}
EOF
)

echo "GraphQL Mutation:"
echo "$QUERY_MUTATION"
echo ""
echo "To execute, use:"
echo "curl -X POST ${ENDPOINT} \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"query\": \"$(echo "$QUERY_MUTATION" | jq -Rs .)\"}'"
