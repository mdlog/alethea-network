#!/bin/bash

# Test UI Updates and Testnet Banner
# This script tests the updated UI components

set -e

echo "=========================================="
echo "Testing UI Updates and Testnet Banner"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the dashboard directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in dashboard directory${NC}"
    echo "Please run this script from alethea-dashboard directory"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking environment configuration...${NC}"
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local found${NC}"
    echo ""
    echo "Current configuration:"
    grep "NEXT_PUBLIC_" .env.local | head -5
    echo ""
else
    echo -e "${RED}✗ .env.local not found${NC}"
    exit 1
fi

echo -e "${BLUE}Step 2: Checking updated components...${NC}"
COMPONENTS=(
    "components/TestnetBanner.tsx"
    "app/layout.tsx"
    "components/VoterRegistrationWithPolling.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo -e "${GREEN}✓ $component exists${NC}"
    else
        echo -e "${RED}✗ $component not found${NC}"
        exit 1
    fi
done
echo ""

echo -e "${BLUE}Step 3: Verifying TestnetBanner integration...${NC}"
if grep -q "TestnetBanner" "app/layout.tsx"; then
    echo -e "${GREEN}✓ TestnetBanner imported in layout${NC}"
else
    echo -e "${RED}✗ TestnetBanner not found in layout${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 4: Installing dependencies (if needed)...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
fi
echo ""

echo -e "${BLUE}Step 5: Building the application...${NC}"
echo "This will verify that all TypeScript code compiles correctly..."
npm run build 2>&1 | tee build.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${RED}✗ Build failed. Check build.log for details${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}Step 6: Component Features Summary${NC}"
echo ""
echo "TestnetBanner Features:"
echo "  • Auto-detects testnet vs localhost"
echo "  • Shows warning only on testnet"
echo "  • Dismissible banner"
echo "  • Visual indicators for transaction status"
echo "  • Explains testnet delays"
echo ""
echo "VoterRegistrationWithPolling Features:"
echo "  • Multi-state UI (idle, submitting, pending, confirming, confirmed, timeout, error)"
echo "  • Progress bar during confirmation"
echo "  • Certificate hash display"
echo "  • Timeout handling with explanation"
echo "  • User-friendly error messages"
echo ""

echo -e "${BLUE}Step 7: Testing checklist${NC}"
echo ""
echo "Manual testing steps:"
echo "1. Start the dashboard: npm run dev"
echo "2. Open http://localhost:3000"
echo "3. Verify TestnetBanner appears (if not on localhost)"
echo "4. Test voter registration flow"
echo "5. Verify all states display correctly"
echo "6. Check certificate hash is shown"
echo "7. Test timeout handling"
echo ""

echo -e "${GREEN}=========================================="
echo "UI Update Test Complete!"
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Start the dashboard: cd alethea-dashboard && npm run dev"
echo "2. Open http://localhost:3000 in your browser"
echo "3. Test the voter registration flow"
echo "4. Verify the testnet banner behavior"
echo ""
echo "To test on testnet:"
echo "1. Update .env.local with testnet URLs"
echo "2. Restart the dashboard"
echo "3. Banner should appear automatically"
echo ""
