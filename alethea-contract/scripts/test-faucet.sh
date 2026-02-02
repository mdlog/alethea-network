#!/bin/bash

# Quick test of Conway Testnet faucet

set +e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FAUCET_URL="https://faucet.testnet-conway.linera.net"

echo ""
echo -e "${BLUE}Testing Conway Testnet Faucet${NC}"
echo ""

# Test 1: HTTP connectivity
echo -e "${YELLOW}[1] Testing HTTP connectivity...${NC}"
HTTP_RESPONSE=$(timeout 10s curl -s -o /dev/null -w "%{http_code}" "${FAUCET_URL}" 2>&1)

if [ $? -eq 124 ]; then
    echo -e "${RED}✗ Connection timed out${NC}"
    echo "Faucet URL: ${FAUCET_URL}"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "  • Faucet is down"
    echo "  • Network connectivity problem"
    echo "  • Firewall blocking connection"
    exit 1
elif [ "${HTTP_RESPONSE}" = "200" ] || [ "${HTTP_RESPONSE}" = "404" ]; then
    echo -e "${GREEN}✓ Faucet is reachable (HTTP ${HTTP_RESPONSE})${NC}"
else
    echo -e "${YELLOW}⚠ Unexpected response: ${HTTP_RESPONSE}${NC}"
fi
echo ""

# Test 2: Try to create wallet
echo -e "${YELLOW}[2] Testing wallet creation with faucet...${NC}"
TEST_WALLET="./test-wallets/test_faucet.json"
mkdir -p ./test-wallets
rm -f "${TEST_WALLET}"

echo "Creating test wallet (timeout: 60s)..."
WALLET_OUTPUT=$(timeout 60s bash -c "LINERA_WALLET='${TEST_WALLET}' linera wallet init --faucet '${FAUCET_URL}'" 2>&1)
EXIT_CODE=$?

if [ ${EXIT_CODE} -eq 124 ]; then
    echo -e "${RED}✗ Wallet creation timed out${NC}"
    echo ""
    echo -e "${YELLOW}The faucet is not responding.${NC}"
    echo "This could mean:"
    echo "  • Conway Testnet is down for maintenance"
    echo "  • Faucet service is overloaded"
    echo "  • Network issue on your end"
    echo ""
    echo -e "${BLUE}Alternative: Use local network${NC}"
    echo "  ./scripts/setup-local-network.sh"
    exit 1
elif [ ${EXIT_CODE} -ne 0 ]; then
    echo -e "${RED}✗ Wallet creation failed${NC}"
    echo ""
    echo "Error output:"
    echo "${WALLET_OUTPUT}"
    exit 1
else
    echo -e "${GREEN}✓ Wallet created successfully!${NC}"
    
    # Check if wallet file exists
    if [ -f "${TEST_WALLET}" ]; then
        echo -e "${GREEN}✓ Wallet file exists: ${TEST_WALLET}${NC}"
        
        # Get chain ID
        CHAIN_ID=$(LINERA_WALLET="${TEST_WALLET}" linera wallet show 2>&1 | grep -oP '[a-f0-9]{64}' | head -1)
        
        if [ -n "${CHAIN_ID}" ]; then
            echo -e "${GREEN}✓ Chain ID: ${CHAIN_ID:0:16}...${NC}"
            echo ""
            echo -e "${GREEN}Faucet is working! You can proceed with multi-wallet test.${NC}"
        fi
    fi
fi
echo ""
