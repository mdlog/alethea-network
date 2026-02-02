#!/bin/bash
# Manual Instantiation of Registry Contract
# Use this if publish-and-create doesn't automatically instantiate

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Manual Registry Contract Instantiation                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load deployment info
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOYMENT_INFO="$SCRIPT_DIR/../deployment-info.txt"

if [ ! -f "$DEPLOYMENT_INFO" ]; then
    echo -e "${RED}❌ deployment-info.txt not found${NC}"
    exit 1
fi

REGISTRY_APP_ID=$(grep "^REGISTRY_APP_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)
CHAIN_ID=$(grep "^CHAIN_ID=" "$DEPLOYMENT_INFO" | cut -d'=' -f2)

echo -e "${YELLOW}Contract Info:${NC}"
echo "  Registry App ID: $REGISTRY_APP_ID"
echo "  Chain ID: $CHAIN_ID"
echo ""

# Check if contract exists
echo -e "${YELLOW}[1] Checking if contract exists...${NC}"
pkill -f "linera service" 2>/dev/null || true
sleep 2
linera service --port 8080 > /tmp/linera-service.log 2>&1 &
sleep 5

REGISTRY_ENDPOINT="http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID"
RESPONSE=$(curl -s -X POST "$REGISTRY_ENDPOINT" \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}')

if echo "$RESPONSE" | grep -q "minStake"; then
    echo -e "${GREEN}✓ Contract is already instantiated!${NC}"
    exit 0
elif echo "$RESPONSE" | grep -q "Failed to load state\|BcsError\|Eof\|unreachable"; then
    echo -e "${YELLOW}⚠ Contract exists but not instantiated${NC}"
else
    echo -e "${RED}✗ Contract not found or error${NC}"
    echo "$RESPONSE"
    exit 1
fi
echo ""

# Note: Linera doesn't support manual instantiation after creation
# publish-and-create should handle it automatically
echo -e "${YELLOW}[2] Attempting manual instantiation...${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT:${NC}"
echo ""
echo "Linera's `publish-and-create` dengan `--json-argument` seharusnya"
echo "otomatis memanggil `instantiate()`. Jika tidak terjadi, kemungkinan:"
echo ""
echo "1. Instantiation message tidak pernah dibuat"
echo "2. Instantiation message dibuat tapi tidak diproses"
echo "3. Ada error saat instantiation yang tidak terlihat"
echo ""
echo -e "${YELLOW}Solutions:${NC}"
echo ""
echo "Option 1: Wait and retry process-inbox"
echo "  pkill -f 'linera service'"
echo "  linera sync"
echo "  linera process-inbox"
echo "  linera service --port 8080 &"
echo "  sleep 10"
echo "  ./test-new-deployment.sh"
echo ""
echo "Option 2: Redeploy with explicit verification"
echo "  cd alethea-contract/scripts"
echo "  ./deploy-complete-system.sh"
echo "  # After deployment, immediately:"
echo "  pkill -f 'linera service'"
echo "  linera sync"
echo "  linera process-inbox"
echo "  # Check output for instantiation messages"
echo ""
echo "Option 3: Check deployment logs"
echo "  Look for 'Initializing Oracle Registry' or 'Hub initialized' messages"
echo "  If not found, instantiation never happened"
echo ""
