#!/bin/bash
source .env.conway

echo "=== Complete Voting Workflow ==="
echo ""

# Step 1: Register Voters
echo "Step 1: Register Voters to Registry"
echo "-----------------------------------"
echo ""

echo "Register Voter 1:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { registerVoter(stake: \"1000\") }"}' | jq .

echo ""
echo "Register Voter 2:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { registerVoter(stake: \"1500\") }"}' | jq .

echo ""
echo "Register Voter 3:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { registerVoter(stake: \"2000\") }"}' | jq .

echo ""
sleep 3

# Step 2: Check Protocol Stats
echo "Step 2: Check Protocol Stats"
echo "----------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets totalVoters activeVoters } }"}' | jq .

echo ""
sleep 2

# Step 3: Request Resolution
echo "Step 3: Request Resolution for Market 0"
echo "---------------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { requestResolution(marketId: 0) }"}' | jq .

echo ""
sleep 3

# Step 4: Check Market Details
echo "Step 4: Check Market Details"
echo "----------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ marketDetails(id: 0) { id question status selectedVotersCount totalCommitments totalReveals } }"}' | jq .

echo ""
sleep 2

# Step 5: Submit Votes
echo "Step 5: Submit Votes from Voters"
echo "--------------------------------"
echo ""

echo "Voter 1 votes: Yes (outcome 0, confidence 80)"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 80) }"}' | jq .

echo ""
echo "Voter 2 votes: Yes (outcome 0, confidence 85)"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 85) }"}' | jq .

echo ""
echo "Voter 3 votes: No (outcome 1, confidence 70)"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 1, confidence: 70) }"}' | jq .

echo ""
sleep 5

# Step 6: Check Final Results
echo "Step 6: Check Final Market Status"
echo "---------------------------------"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ market(id: 0) { id question outcomes status } }"}' | jq .

echo ""
echo "Final Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalMarkets resolvedMarkets totalVoters } }"}' | jq .

echo ""
echo "=== Voting Workflow Complete ==="
