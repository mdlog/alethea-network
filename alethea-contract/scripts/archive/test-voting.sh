#!/bin/bash
source .env.conway

echo "=== Voting Workflow Test ==="
echo "Market ID: 0 (BTC 100k?)"
echo ""

# Step 1: Request Resolution
echo "1. Request Resolution for Market 0:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 0) }"}' | jq .

echo ""
sleep 2

# Step 2: Check Market Details
echo "2. Check Market Details:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ marketDetails(id: 0) { id question status selectedVotersCount } }"}' | jq .

echo ""

# Step 3: Submit Votes from 3 voters
echo "3. Submit Votes (3 voters):"
echo ""

echo "Voter 1 votes: Yes (outcome 0)"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 80) }"}' | jq .

echo ""
echo "Voter 2 votes: Yes (outcome 0)"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 85) }"}' | jq .

echo ""
echo "Voter 3 votes: No (outcome 1)"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 1, confidence: 70) }"}' | jq .

echo ""
sleep 3

# Step 4: Check Final Market Status
echo "4. Check Final Market Status:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ market(id: 0) { id question outcomes status } }"}' | jq .

echo ""
echo "5. Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets resolvedMarkets totalVoters } }"}' | jq .
