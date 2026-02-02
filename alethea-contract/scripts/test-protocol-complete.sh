#!/bin/bash
# Alethea Oracle Protocol - Complete Testing Script
# Script praktis untuk uji coba protocol secara lengkap

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration (Conway Testnet)
CHAIN_ID="a2c0349ae6add80c92e26bb383aca8d98f9f3441c3097fec99111199c7f1e221"
REGISTRY_ID="948a0e49dc424b3cfb0a997d7c7ef05b048c5f4184a2a4d546d6d7abae823261"
VOTER_ID="74e3f1151937c1d3a11e90c90182863c7afcfeec13bfbdcfb0984c4499c27de9"
COORDINATOR_ID="65b99caf35cab22e25dec4b15f45504fa4121a69276780da71d0e1a63dd558ef"
SERVICE_PORT=8080

# GraphQL URLs
REGISTRY_URL="http://localhost:$SERVICE_PORT/chains/$CHAIN_ID/applications/$REGISTRY_ID"
VOTER_URL="http://localhost:$SERVICE_PORT/chains/$CHAIN_ID/applications/$VOTER_ID"
COORDINATOR_URL="http://localhost:$SERVICE_PORT/chains/$CHAIN_ID/applications/$COORDINATOR_ID"

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}▶ $1${NC}"
    echo "───────────────────────────────────────────────────────────"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[i]${NC} $1"
}

# GraphQL query helper
query_graphql() {
    local url=$1
    local query=$2
    
    curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d "{\"query\":\"$query\"}" \
        --max-time 30 \
        --connect-timeout 10 \
        2>&1
}

# Test 1: Check Service Status
test_service_status() {
    print_step "Test 1: Check Service Status"
    
    if pgrep -f "linera service" > /dev/null 2>&1; then
        print_success "Linera service is running"
    else
        print_error "Linera service not running"
        print_info "Start with: linera service --port $SERVICE_PORT &"
        return 1
    fi
    
    if curl -s --max-time 5 "http://localhost:$SERVICE_PORT" > /dev/null 2>&1; then
        print_success "Service is accessible"
    else
        print_error "Service not accessible"
        return 1
    fi
}

# Test 2: Query Protocol Stats
test_protocol_stats() {
    print_step "Test 2: Query Protocol Statistics"
    
    local query='{
      protocolStats {
        totalMarkets
        activeMarkets
        resolvedMarkets
        totalVoters
        activeVoters
        totalValueLocked
        totalFeesCollected
      }
    }'
    
    local result=$(query_graphql "$REGISTRY_URL" "$query")
    
    if echo "$result" | grep -q "protocolStats"; then
        print_success "Protocol stats retrieved"
        if command -v jq &> /dev/null; then
            echo ""
            echo "Protocol Statistics:"
            echo "$result" | jq '.data.protocolStats' 2>/dev/null || echo "$result"
        else
            echo "$result" | grep -A 10 "protocolStats"
        fi
    else
        print_error "Failed to get protocol stats"
        echo "Response: $result"
        return 1
    fi
}

# Test 3: Query Active Markets
test_active_markets() {
    print_step "Test 3: Query Active Markets"
    
    local query='{
      activeMarkets {
        id
        question
        outcomes
        status
        createdAt
        deadline
      }
    }'
    
    local result=$(query_graphql "$REGISTRY_URL" "$query")
    
    if echo "$result" | grep -q "activeMarkets"; then
        print_success "Active markets retrieved"
        if command -v jq &> /dev/null; then
            local count=$(echo "$result" | jq '.data.activeMarkets | length' 2>/dev/null)
            echo "Found $count active markets"
            echo "$result" | jq '.data.activeMarkets' 2>/dev/null || echo "$result"
        else
            echo "$result" | grep -A 20 "activeMarkets"
        fi
    else
        print_info "No active markets found (this is OK)"
        echo "Response: $result"
    fi
}

