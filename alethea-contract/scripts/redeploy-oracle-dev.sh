#!/bin/bash
set -e

echo "🚀 Re-deploying Oracle Registry v2 for Development"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CHAIN_ID="8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}📁 Project root: $PROJECT_ROOT${NC}"

# Step 1: Create dev init params
echo -e "\n${BLUE}Step 1: Creating development init parameters...${NC}"
cd "$PROJECT_ROOT/oracle-registry-v2"

cat > init_params_dev.json << 'EOF'
{
    "min_stake": 100,
    "min_votes_default": 1,
    "default_query_duration": 3600,
    "reward_percentage": 1000,
    "slash_percentage": 500,
    "protocol_fee": 100
}
EOF

echo -e "${GREEN}✓ Created init_params_dev.json${NC}"
cat init_params_dev.json

# Step 2: Build application
echo -e "\n${BLUE}Step 2: Building WASM application...${NC}"
cargo build --release --target wasm32-unknown-unknown

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
    ls -lh target/wasm32-unknown-unknown/release/oracle_registry_v2*.wasm
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

# Step 3: Publish application
echo -e "\n${BLUE}Step 3: Publishing application to chain...${NC}"
echo "Chain ID: $CHAIN_ID"

# Run publish command and capture output
OUTPUT=$(linera publish-and-create \
    $CHAIN_ID \
    target/wasm32-unknown-unknown/release/oracle_registry_v2.wasm \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
    --json-parameters-file init_params_dev.json \
    2>&1)

echo "$OUTPUT"

# Extract application ID from output
APP_ID=$(echo "$OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]+' || echo "")

if [ -z "$APP_ID" ]; then
    echo -e "${RED}✗ Failed to extract application ID${NC}"
    echo "Please check the output above and manually update .env.local"
    exit 1
fi

echo -e "${GREEN}✓ Application published${NC}"
echo -e "${GREEN}Application ID: $APP_ID${NC}"

# Step 4: Update .env.local
echo -e "\n${BLUE}Step 4: Updating .env.local...${NC}"
cd "$PROJECT_ROOT/alethea-dashboard"

# Backup old env
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ Backed up old .env.local${NC}"
fi

# Create new .env.local
cat > .env.local << EOF
# Frontend Configuration
NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID
NEXT_PUBLIC_APP_ID=$APP_ID
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001

# Linera Conway Testnet Faucet
NEXT_PUBLIC_FAUCET_URL=https://faucet.testnet-conway.linera.net
EOF

echo -e "${GREEN}✓ Updated .env.local${NC}"
cat .env.local

# Step 5: Verify deployment
echo -e "\n${BLUE}Step 5: Verifying deployment...${NC}"
sleep 2

VERIFY_OUTPUT=$(curl -s -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID \
  -H "Content-Type: application/json" \
  -d '{"query":"{ parameters { minStake minVotesDefault } }"}')

echo "$VERIFY_OUTPUT" | python3 -m json.tool

if echo "$VERIFY_OUTPUT" | grep -q "minStake"; then
    echo -e "${GREEN}✓ Deployment verified successfully!${NC}"
else
    echo -e "${RED}✗ Verification failed${NC}"
    echo "Application might not be ready yet. Wait a moment and try manually."
fi

# Summary
echo -e "\n${GREEN}=================================================="
echo "✅ Re-deployment Complete!"
echo "==================================================${NC}"
echo ""
echo "📝 Summary:"
echo "  Chain ID:       $CHAIN_ID"
echo "  Application ID: $APP_ID"
echo "  Min Stake:      100 tokens"
echo "  Min Votes:      1"
echo ""
echo "🔄 Next Steps:"
echo "  1. Restart dashboard: cd alethea-dashboard && npm run dev"
echo "  2. Test voter registration from UI"
echo "  3. Verify voters: curl -s -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID -H 'Content-Type: application/json' -d '{\"query\":\"{ voterCount }\"}' | python3 -m json.tool"
echo ""
echo "📚 Documentation: docs/REDEPLOY_APPLICATION_GUIDE.md"
