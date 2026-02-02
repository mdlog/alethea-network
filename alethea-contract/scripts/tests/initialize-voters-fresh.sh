#!/bin/bash
# Initialize and Register Voters for Fresh Deployment

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment
source .env.fresh

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔧 Initialize & Register Voters                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Configuration:${NC}"
echo "Chain ID: ${CHAIN_ID:0:16}..."
echo "Registry: ${ALETHEA_REGISTRY_ID:0:16}..."
echo "Voter 1: ${VOTER_1_ID:0:16}..."
echo "Voter 2: ${VOTER_2_ID:0:16}..."
echo "Voter 3: ${VOTER_3_ID:0:16}..."
echo ""

# Step 1: Initialize Voter 1
echo -e "${YELLOW}📝 Step 1/6: Initializing Voter 1...${NC}"
curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_1_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { initialize(registryId: \\\"${ALETHEA_REGISTRY_ID}\\\", initialStake: \\\"1000000000000\\\") }\"}" \
  | jq '.' || echo "Note: Voter may already be initialized or mutation not available"
echo -e "${GREEN}✓ Voter 1 initialization attempted${NC}\n"

sleep 2

# Step 2: Initialize Voter 2
echo -e "${YELLOW}📝 Step 2/6: Initializing Voter 2...${NC}"
curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_2_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { initialize(registryId: \\\"${ALETHEA_REGISTRY_ID}\\\", initialStake: \\\"2000000000000\\\") }\"}" \
  | jq '.' || echo "Note: Voter may already be initialized or mutation not available"
echo -e "${GREEN}✓ Voter 2 initialization attempted${NC}\n"

sleep 2

# Step 3: Initialize Voter 3
echo -e "${YELLOW}📝 Step 3/6: Initializing Voter 3...${NC}"
curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_3_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { initialize(registryId: \\\"${ALETHEA_REGISTRY_ID}\\\", initialStake: \\\"3000000000000\\\") }\"}" \
  | jq '.' || echo "Note: Voter may already be initialized or mutation not available"
echo -e "${GREEN}✓ Voter 3 initialization attempted${NC}\n"

sleep 2

# Step 4: Register Voter 1 to Registry
echo -e "${YELLOW}📝 Step 4/6: Registering Voter 1 to Registry...${NC}"
curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { registerVoter(voterId: \\\"${VOTER_1_ID}\\\", stake: \\\"1000\\\") }\"}" \
  | jq '.' || echo "Note: Registration may require different approach"
echo -e "${GREEN}✓ Voter 1 registration attempted${NC}\n"

sleep 2

# Step 5: Register Voter 2 to Registry
echo -e "${YELLOW}📝 Step 5/6: Registering Voter 2 to Registry...${NC}"
curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { registerVoter(voterId: \\\"${VOTER_2_ID}\\\", stake: \\\"2000\\\") }\"}" \
  | jq '.' || echo "Note: Registration may require different approach"
echo -e "${GREEN}✓ Voter 2 registration attempted${NC}\n"

sleep 2

# Step 6: Register Voter 3 to Registry
echo -e "${YELLOW}📝 Step 6/6: Registering Voter 3 to Registry...${NC}"
curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { registerVoter(voterId: \\\"${VOTER_3_ID}\\\", stake: \\\"3000\\\") }\"}" \
  | jq '.' || echo "Note: Registration may require different approach"
echo -e "${GREEN}✓ Voter 3 registration attempted${NC}\n"

sleep 2

# Verify Registration
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  📊 Verification                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}Checking Registry Stats...${NC}"
curl -s "http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets activeMarkets totalVoters } }"}' \
  | jq '.'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Note:${NC} If totalVoters is still 0, voters may need to be registered"
echo -e "via Linera operations instead of GraphQL mutations."
echo ""
echo -e "${YELLOW}Alternative approach:${NC}"
echo "  linera execute-operation --application-id \$VOTER_1_ID ..."
echo ""
