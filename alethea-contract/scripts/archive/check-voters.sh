#!/bin/bash
source .env.conway

echo "=== Check Voters Status ==="
echo ""

echo "Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalVoters activeVoters } }"}' | jq .

echo ""
echo "Voter Leaderboard:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ voterLeaderboard(limit: 10) { voterApp reputationScore totalVotes } }"}' | jq .
