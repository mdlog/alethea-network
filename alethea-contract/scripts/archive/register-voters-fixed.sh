#!/bin/bash
source .env.conway

echo "=== Register Voters ==="
echo ""

echo "1. Initialize Voter 1:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_1_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { initialize(registryId: \"'$ALETHEA_REGISTRY_ID'\", initialStake: \"1000\") }"}' | jq .

echo ""
sleep 2

echo "2. Initialize Voter 2:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_2_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { initialize(registryId: \"'$ALETHEA_REGISTRY_ID'\", initialStake: \"1500\") }"}' | jq .

echo ""
sleep 2

echo "3. Initialize Voter 3:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$VOTER_3_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { initialize(registryId: \"'$ALETHEA_REGISTRY_ID'\", initialStake: \"2000\") }"}' | jq .

echo ""
sleep 3

echo "4. Check Protocol Stats:"
curl -s "http://localhost:8080/chains/$CHAIN_ID/applications/$ALETHEA_REGISTRY_ID" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ protocolStats { totalVoters activeVoters } }"}' | jq .
