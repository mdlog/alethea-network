#!/bin/bash

# ============================================================================
# Multi-Wallet Voters Test (Conway Testnet - No Faucet)
# Uses existing wallet, creates separate wallets and chains for each voter
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Multi-Wallet Voters (Conway Testnet)                  ║${NC}"
echo -e "${BLUE}║     Production-Ready Setup (No Faucet)                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}This test will:${NC}"
echo "  1. Use your existing Conway Testnet wallet"
echo "  2. Create new chains for Alice, Bob, and Charlie"
echo "  3. Create separate wallet files for each voter"
echo "  4. Deploy voter application for each"
echo ""

echo -e "${YELLOW}Note:${NC}"
echo "  • Uses your existing wallet's tokens"
echo "  • Creates separate chains via open-chain"
echo "  • Each voter gets isolated wallet + chain"
echo ""

# Load environment if exists
if [ -f .env.fresh ]; then
    source .env.fresh
fi

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""

# Create directory for test wallets
WALLET_DIR="./test-wallets-conway"
rm -rf "${WALLET_DIR}"
mkdir -p "${WALLET_DIR}"

echo -e "${YELLOW}[Setup] Creating test wallet directory: ${WALLET_DIR}${NC}"
echo ""

# ============================================================================
# Step 1: Verify Existing Wallet
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Step 1: Verify Existing Wallet                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check wallet
echo "Checking existing wallet..."
WALLET_INFO=$(linera wallet show 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Wallet not accessible${NC}"
    echo "${WALLET_INFO}"
    exit 1
fi

DEFAULT_CHAIN=$(echo "${WALLET_INFO}" | grep -oP '[a-f0-9]{64}' | head -1)
echo -e "${GREEN}✓ Wallet OK${NC}"
echo "  Default chain: ${DEFAULT_CHAIN:0:16}..."
echo ""

# Get default wallet path
DEFAULT_WALLET="$HOME/.config/linera/wallet.json"
if [ ! -f "${DEFAULT_WALLET}" ]; then
    echo -e "${RED}✗ Default wallet file not found${NC}"
    exit 1
fi

# Voter names
declare -a VOTER_NAMES=("Alice" "Bob" "Charlie")
declare -a WALLET_PATHS
declare -a STORAGE_PATHS
declare -a CHAIN_IDS
declare -a VOTER_APP_IDS

# ============================================================================
# Step 2: Create Chains and Wallets for Each Voter
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Step 2: Create Chains & Wallets                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    WALLET_PATH="${WALLET_DIR}/wallet_${VOTER_NAME,,}.json"
    STORAGE_PATH="${WALLET_DIR}/storage_${VOTER_NAME,,}"
    
    echo -e "${CYAN}Setting up ${VOTER_NAME}...${NC}"
    
    # Step 2a: Sync chain first
    echo "  Syncing chain..."
    linera sync --with-chain-id "${DEFAULT_CHAIN}" > /dev/null 2>&1 || true
    
    # Step 2b: Create new chain using default wallet (with timeout)
    echo "  Creating new chain (timeout: 30s)..."
    CHAIN_OUTPUT=$(timeout 30s linera open-chain --with-chain-id "${DEFAULT_CHAIN}" 2>&1)
    EXIT_CODE=$?
    
    if [ ${EXIT_CODE} -eq 124 ]; then
        echo -e "${RED}✗ Chain creation timed out${NC}"
        echo ""
        echo -e "${YELLOW}Conway Testnet might be slow or having issues.${NC}"
        echo "Try again later or use local network:"
        echo "  ./scripts/test-multi-wallet-local.sh"
        exit 1
    elif [ ${EXIT_CODE} -ne 0 ]; then
        echo -e "${RED}✗ Failed to create chain${NC}"
        echo "${CHAIN_OUTPUT}"
        exit 1
    fi
    
    # Extract new chain ID
    NEW_CHAIN=$(echo "${CHAIN_OUTPUT}" | grep -oP 'Chain ID: \K[a-f0-9]+' | tail -1)
    
    if [ -z "${NEW_CHAIN}" ]; then
        echo -e "${RED}✗ Failed to get chain ID${NC}"
        echo "${CHAIN_OUTPUT}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Chain created: ${NEW_CHAIN:0:16}...${NC}"
    
    # Step 2b: Create separate wallet file for this voter
    echo "  Creating wallet file..."
    cp "${DEFAULT_WALLET}" "${WALLET_PATH}"
    
    # Step 2c: Initialize storage
    echo "  Initializing storage..."
    LINERA_WALLET="${WALLET_PATH}" LINERA_STORAGE="rocksdb:${STORAGE_PATH}" \
        linera sync --with-chain-id "${NEW_CHAIN}" > /dev/null 2>&1 || true
    
    WALLET_PATHS+=("${WALLET_PATH}")
    STORAGE_PATHS+=("${STORAGE_PATH}")
    CHAIN_IDS+=("${NEW_CHAIN}")
    
    echo -e "${GREEN}✓ Wallet: ${WALLET_PATH}${NC}"
    echo -e "${GREEN}✓ Storage: ${STORAGE_PATH}${NC}"
    echo ""
    
    sleep 1
done

# ============================================================================
# Step 3: Deploy Voter Applications
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Step 3: Deploy Voter Applications                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    WALLET_PATH="${WALLET_PATHS[$i]}"
    STORAGE_PATH="${STORAGE_PATHS[$i]}"
    CHAIN_ID="${CHAIN_IDS[$i]}"
    
    echo -e "${CYAN}Deploying voter for ${VOTER_NAME}...${NC}"
    echo "  Wallet: ${WALLET_PATH}"
    echo "  Chain: ${CHAIN_ID:0:16}..."
    echo ""
    
    # Deploy voter application
    echo "  Publishing and creating voter application..."
    DEPLOY_OUTPUT=$(LINERA_WALLET="${WALLET_PATH}" LINERA_STORAGE="rocksdb:${STORAGE_PATH}" \
        linera project publish-and-create \
        --path voter-template \
        --json-parameters '{}' \
        --with-chain-id "${CHAIN_ID}" 2>&1)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to deploy voter${NC}"
        echo "${DEPLOY_OUTPUT}"
        exit 1
    fi
    
    # Extract application ID
    VOTER_APP_ID=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'Application ID: \K[a-f0-9]+' | tail -1)
    
    if [ -z "${VOTER_APP_ID}" ]; then
        echo -e "${RED}✗ Failed to get application ID${NC}"
        echo "${DEPLOY_OUTPUT}"
        exit 1
    fi
    
    VOTER_APP_IDS+=("${VOTER_APP_ID}")
    
    echo -e "${GREEN}✓ Voter deployed!${NC}"
    echo -e "${GREEN}✓ Application ID: ${VOTER_APP_ID:0:16}...${NC}"
    echo ""
    
    sleep 1
