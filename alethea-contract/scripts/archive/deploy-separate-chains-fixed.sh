#!/bin/bash

echo "=== Deploying Alethea Network with Separate Chains (Fixed) ==="

# Clean start
pkill -f linera-service || true
sleep 2

# Initialize wallet with Conway testnet (correct syntax for v0.15.5)
echo "Initializing wallet with Conway testnet..."
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Get main chain ID
MAIN_CHAIN=$(linera wallet show | grep -A 1 "Public Key" | tail -1 | awk '{print $3}')
echo "Main Chain: $MAIN_CHAIN"

# Build contracts
echo "Building contracts..."
cargo build --release --target wasm32-unknown-unknown

echo ""
echo "=== Step 1: Deploy Oracle Registry on Main Chain ==="

# Use publish-and-create for v0.15.5
REGISTRY_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_service.wasm \
  --json-parameters '{"min_voters": 3}' \
  --json-argument '{}' | grep "New application" | awk '{print $3}')

echo "Registry deployed: $REGISTRY_APP on chain $MAIN_CHAIN"

echo ""
echo "=== Step 2: Create Chain for Market Chain ==="
MARKET_CHAIN=$(linera open-chain | grep "New chain" | awk '{print $3}')
echo "Market Chain ID: $MARKET_CHAIN"

# Switch to market chain and deploy
linera wallet set-default $MARKET_CHAIN

MARKET_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/market_chain_contract.wasm \
  target/wasm32-unknown-unknown/release/market_chain_service.wasm \
  --json-parameters '{}' \
  --json-argument '{}' | grep "New application" | awk '{print $3}')

echo "Market Chain deployed: $MARKET_APP on chain $MARKET_CHAIN"

echo ""
echo "=== Step 3: Create Chains for Voters ==="

# Voter 1
VOTER_1_CHAIN=$(linera open-chain | grep "New chain" | awk '{print $3}')
echo "Voter 1 Chain ID: $VOTER_1_CHAIN"

linera wallet set-default $VOTER_1_CHAIN

VOTER_1_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter_template_contract.wasm \
  target/wasm32-unknown-unknown/release/voter_template_service.wasm \
  --json-parameters '{"min_stake": "100"}' \
  --json-argument '{"initial_stake": "1000"}' | grep "New application" | awk '{print $3}')

echo "Voter 1 deployed: $VOTER_1_APP on chain $VOTER_1_CHAIN"

# Voter 2
VOTER_2_CHAIN=$(linera open-chain | grep "New chain" | awk '{print $3}')
echo "Voter 2 Chain ID: $VOTER_2_CHAIN"

linera wallet set-default $VOTER_2_CHAIN

VOTER_2_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter_template_contract.wasm \
  target/wasm32-unknown-unknown/release/voter_template_service.wasm \
  --json-parameters '{"min_stake": "100"}' \
  --json-argument '{"initial_stake": "1500"}' | grep "New application" | awk '{print $3}')

echo "Voter 2 deployed: $VOTER_2_APP on chain $VOTER_2_CHAIN"

# Voter 3
VOTER_3_CHAIN=$(linera open-chain | grep "New chain" | awk '{print $3}')
echo "Voter 3 Chain ID: $VOTER_3_CHAIN"

linera wallet set-default $VOTER_3_CHAIN

VOTER_3_APP=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter_template_contract.wasm \
  target/wasm32-unknown-unknown/release/voter_template_service.wasm \
  --json-parameters '{"min_stake": "100"}' \
  --json-argument '{"initial_stake": "2000"}' | grep "New application" | awk '{print $3}')

echo "Voter 3 deployed: $VOTER_3_APP on chain $VOTER_3_CHAIN"

# Switch back to main chain as default
linera wallet set-default $MAIN_CHAIN

echo ""
echo "=== Step 4: Start GraphQL Service ==="
linera service --port 8080 &
sleep 3

echo ""
echo "=== Deployment Complete ==="
echo "Main Chain (Registry): $MAIN_CHAIN"
echo "Registry App: $REGISTRY_APP"
echo ""
echo "Market Chain: $MARKET_CHAIN"
echo "Market App: $MARKET_APP"
echo ""
echo "Voter 1 Chain: $VOTER_1_CHAIN"
echo "Voter 1 App: $VOTER_1_APP"
echo ""
echo "Voter 2 Chain: $VOTER_2_CHAIN"
echo "Voter 2 App: $VOTER_2_APP"
echo ""
echo "Voter 3 Chain: $VOTER_3_CHAIN"
echo "Voter 3 App: $VOTER_3_APP"

# Save to environment file
cat > .env.separate-chains << EOF
# Alethea Network - Separate Chains Deployment
# Generated: $(date)

# Main Chain (Registry)
export MAIN_CHAIN_ID="$MAIN_CHAIN"
export REGISTRY_APP_ID="$REGISTRY_APP"

# Market Chain
export MARKET_CHAIN_ID="$MARKET_CHAIN"
export MARKET_APP_ID="$MARKET_APP"

# Voter Chains
export VOTER_1_CHAIN_ID="$VOTER_1_CHAIN"
export VOTER_1_APP_ID="$VOTER_1_APP"

export VOTER_2_CHAIN_ID="$VOTER_2_CHAIN"
export VOTER_2_APP_ID="$VOTER_2_APP"

export VOTER_3_CHAIN_ID="$VOTER_3_CHAIN"
export VOTER_3_APP_ID="$VOTER_3_APP"

# GraphQL Endpoints
export REGISTRY_URL="http://localhost:8080/chains/$MAIN_CHAIN/applications/$REGISTRY_APP"
export MARKET_URL="http://localhost:8080/chains/$MARKET_CHAIN/applications/$MARKET_APP"
export VOTER_1_URL="http://localhost:8080/chains/$VOTER_1_CHAIN/applications/$VOTER_1_APP"
export VOTER_2_URL="http://localhost:8080/chains/$VOTER_2_CHAIN/applications/$VOTER_2_APP"
export VOTER_3_URL="http://localhost:8080/chains/$VOTER_3_CHAIN/applications/$VOTER_3_APP"
EOF

echo ""
echo "Environment saved to .env.separate-chains"
echo "Source it with: source .env.separate-chains"

# Show wallet status
echo ""
echo "=== Wallet Status ==="
linera wallet show