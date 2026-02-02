#!/bin/bash
source .env.conway

echo "=== Deploy All Voters on ONE Separate Chain ==="
echo ""

# Step 1: Publish bytecode on new chain
echo "Step 1: Publishing bytecode on new chain..."
PUBLISH_OUTPUT=$(linera --with-new-chain publish-bytecode \
  target/wasm32-unknown-unknown/release/voter_template_contract.wasm \
  target/wasm32-unknown-unknown/release/voter_template_service.wasm 2>&1)

echo "$PUBLISH_OUTPUT"
echo ""

BYTECODE_ID=$(echo "$PUBLISH_OUTPUT" | grep -oP 'Bytecode ID: \K[a-f0-9]+')
VOTER_CHAIN=$(linera wallet show | tail -5 | grep -oP '^│ \K[a-f0-9]{64}' | head -1)

echo "Bytecode ID: $BYTECODE_ID"
echo "Voter Chain: $VOTER_CHAIN"
echo ""

if [ -z "$BYTECODE_ID" ] || [ -z "$VOTER_CHAIN" ]; then
    echo "❌ Failed to get IDs"
    exit 1
fi

# Step 2: Create 3 voters on same chain
echo "Step 2: Creating 3 voters on chain $VOTER_CHAIN..."
echo ""

echo "Creating Voter 1..."
VOTER_1=$(linera create-application $BYTECODE_ID \
  --chain-id $VOTER_CHAIN \
  --json-parameters '{}' \
  --json-argument '{}' 2>&1 | grep -oP 'Application ID: \K[a-f0-9]+')
echo "Voter 1 ID: $VOTER_1"

echo "Creating Voter 2..."
VOTER_2=$(linera create-application $BYTECODE_ID \
  --chain-id $VOTER_CHAIN \
  --json-parameters '{}' \
  --json-argument '{}' 2>&1 | grep -oP 'Application ID: \K[a-f0-9]+')
echo "Voter 2 ID: $VOTER_2"

echo "Creating Voter 3..."
VOTER_3=$(linera create-application $BYTECODE_ID \
  --chain-id $VOTER_CHAIN \
  --json-parameters '{}' \
  --json-argument '{}' 2>&1 | grep -oP 'Application ID: \K[a-f0-9]+')
echo "Voter 3 ID: $VOTER_3"

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "Update .env.conway:"
echo "export VOTER_CHAIN=\"$VOTER_CHAIN\""
echo "export NEW_VOTER_1_ID=\"$VOTER_1\""
echo "export NEW_VOTER_2_ID=\"$VOTER_2\""
echo "export NEW_VOTER_3_ID=\"$VOTER_3\""