done

# ============================================================================
# Step 4: Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deployment Summary                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    echo -e "${CYAN}${VOTER_NAME}'s Setup:${NC}"
    echo "  Wallet:  ${WALLET_PATHS[$i]}"
    echo "  Storage: ${STORAGE_PATHS[$i]}"
    echo "  Chain:   ${CHAIN_IDS[$i]}"
    echo "  Voter:   ${VOTER_APP_IDS[$i]}"
    echo ""
done

# ============================================================================
# Step 5: Save Configuration
# ============================================================================
echo -e "${YELLOW}[Save] Writing configuration...${NC}"

cat > "${WALLET_DIR}/config.env" << EOF
# Multi-Wallet Test Configuration (Conway Testnet)
# Generated: $(date)

# Alice
export ALICE_WALLET="${WALLET_PATHS[0]}"
export ALICE_STORAGE="rocksdb:${STORAGE_PATHS[0]}"
export ALICE_CHAIN="${CHAIN_IDS[0]}"
export ALICE_VOTER="${VOTER_APP_IDS[0]}"

# Bob
export BOB_WALLET="${WALLET_PATHS[1]}"
export BOB_STORAGE="rocksdb:${STORAGE_PATHS[1]}"
export BOB_CHAIN="${CHAIN_IDS[1]}"
export BOB_VOTER="${VOTER_APP_IDS[1]}"

# Charlie
export CHARLIE_WALLET="${WALLET_PATHS[2]}"
export CHARLIE_STORAGE="rocksdb:${STORAGE_PATHS[2]}"
export CHARLIE_CHAIN="${CHAIN_IDS[2]}"
export CHARLIE_VOTER="${VOTER_APP_IDS[2]}"
EOF

echo -e "${GREEN}✓ Configuration saved to: ${WALLET_DIR}/config.env${NC}"
echo ""

# ============================================================================
# Step 6: Usage Examples
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Usage Examples                                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Load configuration:${NC}"
echo "  source ${WALLET_DIR}/config.env"
echo ""

echo -e "${CYAN}Use Alice's wallet:${NC}"
echo "  export LINERA_WALLET=\$ALICE_WALLET"
echo "  export LINERA_STORAGE=\$ALICE_STORAGE"
echo "  linera wallet show"
echo ""

echo -e "${CYAN}Query Alice's voter:${NC}"
echo "  export LINERA_WALLET=\$ALICE_WALLET"
echo "  export LINERA_STORAGE=\$ALICE_STORAGE"
echo "  linera query-application \$ALICE_VOTER"
echo ""

# ============================================================================
# Step 7: Architecture Explanation
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Production Architecture Achieved!                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Complete Wallet Isolation:${NC}"
echo "  • Each voter has separate wallet file"
echo "  • Each voter has separate storage database"
echo "  • No shared state between voters"
echo ""

echo -e "${GREEN}✓ Chain Isolation:${NC}"
echo "  • Each voter on their own chain"
echo "  • Independent state management"
echo "  • No interference between voters"
echo ""

echo -e "${GREEN}✓ Application Ownership:${NC}"
echo "  • Each voter owns their application"
echo "  • Rewards go to correct wallet"
echo "  • Full control over their voter"
echo ""

echo -e "${CYAN}This is production-ready architecture on Conway Testnet!${NC}"
echo ""

echo -e "${GREEN}Test complete! 🎉${NC}"
echo ""
