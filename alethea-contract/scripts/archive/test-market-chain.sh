#!/bin/bash
source .env.conway
DL=$(($(date +%s) + 86400))000000

echo "=== Test Market Chain Workflow ==="
echo ""
echo "Market Chain: $MARKET_CHAIN_ID"
echo "Registry: $ALETHEA_REGISTRY_ID"
echo ""

echo "Step 1: Create Market via Market Chain"
echo "--------------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { createMarket(question: \\\"SOL 500?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: \\\"$DL\\\", initialLiquidity: \\\"1000000\\\") { id question outcomes } }\"}" | jq .

echo ""
sleep 3

echo "Step 2: Check Markets in Market Chain"
echo "-------------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ markets { id question outcomes status totalLiquidity } }"}' | jq .

echo ""
sleep 2

echo "Step 3: Request Resolution via Market Chain"
echo "-------------------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 0) }"}' | jq .

echo ""
sleep 3

echo "Step 4: Check Registry for Market"
echo "---------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes } protocolStats { totalMarkets } }"}' | jq .

echo ""
echo "Step 5: Submit Votes"
echo "-------------------"
echo "Voter 1 votes Yes:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 90) }"}' | jq .

echo ""
echo "Voter 2 votes Yes:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 85) }"}' | jq .

echo ""
echo "Voter 3 votes No:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 1, confidence: 75) }"}' | jq .

echo ""
sleep 5

echo "Step 6: Check Final Market Status"
echo "---------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ market(id: 0) { id question outcomes status finalOutcome } }"}' | jq .
