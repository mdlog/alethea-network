#!/bin/bash
source .env.conway
DL=$(($(date +%s) + 86400))000000

echo "=== Complete Workflow: Market Creation & Voting ==="
echo ""

echo "Step 1: Create New Market"
echo "-------------------------"
MARKET_RESULT=$(curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { registerMarket(question: \\\"ETH 10k?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], deadline: \\\"$DL\\\", callbackData: \\\"00\\\") }\"}")
echo "$MARKET_RESULT" | jq .

echo ""
sleep 3

echo "Step 2: Check Active Markets"
echo "----------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes } }"}' | jq .

echo ""
sleep 2

echo "Step 3: Request Resolution for Market 1"
echo "---------------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 1) }"}' | jq .

echo ""
sleep 3

echo "Step 4: Submit Votes (3 voters)"
echo "-------------------------------"
echo "Voter 1 votes Yes:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 80) }"}' | jq .

echo ""
echo "Voter 2 votes Yes:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 85) }"}' | jq .

echo ""
echo "Voter 3 votes No:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 1, confidence: 70) }"}' | jq .

echo ""
sleep 5

echo "Step 5: Check Final Results"
echo "---------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ market(id: 1) { id question outcomes status } protocolStats { totalMarkets resolvedMarkets totalVoters } }"}' | jq .
