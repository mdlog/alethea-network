#!/bin/bash
source .env.conway

echo "=== Deploy Voter on Separate Chain ==="
echo ""

echo "Creating new chain and deploying Voter 1..."
echo ""

# Deploy voter on new chain
DEPLOY_OUTPUT=$(linera --wait-for-outgoing-messages publish-and-create \
  target/wasm32-unknown-unknown/release/voter_template_contract.wasm \
  target/wasm32-unknown-unknown/release/voter_template_service.wasm \
  --json-parameters '{}' \
  --json-argument '{}' 2>&1)

echo "$DEPLOY_OUTPUT"
echo ""

# Extract IDs
NEW_VOTER_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' | head -1)
NEW_CHAIN_ID=$(linera wallet show | tail -20 | grep -oP '^│ \K[a-f0-9]{64}' | head -1)

echo "New Voter ID: $NEW_VOTER_ID"
echo "New Chain ID: $NEW_CHAIN_ID"
echo ""

if [ -n "$NEW_VOTER_ID" ] && [ -n "$NEW_CHAIN_ID" ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "Update .env.conway with:"
    echo "export NEW_VOTER_1_ID=\"$NEW_VOTER_ID\""
    echo "export NEW_VOTER_1_CHAIN=\"$NEW_CHAIN_ID\""
    echo ""
    echo "Initialize voter:"
    echo "curl -s \"http://localhost:8080/chains/$NEW_CHAIN_ID/applications/$NEW_VOTER_ID\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"query\":\"mutation { initialize(registryId: \\\"$ALETHEA_REGISTRY_ID\\\", initialStake: \\\"1000\\\") }\"}' | jq ."
else
    echo "❌ Deployment failed"
fi
