#!/bin/bash

# Load environment variables
export CHAIN_ID="c8e5acdfe8de4ee96300c8d072085351db08d8e49abacb5864cb53ef92524002"
export VOTER_1_ID="fa3fec8eb4b72893abee7f471e4dbd702a13e6a638e5716a2067c7d70cddf831"
export VOTER_2_ID="8fe971309e20616184c97fe90634fac1fa9b78aed7a3e5fd3ffe1a8fc8fa0e02"
export VOTER_3_ID="d0924ce36976edd3342f94b62bf3ecaa2de62d3356622c20854ed416e8d4b752"
export ALETHEA_REGISTRY_ID="3c018ea20034b33e630ff4db09874fef2bce75c9ba710dcc9fa7eb0b272b6c0a"

echo "=== Voting on Markets ==="

# Market 0: "ETH 10k?" - Vote Yes (outcome 0)
echo "Market 0: ETH 10k?"

echo "Voter 1 votes Yes (confidence 80):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 80) }"}'

echo ""
echo "Voter 2 votes Yes (confidence 90):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 0, confidence: 90) }"}'

echo ""
echo "Voter 3 votes No (confidence 70):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 0, outcomeIndex: 1, confidence: 70) }"}'

echo ""
echo "=== Market 1: Bitcoin 100k ==="

echo "Voter 1 votes Yes (confidence 85):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 85) }"}'

echo ""
echo "Voter 2 votes No (confidence 75):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 1, confidence: 75) }"}'

echo ""
echo "Voter 3 votes Yes (confidence 95):"
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { submitVote(marketId: 1, outcomeIndex: 0, confidence: 95) }"}'

echo ""
echo "=== Voting Complete ==="