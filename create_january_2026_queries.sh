#!/bin/bash

# Script untuk membuat query dengan peristiwa Januari 2026 (1-3 Januari)
# Peristiwa sudah terjadi, bisa di-resolve di Februari 2026
# Commit: 12 jam | Reveal: 12 jam | Total: 24 jam

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
echo -e "${BLUE}║        QUERY PERISTIWA 1-3 JANUARI 2026 (Siap Di-Resolve!)              ║${NC}"
echo -e "${BLUE}║        Commit: 12 jam | Reveal: 12 jam | Total: 24 jam                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Registry: ${REGISTRY_APP_ID}${NC}"
echo -e "${YELLOW}Chain: ${CHAIN_ID}${NC}"
echo -e "${YELLOW}Tanggal Sekarang: 2 Februari 2026${NC}"
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
        echo -e "${YELLOW}  Title: ${title}${NC}"
        echo -e "${YELLOW}  Category: ${category}${NC}"
        echo -e "${YELLOW}  Source: ${source_urls}${NC}"
    else
        echo -e "${RED}✗ Failed to create query${NC}"
        echo -e "${RED}  Error: $(echo "$response" | jq -r '.errors[0].message // "Unknown error"')${NC}"
    fi
    
    echo ""
    sleep 2
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           KATEGORI: KRIPTO                                ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# KRIPTO 1: Bitcoin Price 1 Jan 2026
create_query \
    "Bitcoin Price 1 Januari 2026" \
    "Apakah harga Bitcoin (BTC) berada di atas $95,000 USD pada 1 Januari 2026 pukul 00:00 UTC?" \
    "Bitcoin mengalami volatilitas di akhir 2025 dan awal 2026. Query ini memverifikasi harga BTC pada awal tahun 2026 berdasarkan data historis yang sudah tersedia." \
    "Resolusi berdasarkan harga penutupan Bitcoin pada 1 Januari 2026 pukul 00:00 UTC dari CoinGecko. Gunakan harga BTC/USD pada timestamp tersebut." \
    "https://www.coingecko.com/en/coins/bitcoin, https://coinmarketcap.com/currencies/bitcoin/historical-data/" \
    '["Ya, di atas $95,000", "Tidak, di bawah $95,000"]' \
    "Kripto"

# KRIPTO 2: Ethereum Price 2 Jan 2026
create_query \
    "Ethereum Price 2 Januari 2026" \
    "Apakah harga Ethereum (ETH) mencapai atau melampaui $3,500 USD pada 2 Januari 2026?" \
    "Ethereum menunjukkan pergerakan harga yang menarik di awal 2026. Query ini memverifikasi apakah ETH mencapai level $3,500 pada 2 Januari 2026." \
    "Resolusi berdasarkan harga tertinggi (high) Ethereum pada 2 Januari 2026 dari CoinGecko atau CoinMarketCap. ETH harus mencapai atau melampaui $3,500 kapan saja di tanggal tersebut." \
    "https://www.coingecko.com/en/coins/ethereum, https://coinmarketcap.com/currencies/ethereum/historical-data/" \
    '["Ya, mencapai $3,500+", "Tidak, di bawah $3,500"]' \
    "Kripto"

# KRIPTO 3: Total Crypto Market Cap 1 Jan
create_query \
    "Total Crypto Market Cap 1 Januari 2026" \
    "Apakah total market cap cryptocurrency melebihi $3.2 triliun USD pada 1 Januari 2026?" \
    "Total market cap crypto adalah indikator penting untuk mengukur kesehatan pasar secara keseluruhan. Query ini memverifikasi market cap total pada awal 2026." \
    "Resolusi berdasarkan data total market cap dari CoinGecko pada 1 Januari 2026. Gunakan snapshot market cap pada pukul 00:00 UTC atau data harian." \
    "https://www.coingecko.com/en/global-charts, https://coinmarketcap.com/charts/" \
    '["Ya, di atas $3.2T", "Tidak, di bawah $3.2T"]' \
    "Kripto"

# KRIPTO 4: Solana Price 3 Jan 2026
create_query \
    "Solana Price 3 Januari 2026" \
    "Apakah harga Solana (SOL) berada di atas $180 USD pada 3 Januari 2026?" \
    "Solana telah menunjukkan performa kuat di Q4 2025. Query ini memverifikasi harga SOL pada 3 Januari 2026 berdasarkan data historis." \
    "Resolusi berdasarkan harga penutupan Solana pada 3 Januari 2026 dari CoinGecko. Gunakan harga SOL/USD pada akhir hari (23:59 UTC)." \
    "https://www.coingecko.com/en/coins/solana, https://coinmarketcap.com/currencies/solana/historical-data/" \
    '["Ya, di atas $180", "Tidak, di bawah $180"]' \
    "Kripto"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                          KATEGORI: TEKNOLOGI                              ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# TEKNOLOGI 1: GitHub Outage 1 Jan
