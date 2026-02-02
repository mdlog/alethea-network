#!/bin/bash

# Script to create query via GraphQL mutation
# Mutation createQuery returns String (JSON), not an object

set -e

# Load config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../../alethea-dashboard-vite/.env.local"

if [ -f "${ENV_FILE}" ]; then
    source "${ENV_FILE}"
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
else
    echo "❌ .env.local not found"
    exit 1
fi

SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

# Query parameters
DESCRIPTION="${1:-Did Bitcoin halving occur on or before April 20, 2024?}"
OUTCOMES="${2:-Yes,No}"
STRATEGY="${3:-WeightedByStake}"
MIN_VOTES="${4:-3}"
REWARD_AMOUNT="${5:-50000000000000000000}"
DEADLINE="${6:-1713571200000000}"
DURATION_SECS="${7:-300}"

# Convert outcomes to GraphQL array format
OUTCOMES_ARRAY=$(echo "$OUTCOMES" | awk -F',' '{printf "["; for(i=1;i<=NF;i++) {printf "\"%s\"", $i; if(i<NF) printf ","} printf "]"}')

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     CREATE QUERY VIA GRAPHQL                                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Endpoint: ${ENDPOINT}"
echo "Description: ${DESCRIPTION}"
echo "Outcomes: ${OUTCOMES_ARRAY}"
echo "Strategy: ${STRATEGY}"
echo "Min Votes: ${MIN_VOTES}"
echo "Reward: ${REWARD_AMOUNT} attos"
echo "Deadline: ${DEADLINE}"
echo "Duration: ${DURATION_SECS} seconds"
echo ""

# Create GraphQL mutation (note: no selection since it returns String)
MUTATION=$(cat <<EOF
{
  "query": "mutation { createQuery(description: \"${DESCRIPTION}\", outcomes: ${OUTCOMES_ARRAY}, strategy: \"${STRATEGY}\", minVotes: ${MIN_VOTES}, rewardAmount: \"${REWARD_AMOUNT}\", deadline: \"${DEADLINE}\", durationSecs: ${DURATION_SECS}) }"
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

# Parse response
if echo "${RESPONSE}" | grep -q '"data"'; then
    RESULT=$(echo "${RESPONSE}" | jq -r '.data.createQuery' 2>/dev/null)
    if [ -n "$RESULT" ] && [ "$RESULT" != "null" ]; then
        echo "✅ Query created successfully!"
        echo ""
        echo "Response JSON:"
        echo "${RESULT}" | jq '.' 2>/dev/null || echo "${RESULT}"
        echo ""
        echo "Next steps:"
        echo "1. Sync and process: linera sync && linera process-inbox"
        echo "2. Check queries: curl -X POST ${ENDPOINT} -H 'Content-Type: application/json' -d '{\"query\": \"{ queries { id description status } }\"}'"
    else
        echo "⚠️  Check response for errors"
    fi
else
    echo "❌ Failed to create query"
    echo "Check if linera service is running: linera service"
fi
