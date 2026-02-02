#!/bin/bash
# Deploy Complete Alethea Network to Fresh Chain
# Chain ID: 371f1707095d36c155e513a9cf7030760acda20278a14828f5d176dd8fffecce

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

CHAIN_ID="371f1707095d36c155e513a9cf7030760acda20278a14828f5d176dd8fffecce"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Alethea Network - Fresh Deployment                    ║${NC}"
echo -e "${BLUE}║  Chain ID: ${CHAIN_ID:0:16}...  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Step 1: Build all contracts
echo -e "${YELLOW}📦 Step 1/5: Building all contracts...${NC}"
cargo build --release --target wasm32-unknown-unknown
echo -e "${GREEN}✓ Build complete${NC}\n"

# Step 2: Deploy Oracle Registry
echo -e "${YELLOW}🏛️  Step 2/5: Deploying Oracle Registry (min_voters: 3)...${NC}"
REGISTRY_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_service.wasm \
  --json-parameters '{"min_voters": 3}' 2>&1)

REGISTRY_APP=$(echo "$REGISTRY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")
if [ -z "$REGISTRY_APP" ]; then
    echo -e "${RED}Failed to deploy Registry${NC}"
    echo "$REGISTRY_OUTPUT"
    exit 1
fi
echo -e "   ${GREEN}✓ Registry Application: $REGISTRY_APP${NC}\n"

# Step 3: Deploy Voter Template
echo -e "${YELLOW}🗳️  Step 3/5: Deploying Voter Template...${NC}"
VOTER_TEMPLATE_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "0", "decision_strategy": "Manual"}' 2>&1)

VOTER_TEMPLATE=$(echo "$VOTER_TEMPLATE_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")
if [ -z "$VOTER_TEMPLATE" ]; then
    echo -e "${RED}Failed to deploy Voter Template${NC}"
    echo "$VOTER_TEMPLATE_OUTPUT"
    exit 1
fi
echo -e "   ${GREEN}✓ Voter Template: $VOTER_TEMPLATE${NC}\n"

# Step 4: Deploy 3 Voter Instances
echo -e "${YELLOW}👥 Step 4/5: Deploying 3 Voter Instances...${NC}"

echo "   Creating Voter 1..."
VOTER_1_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "1000", "decision_strategy": "Manual"}' 2>&1)
VOTER_1=$(echo "$VOTER_1_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")
echo "   ✓ Voter 1: $VOTER_1"

echo "   Creating Voter 2..."
VOTER_2_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "2000", "decision_strategy": "Manual"}' 2>&1)
VOTER_2=$(echo "$VOTER_2_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")
echo "   ✓ Voter 2: $VOTER_2"

echo "   Creating Voter 3..."
VOTER_3_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "3000", "decision_strategy": "Manual"}' 2>&1)
VOTER_3=$(echo "$VOTER_3_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")
echo -e "   ${GREEN}✓ Voter 3: $VOTER_3${NC}\n"

# Step 5: Deploy Market Chain
echo -e "${YELLOW}📊 Step 5/5: Deploying Market Chain...${NC}"
MARKET_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/market-chain-contract.wasm \
  target/wasm32-unknown-unknown/release/market-chain-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'"}' 2>&1)

MARKET_APP=$(echo "$MARKET_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")
if [ -z "$MARKET_APP" ]; then
    echo -e "${RED}Failed to deploy Market Chain${NC}"
    echo "$MARKET_OUTPUT"
    exit 1
fi
echo -e "   ${GREEN}✓ Market Chain: $MARKET_APP${NC}\n"

# Update .env.fresh
echo -e "${YELLOW}💾 Updating .env.fresh with deployment IDs...${NC}"
cat > .env.fresh << EOF
# ============================================================================
# Alethea Protocol - Fresh Deployment
# Deployed: $(date '+%Y-%m-%d %H:%M:%S')
# Chain ID: $CHAIN_ID
# ============================================================================

# Network Configuration
export CHAIN_ID="$CHAIN_ID"
export NETWORK="fresh-deployment"

# ============================================================================
# DEPLOYED APPLICATIONS
# ============================================================================

# Oracle Registry - DirectVote Support, min_voters: 3
export ALETHEA_REGISTRY_ID="$REGISTRY_APP"

# Market Chain - Prediction Market dApp
export MARKET_CHAIN_ID="$MARKET_APP"

# Voter Template - Template for creating voter instances
export VOTER_TEMPLATE_ID="$VOTER_TEMPLATE"

# Voter Applications - Created from Voter Template
export VOTER_1_ID="$VOTER_1"
export VOTER_2_ID="$VOTER_2"
export VOTER_3_ID="$VOTER_3"

# Voter Chain IDs (same as main chain for now)
export VOTER_1_CHAIN_ID="$CHAIN_ID"
export VOTER_2_CHAIN_ID="$CHAIN_ID"
export VOTER_3_CHAIN_ID="$CHAIN_ID"

# ============================================================================
# GraphQL Endpoints
# ============================================================================
# Registry: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${ALETHEA_REGISTRY_ID}
# Market Chain: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${MARKET_CHAIN_ID}
# Voter Template: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${VOTER_TEMPLATE_ID}
# Voter 1: http://localhost:8080/chains/\${VOTER_1_CHAIN_ID}/applications/\${VOTER_1_ID}
# Voter 2: http://localhost:8080/chains/\${VOTER_2_CHAIN_ID}/applications/\${VOTER_2_ID}
# Voter 3: http://localhost:8080/chains/\${VOTER_3_CHAIN_ID}/applications/\${VOTER_3_ID}
EOF

echo -e "${GREEN}✓ Environment file updated${NC}\n"

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Deployment Complete!                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${GREEN}Deployed Applications:${NC}"
echo "  📋 Registry:       $REGISTRY_APP"
echo "  📊 Market Chain:   $MARKET_APP"
echo "  🗳️  Voter Template: $VOTER_TEMPLATE"
echo "  👤 Voter 1:        $VOTER_1"
echo "  👤 Voter 2:        $VOTER_2"
echo "  👤 Voter 3:        $VOTER_3"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Load environment:"
echo "     ${BLUE}source .env.fresh${NC}"
echo ""
echo "  2. Register voters to registry:"
echo "     ${BLUE}bash scripts/register-voter.sh${NC}"
echo ""
echo "  3. Test complete workflow:"
echo "     ${BLUE}bash scripts/test-alethea-workflow.sh${NC}"
echo ""

echo -e "${GREEN}🎉 Alethea Network is ready!${NC}"
