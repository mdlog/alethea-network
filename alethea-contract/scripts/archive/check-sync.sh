#!/bin/bash
source .env.conway

echo "=== Check Sync Status ==="
echo ""

echo "1. Test Voter 1 ($VOTER_1_ID):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}' | jq .

echo ""
echo "2. Test Registry ($ALETHEA_REGISTRY_ID):"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalVoters } }"}' | jq .

echo ""
echo "3. GraphQL Service:"
ps aux | grep "linera service" | grep -v grep
