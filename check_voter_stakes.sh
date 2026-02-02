#!/bin/bash

# Script untuk mengecek stake setiap voter
# Menggunakan konfigurasi dari .env.local

set -e

# Warna untuk output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f "alethea-dashboard-vite/.env.local" ]; then
    source <(grep -v '^#' alethea-dashboard-vite/.env.local | sed 's/VITE_//g' | sed 's/^/export /')
fi

# Configuration
SERVICE_URL="${SERVICE_URL:-http://localhost:8080}"
REGISTRY_CHAIN="${CHAIN_ID}"
REGISTRY_APP="${REGISTRY_APP_ID}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   CEK STAKE SETIAP VOTER${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Registry Chain:${NC} ${REGISTRY_CHAIN}"
echo -e "${YELLOW}Registry App:${NC} ${REGISTRY_APP}"
echo -e "${YELLOW}Service URL:${NC} ${SERVICE_URL}"
echo ""

# Query untuk mendapatkan semua voter dengan stake mereka
echo -e "${GREEN}Mengambil data voter...${NC}"
echo ""

VOTERS_RESPONSE=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters(limit: 100, offset: 0, activeOnly: false) { address stake name reputation totalVotes isActive } }"}')

# Check if response is valid
if echo "$VOTERS_RESPONSE" | jq -e '.data.voters' > /dev/null 2>&1; then
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   DAFTAR VOTER DAN STAKE${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Display voters with formatting
    echo "$VOTERS_RESPONSE" | jq -r '.data.voters[] | 
        "Nama: \(.name // "Unknown")
Address: \(.address)
Stake: \(.stake) ALTH
Reputation: \(.reputation)
Total Votes: \(.totalVotes)
Status: \(if .isActive then "Active" else "Inactive" end)
----------------------------------------"'
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   RINGKASAN${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # Count total voters
    TOTAL_VOTERS=$(echo "$VOTERS_RESPONSE" | jq '.data.voters | length')
    echo -e "${YELLOW}Total Voters:${NC} ${TOTAL_VOTERS}"
    
    # Count active voters
    ACTIVE_VOTERS=$(echo "$VOTERS_RESPONSE" | jq '[.data.voters[] | select(.isActive == true)] | length')
    echo -e "${YELLOW}Active Voters:${NC} ${ACTIVE_VOTERS}"
    
    # Calculate total stake
    TOTAL_STAKE=$(echo "$VOTERS_RESPONSE" | jq '[.data.voters[].stake | tonumber] | add // 0')
    echo -e "${YELLOW}Total Stake:${NC} ${TOTAL_STAKE} ALTH"
    
    echo ""
    
    # Get total stake from registry
    echo -e "${GREEN}Verifikasi dengan registry...${NC}"
    REGISTRY_STAKE=$(curl -s -X POST "${SERVICE_URL}/chains/${REGISTRY_CHAIN}/applications/${REGISTRY_APP}" \
      -H "Content-Type: application/json" \
      -d '{"query": "{ totalStake }"}' | jq -r '.data.totalStake // "0"')
    
    echo -e "${YELLOW}Registry Total Stake:${NC} ${REGISTRY_STAKE} ALTH"
    
else
    echo -e "${YELLOW}Error atau tidak ada voter yang ditemukan${NC}"
    echo "Response: $VOTERS_RESPONSE"
fi

echo ""
echo -e "${GREEN}✅ Selesai${NC}"
