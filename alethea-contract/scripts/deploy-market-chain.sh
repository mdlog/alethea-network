#!/bin/bash

# 🚀 Deploy Market Chain untuk Alethea Dashboard
# Script ini akan deploy Market Chain dan output Application ID

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}🚀 Deploying Market Chain${NC}\n"

# Check if Market Chain is already built
BUILD_DIR="target/wasm32-unknown-unknown/release"
CONTRACT_WASM="${BUILD_DIR}/market-chain-contract.wasm"
SERVICE_WASM="${BUILD_DIR}/market-chain-service.wasm"

if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
    echo -e "${YELLOW}⚠️  Market Chain WASM files not found. Building...${NC}\n"
    cargo build --release --target wasm32-unknown-unknown -p alethea-market-chain 2>&1 | grep -E "(error|Finished|Compiling)" || true
    
    if [ ! -f "$CONTRACT_WASM" ] || [ ! -f "$SERVICE_WASM" ]; then
        echo -e "${RED}❌ Build failed. Please check errors above.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Build successful${NC}\n"
fi

# Load environment
if [ -f .env.conway ]; then
    source .env.conway
    echo -e "${BLUE}📋 Loaded environment from .env.conway${NC}"
    echo -e "${BLUE}   Chain ID: ${CHAIN_ID:-'Not set'}${NC}\n"
fi

# Deploy Market Chain
echo -e "${CYAN}📦 Deploying Market Chain...${NC}\n"

DEPLOY_OUTPUT=$(linera publish-and-create \
    "$CONTRACT_WASM" \
    "$SERVICE_WASM" \
    --json-argument 'null' 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract Application ID
MARKET_CHAIN_ID=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Application ID: \K[a-f0-9]{64}' | head -1)

if [ -z "$MARKET_CHAIN_ID" ]; then
    echo -e "\n${RED}❌ Failed to extract Market Chain Application ID${NC}"
    echo -e "${YELLOW}⚠️  Please check the output above for errors${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Market Chain deployed successfully!${NC}\n"
echo -e "${GREEN}📋 Market Chain Application ID:${NC} ${MARKET_CHAIN_ID}\n"

# Get Chain ID if not set
if [ -z "$CHAIN_ID" ]; then
    CHAIN_ID=$(linera wallet show 2>&1 | grep -oP 'Default chain: \K[a-f0-9]{64}' | head -1)
    if [ -z "$CHAIN_ID" ]; then
        CHAIN_ID="a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221"
        echo -e "${YELLOW}⚠️  Using default Chain ID: ${CHAIN_ID}${NC}"
    fi
fi

MARKET_CHAIN_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID}"

echo -e "${CYAN}📝 Configuration untuk .env.local:${NC}\n"
echo -e "${BLUE}NEXT_PUBLIC_MARKET_CHAIN_URL=${MARKET_CHAIN_URL}${NC}\n"

echo -e "${GREEN}✨ Next steps:${NC}"
echo -e "1. Copy URL di atas"
echo -e "2. Tambahkan ke file ${YELLOW}alethea-dashboard/.env.local${NC}"
echo -e "3. Restart Next.js dev server"
echo -e "4. Refresh dashboard\n"

# Save to file
echo "MARKET_CHAIN_ID=${MARKET_CHAIN_ID}" > market-chain-id.txt
echo "MARKET_CHAIN_URL=${MARKET_CHAIN_URL}" >> market-chain-id.txt
echo -e "${GREEN}✅ Saved to market-chain-id.txt${NC}\n"

