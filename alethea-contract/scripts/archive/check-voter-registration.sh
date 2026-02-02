#!/bin/bash
source .env.conway

echo "=== Check Voter Registration Status ==="
echo ""

echo "1. Protocol Stats (Total Voters):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalVoters activeVoters } }"}' | jq .

echo ""
echo "2. Voter Leaderboard:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ voterLeaderboard(limit: 10) { voterApp reputationScore totalVotes accuracyRate } }"}' | jq .

echo ""
echo "3. Check Individual Voter Info:"
echo "Voter 1 ($VOTER_1_ID):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ voterStats(voterApp: \\\"$VOTER_1_ID\\\") { voterApp stake reputationScore totalVotes isActive } }\"}" | jq .

echo ""
echo "Voter 2 ($VOTER_2_ID):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ voterStats(voterApp: \\\"$VOTER_2_ID\\\") { voterApp stake reputationScore totalVotes isActive } }\"}" | jq .

echo ""
echo "Voter 3 ($VOTER_3_ID):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ voterStats(voterApp: \\\"$VOTER_3_ID\\\") { voterApp stake reputationScore totalVotes isActive } }\"}" | jq .
