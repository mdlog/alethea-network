#!/bin/bash

# Alethea Oracle SDK - Release Preparation Script
# This script helps prepare the SDK for a stable release

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CURRENT_VERSION=$(node -p "require('./package.json').version")
NEW_VERSION=${1:-"1.0.0"}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Alethea Oracle SDK - Release Preparation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Current version: ${YELLOW}${CURRENT_VERSION}${NC}"
echo -e "Target version:  ${GREEN}${NEW_VERSION}${NC}"
echo ""

# Confirm with user
read -p "Continue with release preparation? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Release preparation cancelled${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 1: Running pre-release checks...${NC}"

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: Not on main branch (current: ${CURRENT_BRANCH})${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: Uncommitted changes detected${NC}"
    echo "Please commit or stash your changes before releasing"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${RED}Error: Working directory is not clean${NC}"
    git status --short
    exit 1
fi

echo -e "${GREEN}✓ Git checks passed${NC}"

echo ""
echo -e "${BLUE}Step 2: Running tests...${NC}"

# Run tests
if npm test; then
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Running linter...${NC}"

# Run linter
if npm run lint; then
    echo -e "${GREEN}✓ Linting passed${NC}"
else
    echo -e "${RED}✗ Linting failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Building package...${NC}"

# Clean and build
npm run clean
if npm run build; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 5: Checking package size...${NC}"

# Pack and check size
npm pack
PACKAGE_FILE="alethea-oracle-sdk-${NEW_VERSION}.tgz"
if [ -f "$PACKAGE_FILE" ]; then
    PACKAGE_SIZE=$(du -h "$PACKAGE_FILE" | cut -f1)
    echo -e "Package size: ${YELLOW}${PACKAGE_SIZE}${NC}"
    
    # Warn if package is too large (> 1MB)
    SIZE_BYTES=$(stat -f%z "$PACKAGE_FILE" 2>/dev/null || stat -c%s "$PACKAGE_FILE" 2>/dev/null)
    if [ "$SIZE_BYTES" -gt 1048576 ]; then
        echo -e "${YELLOW}Warning: Package size is larger than 1MB${NC}"
    fi
    
    rm "$PACKAGE_FILE"
else
    echo -e "${RED}Error: Package file not created${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 6: Updating version...${NC}"

# Update version in package.json
npm version "$NEW_VERSION" --no-git-tag-version

echo -e "${GREEN}✓ Version updated to ${NEW_VERSION}${NC}"

echo ""
echo -e "${BLUE}Step 7: Updating CHANGELOG...${NC}"

# Check if CHANGELOG has been updated
if grep -q "## \[${NEW_VERSION}\]" CHANGELOG.md; then
    echo -e "${GREEN}✓ CHANGELOG already updated for ${NEW_VERSION}${NC}"
else
    echo -e "${YELLOW}Warning: CHANGELOG not updated for ${NEW_VERSION}${NC}"
    echo "Please update CHANGELOG.md before proceeding"
fi

echo ""
echo -e "${BLUE}Step 8: Creating release commit...${NC}"

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: bump version to ${NEW_VERSION}"

echo -e "${GREEN}✓ Release commit created${NC}"

echo ""
echo -e "${BLUE}Step 9: Creating release tag...${NC}"

# Create tag
git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"

echo -e "${GREEN}✓ Tag v${NEW_VERSION} created${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release preparation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes: git show HEAD"
echo "2. Push the commit: git push origin main"
echo "3. Push the tag: git push origin v${NEW_VERSION}"
echo "4. Publish to npm: npm publish"
echo "5. Create GitHub release"
echo ""
echo -e "${YELLOW}Note: The commit and tag have been created locally but not pushed${NC}"
echo -e "${YELLOW}Review everything before pushing!${NC}"
echo ""

# Offer to push
read -p "Push commit and tag now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Pushing to origin..."
    git push origin main
    git push origin "v${NEW_VERSION}"
    echo -e "${GREEN}✓ Pushed to origin${NC}"
    
    # Offer to publish
    read -p "Publish to npm now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Publishing to npm..."
        npm publish
        echo -e "${GREEN}✓ Published to npm${NC}"
        echo ""
        echo -e "${GREEN}Release complete! 🎉${NC}"
        echo "Don't forget to create a GitHub release!"
    else
        echo "Skipping npm publish"
        echo "Run 'npm publish' when ready"
    fi
else
    echo "Skipping push"
    echo "Run the following commands when ready:"
    echo "  git push origin main"
    echo "  git push origin v${NEW_VERSION}"
    echo "  npm publish"
fi