# Test 4: Query Market Details
test_market_details() {
    print_step "Test 4: Query Market Details"
    
    local market_id=${1:-0}
    
    local query="{
      marketDetails(id: $market_id) {
        id
        question
        outcomes
        status
        createdAt
        deadline
        selectedVotersCount
        totalCommitments
        totalReveals
      }
    }"
    
    local result=$(query_graphql "$REGISTRY_URL" "$query")
    
    if echo "$result" | grep -q "marketDetails"; then
        print_success "Market details retrieved for market $market_id"
        if command -v jq &> /dev/null; then
            echo "$result" | jq '.data.marketDetails' 2>/dev/null || echo "$result"
        else
            echo "$result" | grep -A 15 "marketDetails"
        fi
    else
        print_info "Market $market_id not found (this is OK if no markets created yet)"
        echo "Response: $result"
    fi
}

# Test 5: Query Voter Leaderboard
test_voter_leaderboard() {
    print_step "Test 5: Query Voter Leaderboard"
    
    local query='{
      voterLeaderboard(limit: 10) {
        voterApp
        reputationScore
        totalVotes
        accuracyRate
      }
    }'
    
    local result=$(query_graphql "$REGISTRY_URL" "$query")
    
    if echo "$result" | grep -q "voterLeaderboard"; then
        print_success "Voter leaderboard retrieved"
        if command -v jq &> /dev/null; then
            local count=$(echo "$result" | jq '.data.voterLeaderboard | length' 2>/dev/null)
            echo "Found $count voters"
            echo "$result" | jq '.data.voterLeaderboard' 2>/dev/null || echo "$result"
        else
            echo "$result" | grep -A 20 "voterLeaderboard"
        fi
    else
        print_info "No voters found (this is OK)"
        echo "Response: $result"
    fi
}

# Test 6: Query Recent Activity
test_recent_activity() {
    print_step "Test 6: Query Recent Activity"
    
    local query='{
      recentActivity(limit: 10) {
        marketId
        question
        status
        createdAt
      }
    }'
    
    local result=$(query_graphql "$REGISTRY_URL" "$query")
    
    if echo "$result" | grep -q "recentActivity"; then
        print_success "Recent activity retrieved"
        if command -v jq &> /dev/null; then
            local count=$(echo "$result" | jq '.data.recentActivity | length' 2>/dev/null)
            echo "Found $count recent activities"
            echo "$result" | jq '.data.recentActivity' 2>/dev/null || echo "$result"
        else
            echo "$result" | grep -A 20 "recentActivity"
        fi
    else
        print_info "No recent activity found (this is OK)"
        echo "Response: $result"
    fi
}

# Test 7: Test GraphQL Schema
test_graphql_schema() {
    print_step "Test 7: Test GraphQL Schema"
    
    local query='{
      __schema {
        queryType {
          name
          fields {
            name
            type {
              name
            }
          }
        }
      }
    }'
    
    local result=$(query_graphql "$REGISTRY_URL" "$query")
    
    if echo "$result" | grep -q "__schema\|QueryRoot"; then
        print_success "GraphQL schema accessible"
        if command -v jq &> /dev/null; then
            echo "Available queries:"
            echo "$result" | jq '.data.__schema.queryType.fields[].name' 2>/dev/null || echo "$result"
        fi
    else
        print_error "Failed to get GraphQL schema"
        echo "Response: $result"
        return 1
    fi
}

# Main execution
main() {
    print_header "Alethea Oracle Protocol - Complete Testing"
    
    echo "Configuration:"
    echo "  Chain ID:     ${CHAIN_ID:0:16}..."
    echo "  Registry ID:  ${REGISTRY_ID:0:16}..."
    echo "  Voter ID:     ${VOTER_ID:0:16}..."
    echo "  Service Port: $SERVICE_PORT"
    echo ""
    
    # Run all tests
    test_service_status || exit 1
    test_protocol_stats
    test_active_markets
    test_market_details 0
    test_voter_leaderboard
    test_recent_activity
    test_graphql_schema
    
    print_header "Testing Complete"
    echo ""
    echo "✅ All tests completed!"
    echo ""
    echo "Next Steps:"
    echo "  1. Create a market via Linera operation"
    echo "  2. Register voters"
    echo "  3. Test complete workflow"
    echo ""
    echo "See docs/PROTOCOL_TESTING_GUIDE.md for detailed instructions"
}

# Run main
main "$@"

