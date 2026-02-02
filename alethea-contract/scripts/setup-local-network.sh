#!/bin/bash

# ============================================================================
# Setup Local Linera Network for Testing
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Setup Local Linera Network                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}This will:${NC}"
echo "  1. Stop any existing local network"
echo "  2. Create a fresh local network"
echo "  3. Initialize a new wallet"
echo "  4. Test chain creation"
echo ""
echo -e "${YELLOW}⚠️  This will REPLACE your current wallet!${NC}"
echo "Make sure you backup any important data first."
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""

# Step 1: Kill existing processes
echo -e "${YELLOW}[1] Cleaning up existing processes...${NC}"
pkill -9 linera 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ Cleanup done${NC}"
echo ""

# Step 2: Backup existing wallet
echo -e "${YELLOW}[2] Backing up existing wallet...${NC}"
WALLET_DIR="$HOME/.config/linera"
BACKUP_DIR="$HOME/.config/linera.backup.$(date +%s)"

if [ -d "${WALLET_DIR}" ]; then
    mv "${WALLET_DIR}" "${BACKUP_DIR}"
    echo -e "${GREEN}✓ Wallet backed up to: ${BACKUP_DIR}${NC}"
else
    echo -e "${CYAN}No existing wallet found${NC}"
fi
echo ""

# Step 3: Start local network
echo -e "${YELLOW}[3] Starting local Linera network...${NC}"
echo "This will create a local validator and network..."
echo ""

# Create temporary directory for network
NETWORK_DIR="/tmp/linera-network-$$"
mkdir -p "${NETWORK_DIR}"

echo "Network directory: ${NETWORK_DIR}"
echo ""

# Initialize local network
linera net up --extra-wallets 2 --testing-prng-seed 37 2>&1 | tee "${NETWORK_DIR}/network.log" &
NETWORK_PID=$!

echo "Network starting (PID: ${NETWORK_PID})..."
echo "Waiting for network to be ready..."

# Wait for network to be ready (check for wallet creation)
for i in {1..30}; do
    if [ -f "$HOME/.config/linera/wallet.json" ]; then
        echo -e "${GREEN}✓ Network is ready!${NC}"
        break
    fi
    
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Network startup timeout${NC}"
        kill ${NETWORK_PID} 2>/dev/null || true
        exit 1
    fi
    
    echo -n "."
    sleep 1
done
echo ""
echo ""

# Step 4: Verify wallet
echo -e "${YELLOW}[4] Verifying wallet...${NC}"
WALLET_INFO=$(linera wallet show 2>&1)
echo "${WALLET_INFO}" | head -10
echo ""

# Get default chain
DEFAULT_CHAIN=$(echo "${WALLET_INFO}" | grep -oP '[a-f0-9]{64}' | head -1)
echo -e "${GREEN}✓ Default chain: ${DEFAULT_CHAIN:0:16}...${NC}"
echo ""

# Step 5: Test chain creation
echo -e "${YELLOW}[5] Testing chain creation...${NC}"
NEW_CHAIN_OUTPUT=$(linera open-chain 2>&1)
NEW_CHAIN=$(echo "${NEW_CHAIN_OUTPUT}" | grep -oP 'Chain ID: \K[a-f0-9]+' | tail -1)

if [ -n "${NEW_CHAIN}" ]; then
    echo -e "${GREEN}✓ Successfully created test chain: ${NEW_CHAIN:0:16}...${NC}"
else
    echo -e "${RED}✗ Failed to create test chain${NC}"
    echo "${NEW_CHAIN_OUTPUT}"
    exit 1
fi
echo ""

# Step 6: Save network info
echo -e "${YELLOW}[6] Saving network configuration...${NC}"

cat > .env.local << EOF
# Local Linera Network Configuration
# Generated: $(date)

# Network
export LINERA_NETWORK="local"
export LINERA_NETWORK_DIR="${NETWORK_DIR}"
export LINERA_NETWORK_PID="${NETWORK_PID}"

# Wallet
export LINERA_WALLET="$HOME/.config/linera/wallet.json"

# Default Chain
export DEFAULT_CHAIN_ID="${DEFAULT_CHAIN}"

# Test Chain
export TEST_CHAIN_ID="${NEW_CHAIN}"

# Backup
export WALLET_BACKUP="${BACKUP_DIR}"
EOF

echo -e "${GREEN}✓ Configuration saved to .env.local${NC}"
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Local Network Ready!                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ Local network is running${NC}"
echo -e "${GREEN}✓ Wallet initialized${NC}"
echo -e "${GREEN}✓ Chain creation works${NC}"
echo ""

echo -e "${CYAN}Network Info:${NC}"
echo "  PID: ${NETWORK_PID}"
echo "  Directory: ${NETWORK_DIR}"
echo "  Default Chain: ${DEFAULT_CHAIN:0:16}..."
echo ""

echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Source the local config:"
echo "     source .env.local"
echo ""
echo "  2. Run diagnostic:"
echo "     ./scripts/check-linera-setup.sh"
echo ""
echo "  3. Run multi-wallet test:"
echo "     ./scripts/test-multi-wallet-voters.sh"
echo ""

echo -e "${YELLOW}To stop the network:${NC}"
echo "  kill ${NETWORK_PID}"
echo ""

echo -e "${YELLOW}To restore old wallet:${NC}"
echo "  mv ${BACKUP_DIR} $HOME/.config/linera"
echo ""