create_query \
    "GitHub Status 1 Januari 2026" \
    "Apakah GitHub mengalami outage atau incident pada 1 Januari 2026?" \
    "GitHub adalah platform development terbesar di dunia. Query ini memverifikasi apakah ada gangguan layanan pada 1 Januari 2026." \
    "Resolusi berdasarkan GitHub Status page. Incident atau outage didefinisikan sebagai gangguan yang dilaporkan di status page pada 1 Januari 2026." \
    "https://www.githubstatus.com/, https://www.githubstatus.com/history" \
    '["Ya, ada outage/incident", "Tidak, tidak ada gangguan"]' \
    "Teknologi"

# TEKNOLOGI 2: Apple Stock 2 Jan
create_query \
    "Apple Stock Price 2 Januari 2026" \
    "Apakah harga saham Apple (AAPL) ditutup di atas $230 USD pada 2 Januari 2026?" \
    "Apple adalah salah satu perusahaan teknologi terbesar. Query ini memverifikasi harga penutupan saham AAPL pada 2 Januari 2026." \
    "Resolusi berdasarkan harga penutupan resmi Apple (AAPL) di NASDAQ pada 2 Januari 2026. Gunakan data dari Yahoo Finance atau Bloomberg." \
    "https://finance.yahoo.com/quote/AAPL/, https://www.nasdaq.com/market-activity/stocks/aapl" \
    '["Ya, di atas $230", "Tidak, di bawah $230"]' \
    "Teknologi"

# TEKNOLOGI 3: Tesla Stock 3 Jan
create_query \
    "Tesla Stock Price 3 Januari 2026" \
    "Apakah harga saham Tesla (TSLA) mencapai atau melampaui $400 USD pada 3 Januari 2026?" \
    "Tesla adalah pemimpin dalam kendaraan listrik dan teknologi otonom. Query ini memverifikasi harga saham TSLA pada 3 Januari 2026." \
    "Resolusi berdasarkan harga tertinggi (high) Tesla (TSLA) di NASDAQ pada 3 Januari 2026. Gunakan data dari Yahoo Finance atau Bloomberg." \
    "https://finance.yahoo.com/quote/TSLA/, https://www.nasdaq.com/market-activity/stocks/tsla" \
    '["Ya, mencapai $400+", "Tidak, di bawah $400"]' \
    "Teknologi"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           KATEGORI: SPORT                                 ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# SPORT 1: Premier League 1 Jan
create_query \
    "Premier League Match 1 Januari 2026" \
    "Apakah ada pertandingan Premier League yang berlangsung pada 1 Januari 2026?" \
    "Premier League biasanya memiliki jadwal padat di periode Tahun Baru. Query ini memverifikasi apakah ada pertandingan pada 1 Januari 2026." \
    "Resolusi berdasarkan jadwal resmi Premier League. Minimal satu pertandingan harus berlangsung pada 1 Januari 2026 (kick-off di tanggal tersebut)." \
    "https://www.premierleague.com/fixtures, https://www.espn.com/soccer/fixtures/_/league/eng.1" \
    '["Ya, ada pertandingan", "Tidak, tidak ada pertandingan"]' \
    "Sport"

# SPORT 2: NBA Games 2 Jan
create_query \
    "NBA Games 2 Januari 2026" \
    "Apakah ada minimal 5 pertandingan NBA yang berlangsung pada 2 Januari 2026?" \
    "NBA memiliki jadwal reguler yang padat di bulan Januari. Query ini memverifikasi jumlah pertandingan pada 2 Januari 2026." \
    "Resolusi berdasarkan jadwal resmi NBA. Minimal 5 pertandingan harus berlangsung pada 2 Januari 2026 (tip-off di tanggal tersebut)." \
    "https://www.nba.com/schedule, https://www.espn.com/nba/schedule" \
    '["Ya, 5+ pertandingan", "Tidak, kurang dari 5"]' \
    "Sport"

# SPORT 3: La Liga Match 3 Jan
create_query \
    "La Liga Match 3 Januari 2026" \
    "Apakah Real Madrid atau Barcelona bermain di La Liga pada 3 Januari 2026?" \
    "Real Madrid dan Barcelona adalah klub terbesar di La Liga. Query ini memverifikasi apakah salah satu dari mereka bermain pada 3 Januari 2026." \
    "Resolusi berdasarkan jadwal resmi La Liga. Real Madrid atau Barcelona harus bermain minimal satu pertandingan pada 3 Januari 2026." \
    "https://www.laliga.com/en-GB/fixtures, https://www.espn.com/soccer/fixtures/_/league/esp.1" \
    '["Ya, salah satu bermain", "Tidak, keduanya tidak bermain"]' \
    "Sport"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                           KATEGORI: POLITIK                               ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# POLITIK 1: New Year Global
