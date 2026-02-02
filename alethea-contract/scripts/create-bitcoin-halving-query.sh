#!/bin/bash

# Create a query about Bitcoin Halving 2024 (already happened)
# This is a real event that can be immediately resolved

set -e

# Load config
if [ -f "../../alethea-dashboard-vite/.env.local" ]; then
    source ../../alethea-dashboard-vite/.env.local
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
else
    echo "❌ .env.local not found"
    exit 1
fi

SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     CREATE BITCOIN HALVING 2024 QUERY                      ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Registry: ${REGISTRY_APP_ID}"
echo "Chain: ${CHAIN_ID}"
echo "Endpoint: ${ENDPOINT}"
echo ""

# Calculate deadline (April 20, 2024 in microseconds)
# April 20, 2024 00:00:00 UTC = 1713571200 seconds = 1713571200000000 microseconds
DEADLINE="1713571200000000"

# Reward amount: 50 ALTH = 50000000000000000000 attos
REWARD_AMOUNT="50000000000000000000"

echo "Creating query..."
echo "Description: Did Bitcoin halving occur on or before April 20, 2024?"
echo "Outcomes: [Yes, No]"
echo "Deadline: ${DEADLINE} (April 20, 2024)"
echo "Reward: ${REWARD_AMOUNT} attos (50 ALTH)"
echo ""

# Create query via GraphQL mutation
MUTATION=$(cat <<EOF
{
  "query": "mutation { createQuery(description: \"Did Bitcoin halving occur on or before April 20, 2024? (Halving reduces block reward from 6.25 BTC to 3.125 BTC at block 840,000)\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"${REWARD_AMOUNT}\", deadline: \"${DEADLINE}\", durationSecs: 300) { success message } }"
}
EOF
)

echo "Sending mutation..."
echo ""

RESPONSE=$(curl -s -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${MUTATION}")

echo "Response:"
echo "${RESPONSE}" | jq '.' 2>/dev/null || echo "${RESPONSE}"
echo ""

if echo "${RESPONSE}" | grep -q '"success":true'; then
    echo "✅ Query created successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Check query: curl -X POST ${ENDPOINT} -H 'Content-Type: application/json' -d '{\"query\": \"{ queries { id description status } }\"}'"
    echo "2. Vote on the query using dashboard or GraphQL"
    echo "3. Resolve query after voting period"
else
    echo "❌ Failed to create query"
    echo "Check if linera service is running: linera service"
fi
