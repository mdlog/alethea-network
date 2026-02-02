#!/bin/bash
source .env.conway

echo "=== Initialize & Register Voters ==="
echo ""
echo "Registry: $ALETHEA_REGISTRY_ID"
echo "Voter 1: $VOTER_1_ID"
echo "Voter 2: $VOTER_2_ID"
echo "Voter 3: $VOTER_3_ID"
echo ""

echo "Step 1: Initialize Voters"
echo "------------------------"
echo ""

echo "Initialize Voter 1 (stake: 1000):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { initialize(registryId: \"'$ALETHEA_REGISTRY_ID'\", initialStake: \"1000\") }"}' | jq .

echo ""
sleep 2

echo "Initialize Voter 2 (stake: 1500):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { initialize(registryId: \"'$ALETHEA_REGISTRY_ID'\", initialStake: \"1500\") }"}' | jq .

echo ""
sleep 2

echo "Initialize Voter 3 (stake: 2000):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { initialize(registryId: \"'$ALETHEA_REGISTRY_ID'\", initialStake: \"2000\") }"}' | jq .

echo ""
sleep 5

echo "Step 2: Check Voter Status"
echo "--------------------------"
echo ""

echo "Voter 1 Status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ status { stake reputation totalVotes } }"}' | jq .

echo ""
echo "Voter 2 Status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ status { stake reputation totalVotes } }"}' | jq .

echo ""
echo "Voter 3 Status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ status { stake reputation totalVotes } }"}' | jq .

echo ""
sleep 3

echo "Step 3: Check Registry"
echo "---------------------"
echo ""

echo "Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalVoters activeVoters } }"}' | jq .

echo ""
echo "Voter Leaderboard:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ voterLeaderboard(limit: 5) { voterApp reputationScore totalVotes } }"}' | jq .

echo ""
echo "=== Complete ==="
