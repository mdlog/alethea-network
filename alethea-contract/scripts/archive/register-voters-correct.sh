#!/bin/bash

# Load environment variables
export CHAIN_ID="c8e5acdfe8de4ee96300c8d072085351db08d8e49abacb5864cb53ef92524002"
export ALETHEA_REGISTRY_ID="3c018ea20034b33e630ff4db09874fef2bce75c9ba710dcc9fa7eb0b272b6c0a"
export VOTER_1_ID="fa3fec8eb4b72893abee7f471e4dbd702a13e6a638e5716a2067c7d70cddf831"
export VOTER_2_ID="8fe971309e20616184c97fe90634fac1fa9b78aed7a3e5fd3ffe1a8fc8fa0e02"
export VOTER_3_ID="d0924ce36976edd3342f94b62bf3ecaa2de62d3356622c20854ed416e8d4b752"

echo "=== Registering Voters to Registry ==="

# Register Voter 1
echo "Registering Voter 1: $VOTER_1_ID"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { registerVoter(voterApp: \\\"$VOTER_1_ID\\\", initialStake: \\\"1000\\\") }\"}"

echo ""

# Register Voter 2  
echo "Registering Voter 2: $VOTER_2_ID"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { registerVoter(voterApp: \\\"$VOTER_2_ID\\\", initialStake: \\\"1000\\\") }\"}"

echo ""

# Register Voter 3
echo "Registering Voter 3: $VOTER_3_ID"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { registerVoter(voterApp: \\\"$VOTER_3_ID\\\", initialStake: \\\"1000\\\") }\"}"

echo ""
echo "=== Registration Complete ==="
echo "Checking voter leaderboard..."

curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ voterLeaderboard(limit: 10) { voterApp reputationScore } }"}' | jq .