#!/bin/bash

# ============================================================================
# Initialize Multi-Wallet Voters
# Calls the initialize operation on each voter application
# ============================================================================

set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Initialize Multi-Wallet Voters                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Load configuration
if [ ! -f .env.voters ]; then
    echo -e "${RED}✗ .env.voters not found${NC}"
    echo "Please run the deployment script first."
    exit 1
fi

source .env.voters

echo -e "${CYAN}Initializing 3 voters on Conway Testnet${NC}"
echo ""

# Load registry ID from .env.fresh
if [ -f .env.fresh ]; then
    source .env.fresh
    REGISTRY_ID="${ALETHEA_REGISTRY_ID}"
else
    echo -e "${RED}✗ .env.fresh not found${NC}"
    exit 1
fi

if [ -z "${REGISTRY_ID}" ]; then
    echo -e "${RED}✗ ALETHEA_REGISTRY_ID not found in .env.fresh${NC}"
    exit 1
fi

echo -e "${CYAN}Oracle Registry ID: ${REGISTRY_ID:0:16}...${NC}"
echo -e "${CYAN}Registry Chain: ${CHAIN_ID:0:16}...${NC}"
echo ""

# ============================================================================
# Initialize Each Voter
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Initializing Voters                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

declare -a INIT_RESULTS

for i in 1 2 3; do
    WALLET_VAR="VOTER${i}_WALLET"
    KEYSTORE_VAR="VOTER${i}_KEYSTORE"
    CHAIN_VAR="VOTER${i}_CHAIN"
    APP_VAR="VOTER${i}_APP"
    OWNER_VAR="VOTER${i}_OWNER"
    
    WALLET_PATH="${!WALLET_VAR}"
    KEYSTORE_PATH="${!KEYSTORE_VAR}"
    CHAIN_ID="${!CHAIN_VAR}"
    APP_ID="${!APP_VAR}"
    OWNER="${!OWNER_VAR}"
    
    echo -e "${CYAN}Initializing Voter ${i}...${NC}"
    echo "  Chain:  ${CHAIN_ID:0:16}..."
    echo "  App:    ${APP_ID:0:16}..."
    echo "  Owner:  ${OWNER:0:16}..."
    echo ""
    
    # Create GraphQL mutation for registration to registry
    MUTATION=$(cat <<EOF
mutation {
  registerVoter(
    registryChainId: "${CHAIN_ID}",
    registryAppId: "${REGISTRY_ID}",
    voterAppId: "${APP_ID}",
    voterChainId: "${CHAIN_ID}",
    voterAddress: "${OWNER}"
  )
}
EOF
)
    
    echo "  Starting GraphQL service..."
    
    # Start service in background
    linera --wallet "${WALLET_PATH}" --keystore "${KEYSTORE_PATH}" \
        service --port $((8080 + i)) > /tmp/voter${i}-service.log 2>&1 &
    SERVICE_PID=$!
    
    echo "  Service PID: ${SERVICE_PID}"
    echo "  Waiting for service to be ready..."
    
    # Wait for service to be ready
    for j in {1..30}; do
        if curl -s http://localhost:$((8080 + i)) > /dev/null 2>&1; then
            echo -e "${GREEN}  ✓ Service ready${NC}"
            break
        fi
        
        if [ $j -eq 30 ]; then
            echo -e "${RED}  ✗ Service startup timeout${NC}"
            kill ${SERVICE_PID} 2>/dev/null || true
            INIT_RESULTS+=("FAILED")
            continue 2
        fi
        
        sleep 1
    done
    
    # Call register voter mutation
    echo "  Calling registerVoter mutation..."
    
    INIT_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"${MUTATION}\"}" \
        http://localhost:$((8080 + i))/chains/${CHAIN_ID}/applications/${APP_ID})
    
    # Check response
    if echo "${INIT_RESPONSE}" | grep -q "\"registerVoter\"" || echo "${INIT_RESPONSE}" | grep -q "\"data\""; then
        echo -e "${GREEN}  ✓ Voter ${i} registered successfully${NC}"
        INIT_RESULTS+=("SUCCESS")
    else
        echo -e "${RED}  ✗ Registration failed${NC}"
        echo "  Response: ${INIT_RESPONSE}"
        INIT_RESULTS+=("FAILED")
    fi
    
    # Stop service
    echo "  Stopping service..."
    kill ${SERVICE_PID} 2>/dev/null || true
    
    echo ""
    sleep 2
done

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Initialization Summary                                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

SUCCESS_COUNT=0
FAILED_COUNT=0

for i in {0..2}; do
    VOTER_NUM=$((i + 1))
    RESULT="${INIT_RESULTS[$i]}"
    
    if [ "${RESULT}" = "SUCCESS" ]; then
        echo -e "${GREEN}✓ Voter ${VOTER_NUM}: Initialized${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}✗ Voter ${VOTER_NUM}: Failed${NC}"
        ((FAILED_COUNT++))
    fi
done

echo ""
echo "Total: 3"
echo -e "${GREEN}Success: ${SUCCESS_COUNT}${NC}"
echo -e "${RED}Failed: ${FAILED_COUNT}${NC}"
echo ""

if [ ${SUCCESS_COUNT} -eq 3 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     ✓ All Voters Initialized!                             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Your voters are now ready to participate in oracle queries!"
    echo ""
    echo "Next steps:"
    echo "  1. Create an oracle query"
    echo "  2. Submit votes from each voter"
    echo "  3. Verify rewards distribution"
    echo ""
else
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║     ⚠ Some Initializations Failed                         ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please check the errors above and retry failed voters."
    echo ""
fi

# Save registry info to config
if ! grep -q "ALETHEA_REGISTRY_ID" .env.voters; then
    echo "" >> .env.voters
    echo "# Oracle Registry" >> .env.voters
    echo "export ALETHEA_REGISTRY_ID=\"${REGISTRY_ID}\"" >> .env.voters
    echo "export REGISTRY_CHAIN_ID=\"${CHAIN_ID}\"" >> .env.voters
    echo -e "${GREEN}✓ Registry info saved to .env.voters${NC}"
fi
