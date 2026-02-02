#!/bin/bash
# Deploy Complete Alethea Network - Fresh Chain
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
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# Stop service if running
echo -e "${YELLOW}🛑 Stopping linera service...${NC}"
pkill -f "linera service" || true
sleep 3
echo -e "${GREEN}✓ Service stopped${NC}\n"

# Set default chain
echo -e "${YELLOW}🔗 Setting default chain...${NC}"
linera wallet set-default $CHAIN_ID
echo -e "${GREEN}✓ Chain set: ${CHAIN_ID:0:16}...${NC}\n"

# Sync chain
echo -e "${YELLOW}🔄 Syncing chain...${NC}"
linera sync $CHAIN_ID
echo -e "${GREEN}✓ Chain synced${NC}\n"

# Deploy Registry
echo -e "${YELLOW}🏛️  Step 1/5: Deploying Oracle Registry (min_voters: 3)...${NC}"
REGISTRY_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_service.wasm \
  --json-parameters '{"min_voters": 3}')

REGISTRY_APP=$(echo "$REGISTRY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+')
echo -e "   ${GREEN}✓ Registry: $REGISTRY_APP${NC}\n"

# Deploy Voter Template
echo -e "${YELLOW}🗳️  Step 2/5: Deploying Voter Template...${NC}"
VOTER_TEMPLATE_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "0", "decision_strategy": "Manual"}')

VOTER_TEMPLATE=$(echo "$VOTER_TEMPLATE_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+')
echo -e "   ${GREEN}✓ Voter Template: $VOTER_TEMPLATE${NC}\n"

# Deploy Voter 1
echo -e "${YELLOW}👥 Step 3/5: Deploying Voter 1...${NC}"
VOTER_1_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "1000", "decision_strategy": "Manual"}')

VOTER_1=$(echo "$VOTER_1_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+')
echo -e "   ${GREEN}✓ Voter 1: $VOTER_1${NC}\n"

# Deploy Voter 2
echo -e "${YELLOW}👥 Step 4/5: Deploying Voter 2...${NC}"
VOTER_2_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "2000", "decision_strategy": "Manual"}')

VOTER_2=$(echo "$VOTER_2_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+')
echo -e "   ${GREEN}✓ Voter 2: $VOTER_2${NC}\n"

# Deploy Voter 3
echo -e "${YELLOW}👥 Step 5/5: Deploying Voter 3...${NC}"
VOTER_3_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/voter-template-contract.wasm \
  target/wasm32-unknown-unknown/release/voter-template-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'", "initial_stake": "3000", "decision_strategy": "Manual"}')

VOTER_3=$(echo "$VOTER_3_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+')
echo -e "   ${GREEN}✓ Voter 3: $VOTER_3${NC}\n"

# Deploy Market Chain
echo -e "${YELLOW}📊 Step 6/6: Deploying Market Chain...${NC}"
MARKET_OUTPUT=$(linera publish-and-create \
  target/wasm32-unknown-unknown/release/market-chain-contract.wasm \
  target/wasm32-unknown-unknown/release/market-chain-service.wasm \
  --json-argument '{"registry_id": "'$REGISTRY_APP'"}')

MARKET_APP=$(echo "$MARKET_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+')
echo -e "   ${GREEN}✓ Market Chain: $MARKET_APP${NC}\n"

# Update .env.fresh
echo -e "${YELLOW}💾 Updating .env.fresh...${NC}"
cat > .env.fresh << EOF
# ============================================================================
# Alethea Protocol - Fresh Deployment
# Deployed: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================================

# Network Configuration
export CHAIN_ID="$CHAIN_ID"
export NETWORK="fresh-deployment"

# Deployed Applications
export ALETHEA_REGISTRY_ID="$REGISTRY_APP"
export MARKET_CHAIN_ID="$MARKET_APP"
export VOTER_TEMPLATE_ID="$VOTER_TEMPLATE"

# Voter Applications
export VOTER_1_ID="$VOTER_1"
export VOTER_2_ID="$VOTER_2"
export VOTER_3_ID="$VOTER_3"

# Voter Chain IDs (same as main chain)
export VOTER_1_CHAIN_ID="$CHAIN_ID"
export VOTER_2_CHAIN_ID="$CHAIN_ID"
export VOTER_3_CHAIN_ID="$CHAIN_ID"

# GraphQL Endpoints
# Registry: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${ALETHEA_REGISTRY_ID}
# Market: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${MARKET_CHAIN_ID}
# Voter 1: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${VOTER_1_ID}
# Voter 2: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${VOTER_2_ID}
# Voter 3: http://localhost:8080/chains/\${CHAIN_ID}/applications/\${VOTER_3_ID}
EOF

echo -e "${GREEN}✓ Environment updated${NC}\n"

# Restart service
echo -e "${YELLOW}🔄 Restarting linera service...${NC}"
nohup linera service --port 8080 > /tmp/linera-service-fresh.log 2>&1 &
sleep 5
echo -e "${GREEN}✓ Service restarted${NC}\n"

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
echo "  2. Test GraphQL endpoints:"
echo "     ${BLUE}curl http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP${NC}"
echo ""

echo -e "${GREEN}🎉 Alethea Network is ready!${NC}"
