#!/bin/bash

# 🔄 Redeploy Market Chain & Registry Services
# Redeploy services dengan custom mutation roots

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🔄 Redeploy Market Chain & Registry Services${NC}\n"

# Load environment
if [ -f .env.fresh ]; then
    set -a
    source <(grep '^export' .env.fresh 2>/dev/null || true)
    set +a
fi

CHAIN_ID="${CHAIN_ID:-a69fa7ecceb91b3ee351cc3f5a87a970d65b2b315068f8657e393a0ad9004fee}"

echo -e "${BLUE}📋 Configuration:${NC}"
echo -e "   Chain ID: ${CHAIN_ID}\n"

# Check if linera service is running
if pgrep -f "linera service" > /dev/null; then
    echo -e "${YELLOW}⚠️  Linera service is running. This may cause wallet lock issues.${NC}"
    echo -e "${YELLOW}    Consider stopping the service temporarily or use separate wallet.${NC}\n"
fi

# Build services
echo -e "${CYAN}🔨 Building Services...${NC}\n"
cargo build --release --target wasm32-unknown-unknown \
    --package alethea-market-chain \
    --package oracle-registry-v2 \
    --package voter-template 2>&1 | grep -E "(Compiling|Finished|error)" | tail -5

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}\n"

# Function to deploy service using publish-and-create (more reliable)
deploy_service() {
    local service_name=$1
    local contract_wasm=$2
    local service_wasm=$3
    local params_json=$4
    
    echo -e "${CYAN}📦 Deploying ${service_name}...${NC}" >&2
    
    # Use publish-and-create which is more reliable
    echo -e "${YELLOW}  Publishing and creating application...${NC}" >&2
    CREATE_OUTPUT=$(linera publish-and-create \
        "$contract_wasm" \
        "$service_wasm" \
        --json-parameters "$params_json" 2>&1)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to publish and create ${service_name}${NC}" >&2
        echo "$CREATE_OUTPUT" >&2
        return 1
    fi
    
    # Extract Application ID - try multiple patterns
    # Pattern 1: Look for "Application ID: ..." format
    APP_ID=$(echo "$CREATE_OUTPUT" | grep -i "application id" | tail -1 | sed 's/.*Application ID: *\([a-f0-9]\{64\}\).*/\1/i' 2>/dev/null)
    
    # Pattern 2: Get last line if it's a 64-char hex (publish-and-create outputs ID on last line)
    if [ -z "$APP_ID" ] || [ ${#APP_ID} -ne 64 ]; then
        LAST_LINE=$(echo "$CREATE_OUTPUT" | tail -1 | tr -d '[:space:]')
        if [ ${#LAST_LINE} -eq 64 ] && [[ "$LAST_LINE" =~ ^[a-f0-9]{64}$ ]]; then
            APP_ID="$LAST_LINE"
        fi
    fi
    
    # Pattern 3: Get last unique 64-char hex
    if [ -z "$APP_ID" ] || [ ${#APP_ID} -ne 64 ]; then
        APP_ID=$(echo "$CREATE_OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1)
    fi
    
    if [ -z "$APP_ID" ] || [ ${#APP_ID} -ne 64 ]; then
        echo -e "${RED}❌ Failed to get application ID for ${service_name}${NC}" >&2
        echo -e "${YELLOW}Full output (last 10 lines):${NC}" >&2
        echo "$CREATE_OUTPUT" | tail -10 >&2
        return 1
    fi
    
    echo -e "${GREEN}  ✅ Application created: ${APP_ID:0:16}...${NC}\n" >&2
    
    # Output only the ID to stdout (no color codes)
    echo "$APP_ID"
}

# Deploy Market Chain
echo -e "${CYAN}=== Deploying Market Chain ===${NC}\n"
MARKET_CHAIN_CONTRACT="target/wasm32-unknown-unknown/release/market-chain-contract.wasm"
MARKET_CHAIN_SERVICE="target/wasm32-unknown-unknown/release/market-chain-service.wasm"

if [ ! -f "$MARKET_CHAIN_CONTRACT" ] || [ ! -f "$MARKET_CHAIN_SERVICE" ]; then
    echo -e "${RED}❌ Market Chain WASM files not found${NC}"
    exit 1
fi

MARKET_CHAIN_PARAMS='{}'
NEW_MARKET_CHAIN_ID=$(deploy_service "Market Chain" \
    "$MARKET_CHAIN_CONTRACT" \
    "$MARKET_CHAIN_SERVICE" \
    "$MARKET_CHAIN_PARAMS")

if [ -z "$NEW_MARKET_CHAIN_ID" ]; then
    echo -e "${RED}❌ Market Chain deployment failed${NC}"
    exit 1
fi

# Deploy Registry
echo -e "${CYAN}=== Deploying Oracle Registry ===${NC}\n"
REGISTRY_CONTRACT="target/wasm32-unknown-unknown/release/oracle_registry_contract.wasm"
REGISTRY_SERVICE="target/wasm32-unknown-unknown/release/oracle_registry_service.wasm"

if [ ! -f "$REGISTRY_CONTRACT" ] || [ ! -f "$REGISTRY_SERVICE" ]; then
    echo -e "${RED}❌ Registry WASM files not found${NC}"
    exit 1
fi

REGISTRY_PARAMS='{
    "min_stake": "1000",
    "min_voters_per_market": 3,
    "max_voters_per_market": 50,
    "commit_phase_duration": 3600,
    "reveal_phase_duration": 3600,
    "base_market_fee": "10",
    "protocol_fee_percentage": 10,
    "slash_percentage": 10,
    "min_reputation": 20
}'
NEW_REGISTRY_ID=$(deploy_service "Oracle Registry" \
    "$REGISTRY_CONTRACT" \
    "$REGISTRY_SERVICE" \
    "$REGISTRY_PARAMS")

if [ -z "$NEW_REGISTRY_ID" ]; then
    echo -e "${RED}❌ Registry deployment failed${NC}"
    exit 1
fi

# Update .env.fresh
echo -e "${CYAN}📝 Updating .env.fresh...${NC}"
if [ -f .env.fresh ]; then
    # Backup
    cp .env.fresh .env.fresh.backup.$(date +%Y%m%d_%H%M%S)
    
    # Update Market Chain ID (without color codes)
    if grep -q "^export MARKET_CHAIN_ID=" .env.fresh; then
        perl -i -pe "s|^export MARKET_CHAIN_ID=.*|export MARKET_CHAIN_ID=\"${NEW_MARKET_CHAIN_ID}\"|" .env.fresh
    else
        echo "export MARKET_CHAIN_ID=\"${NEW_MARKET_CHAIN_ID}\"" >> .env.fresh
    fi
    
    # Update Registry ID (without color codes)
    if grep -q "^export ALETHEA_REGISTRY_ID=" .env.fresh; then
        perl -i -pe "s|^export ALETHEA_REGISTRY_ID=.*|export ALETHEA_REGISTRY_ID=\"${NEW_REGISTRY_ID}\"|" .env.fresh
    else
        echo "export ALETHEA_REGISTRY_ID=\"${NEW_REGISTRY_ID}\"" >> .env.fresh
    fi
    
    echo -e "${GREEN}✅ Updated .env.fresh${NC}"
else
    echo -e "${YELLOW}⚠️  .env.fresh not found, creating new one...${NC}"
    cat > .env.fresh << EOF
export CHAIN_ID="$CHAIN_ID"
export MARKET_CHAIN_ID="$NEW_MARKET_CHAIN_ID"
export ALETHEA_REGISTRY_ID="$NEW_REGISTRY_ID"
EOF
fi

# Deploy Voter Template
echo -e "${CYAN}=== Deploying Voter Template ===${NC}\n"
VOTER_TEMPLATE_CONTRACT="target/wasm32-unknown-unknown/release/voter-template-contract.wasm"
VOTER_TEMPLATE_SERVICE="target/wasm32-unknown-unknown/release/voter-template-service.wasm"

if [ ! -f "$VOTER_TEMPLATE_CONTRACT" ] || [ ! -f "$VOTER_TEMPLATE_SERVICE" ]; then
    echo -e "${RED}❌ Voter Template WASM files not found${NC}"
    exit 1
fi

VOTER_TEMPLATE_PARAMS='{}'

# Deploy Voter Template using publish-and-create
echo -e "${CYAN}📦 Deploying Voter Template...${NC}" >&2
echo -e "${YELLOW}  Publishing and creating Voter Template application...${NC}" >&2
VOTER_TEMPLATE_CREATE_OUTPUT=$(linera publish-and-create \
    "$VOTER_TEMPLATE_CONTRACT" \
    "$VOTER_TEMPLATE_SERVICE" \
    --json-parameters "$VOTER_TEMPLATE_PARAMS" 2>&1)

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to publish and create Voter Template${NC}" >&2
    echo "$VOTER_TEMPLATE_CREATE_OUTPUT" >&2
    exit 1
fi

# Extract Voter Template Application ID
NEW_VOTER_TEMPLATE_ID=$(echo "$VOTER_TEMPLATE_CREATE_OUTPUT" | grep -i "application id" | tail -1 | sed 's/.*Application ID: *\([a-f0-9]\{64\}\).*/\1/i' 2>/dev/null)
if [ -z "$NEW_VOTER_TEMPLATE_ID" ] || [ ${#NEW_VOTER_TEMPLATE_ID} -ne 64 ]; then
    LAST_LINE=$(echo "$VOTER_TEMPLATE_CREATE_OUTPUT" | tail -1 | tr -d '[:space:]')
    if [ ${#LAST_LINE} -eq 64 ] && [[ "$LAST_LINE" =~ ^[a-f0-9]{64}$ ]]; then
        NEW_VOTER_TEMPLATE_ID="$LAST_LINE"
    else
        NEW_VOTER_TEMPLATE_ID=$(echo "$VOTER_TEMPLATE_CREATE_OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1)
    fi
fi

if [ -z "$NEW_VOTER_TEMPLATE_ID" ] || [ ${#NEW_VOTER_TEMPLATE_ID} -ne 64 ]; then
    echo -e "${RED}❌ Failed to get Voter Template application ID${NC}" >&2
    echo "$VOTER_TEMPLATE_CREATE_OUTPUT" | tail -10 >&2
    exit 1
fi

echo -e "${GREEN}  ✅ Voter Template application created: ${NEW_VOTER_TEMPLATE_ID:0:16}...${NC}\n" >&2

# Get Bytecode ID for creating voter instances
# Extract from the long hex line in output
VOTER_BYTECODE_LINE=$(echo "$VOTER_TEMPLATE_CREATE_OUTPUT" | grep -E '[a-f0-9]{128,}' | head -1 | tr -d '[:space:]')
if [ -n "$VOTER_BYTECODE_LINE" ] && [ ${#VOTER_BYTECODE_LINE} -ge 64 ]; then
    VOTER_BYTECODE_ID="${VOTER_BYTECODE_LINE:0:64}"
else
    # Fallback: publish module separately to get bytecode ID
    VOTER_BYTECODE_OUTPUT=$(linera publish-module "$VOTER_TEMPLATE_CONTRACT" "$VOTER_TEMPLATE_SERVICE" 2>&1)
    VOTER_BYTECODE_LINE=$(echo "$VOTER_BYTECODE_OUTPUT" | grep -E '[a-f0-9]{128,}' | head -1 | tr -d '[:space:]')
    VOTER_BYTECODE_ID="${VOTER_BYTECODE_LINE:0:64}"
fi

# Create 3 Voter Applications from Template (using Bytecode ID)
echo -e "${CYAN}=== Creating 3 Voter Applications ===${NC}\n"
VOTER_APP_IDS=()
for i in 1 2 3; do
    echo -e "${YELLOW}  Creating Voter $i...${NC}"
    VOTER_APP_OUTPUT=$(linera create-application "$VOTER_BYTECODE_ID" \
        --json-parameters "$VOTER_TEMPLATE_PARAMS" 2>&1)
    
    # Extract Application ID - get last unique 64-char hex
    VOTER_APP_ID=$(echo "$VOTER_APP_OUTPUT" | tail -1 | tr -d '[:space:]')
    if [ ${#VOTER_APP_ID} -ne 64 ] || ! [[ "$VOTER_APP_ID" =~ ^[a-f0-9]{64}$ ]]; then
        VOTER_APP_ID=$(echo "$VOTER_APP_OUTPUT" | grep -oE '[a-f0-9]{64}' | grep -v "^${VOTER_BYTECODE_ID}$" | grep -v "^${CHAIN_ID}$" | tail -1)
    fi
    
    if [ -z "$VOTER_APP_ID" ] || [ ${#VOTER_APP_ID} -ne 64 ]; then
        echo -e "${RED}❌ Failed to get Voter $i application ID${NC}"
        echo "$VOTER_APP_OUTPUT" | tail -5
        exit 1
    fi
    
    echo -e "${GREEN}  ✅ Voter $i created: ${VOTER_APP_ID:0:16}...${NC}"
    VOTER_APP_IDS+=("$VOTER_APP_ID")
    sleep 1  # Small delay between creations
done

NEW_VOTER_1_ID="${VOTER_APP_IDS[0]}"
NEW_VOTER_2_ID="${VOTER_APP_IDS[1]}"
NEW_VOTER_3_ID="${VOTER_APP_IDS[2]}"

# Update .env.fresh with Voter Template and Voters
echo -e "${CYAN}📝 Updating .env.fresh with Voter IDs...${NC}"
if [ -f .env.fresh ]; then
    # Update Voter Template ID
    if grep -q "^export VOTER_TEMPLATE_ID=" .env.fresh; then
        perl -i -pe "s|^export VOTER_TEMPLATE_ID=.*|export VOTER_TEMPLATE_ID=\"${NEW_VOTER_TEMPLATE_ID}\"|" .env.fresh
    else
        echo "export VOTER_TEMPLATE_ID=\"${NEW_VOTER_TEMPLATE_ID}\"" >> .env.fresh
    fi
    
    # Update Voter IDs
    for i in 1 2 3; do
        VOTER_VAR="NEW_VOTER_${i}_ID"
        VOTER_ID="${!VOTER_VAR}"
        if grep -q "^export VOTER_${i}_ID=" .env.fresh; then
            perl -i -pe "s|^export VOTER_${i}_ID=.*|export VOTER_${i}_ID=\"${VOTER_ID}\"|" .env.fresh
        else
            echo "export VOTER_${i}_ID=\"${VOTER_ID}\"" >> .env.fresh
        fi
    done
    
    echo -e "${GREEN}✅ Updated .env.fresh with Voter IDs${NC}"
fi

# Summary
echo -e "\n${GREEN}✅ Deployment Complete!${NC}\n"
echo -e "${BLUE}📋 New Application IDs:${NC}"
echo -e "   Market Chain: ${NEW_MARKET_CHAIN_ID}"
echo -e "   Registry:     ${NEW_REGISTRY_ID}"
echo -e "   Voter Template: ${NEW_VOTER_TEMPLATE_ID}"
echo -e "   Voter 1:      ${NEW_VOTER_1_ID}"
echo -e "   Voter 2:      ${NEW_VOTER_2_ID}"
echo -e "   Voter 3:      ${NEW_VOTER_3_ID}"
echo ""
echo -e "${YELLOW}⚠️  Note: If linera service is running, you may need to restart it${NC}"
echo -e "${YELLOW}    to pick up the new application IDs.${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "   1. Update dashboard .env.local with new IDs"
echo -e "   2. Initialize voters: ./scripts/initialize-voters.sh"
echo -e "   3. Test mutations: ./scripts/test-workflow-complete.sh"
echo ""

