#!/bin/bash

# ============================================================================
# Multi-Chain Voters Test (Single Wallet, Multiple Chains)
# Practical approach: One wallet, separate chains per voter
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Conway Testnet Faucet
FAUCET_URL="https://faucet.testnet-conway.linera.net"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Multi-Chain Voters Test                                ║${NC}"
echo -e "${BLUE}║     Single Wallet, Separate Chains                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Approach:${NC}"
echo "  • Use your existing wallet"
echo "  • Create separate chains for each voter"
echo "  • Each voter gets their own chain and application"
echo ""

echo -e "${YELLOW}Note:${NC}"
echo "  This is practical for testing, but in production:"
echo "  • Each voter should have their own wallet"
echo "  • This ensures proper asset ownership"
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

# Check wallet
echo -e "${YELLOW}[Check] Verifying wallet...${NC}"
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

# Voter names
declare -a VOTER_NAMES=("Alice" "Bob" "Charlie")
declare -a CHAIN_IDS
declare -a VOTER_APP_IDS

# ============================================================================
# Step 1: Request Chains from Faucet
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Step 1: Request Chains from Faucet                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    
    echo -e "${CYAN}Requesting chain for ${VOTER_NAME}...${NC}"
    
    # Request new chain from faucet
    CHAIN_OUTPUT=$(timeout 60s linera wallet request-chain --faucet "${FAUCET_URL}" 2>&1)
    EXIT_CODE=$?
    
    if [ ${EXIT_CODE} -eq 124 ]; then
        echo -e "${RED}✗ Faucet request timed out${NC}"
        echo ""
        echo -e "${YELLOW}Faucet might be slow or down. Try again later.${NC}"
        exit 1
    elif [ ${EXIT_CODE} -ne 0 ]; then
        echo -e "${RED}✗ Failed to request chain${NC}"
        echo "${CHAIN_OUTPUT}"
        exit 1
    fi
    
    # Extract chain ID
    NEW_CHAIN=$(echo "${CHAIN_OUTPUT}" | grep -oP 'Chain ID: \K[a-f0-9]+' | tail -1)
    
    if [ -z "${NEW_CHAIN}" ]; then
        # Try alternative parsing
        NEW_CHAIN=$(echo "${CHAIN_OUTPUT}" | grep -oP '[a-f0-9]{64}' | tail -1)
    fi
    
    if [ -z "${NEW_CHAIN}" ]; then
        echo -e "${RED}✗ Failed to get chain ID${NC}"
        echo "${CHAIN_OUTPUT}"
        exit 1
    fi
    
    CHAIN_IDS+=("${NEW_CHAIN}")
    
    echo -e "${GREEN}✓ Chain created: ${NEW_CHAIN:0:16}...${NC}"
    echo ""
    
    # Delay to avoid rate limiting
    sleep 3
done

# ============================================================================
# Step 2: Deploy Voter Applications
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Step 2: Deploy Voter Applications                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    CHAIN_ID="${CHAIN_IDS[$i]}"
    
    echo -e "${CYAN}Deploying voter for ${VOTER_NAME}...${NC}"
    echo "  Chain: ${CHAIN_ID:0:16}..."
    echo ""
    
    # Deploy voter application on specific chain
    echo "  Publishing and creating voter application..."
    DEPLOY_OUTPUT=$(timeout 90s linera project publish-and-create \
        --path voter-template \
        --json-parameters '{}' \
        --with-chain-id "${CHAIN_ID}" 2>&1)
    EXIT_CODE=$?
    
    if [ ${EXIT_CODE} -eq 124 ]; then
        echo -e "${RED}✗ Deployment timed out${NC}"
        exit 1
    elif [ ${EXIT_CODE} -ne 0 ]; then
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
    
    sleep 2
done

# ============================================================================
# Step 3: Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deployment Summary                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    echo -e "${CYAN}${VOTER_NAME}'s Voter:${NC}"
    echo "  Chain:   ${CHAIN_IDS[$i]}"
    echo "  Voter:   ${VOTER_APP_IDS[$i]}"
    echo ""
done

# ============================================================================
# Step 4: Save Configuration
# ============================================================================
echo -e "${YELLOW}[Save] Updating .env.fresh...${NC}"

cat >> .env.fresh << EOF

# Multi-Chain Voters Test
# Generated: $(date)

# Alice
export ALICE_CHAIN="${CHAIN_IDS[0]}"
export ALICE_VOTER="${VOTER_APP_IDS[0]}"

# Bob
export BOB_CHAIN="${CHAIN_IDS[1]}"
export BOB_VOTER="${VOTER_APP_IDS[1]}"

# Charlie
export CHARLIE_CHAIN="${CHAIN_IDS[2]}"
export CHARLIE_VOTER="${VOTER_APP_IDS[2]}"
EOF

echo -e "${GREEN}✓ Configuration saved to .env.fresh${NC}"
echo ""

# ============================================================================
# Step 5: Architecture Explanation
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Architecture Achieved                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Chain Isolation:${NC}"
echo "  • Each voter on separate chain"
echo "  • Independent state management"
echo "  • No interference between voters"
echo ""

echo -e "${GREEN}✓ Application Ownership:${NC}"
echo "  • Each voter has unique application ID"
echo "  • Can be queried independently"
echo "  • Ready for cross-chain messaging"
echo ""

echo -e "${YELLOW}⚠️  Production Note:${NC}"
echo "  • This uses ONE wallet for all voters"
echo "  • In production, each voter needs their own wallet"
echo "  • Separate wallets = proper asset ownership"
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Test voting with each voter"
echo "  2. Verify cross-chain messaging"
echo "  3. Check state isolation"
echo ""

echo -e "${GREEN}Test complete! 🎉${NC}"
echo ""
