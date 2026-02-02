#!/bin/bash
source .env.conway

echo "=== Vote for Existing Market ==="
echo ""

echo "Active Markets in Registry:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ activeMarkets { id question outcomes } }"}' | jq .

echo ""
echo "Voting for Market ID 1 (Bitcoin 100k)"
echo "-------------------------------------"
echo ""

echo "Voter 1 votes Yes (outcome 0, confidence 90):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 90) }"}' | jq .

echo ""
echo "Voter 2 votes Yes (outcome 0, confidence 85):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 85) }"}' | jq .

echo ""
echo "Voter 3 votes No (outcome 1, confidence 75):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 1, confidence: 75) }"}' | jq .

echo ""
sleep 5

echo "Check Results:"
echo "-------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ market(id: 1) { id question outcomes status } marketDetails(id: 1) { status totalCommitments totalReveals } protocolStats { resolvedMarkets } }"}' | jq .
