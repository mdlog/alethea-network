#!/bin/bash

# Rebuild and Deploy Oracle Registry V2
# After updating GraphQL mutations in service.rs

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "========================================="
echo "Rebuild and Deploy Oracle Registry V2"
echo "========================================="
echo ""

# Step 1: Clean build
echo -e "${BLUE}Step 1: Cleaning previous build...${NC}"
cd oracle-registry-v2
cargo clean
echo -e "${GREEN}✓ Clean complete${NC}"
echo ""

# Step 2: Build contract
echo -e "${BLUE}Step 2: Building contract...${NC}"
cargo build --release
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Run tests
echo -e "${BLUE}Step 3: Running tests...${NC}"
cargo test --release
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Some tests failed (continuing anyway)${NC}"
fi
echo ""

# Step 4: Publish and create
echo -e "${BLUE}Step 4: Publishing to Linera...${NC}"
echo -e "${YELLOW}Note: This will create a new application instance${NC}"
echo -e "${YELLOW}Make sure to update APP_ID in .env.local after deployment${NC}"
echo ""

linera project publish-and-create

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Update your .env.local with the new Application ID!${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Copy the Application ID from above"
echo "2. Update alethea-dashboard/.env.local:"
echo "   NEXT_PUBLIC_APP_ID=<new_app_id>"
echo "3. Restart the dashboard: npm run dev"
echo "4. Test voter registration"
echo ""
