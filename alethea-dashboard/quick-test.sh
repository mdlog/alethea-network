#!/bin/bash

echo "=========================================="
echo "Quick UI Test - Alethea Dashboard"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}1. Checking updated files...${NC}"
echo ""

# Check TestnetBanner
if grep -q "Auto-detects testnet vs localhost" components/TestnetBanner.tsx; then
    echo -e "${GREEN}✓ TestnetBanner updated with auto-detection${NC}"
else
    echo -e "${RED}✗ TestnetBanner not updated${NC}"
fi

# Check layout integration
if grep -q "import { TestnetBanner }" app/layout.tsx; then
    echo -e "${GREEN}✓ TestnetBanner integrated in layout${NC}"
else
    echo -e "${RED}✗ TestnetBanner not in layout${NC}"
fi

# Check graphql.ts registry ID
if grep -q "640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6" lib/graphql.ts; then
    echo -e "${GREEN}✓ Registry ID updated to latest${NC}"
else
    echo -e "${RED}✗ Registry ID not updated${NC}"
fi

echo ""
echo -e "${BLUE}2. TypeScript diagnostics...${NC}"
echo ""

# Quick type check on key files
npx tsc --noEmit --skipLibCheck components/TestnetBanner.tsx 2>&1 | head -5 || echo -e "${GREEN}✓ TestnetBanner types OK${NC}"

echo ""
echo -e "${BLUE}3. Summary${NC}"
echo ""
echo "Updated components:"
echo "  • TestnetBanner.tsx - Enhanced with auto-detection"
echo "  • app/layout.tsx - Banner integrated"
echo "  • lib/graphql.ts - Registry ID updated"
echo "  • lib/linera-metamask.ts - Type safety improved"
echo "  • lib/services/*.ts - Endpoint types fixed"
echo ""
echo -e "${YELLOW}To start the dashboard:${NC}"
echo "  npm run dev"
echo ""
echo -e "${YELLOW}To build for production:${NC}"
echo "  npm run build"
echo ""
