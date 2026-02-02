#!/bin/bash

# Examples of correct GraphQL mutations for creating queries
# Note: createQuery returns String (JSON), not an object, so no selection needed

# Load config
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ENV_FILE="${SCRIPT_DIR}/../../alethea-dashboard-vite/.env.local"

if [ -f "${ENV_FILE}" ]; then
    source "${ENV_FILE}"
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
else
    REGISTRY_APP_ID="bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae"
    CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
fi

SERVICE_URL="http://localhost:8080"
ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     GRAPHQL MUTATION EXAMPLES FOR CREATE QUERY                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Endpoint: ${ENDPOINT}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Example 1: Bitcoin Halving 2024"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo 'curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{'
echo '    "query": "mutation { createQuery(description: \"Did Bitcoin halving occur on or before April 20, 2024?\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1713571200000000\", durationSecs: 300) }"'
echo '  }'"'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Example 2: Ethereum Merge"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo 'curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{'
echo '    "query": "mutation { createQuery(description: \"Was Ethereum Merge completed successfully on September 15, 2022?\", outcomes: [\"Yes\", \"No\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1663200000000000\", durationSecs: 300) }"'
echo '  }'"'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Example 3: FIFA World Cup 2022"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo 'curl -X POST http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/bee143d1a76cb7e0b8985002d70aca3b6807345b111a5b1f03248c3fe156a5ae \'
echo '  -H "Content-Type: application/json" \'
echo '  -d '"'"'{'
echo '    "query": "mutation { createQuery(description: \"Who won the FIFA World Cup 2022 final on December 18, 2022?\", outcomes: [\"Argentina\", \"France\"], strategy: \"WeightedByStake\", minVotes: 3, rewardAmount: \"50000000000000000000\", deadline: \"1671321600000000\", durationSecs: 300) }"'
echo '  }'"'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "IMPORTANT NOTES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Mutation createQuery returns String (JSON), NOT an object"
echo "   ❌ WRONG: createQuery(...) { success message }"
echo "   ✅ CORRECT: createQuery(...)"
echo ""
echo "2. After creating query, sync and process:"
echo "   linera sync && linera process-inbox"
echo ""
echo "3. Check queries:"
echo "   curl -X POST ${ENDPOINT} \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"{ queries { id description status } }\"}'"
echo ""
