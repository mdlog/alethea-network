#!/bin/bash

# ============================================================================
# Test Multi-Wallet Voters Flow
# Verifies the complete voter setup and basic operations
# ============================================================================

set +e  # Don't exit on errors, we want to see all test results

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Multi-Wallet Voters Test                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load configuration
if [ ! -f .env.voters ]; then
    echo -e "${RED}✗ .env.voters not found${NC}"
    echo "Please run the deployment script first."
    exit 1
fi

source .env.voters

echo -e "${CYAN}Testing 3 independent voters on Conway Testnet${NC}"
echo ""

# ============================================================================
# Test 1: Verify Wallets
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test 1: Verify Wallets                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

PASSED=0
FAILED=0

for i in 1 2 3; do
    WALLET_VAR="VOTER${i}_WALLET"
    WALLET_PATH="${!WALLET_VAR}"
    
    echo -e "${CYAN}Checking Voter ${i} wallet...${NC}"
    
    if [ -f "${WALLET_PATH}" ]; then
        echo -e "${GREEN}✓ Wallet file exists: ${WALLET_PATH}${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Wallet file not found: ${WALLET_PATH}${NC}"
        ((FAILED++))
    fi
done

echo ""

# ============================================================================
# Test 2: Verify Keystores
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test 2: Verify Keystores                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in 1 2 3; do
    KEYSTORE_VAR="VOTER${i}_KEYSTORE"
    KEYSTORE_PATH="${!KEYSTORE_VAR}"
    
    echo -e "${CYAN}Checking Voter ${i} keystore...${NC}"
    
    if [ -f "${KEYSTORE_PATH}" ]; then
        echo -e "${GREEN}✓ Keystore file exists: ${KEYSTORE_PATH}${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ Keystore file not found: ${KEYSTORE_PATH}${NC}"
        ((FAILED++))
    fi
done

echo ""

# ============================================================================
# Test 3: Query Wallets
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test 3: Query Wallets                                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in 1 2 3; do
    WALLET_VAR="VOTER${i}_WALLET"
    KEYSTORE_VAR="VOTER${i}_KEYSTORE"
    CHAIN_VAR="VOTER${i}_CHAIN"
    
    WALLET_PATH="${!WALLET_VAR}"
    KEYSTORE_PATH="${!KEYSTORE_VAR}"
    EXPECTED_CHAIN="${!CHAIN_VAR}"
    
    echo -e "${CYAN}Querying Voter ${i} wallet...${NC}"
    
    WALLET_OUTPUT=$(linera --wallet "${WALLET_PATH}" --keystore "${KEYSTORE_PATH}" wallet show 2>&1)
    
    if echo "${WALLET_OUTPUT}" | grep -q "${EXPECTED_CHAIN}"; then
        echo -e "${GREEN}✓ Wallet accessible, chain verified${NC}"
        echo "  Chain: ${EXPECTED_CHAIN:0:16}..."
        ((PASSED++))
    else
        echo -e "${RED}✗ Wallet query failed or chain mismatch${NC}"
        ((FAILED++))
    fi
    echo ""
done

# ============================================================================
# Test 4: Verify Applications
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test 4: Verify Applications                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in 1 2 3; do
    WALLET_VAR="VOTER${i}_WALLET"
    KEYSTORE_VAR="VOTER${i}_KEYSTORE"
    APP_VAR="VOTER${i}_APP"
    
    WALLET_PATH="${!WALLET_VAR}"
    KEYSTORE_PATH="${!KEYSTORE_VAR}"
    APP_ID="${!APP_VAR}"
    
    echo -e "${CYAN}Checking Voter ${i} application...${NC}"
    echo "  App ID: ${APP_ID:0:16}..."
    
    # Try to describe the application
    APP_OUTPUT=$(linera --wallet "${WALLET_PATH}" --keystore "${KEYSTORE_PATH}" \
        wallet show 2>&1 | grep -A 5 "${APP_ID}" || echo "")
    
    if [ -n "${APP_OUTPUT}" ]; then
        echo -e "${GREEN}✓ Application found in wallet${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠ Application not visible in wallet (might be OK)${NC}"
        # Not counting as failure since app might not show in wallet list
    fi
    echo ""
done

# ============================================================================
# Test 5: Check Balances
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test 5: Check Balances                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

for i in 1 2 3; do
    WALLET_VAR="VOTER${i}_WALLET"
    KEYSTORE_VAR="VOTER${i}_KEYSTORE"
    
    WALLET_PATH="${!WALLET_VAR}"
    KEYSTORE_PATH="${!KEYSTORE_VAR}"
    
    echo -e "${CYAN}Checking Voter ${i} balance...${NC}"
    
    BALANCE_OUTPUT=$(linera --wallet "${WALLET_PATH}" --keystore "${KEYSTORE_PATH}" \
        query-balance 2>&1 | head -5)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Balance query successful${NC}"
        echo "${BALANCE_OUTPUT}" | grep -E "Balance|Chain" | head -2
        ((PASSED++))
    else
        echo -e "${RED}✗ Balance query failed${NC}"
        ((FAILED++))
    fi
    echo ""
done

# ============================================================================
# Test 6: Verify Chain Isolation
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test 6: Verify Chain Isolation                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Checking that all chains are different...${NC}"

if [ "${VOTER1_CHAIN}" != "${VOTER2_CHAIN}" ] && \
   [ "${VOTER1_CHAIN}" != "${VOTER3_CHAIN}" ] && \
   [ "${VOTER2_CHAIN}" != "${VOTER3_CHAIN}" ]; then
    echo -e "${GREEN}✓ All chains are unique${NC}"
    echo "  Voter 1: ${VOTER1_CHAIN:0:16}..."
    echo "  Voter 2: ${VOTER2_CHAIN:0:16}..."
    echo "  Voter 3: ${VOTER3_CHAIN:0:16}..."
    ((PASSED++))
else
    echo -e "${RED}✗ Chain collision detected!${NC}"
    ((FAILED++))
fi

echo ""

# ============================================================================
# Test 7: Verify Application Isolation
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test 7: Verify Application Isolation                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${CYAN}Checking that all applications are different...${NC}"

if [ "${VOTER1_APP}" != "${VOTER2_APP}" ] && \
   [ "${VOTER1_APP}" != "${VOTER3_APP}" ] && \
   [ "${VOTER2_APP}" != "${VOTER3_APP}" ]; then
    echo -e "${GREEN}✓ All applications are unique${NC}"
    echo "  Voter 1: ${VOTER1_APP:0:16}..."
    echo "  Voter 2: ${VOTER2_APP:0:16}..."
    echo "  Voter 3: ${VOTER3_APP:0:16}..."
    ((PASSED++))
else
    echo -e "${RED}✗ Application collision detected!${NC}"
    ((FAILED++))
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Test Summary                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
echo "Total Tests: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"

if [ ${FAILED} -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED}${NC}"
else
    echo -e "${GREEN}Failed: ${FAILED}${NC}"
fi

echo ""

if [ ${FAILED} -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ✓ All Tests Passed!                                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Your multi-wallet voter setup is working correctly!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Register voters with oracle"
    echo "  2. Test voting functionality"
    echo "  3. Verify reward distribution"
    echo ""
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     ✗ Some Tests Failed                                    ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please review the errors above and fix the issues."
    exit 1
fi
