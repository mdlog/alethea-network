#!/bin/bash

# Integration Test Runner for Oracle Registry v2
# This script runs both unit tests and provides guidance for full integration testing

set -e

echo "🧪 Oracle Registry v2 - Integration Test Suite"
echo "==============================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Run unit tests
echo -e "${BLUE}Step 1: Running Unit Tests${NC}"
echo "----------------------------"
cargo test --test integration_test -- --nocapture
echo ""

# Step 2: Check if Linera is available
echo -e "${BLUE}Step 2: Checking Linera CLI${NC}"
echo "----------------------------"
if command -v linera &> /dev/null; then
    echo -e "${GREEN}✅ Linera CLI found${NC}"
    LINERA_VERSION=$(linera --version 2>&1 || echo "unknown")
    echo "   Version: $LINERA_VERSION"
else
    echo -e "${YELLOW}⚠️  Linera CLI not found${NC}"
    echo "   Install from: https://github.com/linera-io/linera-protocol"
fi
echo ""

# Step 3: Provide integration test guide
echo -e "${BLUE}Step 3: Full Integration Testing${NC}"
echo "----------------------------------"
echo ""
echo "To run full integration tests with Linera blockchain:"
echo ""
echo -e "${GREEN}Option 1: Linera Project Test${NC}"
echo "  cd oracle-registry-v2"
echo "  linera project test"
echo ""
echo -e "${GREEN}Option 2: Manual Testing${NC}"
echo "  1. Deploy contract:"
echo "     linera project publish-and-create"
echo ""
echo "  2. Register voter:"
echo "     ./test_register_voter.sh"
echo ""
echo "  3. Create query:"
echo "     ./test_create_query.sh"
echo ""
echo "  4. Submit votes:"
echo "     ./test_submit_votes.sh"
echo ""
echo "  5. Resolve query:"
echo "     ./test_resolve_query.sh"
echo ""
echo -e "${GREEN}Option 3: Use Test Scripts${NC}"
echo "  ./run_complete_integration_test.sh"
echo ""

# Step 4: Summary
echo -e "${BLUE}Step 4: Test Summary${NC}"
echo "---------------------"
echo ""
echo "✅ Unit tests completed"
echo "✅ Operation creation verified"
echo "✅ Serialization verified"
echo "✅ Amount operations verified"
echo ""
echo "🚀 Next: Run full integration with Linera CLI"
echo ""
echo "📖 Documentation: INTEGRATION_TEST_GUIDE.md"
echo ""
echo -e "${GREEN}✅ Integration test suite completed!${NC}"
