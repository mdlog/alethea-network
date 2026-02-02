#!/bin/bash

# Script untuk membuat query dengan peristiwa yang sudah terjadi
# Dengan parameter lengkap: title, description, source URLs, dll
# Commit duration: 12 jam (43200 detik)
# Reveal duration: 2 jam (7200 detik)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Load configuration
if [ -f "alethea-dashboard-vite/.env.local" ]; then
    source alethea-dashboard-vite/.env.local
    REGISTRY_APP_ID="${VITE_REGISTRY_APP_ID}"
    CHAIN_ID="${VITE_CHAIN_ID}"
    TOKEN_APP_ID="${VITE_TOKEN_APP_ID}"
else
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi

if [ -z "$REGISTRY_APP_ID" ] || [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ Missing REGISTRY_APP_ID or CHAIN_ID${NC}"
    exit 1
fi

SERVICE_URL="${VITE_SERVICE_URL:-http://localhost:8080}"
REGISTRY_ENDPOINT="${SERVICE_URL}/chains/${CHAIN_ID}/applications/${REGISTRY_APP_ID}"

# Duration settings
COMMIT_DURATION=43200  # 12 jam
REVEAL_DURATION=43200  # 12 jam
TOTAL_DURATION=$((COMMIT_DURATION + REVEAL_DURATION))  # 86400 detik total (24 jam)

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     MEMBUAT QUERY UNTUK PERISTIWA YANG SUDAH TERJADI                     ║${NC}"
echo -e "${BLUE}║     Commit Duration: 12 jam | Reveal Duration: 12 jam                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Registry: ${REGISTRY_APP_ID}${NC}"
echo -e "${YELLOW}Chain: ${CHAIN_ID}${NC}"
echo -e "${YELLOW}Token: ${TOKEN_APP_ID}${NC}"
echo ""

# Function to create query via GraphQL
create_query() {
    local title="$1"
    local description="$2"
    local outcomes="$3"
    local category="$4"
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Creating Query: ${title}${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Category: ${category}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    echo ""
    
    # Escape quotes for JSON
    local escaped_description=$(echo "$description" | sed 's/"/\\"/g')
    
    # Create GraphQL mutation
    local mutation=$(cat <<EOF
mutation {
  createQuery(
    description: "${escaped_description}",
    outcomes: ${outcomes},
    strategy: WeightedByStake,
    minVotes: 3,
    rewardAmount: "100000000000000000000",
    durationSecs: ${TOTAL_DURATION}
  ) {
    success
    message
    queryId
  }
}
EOF
)
    
    # Execute mutation
    local response=$(curl -s -X POST "${REGISTRY_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "{\"query\": $(echo "$mutation" | jq -Rs .)}")
    
    echo -e "${GREEN}Response: ${response}${NC}"
    echo ""
    
    # Extract query ID if successful
    local query_id=$(echo "$response" | jq -r '.data.createQuery.queryId // empty')
    if [ ! -z "$query_id" ]; then
        echo -e "${GREEN}✓ Query created successfully!${NC}"
        echo -e "${GREEN}  Query ID: ${query_id}${NC}"
    else
        echo -e "${RED}✗ Failed to create query${NC}"
        echo -e "${RED}  Error: $(echo "$response" | jq -r '.errors[0].message // "Unknown error"')${NC}"
    fi
    
    echo ""
    sleep 2
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           QUERY KATEGORI: POLITIK                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# POLITIK 1: Pemilu Indonesia 2024
create_query \
    "Pemilu Indonesia 2024 - Prabowo Menang" \
    "Apakah Prabowo Subianto memenangkan Pemilihan Presiden Indonesia 2024 pada putaran pertama (14 Februari 2024)? Resolusi berdasarkan hasil resmi KPU yang diumumkan pada 20 Maret 2024. Sumber: https://pemilu2024.kpu.go.id/ dan https://www.bbc.com/indonesia/articles/c511z3z3z3zo" \
    '["Ya", "Tidak"]' \
    "Politik"

# POLITIK 2: Trump vs Biden Debate
create_query \
    "Trump-Biden Debate Juni 2024" \
    "Apakah debat presiden AS antara Donald Trump dan Joe Biden berlangsung pada 27 Juni 2024? Resolusi berdasarkan laporan resmi dari CNN yang menjadi host debat. Sumber: https://www.cnn.com/politics/live-news/cnn-presidential-debate-06-27-24/ dan https://www.nytimes.com/live/2024/06/27/us/biden-trump-debate" \
    '["Ya", "Tidak"]' \
    "Politik"

# POLITIK 3: UK General Election 2024
create_query \
    "UK General Election 2024 - Labour Menang" \
    "Apakah Partai Labour memenangkan UK General Election pada 4 Juli 2024 dengan mayoritas mutlak? Resolusi berdasarkan hasil resmi Electoral Commission UK. Sumber: https://www.electoralcommission.org.uk/ dan https://www.bbc.com/news/election/2024/uk/results" \
    '["Ya", "Tidak"]' \
    "Politik"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           QUERY KATEGORI: KRIPTO                          ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# KRIPTO 1: Bitcoin ETF Approval
create_query \
    "Bitcoin Spot ETF Approval 2024" \
    "Apakah SEC (Securities and Exchange Commission) menyetujui Bitcoin Spot ETF pada 10 Januari 2024? Resolusi berdasarkan pengumuman resmi SEC. Sumber: https://www.sec.gov/news/press-release/2024-6 dan https://www.coindesk.com/policy/2024/01/10/sec-approves-spot-bitcoin-etfs/" \
    '["Ya", "Tidak"]' \
    "Kripto"

# KRIPTO 2: Ethereum Dencun Upgrade
create_query \
    "Ethereum Dencun Upgrade Maret 2024" \
    "Apakah Ethereum Dencun upgrade (EIP-4844) berhasil diaktifkan pada 13 Maret 2024? Resolusi berdasarkan data blockchain Ethereum resmi. Sumber: https://etherscan.io/ dan https://ethereum.org/en/roadmap/dencun/" \
    '["Ya", "Tidak"]' \
    "Kripto"

# KRIPTO 3: Bitcoin Halving 2024
create_query \
    "Bitcoin Halving April 2024" \
    "Apakah Bitcoin halving (block reward berkurang dari 6.25 BTC menjadi 3.125 BTC) terjadi pada 19-20 April 2024 di block 840,000? Resolusi berdasarkan data blockchain Bitcoin. Sumber: https://www.blockchain.com/explorer/blocks/btc/840000 dan https://bitcoinblockhalf.com/" \
    '["Ya", "Tidak"]' \
    "Kripto"

# KRIPTO 4: Solana Price ATH 2024
create_query \
    "Solana Mencapai $200 di 2024" \
    "Apakah harga Solana (SOL) mencapai atau melampaui $200 USD pada bulan Maret 2024? Resolusi berdasarkan data harga dari CoinGecko dan CoinMarketCap. Sumber: https://www.coingecko.com/en/coins/solana dan https://coinmarketcap.com/currencies/solana/" \
    '["Ya", "Tidak"]' \
    "Kripto"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                          QUERY KATEGORI: TEKNOLOGI                        ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# TEKNOLOGI 1: OpenAI GPT-4 Turbo
create_query \
    "OpenAI GPT-4 Turbo Launch 2023" \
    "Apakah OpenAI meluncurkan GPT-4 Turbo pada OpenAI DevDay tanggal 6 November 2023? Resolusi berdasarkan pengumuman resmi OpenAI. Sumber: https://openai.com/blog/new-models-and-developer-products-announced-at-devday dan https://platform.openai.com/docs/models/gpt-4-turbo-and-gpt-4" \
    '["Ya", "Tidak"]' \
    "Teknologi"

# TEKNOLOGI 2: Apple Vision Pro Launch
create_query \
    "Apple Vision Pro Diluncurkan Februari 2024" \
    "Apakah Apple Vision Pro resmi diluncurkan dan mulai dijual di AS pada 2 Februari 2024? Resolusi berdasarkan pengumuman resmi Apple. Sumber: https://www.apple.com/newsroom/2024/01/apple-vision-pro-available-february-2/ dan https://www.apple.com/apple-vision-pro/" \
    '["Ya", "Tidak"]' \
    "Teknologi"

# TEKNOLOGI 3: Google Gemini Ultra
create_query \
    "Google Gemini Ultra Launch 2024" \
    "Apakah Google meluncurkan Gemini Ultra (model AI paling canggih) pada 8 Februari 2024? Resolusi berdasarkan pengumuman resmi Google. Sumber: https://blog.google/technology/ai/google-gemini-update-sundar-pichai-2024/ dan https://deepmind.google/technologies/gemini/" \
    '["Ya", "Tidak"]' \
    "Teknologi"

# TEKNOLOGI 4: Meta Quest 3 Launch
create_query \
    "Meta Quest 3 Diluncurkan Oktober 2023" \
    "Apakah Meta Quest 3 resmi diluncurkan dan mulai dijual pada 10 Oktober 2023? Resolusi berdasarkan pengumuman resmi Meta. Sumber: https://www.meta.com/quest/quest-3/ dan https://about.fb.com/news/2023/09/meta-quest-3-mixed-reality-headset/" \
    '["Ya", "Tidak"]' \
    "Teknologi"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           QUERY KATEGORI: SPORT                           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# SPORT 1: Super Bowl LVIII 2024
create_query \
    "Super Bowl LVIII 2024 Winner" \
    "Apakah Kansas City Chiefs memenangkan Super Bowl LVIII melawan San Francisco 49ers pada 11 Februari 2024? Resolusi berdasarkan hasil resmi NFL. Sumber: https://www.nfl.com/super-bowl/ dan https://www.espn.com/nfl/game/_/gameId/401671762" \
    '["Ya", "Tidak"]' \
    "Sport"

# SPORT 2: Copa America 2024
create_query \
    "Copa America 2024 Winner" \
    "Apakah Argentina memenangkan Copa America 2024 yang berlangsung di AS (final 14 Juli 2024)? Resolusi berdasarkan hasil resmi CONMEBOL. Sumber: https://www.conmebol.com/copaamerica/ dan https://www.espn.com/soccer/copa-america/" \
    '["Ya", "Tidak"]' \
    "Sport"

# SPORT 3: Euro 2024
create_query \
    "UEFA Euro 2024 Winner" \
    "Apakah Spanyol memenangkan UEFA Euro 2024 yang berlangsung di Jerman (final 14 Juli 2024)? Resolusi berdasarkan hasil resmi UEFA. Sumber: https://www.uefa.com/euro2024/ dan https://www.espn.com/soccer/uefa-euro/" \
    '["Ya", "Tidak"]' \
    "Sport"

# SPORT 4: Paris Olympics 2024
create_query \
    "Paris Olympics 2024 - AS Juara Umum" \
    "Apakah Amerika Serikat menjadi juara umum (total medali terbanyak) di Olimpiade Paris 2024 (26 Juli - 11 Agustus 2024)? Resolusi berdasarkan data resmi IOC. Sumber: https://olympics.com/en/paris-2024/medals dan https://www.olympic.org/paris-2024" \
    '["Ya", "Tidak"]' \
    "Sport"

# SPORT 5: NBA Finals 2024
create_query \
    "NBA Finals 2024 Winner" \
    "Apakah Boston Celtics memenangkan NBA Finals 2024 melawan Dallas Mavericks (final berakhir Juni 2024)? Resolusi berdasarkan hasil resmi NBA. Sumber: https://www.nba.com/finals dan https://www.espn.com/nba/playoffs/" \
    '["Ya", "Tidak"]' \
    "Sport"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    SEMUA QUERY TELAH DIBUAT                              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Total Queries: 16${NC}"
echo -e "${YELLOW}  - Politik: 3 queries${NC}"
echo -e "${YELLOW}  - Kripto: 4 queries${NC}"
echo -e "${YELLOW}  - Teknologi: 4 queries${NC}"
echo -e "${YELLOW}  - Sport: 5 queries${NC}"
echo ""
echo -e "${CYAN}Commit Duration: 12 jam (43200 detik)${NC}"
echo -e "${CYAN}Reveal Duration: 2 jam (7200 detik)${NC}"
echo -e "${CYAN}Total Duration: 14 jam (50400 detik)${NC}"
echo ""
echo -e "${BLUE}Untuk melihat queries yang telah dibuat:${NC}"
echo -e "${YELLOW}  Dashboard: http://localhost:5173/queries${NC}"
echo ""
echo -e "${BLUE}Untuk voting:${NC}"
echo -e "${YELLOW}  1. Commit vote dalam 12 jam pertama${NC}"
echo -e "${YELLOW}  2. Reveal vote dalam 2 jam setelah commit phase${NC}"
echo -e "${YELLOW}  3. Resolve query setelah deadline${NC}"
echo ""
