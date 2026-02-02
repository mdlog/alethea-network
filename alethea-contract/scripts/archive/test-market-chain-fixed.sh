#!/bin/bash
source .env.conway
DL=$(($(date +%s) + 86400))000000

echo "=== Market Chain Complete Workflow ==="
echo ""

echo "Step 1: Create Market via Market Chain"
echo "--------------------------------------"
MARKET_ID=$(curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { createMarket(question: \\\"SOL 500?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: \\\"$DL\\\", initialLiquidity: \\\"1000000\\\") }\"}" | jq -r '.data.createMarket')

echo "Market ID created: $MARKET_ID"
echo ""
sleep 3

echo "Step 2: Check Market Details"
echo "----------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ market(id: $MARKET_ID) { id question outcomes status totalLiquidity } }\"}" | jq .

echo ""
sleep 2

echo "Step 3: Request Resolution"
echo "-------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { requestResolution(marketId: $MARKET_ID) }\"}" | jq .

echo ""
sleep 5

echo "Step 4: Check Registry (should have new market)"
echo "-----------------------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes } protocolStats { totalMarkets } }"}' | jq .

echo ""
sleep 2

echo "Step 5: Submit Votes for Market $MARKET_ID"
echo "-------------------------------------------"
echo "Voter 1 votes Yes (outcome 0):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { submitVote(marketId: $MARKET_ID, outcomeIndex: 0, confidence: 90) }\"}" | jq .

echo ""
echo "Voter 2 votes Yes (outcome 0):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { submitVote(marketId: $MARKET_ID, outcomeIndex: 0, confidence: 85) }\"}" | jq .

echo ""
echo "Voter 3 votes No (outcome 1):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { submitVote(marketId: $MARKET_ID, outcomeIndex: 1, confidence: 75) }\"}" | jq .

echo ""
sleep 5

echo "Step 6: Check Final Results"
echo "---------------------------"
echo "Market Chain Status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ market(id: $MARKET_ID) { id question status finalOutcome } }\"}" | jq .

echo ""
echo "Registry Status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets resolvedMarkets totalVoters } }"}' | jq .
