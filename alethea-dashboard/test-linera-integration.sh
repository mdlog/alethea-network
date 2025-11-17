#!/bin/bash

# Linera Integration Test Script
# This script performs basic checks on the Linera integration

echo "🧪 Linera Integration Test Suite"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test
test_check() {
    local name=$1
    local command=$2
    
    echo -n "Testing: $name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Check if dashboard is running
test_check "Dashboard is running" "curl -s http://localhost:4000 > /dev/null"

# Test 2: Check if demo page exists
test_check "Demo page accessible" "curl -s http://localhost:4000/linera-demo | grep -q 'Linera'"

# Test 3: Check if service file exists
test_check "Service file exists" "test -f lib/services/linera-client.ts"

# Test 4: Check if hooks file exists
test_check "Hooks file exists" "test -f hooks/useLineraClient.ts"

# Test 5: Check if wallet component exists
test_check "Wallet component exists" "test -f components/LineraWalletConnect.tsx"

# Test 6: Check if counter component exists
test_check "Counter component exists" "test -f components/LineraCounterDemo.tsx"

# Test 7: Check if demo page exists
test_check "Demo page exists" "test -f app/linera-demo/page.tsx"

# Test 8: Check if @linera/client is installed
test_check "@linera/client installed" "test -d node_modules/@linera/client"

# Test 9: Check if linera_web.js exists
test_check "linera_web.js exists" "test -f node_modules/@linera/client/dist/linera_web.js"

# Test 10: Check if documentation exists
test_check "Documentation exists" "test -f LINERA_QUICKSTART.md"

echo ""
echo "================================"
echo "Test Results:"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "🎉 Linera integration is ready for testing!"
    echo ""
    echo "Next steps:"
    echo "1. Open browser: http://localhost:4000/linera-demo"
    echo "2. Click 'Initialize Linera'"
    echo "3. Click 'Create Wallet (Testnet)'"
    echo "4. Test counter increment"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Please check the failed tests and fix issues."
    echo ""
    exit 1
fi
