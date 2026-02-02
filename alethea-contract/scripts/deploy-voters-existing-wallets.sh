#!/bin/bash

# ============================================================================
# Deploy Voter Applications to Existing Wallets
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
echo -e "${BLUE}║     Deploy Voters to Existing Wallets                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Voter configurations
declare -a VOTER_NAMES=("Voter_1" "Voter_2" "Voter_3")
declare -a WALLET_PATHS=(
    "/home/mdlog/.config/linera/voter1.json"
    "/home/mdlog/.config/linera/voter2.json"
    "/home/mdlog/.config/linera/voter3.json"
)
declare -a KEYSTORE_PATHS=(
    "/home/mdlog/.config/linera/keystore_voter1.json"
    "/home/mdlog/.config/linera/keystore_voter2.json"
    "/home/mdlog/.config/linera/keystore_voter3.json"
)
declare -a CHAIN_IDS=(
    "8cc803028a02b29eb5fb7fa01152dbf65c1aeb8c8fe9d0192658ddbe781eb70a"
    "42f545cfb7e67e7c1748d6ff8166a0badf728c4213322fbad2b268876649c24a"
    "b88a902b901b96210349fde24673171c58b6c64b3bc209cbe3bbe9bbf3745ad2"
)
declare -a ACCOUNT_OWNERS=(
    "0x2c31eeb0a92972320598746e560ae866c4d278c00f8f5367e47214b0fe72c4cc"
    "0xfd3ba9bdcba0b4c71a59235fa214a3f529737814e7cc00c4a3e38f3eecd7f7a1"
    "0xd0b5b75cd82b35e0a1b8c4da495ca2b1f8036297c3d514ddc567cccf3e1e99c2"
)

declare -a VOTER_APP_IDS

echo -e "${CYAN}Existing Wallets:${NC}"
for i in {0..2}; do
    echo "  ${VOTER_NAMES[$i]}:"
    echo "    Wallet:  ${WALLET_PATHS[$i]}"
    echo "    Chain:   ${CHAIN_IDS[$i]:0:16}..."
    echo "    Owner:   ${ACCOUNT_OWNERS[$i]:0:16}..."
    echo ""
done

read -p "Deploy voter applications to these wallets? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""

# ============================================================================
# Deploy Voter Applications
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deploying Voter Applications                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    WALLET_PATH="${WALLET_PATHS[$i]}"
    KEYSTORE_PATH="${KEYSTORE_PATHS[$i]}"
    CHAIN_ID="${CHAIN_IDS[$i]}"
    
    echo -e "${CYAN}Deploying voter for ${VOTER_NAME}...${NC}"
    echo "  Wallet:  ${WALLET_PATH}"
    echo "  Chain:   ${CHAIN_ID:0:16}..."
    echo ""
    
    # Check if wallet exists
    if [ ! -f "${WALLET_PATH}" ]; then
        echo -e "${RED}✗ Wallet file not found: ${WALLET_PATH}${NC}"
        exit 1
    fi
    
    # Check if keystore exists
    if [ ! -f "${KEYSTORE_PATH}" ]; then
        echo -e "${RED}✗ Keystore file not found: ${KEYSTORE_PATH}${NC}"
        exit 1
    fi
    
    # Deploy voter application
    echo "  Publishing and creating voter application (this may take 30-60s)..."
    DEPLOY_OUTPUT=$(timeout 120s linera --wallet "${WALLET_PATH}" --keystore "${KEYSTORE_PATH}" \
        project publish-and-create voter-template \
        --json-parameters '{}' 2>&1)
    EXIT_CODE=$?
    
    if [ ${EXIT_CODE} -eq 124 ]; then
        echo -e "${RED}✗ Deployment timed out (120s)${NC}"
        echo "This might indicate network issues or slow compilation."
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
    echo -e "${GREEN}✓ Application ID: ${VOTER_APP_ID}${NC}"
    echo ""
    
    sleep 1
