#!/bin/bash

# ============================================================================
# SIMPLE COPY-PASTE COMMANDS - ONE BY ONE
# ============================================================================

echo "============================================================================"
echo "STEP 1: Load environment variables"
echo "============================================================================"
echo ""
echo "Run this first:"
echo ""

cat << 'EOF'
source alethea-dashboard-vite/.env.local
REGISTRY_ENDPOINT="http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}"
echo "✓ Environment loaded. REGISTRY_ENDPOINT: ${REGISTRY_ENDPOINT}"
EOF

echo ""
echo ""
echo "============================================================================"
echo "STEP 2: Copy-paste any query command below"
echo "============================================================================"
echo ""

# ============================================================================
# QUERY #1: Bitcoin Price January 1, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #1: Bitcoin Price January 1, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Was Bitcoin (BTC) price above $95,000 USD on January 1, 2026 at 00:00 UTC?\", outcomes: [\"Yes, above $95,000\", \"No, below $95,000\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #2: Ethereum Price January 2, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #2: Ethereum Price January 2, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did Ethereum (ETH) reach or exceed $3,500 USD on January 2, 2026?\", outcomes: [\"Yes, reached $3,500+\", \"No, below $3,500\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #3: Total Crypto Market Cap January 1, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #3: Total Crypto Market Cap January 1, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did total cryptocurrency market cap exceed $3.2 trillion USD on January 1, 2026?\", outcomes: [\"Yes, above $3.2T\", \"No, below $3.2T\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #4: Solana Price January 3, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #4: Solana Price January 3, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Was Solana (SOL) price above $180 USD on January 3, 2026?\", outcomes: [\"Yes, above $180\", \"No, below $180\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #5: GitHub Status January 1, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #5: GitHub Status January 1, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did GitHub experience an outage or incident on January 1, 2026?\", outcomes: [\"Yes, had outage/incident\", \"No, no disruption\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #6: Apple Stock Price January 2, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #6: Apple Stock Price January 2, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did Apple (AAPL) stock close above $230 USD on January 2, 2026?\", outcomes: [\"Yes, above $230\", \"No, below $230\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #7: Tesla Stock Price January 3, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #7: Tesla Stock Price January 3, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did Tesla (TSLA) stock reach or exceed $400 USD on January 3, 2026?\", outcomes: [\"Yes, reached $400+\", \"No, below $400\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #8: Premier League Match January 1, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #8: Premier League Match January 1, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Was there any Premier League match played on January 1, 2026?\", outcomes: [\"Yes, had match(es)\", \"No, no matches\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #9: NBA Games January 2, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #9: NBA Games January 2, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Were there at least 5 NBA games played on January 2, 2026?\", outcomes: [\"Yes, 5+ games\", \"No, less than 5\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #10: La Liga Match January 3, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #10: La Liga Match January 3, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did Real Madrid or Barcelona play in La Liga on January 3, 2026?\", outcomes: [\"Yes, one played\", \"No, neither played\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #11: New Year Celebration 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #11: New Year Celebration 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Did the New Year'\''s Eve fireworks celebration take place at Times Square, New York on January 1, 2026?\", outcomes: [\"Yes, took place\", \"No, cancelled\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #12: Tokyo Weather January 2, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #12: Tokyo Weather January 2, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Was the temperature in Tokyo, Japan below 10°C on January 2, 2026?\", outcomes: [\"Yes, below 10°C\", \"No, 10°C or above\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #13: USD/IDR Exchange Rate January 3, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #13: USD/IDR Exchange Rate January 3, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Was the USD/IDR exchange rate above Rp 16,000 on January 3, 2026?\", outcomes: [\"Yes, above Rp 16,000\", \"No, below Rp 16,000\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

# ============================================================================
# QUERY #14: Bitcoin Daily Volume January 1, 2026
# ============================================================================

cat << 'EOF'

# ============================================================================
# QUERY #14: Bitcoin Daily Volume January 1, 2026
# ============================================================================

curl -X POST "http://localhost:8080/chains/${VITE_CHAIN_ID}/applications/${VITE_REGISTRY_APP_ID}" -H "Content-Type: application/json" -d '{"query": "mutation { createQuery(description: \"Was Bitcoin 24-hour trading volume above $30 billion USD on January 1, 2026?\", outcomes: [\"Yes, above $30B\", \"No, below $30B\"], strategy: WeightedByStake, minVotes: 3, rewardAmount: \"100000000000000000000\", durationSecs: 86400) { success message queryId } }"}'

EOF

echo ""
echo "============================================================================"
echo "DONE! Run the script to see all commands:"
echo "bash SIMPLE_COMMANDS.sh"
echo "============================================================================"
