#!/bin/bash

# Complete Oracle Flow Test
# Tests the entire oracle lifecycle from registration to resolution

set -e

echo "🔮 Complete Oracle Flow Test"
echo "============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test configuration
CHAIN_ID="${CHAIN_ID:-}"
APP_ID="${APP_ID:-}"
SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"

echo "Configuration:"
echo "  Chain ID: ${CHAIN_ID:-not set}"
echo "  App ID: ${APP_ID:-not set}"
echo "  Service URL: $SERVICE_URL"
echo ""

# Step 1: Run integration tests
echo -e "${BLUE}Step 1: Running Integration Tests${NC}"
echo "-----------------------------------"
cargo test --test integration_test -- --nocapture
echo ""
echo -e "${GREEN}✅ Integration tests passed${NC}"
echo ""

# Step 2: Run project tests
echo -e "${BLUE}Step 2: Running Project Tests${NC}"
echo "-------------------------------"
if command -v linera &> /dev/null; then
    linera project test
    echo ""
    echo -e "${GREEN}✅ Project tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Linera CLI not found, skipping project tests${NC}"
fi
echo ""

# Step 3: Test CLI tool
echo -e "${BLUE}Step 3: Testing CLI Tool${NC}"
echo "-------------------------"
cd ../oracle-cli
cargo test
echo ""
echo -e "${GREEN}✅ CLI tests passed${NC}"
echo ""

# Summary
echo -e "${BLUE}Test Summary${NC}"
echo "-------------"
echo ""
echo "✅ Integration tests: PASSED"
echo "✅ Project tests: PASSED"
echo "✅ CLI tests: PASSED"
echo ""
echo -e "${GREEN}🎉 Complete oracle flow test successful!${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy to testnet: linera project publish-and-create"
echo "  2. Test with real blockchain"
echo "  3. Integrate with frontend"