done

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Deployment Summary                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in {0..2}; do
    VOTER_NAME="${VOTER_NAMES[$i]}"
    echo -e "${CYAN}${VOTER_NAME}:${NC}"
    echo "  Wallet:  ${WALLET_PATHS[$i]}"
    echo "  Chain:   ${CHAIN_IDS[$i]}"
    echo "  Owner:   ${ACCOUNT_OWNERS[$i]}"
    echo "  Voter:   ${VOTER_APP_IDS[$i]}"
    echo ""
done

# ============================================================================
# Save Configuration
# ============================================================================
echo -e "${YELLOW}[Save] Writing configuration...${NC}"

cat > .env.voters << EOF
# Multi-Wallet Voter Configuration
# Generated: $(date)

# Voter 1
export VOTER1_WALLET="${WALLET_PATHS[0]}"
export VOTER1_KEYSTORE="${KEYSTORE_PATHS[0]}"
export VOTER1_CHAIN="${CHAIN_IDS[0]}"
export VOTER1_OWNER="${ACCOUNT_OWNERS[0]}"
export VOTER1_APP="${VOTER_APP_IDS[0]}"

# Voter 2
export VOTER2_WALLET="${WALLET_PATHS[1]}"
export VOTER2_KEYSTORE="${KEYSTORE_PATHS[1]}"
export VOTER2_CHAIN="${CHAIN_IDS[1]}"
export VOTER2_OWNER="${ACCOUNT_OWNERS[1]}"
export VOTER2_APP="${VOTER_APP_IDS[1]}"

# Voter 3
export VOTER3_WALLET="${WALLET_PATHS[2]}"
export VOTER3_KEYSTORE="${KEYSTORE_PATHS[2]}"
export VOTER3_CHAIN="${CHAIN_IDS[2]}"
export VOTER3_OWNER="${ACCOUNT_OWNERS[2]}"
export VOTER3_APP="${VOTER_APP_IDS[2]}"

# Aliases
alias linera-voter1='linera --wallet \$VOTER1_WALLET --keystore \$VOTER1_KEYSTORE'
alias linera-voter2='linera --wallet \$VOTER2_WALLET --keystore \$VOTER2_KEYSTORE'
alias linera-voter3='linera --wallet \$VOTER3_WALLET --keystore \$VOTER3_KEYSTORE'
EOF

echo -e "${GREEN}✓ Configuration saved to: .env.voters${NC}"
echo ""

# ============================================================================
# Usage Guide
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Usage Guide                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Load configuration:${NC}"
echo "  source .env.voters"
echo ""

echo -e "${CYAN}Use Voter 1:${NC}"
echo "  linera-voter1 wallet show"
echo "  linera-voter1 query-application \$VOTER1_APP"
echo ""

echo -e "${CYAN}Use Voter 2:${NC}"
echo "  linera-voter2 wallet show"
echo "  linera-voter2 query-application \$VOTER2_APP"
echo ""

echo -e "${CYAN}Use Voter 3:${NC}"
echo "  linera-voter3 wallet show"
echo "  linera-voter3 query-application \$VOTER3_APP"
echo ""

# ============================================================================
# Architecture Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Production Architecture Achieved!                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Complete Wallet Isolation:${NC}"
echo "  • Each voter has separate wallet file"
echo "  • Each voter has separate keystore"
echo "  • Each voter has their own private keys"
echo ""

echo -e "${GREEN}✓ Chain Isolation:${NC}"
echo "  • Each voter on separate chain"
echo "  • Independent state management"
echo "  • No interference between voters"
echo ""

echo -e "${GREEN}✓ Application Ownership:${NC}"
echo "  • Each voter owns their application"
echo "  • Rewards go to correct wallet"
echo "  • Full control per voter"
echo ""

echo -e "${CYAN}This is EXACTLY production architecture!${NC}"
echo ""

echo -e "${GREEN}Deployment complete! 🎉${NC}"
echo ""
