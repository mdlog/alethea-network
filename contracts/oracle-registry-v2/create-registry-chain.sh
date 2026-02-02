#!/bin/bash

# Create Registry Chain and Deploy Oracle Registry v2
# This script creates a dedicated chain for the Oracle Registry

set -e

echo "🔗 Creating Registry Chain for Alethea Oracle"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Create new chain
echo -e "${BLUE}Step 1: Creating new chain...${NC}"
REGISTRY_CHAIN_OUTPUT=$(linera open-chain 2>&1)
echo "$REGISTRY_CHAIN_OUTPUT"

# Extract chain ID from output
REGISTRY_CHAIN_ID=$(echo "$REGISTRY_CHAIN_OUTPUT" | grep -oP 'e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65[0-9a-f]{64}' | head -1)

if [ -z "$REGISTRY_CHAIN_ID" ]; then
    echo -e "${RED}❌ Failed to create chain${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Registry Chain created: $REGISTRY_CHAIN_ID${NC}"
echo ""

# Step 2: Show wallet
echo -e "${BLUE}Step 2: Current wallet status${NC}"
linera wallet show
echo ""

# Step 3: Build contract
echo -e "${BLUE}Step 3: Building Oracle Registry v2...${NC}"
cd ../..
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GRE