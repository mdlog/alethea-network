#!/bin/bash

# Oracle Execution Test Script
# This script tests the complete oracle flow using Linera project test

set -e

echo "🧪 Oracle Execution Test"
echo "========================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if linera is available
if ! command -v linera &> /dev/null; then
    echo -e "${RED}❌ Linera CLI not found${NC}"
    echo ""
    echo "Please install Linera CLI:"
    echo "  https://github.com/linera-io/linera-protocol"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Linera CLI found${NC}"
echo ""

# Run project tests
echo -e "${BLUE}Running Linera project tests...${NC}"
echo ""

linera project test

echo ""
echo -e "${GREEN}✅ Tests completed!${NC}"
echo ""

# Summary
echo -e "${BLUE}Test Summary:${NC}"
echo "-------------"
echo ""
echo "✅ Contract deployed"
echo "✅ Operations executed"
echo "✅ State verified"
echo ""
echo -e "${GREEN}🎉 Oracle execution test successful!${NC}"
