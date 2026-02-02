#!/bin/bash
source .env.conway

echo "=== Check Registered Voter Details ==="
echo ""

echo "1. Voter Leaderboard (shows registered voter):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ voterLeaderboard(limit: 5) { voterApp reputationScore } }"}' | jq .

echo ""
echo "2. Check if it's Registry ID:"
echo "Registry ID: $ALETHEA_REGISTRY_ID"
echo ""

echo "3. Try to get voter stats for Registry:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ voterStats(voterApp: \\\"$ALETHEA_REGISTRY_ID\\\") { voterApp stake isActive } }\"}" | jq .

echo ""
echo "4. Try to get voter stats for Voter 1:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ voterStats(voterApp: \\\"$VOTER_1_ID\\\") { voterApp stake isActive } }\"}" | jq .
