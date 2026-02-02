#!/bin/bash

# ============================================================================
# Check Linera Setup - Diagnostic Tool
# ============================================================================

set +e  # Don't exit on errors

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Linera Setup Diagnostic                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check 1: Linera binary
echo -e "${YELLOW}[1] Checking Linera binary...${NC}"
if command -v linera &> /dev/null; then
    LINERA_VERSION=$(linera --version 2>&1 | head -1)
    echo -e "${GREEN}✓ Linera found: ${LINERA_VERSION}${NC}"
else
    echo -e "${RED}✗ Linera binary not found${NC}"
    exit 1
fi
echo ""

# Check 2: Wallet
echo -e "${YELLOW}[2] Checking wallet...${NC}"
WALLET_CHECK=$(linera wallet show 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Wallet accessible${NC}"
    echo "${WALLET_CHECK}" | head -5
else
    echo -e "${RED}✗ Wallet not accessible${NC}"
    echo "${WALLET_CHECK}"
fi
echo ""

# Check 3: Environment file
echo -e "${YELLOW}[3] Checking .env.fresh...${NC}"
if [ -f .env.fresh ]; then
    echo -e "${GREEN}✓ .env.fresh exists${NC}"
    source .env.fresh
    
    if [ -n "${ORACLE_APP_ID}" ]; then
        echo -e "${GREEN}✓ ORACLE_APP_ID set: ${ORACLE_APP_ID:0:16}...${NC}"
    else
        echo -e "${YELLOW}⚠ ORACLE_APP_ID not set${NC}"
    fi
    
    if [ -n "${ORACLE_CHAIN_ID}" ]; then
        echo -e "${GREEN}✓ ORACLE_CHAIN_ID set: ${ORACLE_CHAIN_ID:0:16}...${NC}"
    else
        echo -e "${YELLOW}⚠ ORACLE_CHAIN_ID not set${NC}"
    fi
else
    echo -e "${RED}✗ .env.fresh not found${NC}"
fi
echo ""

# Check 4: Try to query chain (this tests network connectivity)
echo -e "${YELLOW}[4] Testing network connectivity...${NC}"
if [ -n "${ORACLE_CHAIN_ID}" ]; then
    echo "Querying chain ${ORACLE_CHAIN_ID:0:16}..."
    QUERY_RESULT=$(timeout 10s linera query-balance 2>&1)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Network connectivity OK${NC}"
        echo "${QUERY_RESULT}" | head -3
    else
        echo -e "${RED}✗ Network query failed or timed out${NC}"
        echo "${QUERY_RESULT}"
        echo ""
        echo -e "${YELLOW}Possible issues:${NC}"
        echo "  • Linera service not running"
        echo "  • Network validator not accessible"
        echo "  • Firewall blocking connection"
    fi
else
    echo -e "${YELLOW}⚠ Skipping (no ORACLE_CHAIN_ID)${NC}"
fi
echo ""

# Check 5: Try to create a chain (the actual problem)
echo -e "${YELLOW}[5] Testing chain creation...${NC}"
echo "Attempting to create a new chain (timeout: 15s)..."
CHAIN_TEST=$(timeout 15s linera open-chain 2>&1)
CHAIN_EXIT=$?

if [ ${CHAIN_EXIT} -eq 124 ]; then
    echo -e "${RED}✗ Chain creation TIMED OUT${NC}"
    echo ""
    echo -e "${YELLOW}This is the problem!${NC}"
    echo ""
    echo "The 'linera open-chain' command is hanging."
    echo "This usually means:"
    echo "  1. Linera service is not running"
    echo "  2. Network validator is not accessible"
    echo ""
    echo -e "${BLUE}Solution:${NC}"
    echo "Start Linera service in a separate terminal:"
    echo "  linera service --port 8080"
    echo ""
    echo "Or if using a local network:"
    echo "  linera net up"
    echo ""
elif [ ${CHAIN_EXIT} -eq 0 ]; then
    NEW_CHAIN=$(echo "${CHAIN_TEST}" | grep -oP 'Chain ID: \K[a-f0-9]+' | tail -1)
    if [ -n "${NEW_CHAIN}" ]; then
        echo -e "${GREEN}✓ Chain creation works!${NC}"
        echo "New chain: ${NEW_CHAIN:0:16}..."
        echo ""
        echo -e "${GREEN}Your setup is ready for multi-wallet tests!${NC}"
    else
        echo -e "${YELLOW}⚠ Chain created but couldn't parse ID${NC}"
        echo "${CHAIN_TEST}"
    fi
else
    echo -e "${RED}✗ Chain creation failed${NC}"
    echo "${CHAIN_TEST}"
fi
echo ""

# Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Summary                                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ ${CHAIN_EXIT} -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "You can run: ./scripts/test-multi-wallet-voters.sh"
else
    echo -e "${RED}✗ Setup incomplete${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Make sure Linera service is running"
    echo "  2. Check network connectivity"
    echo "  3. Re-run this diagnostic"
fi
echo ""
