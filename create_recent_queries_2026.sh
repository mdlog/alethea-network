#!/bin/bash

# Script untuk membuat query dengan peristiwa terbaru (Januari 2026 & Akhir 2025)
# Struktur profesional: Title terpisah dari Description
# Commit duration: 12 jam | Reveal duration: 12 jam | Total: 24 jam

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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
TOTAL_DURATION=$((COMMIT_DURATION + REVEAL_DURATION))  # 86400 detik (24 jam)

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          MEMBUAT QUERY PERISTIWA TERBARU (JAN 2026 & AKHIR 2025)        ║${NC}"
echo -e "${BLUE}║          Commit: 12 jam | Reveal: 12 jam | Total: 24 jam                ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Registry: ${REGISTRY_APP_ID}${NC}"
echo -e "${YELLOW}Chain: ${CHAIN_ID}${NC}"
echo ""

# Function to create query via GraphQL
create_query() {
    local title="$1"
    local description="$2"
    local context="$3"
    local resolution_criteria="$4"
    local source_urls="$5"
    local outcomes="$6"
    local category="$7"
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Creating Query: ${title}${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Category: ${category}${NC}"
    echo -e "${YELLOW}Description: ${description}${NC}"
    echo ""
    
    # Escape quotes for JSON
    local escaped_title=$(echo "$title" | sed 's/"/\\"/g')
    local escaped_description=$(echo "$description" | sed 's/"/\\"/g')
    local escaped_context=$(echo "$context" | sed 's/"/\\"/g')
    local escaped_criteria=$(echo "$resolution_criteria" | sed 's/"/\\"/g')
    local escaped_sources=$(echo "$source_urls" | sed 's/"/\\"/g')
    
    # Create GraphQL mutation with all metadata fields
    local mutation=$(cat <<EOF
mutation {
  createQueryWithMetadata(
    title: "${escaped_title}",
    description: "${escaped_description}",
    context: "${escaped_context}",
    resolutionCriteria: "${escaped_criteria}",
    sourceUrls: "${escaped_sources}",
    outcomes: ${outcomes},
    category: "${category}",
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
    local query_id=$(echo "$response" | jq -r '.data.createQueryWithMetadata.queryId // empty')
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
echo -e "${BLUE}                           KATEGORI: POLITIK                               ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# POLITIK 1: Trump Inauguration 2025
create_query \
    "Trump Inauguration 2025" \
    "Apakah Donald Trump dilantik sebagai Presiden AS ke-47 pada 20 Januari 2025?" \
    "Donald Trump memenangkan pemilihan presiden AS 2024 dan dijadwalkan dilantik pada 20 Januari 2025 di Washington D.C. Ini akan menjadi masa jabatan kedua Trump setelah periode 2017-2021." \
    "Resolusi berdasarkan liputan resmi dari White House dan media mainstream. Trump harus dilantik pada tanggal 20 Januari 2025 di Washington D.C." \
    "https://www.whitehouse.gov/, https://www.cnn.com/politics, https://www.bbc.com/news/world-us-canada" \
    '["Ya", "Tidak"]' \
    "Politik"

# POLITIK 2: Starmer UK PM 2025
create_query \
    "Keir Starmer Masih PM UK Januari 2026" \
    "Apakah Keir Starmer masih menjabat sebagai Perdana Menteri Inggris pada 1 Januari 2026?" \
    "Keir Starmer dari Partai Labour menjadi PM UK setelah kemenangan telak di pemilu Juli 2024. Query ini memverifikasi apakah dia masih menjabat hingga awal 2026." \
    "Resolusi berdasarkan data resmi dari UK Government dan Parliament. Starmer harus masih menjabat sebagai PM pada 1 Januari 2026." \
    "https://www.gov.uk/, https://www.parliament.uk/, https://www.bbc.com/news/politics" \
    '["Ya", "Tidak"]' \
    "Politik"

# POLITIK 3: Prabowo 100 Hari
create_query \
    "Prabowo 100 Hari Pertama" \
    "Apakah Prabowo Subianto telah menyelesaikan 100 hari pertama sebagai Presiden Indonesia pada Januari 2026?" \
    "Prabowo dilantik sebagai Presiden Indonesia pada 20 Oktober 2024. 100 hari pertama akan berakhir sekitar akhir Januari 2025. Query ini memverifikasi pencapaian milestone tersebut." \
    "Resolusi berdasarkan tanggal pelantikan resmi (20 Oktober 2024) dan perhitungan 100 hari kalender. Hitung hingga 28 Januari 2025." \
    "https://www.presidenri.go.id/, https://www.kompas.com/, https://www.detik.com/" \
    '["Ya", "Tidak"]' \
    "Politik"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           KATEGORI: KRIPTO                                ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# KRIPTO 1: Bitcoin $100K 2025
create_query \
    "Bitcoin Mencapai $100K di 2025" \
    "Apakah harga Bitcoin (BTC) mencapai atau melampaui $100,000 USD pada tahun 2025?" \
    "Bitcoin mengalami bull run signifikan di 2024-2025 setelah approval Bitcoin Spot ETF dan halving April 2024. Banyak analis memprediksi BTC akan mencapai $100K di 2025." \
    "Resolusi berdasarkan data harga dari CoinGecko dan CoinMarketCap. BTC/USD harus mencapai atau melampaui $100,000 kapan saja antara 1 Januari - 31 Desember 2025." \
    "https://www.coingecko.com/en/coins/bitcoin, https://coinmarketcap.com/currencies/bitcoin/" \
    '["Ya", "Tidak"]' \
    "Kripto"

# KRIPTO 2: Ethereum $5K 2025
create_query \
    "Ethereum Mencapai $5K di 2025" \
    "Apakah harga Ethereum (ETH) mencapai atau melampaui $5,000 USD pada tahun 2025?" \
    "Ethereum terus berkembang dengan upgrade Dencun (Maret 2024) yang menurunkan biaya Layer 2. ETH ATH sebelumnya adalah ~$4,800 di November 2021." \
    "Resolusi berdasarkan data harga dari CoinGecko dan CoinMarketCap. ETH/USD harus mencapai atau melampaui $5,000 kapan saja antara 1 Januari - 31 Desember 2025." \
    "https://www.coingecko.com/en/coins/ethereum, https://coinmarketcap.com/currencies/ethereum/" \
    '["Ya", "Tidak"]' \
    "Kripto"

# KRIPTO 3: Solana Outage 2025
create_query \
    "Solana Network Outage di 2025" \
    "Apakah Solana blockchain mengalami network outage (downtime >1 jam) pada tahun 2025?" \
    "Solana memiliki sejarah network outage di masa lalu (2021-2022). Query ini memverifikasi apakah ada outage signifikan (>1 jam) di tahun 2025." \
    "Resolusi berdasarkan data dari Solana Status page dan block explorer. Outage didefinisikan sebagai network downtime >1 jam dimana transaksi tidak dapat diproses." \
    "https://status.solana.com/, https://solscan.io/, https://solanabeach.io/" \
    '["Ya", "Tidak"]' \
    "Kripto"

# KRIPTO 4: Crypto Market Cap $3T
create_query \
    "Total Crypto Market Cap $3 Triliun" \
    "Apakah total market cap cryptocurrency mencapai atau melampaui $3 triliun USD pada tahun 2025?" \
    "Total crypto market cap mencapai ATH ~$3T di November 2021. Dengan bull market 2024-2025, ada potensi mencapai atau melampaui level tersebut." \
    "Resolusi berdasarkan data dari CoinGecko dan CoinMarketCap. Total market cap semua cryptocurrency harus mencapai atau melampaui $3 triliun kapan saja di 2025." \
    "https://www.coingecko.com/en/global-charts, https://coinmarketcap.com/charts/" \
    '["Ya", "Tidak"]' \
    "Kripto"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                          KATEGORI: TEKNOLOGI                              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# TEKNOLOGI 1: OpenAI GPT-5 2025
create_query \
    "OpenAI GPT-5 Launch 2025" \
    "Apakah OpenAI meluncurkan GPT-5 pada tahun 2025?" \
    "Setelah GPT-4 (Maret 2023) dan GPT-4 Turbo (November 2023), banyak spekulasi tentang GPT-5. Query ini memverifikasi apakah GPT-5 diluncurkan di 2025." \
    "Resolusi berdasarkan pengumuman resmi OpenAI. Model harus secara resmi dinamakan 'GPT-5' dan diluncurkan untuk publik (bukan hanya preview) di 2025." \
    "https://openai.com/blog, https://platform.openai.com/docs/models" \
    '["Ya", "Tidak"]' \
    "Teknologi"

# TEKNOLOGI 2: Apple Vision Pro Global
create_query \
    "Apple Vision Pro Tersedia Global 2025" \
    "Apakah Apple Vision Pro tersedia di lebih dari 10 negara pada akhir 2025?" \
    "Vision Pro diluncurkan di AS pada Februari 2024. Apple biasanya melakukan ekspansi global bertahap. Query ini memverifikasi ketersediaan di >10 negara hingga 31 Desember 2025." \
    "Resolusi berdasarkan data resmi Apple Store. Vision Pro harus tersedia untuk dibeli di lebih dari 10 negara pada atau sebelum 31 Desember 2025." \
    "https://www.apple.com/apple-vision-pro/, https://www.apple.com/newsroom/" \
    '["Ya", "Tidak"]' \
    "Teknologi"

# TEKNOLOGI 3: Tesla FSD Level 4
create_query \
    "Tesla FSD Level 4 Approval 2025" \
    "Apakah Tesla Full Self-Driving mendapat approval Level 4 autonomy di AS pada 2025?" \
    "Tesla FSD saat ini masih Level 2 (memerlukan pengawasan pengemudi). Level 4 berarti kendaraan dapat mengemudi sendiri tanpa pengawasan di kondisi tertentu." \
    "Resolusi berdasarkan pengumuman resmi dari NHTSA atau Tesla. FSD harus mendapat sertifikasi Level 4 autonomy (SAE J3016) di AS pada 2025." \
    "https://www.nhtsa.gov/, https://www.tesla.com/autopilot, https://www.sae.org/standards/content/j3016_202104/" \
    '["Ya", "Tidak"]' \
    "Teknologi"

# TEKNOLOGI 4: Meta Quest 4 Launch
create_query \
    "Meta Quest 4 Diluncurkan 2025" \
    "Apakah Meta meluncurkan Quest 4 (atau Quest Pro 2) pada tahun 2025?" \
    "Meta Quest 3 diluncurkan Oktober 2023. Biasanya Meta merilis headset VR baru setiap 1-2 tahun. Query ini memverifikasi peluncuran generasi berikutnya di 2025." \
    "Resolusi berdasarkan pengumuman resmi Meta. Produk harus dinamakan 'Quest 4' atau 'Quest Pro 2' dan diluncurkan untuk publik di 2025." \
    "https://www.meta.com/quest/, https://about.fb.com/news/" \
    '["Ya", "Tidak"]' \
    "Teknologi"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           KATEGORI: SPORT                                 ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# SPORT 1: Super Bowl LIX 2025
create_query \
    "Super Bowl LIX Winner 2025" \
    "Siapa pemenang Super Bowl LIX yang berlangsung pada 9 Februari 2025?" \
    "Super Bowl LIX adalah final NFL season 2024-2025 yang berlangsung di Caesars Superdome, New Orleans. Query ini memverifikasi tim pemenang." \
    "Resolusi berdasarkan hasil resmi NFL. Pemenang ditentukan oleh skor akhir pertandingan Super Bowl LIX pada 9 Februari 2025." \
    "https://www.nfl.com/super-bowl/, https://www.espn.com/nfl/" \
    '["Kansas City Chiefs", "Philadelphia Eagles", "Buffalo Bills", "Detroit Lions", "Baltimore Ravens", "San Francisco 49ers", "Tim Lain"]' \
    "Sport"

# SPORT 2: Champions League 2024-25
create_query \
    "UEFA Champions League 2024-25 Winner" \
    "Siapa pemenang UEFA Champions League musim 2024-25 (final Mei/Juni 2025)?" \
    "Champions League 2024-25 menggunakan format baru dengan 36 tim. Final dijadwalkan berlangsung di Allianz Arena, Munich pada 31 Mei 2025." \
    "Resolusi berdasarkan hasil resmi UEFA. Pemenang ditentukan oleh hasil final Champions League 2024-25 pada 31 Mei 2025." \
    "https://www.uefa.com/uefachampionsleague/, https://www.espn.com/soccer/league/_/name/uefa.champions" \
    '["Real Madrid", "Manchester City", "Bayern Munich", "Barcelona", "Arsenal", "PSG", "Inter Milan", "Tim Lain"]' \
    "Sport"

# SPORT 3: NBA Finals 2025
create_query \
    "NBA Finals 2025 Winner" \
    "Siapa pemenang NBA Finals 2024-25 season (final Juni 2025)?" \
    "NBA Finals 2024-25 adalah puncak dari NBA season yang dimulai Oktober 2024. Final biasanya berlangsung di bulan Juni." \
    "Resolusi berdasarkan hasil resmi NBA. Pemenang ditentukan oleh tim yang memenangkan series 4-3 atau 4-2 atau 4-1 atau 4-0 di NBA Finals 2025." \
    "https://www.nba.com/finals, https://www.espn.com/nba/" \
    '["Boston Celtics", "Denver Nuggets", "Milwaukee Bucks", "Phoenix Suns", "Los Angeles Lakers", "Golden State Warriors", "Tim Lain"]' \
    "Sport"

# SPORT 4: FIFA Club World Cup 2025
create_query \
    "FIFA Club World Cup 2025 Winner" \
    "Siapa pemenang FIFA Club World Cup 2025 yang berlangsung di AS (Juni-Juli 2025)?" \
    "FIFA Club World Cup 2025 adalah turnamen baru dengan format 32 tim yang berlangsung di AS. Ini adalah edisi pertama dengan format baru." \
    "Resolusi berdasarkan hasil resmi FIFA. Pemenang ditentukan oleh hasil final FIFA Club World Cup 2025." \
    "https://www.fifa.com/fifaplus/en/tournaments/mens/clubworldcup, https://www.espn.com/soccer/" \
    '["Real Madrid", "Manchester City", "Bayern Munich", "Flamengo", "Al Hilal", "Inter Miami", "Tim Lain"]' \
    "Sport"

# SPORT 5: Wimbledon 2025 Men
create_query \
    "Wimbledon 2025 Men's Singles Winner" \
    "Siapa pemenang Wimbledon Men's Singles 2025 (Juli 2025)?" \
    "Wimbledon 2025 adalah Grand Slam ketiga di musim tenis 2025, berlangsung di All England Club, London pada Juni-Juli 2025." \
    "Resolusi berdasarkan hasil resmi Wimbledon. Pemenang ditentukan oleh hasil final Men's Singles Wimbledon 2025." \
    "https://www.wimbledon.com/, https://www.atptour.com/" \
    '["Carlos Alcaraz", "Novak Djokovic", "Jannik Sinner", "Daniil Medvedev", "Alexander Zverev", "Pemain Lain"]' \
    "Sport"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    SEMUA QUERY TELAH DIBUAT                              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Total Queries: 17${NC}"
echo -e "${YELLOW}  - Politik: 3 queries${NC}"
echo -e "${YELLOW}  - Kripto: 4 queries${NC}"
echo -e "${YELLOW}  - Teknologi: 4 queries${NC}"
echo -e "${YELLOW}  - Sport: 6 queries${NC}"
echo ""
echo -e "${CYAN}Commit Duration: 12 jam (43200 detik)${NC}"
echo -e "${CYAN}Reveal Duration: 12 jam (43200 detik)${NC}"
echo -e "${CYAN}Total Duration: 24 jam (86400 detik)${NC}"
echo ""
echo -e "${BLUE}Untuk melihat queries yang telah dibuat:${NC}"
echo -e "${YELLOW}  Dashboard: http://localhost:5173/queries${NC}"
echo ""