create_query \
    "Perayaan Tahun Baru 2026" \
    "Apakah perayaan kembang api Tahun Baru berlangsung di Times Square, New York pada 1 Januari 2026?" \
    "Times Square New Year's Eve adalah salah satu perayaan Tahun Baru paling ikonik di dunia. Query ini memverifikasi apakah acara berlangsung pada 1 Januari 2026." \
    "Resolusi berdasarkan laporan media mainstream (CNN, BBC, New York Times). Acara ball drop dan kembang api harus berlangsung di Times Square pada malam 31 Des 2025 - 1 Jan 2026." \
    "https://www.timessquarenyc.org/times-square-new-years-eve, https://www.cnn.com/, https://www.bbc.com/news" \
    '["Ya, berlangsung", "Tidak, dibatalkan"]' \
    "Politik"

# POLITIK 2: Weather Event
create_query \
    "Cuaca Tokyo 2 Januari 2026" \
    "Apakah suhu udara di Tokyo, Jepang berada di bawah 10°C pada 2 Januari 2026?" \
    "Tokyo mengalami musim dingin di bulan Januari. Query ini memverifikasi suhu udara pada 2 Januari 2026 berdasarkan data cuaca historis." \
    "Resolusi berdasarkan data suhu dari Japan Meteorological Agency atau Weather.com. Gunakan suhu rata-rata harian atau suhu pada pukul 12:00 JST." \
    "https://www.jma.go.jp/jma/indexe.html, https://weather.com/weather/today/l/Tokyo+Japan" \
    '["Ya, di bawah 10°C", "Tidak, 10°C atau lebih"]' \
    "Politik"

# POLITIK 3: Currency Rate
create_query \
    "Kurs USD/IDR 3 Januari 2026" \
    "Apakah kurs USD/IDR berada di atas Rp 16,000 pada 3 Januari 2026?" \
    "Kurs mata uang adalah indikator ekonomi penting. Query ini memverifikasi kurs USD/IDR pada 3 Januari 2026 berdasarkan data Bank Indonesia." \
    "Resolusi berdasarkan kurs tengah USD/IDR dari Bank Indonesia pada 3 Januari 2026. Gunakan kurs jual atau kurs tengah resmi." \
    "https://www.bi.go.id/id/statistik/informasi-kurs/default.aspx, https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=IDR" \
    '["Ya, di atas Rp 16,000", "Tidak, di bawah Rp 16,000"]' \
    "Politik"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    SEMUA QUERY TELAH DIBUAT                              ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Total Queries: 14${NC}"
echo -e "${YELLOW}  - Kripto: 4 queries (Bitcoin, Ethereum, Market Cap, Solana)${NC}"
echo -e "${YELLOW}  - Teknologi: 3 queries (GitHub, Apple, Tesla)${NC}"
echo -e "${YELLOW}  - Sport: 3 queries (Premier League, NBA, La Liga)${NC}"
echo -e "${YELLOW}  - Politik/Lainnya: 4 queries (Tahun Baru, Cuaca, Kurs)${NC}"
echo ""
echo -e "${CYAN}Periode Peristiwa: 1-3 Januari 2026${NC}"
echo -e "${CYAN}Tanggal Sekarang: 2 Februari 2026${NC}"
echo -e "${CYAN}Status: Semua peristiwa sudah terjadi, siap di-resolve!${NC}"
echo ""
echo -e "${CYAN}Commit Duration: 12 jam (43200 detik)${NC}"
echo -e "${CYAN}Reveal Duration: 12 jam (43200 detik)${NC}"
echo -e "${CYAN}Total Duration: 24 jam (86400 detik)${NC}"
echo ""
echo -e "${BLUE}Untuk melihat queries yang telah dibuat:${NC}"
echo -e "${YELLOW}  Dashboard: http://localhost:5173/queries${NC}"
echo ""
echo -e "${BLUE}Workflow:${NC}"
echo -e "${YELLOW}  1. Commit vote (12 jam pertama)${NC}"
echo -e "${YELLOW}  2. Reveal vote (12 jam berikutnya)${NC}"
echo -e "${YELLOW}  3. Resolve query (setelah 24 jam)${NC}"
echo -e "${YELLOW}  4. Verifikasi dengan source URLs yang disediakan${NC}"
echo ""
