#!/bin/bash

# Create Test Query Script
# Usage: ./create_test_query.sh

REGISTRY_APP="b08bd0587eb941b8db83fd7dffa32ad0ebd1a55eed0f9e0789b7cf02c402b9ff"
APP_CHAIN="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         CREATE QUERY VIA DASHBOARD (RECOMMENDED)            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Cara termudah:"
echo "1. Buka dashboard di http://localhost:5173"
echo "2. Pergi ke halaman 'Queries' atau 'Create Query'"
echo "3. Isi form dengan:"
echo "   - Description: 'Did Bitcoin reach \$50,000 on January 1, 2025?'"
echo "   - Outcomes: Yes, No"
echo "   - Strategy: Majority"
echo "   - Min Votes: 1"
echo "   - Reward: 100 ALTH"
echo "   - Duration: 300 seconds (5 minutes)"
echo ""
echo "Atau gunakan mutation GraphQL berikut di dashboard GraphQL playground:"
echo ""
cat <<'EOF'
mutation {
  createQuery(
    description: "Did Bitcoin reach $50,000 on January 1, 2025?"
    outcomes: ["Yes", "No"]
    strategy: "Majority"
    minVotes: 1
    rewardAmount: "100"
    durationSecs: 300
  )
}
EOF

echo ""
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         CHECK EXISTING QUERIES                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

curl -s "http://localhost:8080/chains/${APP_CHAIN}/applications/${REGISTRY_APP}" \
  -H 'Content-Type: application/json' \
  -d '{"query":"query { queries(limit: 5) { id description outcomes strategy rewardAmount deadline phase status voteCount } }"}' | \
  jq '.data.queries[] | "ID: \(.id)\nDescription: \(.description)\nPhase: \(.phase)\nStatus: \(.status)\nVotes: \(.voteCount)\n---"'

echo ""
echo "✅ Gunakan dashboard untuk membuat query - lebih mudah dan reliable!"
