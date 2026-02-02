#!/bin/bash

# Script untuk mengecek balance treasury dan statistik token
set -e

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "alethea-dashboard-vite/.env.local" ]; then
    source <(grep -v '^#' alethea-dashboard-vite/.env.local | sed 's/VITE_//g' | sed 's/^/export /')
fi

# Configuration
SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"
TOKEN_CHAIN="${TOKEN_CHAIN_ID}"
TOKEN_APP="${TOKEN_APP_ID}"
TREASURY_OWNER="${TREASURY_OWNER}"
REGISTRY_APP="${REGISTRY_APP_ID}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   CEK BALANCE TREASURY & TOKEN INFO${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Token Chain:${NC} ${TOKEN_CHAIN}"
echo -e "${YELLOW}Token App:${NC} ${TOKEN_APP}"
echo -e "${YELLOW}Treasury Owner:${NC} ${TREASURY_OWNER}"
echo ""

# Get treasury balance
echo -e "${GREEN}📊 Mengambil balance treasury...${NC}"
TREASURY_BALANCE=$(curl -s -X POST "${SERVICE_URL}/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ accounts { entry(key: \\\"${TREASURY_OWNER}\\\") { value } } }\"}" | jq -r '.data.accounts.entry.value // "0"')

echo -e "${CYAN}Treasury Balance:${NC} ${TREASURY_BALANCE} ALTH"
echo ""

# Get registry balance
echo -e "${GREEN}📊 Mengambil balance registry...${NC}"
REGISTRY_BALANCE=$(curl -s -X POST "${SERVICE_URL}/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ accounts { entry(key: \\\"0x${REGISTRY_APP}\\\") { value } } }\"}" | jq -r '.data.accounts.entry.value // "0"')

echo -e "${CYAN}Registry Balance:${NC} ${REGISTRY_BALANCE} ALTH"
echo ""

# Get ticker symbol
echo -e "${GREEN}📊 Mengambil info token...${NC}"
TICKER=$(curl -s -X POST "${SERVICE_URL}/chains/${TOKEN_CHAIN}/applications/${TOKEN_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ tickerSymbol }"}' | jq -r '.data.tickerSymbol // "ALTH"')

echo -e "${CYAN}Ticker Symbol:${NC} ${TICKER}"
echo ""

# Calculate total supply (treasury + registry + staked)
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   RINGKASAN${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get total stake from registry
TOTAL_STAKE=$(curl -s -X POST "${SERVICE_URL}/chains/ce18260eea4fcbc1fa29da51a92e48d71eaf77513f6eec9b933e5b2f9f94732f/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake // "0"')

echo -e "${YELLOW}Treasury Balance:${NC} ${TREASURY_BALANCE} ALTH"
echo -e "${YELLOW}Registry Balance:${NC} ${REGISTRY_BALANCE} ALTH"
echo -e "${YELLOW}Total Staked:${NC} ${TOTAL_STAKE} ALTH"
echo ""

# Calculate percentages
TREASURY_NUM=$(echo "$TREASURY_BALANCE" | sed 's/\.//')
REGISTRY_NUM=$(echo "$REGISTRY_BALANCE" | sed 's/\.//')
STAKE_NUM=$(echo "$TOTAL_STAKE" | sed 's/\.//')

TOTAL=$((TREASURY_NUM + REGISTRY_NUM + STAKE_NUM))

if [ $TOTAL -gt 0 ]; then
    TREASURY_PCT=$(awk "BEGIN {printf \"%.2f\", ($TREASURY_NUM / $TOTAL) * 100}")
    REGISTRY_PCT=$(awk "BEGIN {printf \"%.2f\", ($REGISTRY_NUM / $TOTAL) * 100}")
    STAKE_PCT=$(awk "BEGIN {printf \"%.2f\", ($STAKE_NUM / $TOTAL) * 100}")
    
    echo -e "${CYAN}Distribusi Token:${NC}"
    echo -e "  Treasury: ${TREASURY_PCT}%"
    echo -e "  Registry: ${REGISTRY_PCT}%"
    echo -e "  Staked: ${STAKE_PCT}%"
fi

echo ""
echo -e "${GREEN}✅ Selesai${NC}"
