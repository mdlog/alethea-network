#!/bin/bash
# Monitor Account-Based Oracle Registry v2
# Real-time monitoring of registry statistics, voters, queries, and system health

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
REFRESH_INTERVAL=${REFRESH_INTERVAL:-5}  # Default 5 seconds
ALERT_THRESHOLD_LOW_VOTES=${ALERT_THRESHOLD_LOW_VOTES:-50}  # Alert if vote response rate < 50%
ALERT_THRESHOLD_LOW_REPUTATION=${ALERT_THRESHOLD_LOW_REPUTATION:-30}  # Alert if avg reputation < 30
ALERT_THRESHOLD_EXPIRED_QUERIES=${ALERT_THRESHOLD_EXPIRED_QUERIES:-5}  # Alert if > 5 expired queries

# Parse command line arguments first
RUN_ONCE=false
SHOW_HELP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        -i|--interval)
            REFRESH_INTERVAL="$2"
            shift 2
            ;;
        -o|--once)
            RUN_ONCE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            SHOW_HELP=true
            shift
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
    echo -e "${CYAN}Account-Based Registry Monitor${NC}\n"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help                    Show this help message"
    echo "  -i, --interval SECONDS        Set refresh interval (default: 5)"
    echo "  -o, --once                    Run once and exit (no continuous monitoring)"
    echo ""
    echo "Environment Variables:"
    echo "  REFRESH_INTERVAL              Refresh interval in seconds (default: 5)"
    echo "  ALERT_THRESHOLD_LOW_VOTES     Alert threshold for low vote rate (default: 50%)"
    echo "  ALERT_THRESHOLD_LOW_REPUTATION Alert threshold for low reputation (default: 30)"
    echo "  ALERT_THRESHOLD_EXPIRED_QUERIES Alert threshold for expired queries (default: 5)"
    echo ""
    echo "Examples:"
    echo "  $0                            # Start monitoring with default settings"
    echo "  $0 -i 10                      # Monitor with 10-second refresh"
    echo "  $0 -o                         # Run once and exit"
    echo "  REFRESH_INTERVAL=3 $0         # Monitor with 3-second refresh"
    echo ""
    exit 0
fi

# Load environment
if [ -f .env.account-based-registry ]; then
    source .env.account-based-registry
    echo -e "${GREEN}✓ Loaded environment from .env.account-based-registry${NC}\n"
elif [ -f .env.fresh ]; then
    source .env.fresh
    echo -e "${YELLOW}⚠️  Using .env.fresh (account-based registry not found)${NC}\n"
else
    echo -e "${RED}❌ No environment file found${NC}"
    echo -e "${YELLOW}Please run deploy-account-based-registry.sh first${NC}"
    exit 1
fi

# Set registry ID
REGISTRY_ID="${ACCOUNT_BASED_REGISTRY_ID:-${ALETHEA_REGISTRY_ID}}"

if [ -z "$REGISTRY_ID" ]; then
    echo -e "${RED}❌ Registry ID not set${NC}"
    echo -e "${YELLOW}Please set ACCOUNT_BASED_REGISTRY_ID or ALETHEA_REGISTRY_ID${NC}"
    exit 1
fi

if [ -z "$CHAIN_ID" ]; then
    echo -e "${RED}❌ CHAIN_ID not set${NC}"
    exit 1
fi

REGISTRY_URL="http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}"

# Function to clear screen
clear_screen() {
    clear
}

# Function to print header
print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${MAGENTA}🔮 Account-Based Oracle Registry Monitor${NC}                                ${CYAN}║${NC}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  Registry ID: ${GREEN}${REGISTRY_ID:0:16}...${NC}                    ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  Chain ID:    ${GREEN}${CHAIN_ID:0:16}...${NC}                    ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  Updated:     ${BLUE}$(date '+%Y-%m-%d %H:%M:%S')${NC}                                  ${CYAN}║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════════════╝${NC}\n"
}

# Function to query GraphQL
query_graphql() {
    local query="$1"
    local result
    
    result=$(curl -s --max-time 10 "$REGISTRY_URL" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"$query\"}" 2>/dev/null || echo '{"errors": [{"message": "Connection failed"}]}')
    
    echo "$result"
}

# Function to extract value from JSON
extract_value() {
    local json="$1"
    local path="$2"
    echo "$json" | jq -r "$path" 2>/dev/null || echo "N/A"
}

# Function to display statistics
display_statistics() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📊 Protocol Statistics${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    local query='{ statistics { totalVoters activeVoters totalStake totalLockedStake averageStake totalQueriesCreated totalQueriesResolved activeQueriesCount totalVotesSubmitted averageVotesPerQuery totalRewardsDistributed rewardPoolBalance protocolTreasury averageReputation protocolStatus resolutionRate } }'
    
    local result=$(query_graphql "$query")
    
    if echo "$result" | grep -q "errors"; then
        echo -e "${RED}❌ Failed to fetch statistics${NC}"
        echo "$result" | jq '.errors' 2>/dev/null || echo "$result"
        return 1
    fi
    
    # Extract values
    local total_voters=$(extract_value "$result" '.data.statistics.totalVoters')
    local active_voters=$(extract_value "$result" '.data.statistics.activeVoters')
    local total_stake=$(extract_value "$result" '.data.statistics.totalStake')
    local total_locked=$(extract_value "$result" '.data.statistics.totalLockedStake')
    local avg_stake=$(extract_value "$result" '.data.statistics.averageStake')
    local total_queries=$(extract_value "$result" '.data.statistics.totalQueriesCreated')
    local resolved_queries=$(extract_value "$result" '.data.statistics.totalQueriesResolved')
    local active_queries=$(extract_value "$result" '.data.statistics.activeQueriesCount')
    local total_votes=$(extract_value "$result" '.data.statistics.totalVotesSubmitted')
    local avg_votes=$(extract_value "$result" '.data.statistics.averageVotesPerQuery')
    local total_rewards=$(extract_value "$result" '.data.statistics.totalRewardsDistributed')
    local reward_pool=$(extract_value "$result" '.data.statistics.rewardPoolBalance')
    local treasury=$(extract_value "$result" '.data.statistics.protocolTreasury')
    local avg_reputation=$(extract_value "$result" '.data.statistics.averageReputation')
    local protocol_status=$(extract_value "$result" '.data.statistics.protocolStatus')
    local resolution_rate=$(extract_value "$result" '.data.statistics.resolutionRate')
    
    # Display in columns
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC} ${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Total Voters:" "$total_voters" \
        "Active Voters:" "$active_voters"
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC} ${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Total Stake:" "$total_stake" \
        "Locked Stake:" "$total_locked"
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC} ${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Average Stake:" "$avg_stake" \
        "Average Reputation:" "$avg_reputation"
    
    echo ""
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC} ${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Total Queries:" "$total_queries" \
        "Resolved Queries:" "$resolved_queries"
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC} ${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Active Queries:" "$active_queries" \
        "Resolution Rate:" "${resolution_rate}%"
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC} ${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Total Votes:" "$total_votes" \
        "Avg Votes/Query:" "$avg_votes"
    
    echo ""
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Total Rewards Distributed:" "$total_rewards"
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Reward Pool Balance:" "$reward_pool"
    
    printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" \
        "Protocol Treasury:" "$treasury"
    
    echo ""
    
    # Protocol status with color
    if [ "$protocol_status" = "Active" ]; then
        printf "${CYAN}%-30s${NC} ${GREEN}%-20s${NC}\n" "Protocol Status:" "✓ $protocol_status"
    else
        printf "${CYAN}%-30s${NC} ${RED}%-20s${NC}\n" "Protocol Status:" "⚠ $protocol_status"
    fi
    
    echo ""
    
    # Store values for alerts
    STATS_AVG_REPUTATION="$avg_reputation"
    STATS_ACTIVE_QUERIES="$active_queries"
    STATS_TOTAL_QUERIES="$total_queries"
    STATS_RESOLVED_QUERIES="$resolved_queries"
}

# Function to display active queries
display_active_queries() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}🗳️  Active Queries (Top 5)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    local query='{ activeQueries(limit: 5) { id description strategy minVotes voteCount timeRemaining rewardAmount } }'
    
    local result=$(query_graphql "$query")
    
    if echo "$result" | grep -q "errors"; then
        echo -e "${RED}❌ Failed to fetch active queries${NC}"
        return 1
    fi
    
    local query_count=$(echo "$result" | jq '.data.activeQueries | length' 2>/dev/null || echo "0")
    
    if [ "$query_count" = "0" ]; then
        echo -e "${YELLOW}No active queries${NC}\n"
        return 0
    fi
    
    # Display each query
    for i in $(seq 0 $((query_count - 1))); do
        local id=$(echo "$result" | jq -r ".data.activeQueries[$i].id")
        local desc=$(echo "$result" | jq -r ".data.activeQueries[$i].description" | cut -c1-60)
        local strategy=$(echo "$result" | jq -r ".data.activeQueries[$i].strategy")
        local min_votes=$(echo "$result" | jq -r ".data.activeQueries[$i].minVotes")
        local vote_count=$(echo "$result" | jq -r ".data.activeQueries[$i].voteCount")
        local time_remaining=$(echo "$result" | jq -r ".data.activeQueries[$i].timeRemaining")
        local reward=$(echo "$result" | jq -r ".data.activeQueries[$i].rewardAmount")
        
        # Convert time remaining to human readable
        local hours=$((time_remaining / 3600))
        local minutes=$(((time_remaining % 3600) / 60))
        local time_str="${hours}h ${minutes}m"
        
        # Vote progress indicator
        local vote_progress=""
        if [ "$vote_count" -ge "$min_votes" ]; then
            vote_progress="${GREEN}✓${NC}"
        else
            vote_progress="${YELLOW}⏳${NC}"
        fi
        
        echo -e "${CYAN}Query #${id}${NC} $vote_progress"
        echo -e "  ${BLUE}Description:${NC} $desc..."
        echo -e "  ${BLUE}Strategy:${NC} $strategy  ${BLUE}|${NC}  ${BLUE}Votes:${NC} $vote_count/$min_votes  ${BLUE}|${NC}  ${BLUE}Time:${NC} $time_str  ${BLUE}|${NC}  ${BLUE}Reward:${NC} $reward"
        echo ""
    done
}

# Function to display top voters
display_top_voters() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}👥 Top Voters (by Reputation)${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    local query='{ voters(limit: 5, activeOnly: true) { address stake reputation reputationTier totalVotes correctVotes accuracyPercentage name } }'
    
    local result=$(query_graphql "$query")
    
    if echo "$result" | grep -q "errors"; then
        echo -e "${RED}❌ Failed to fetch voters${NC}"
        return 1
    fi
    
    local voter_count=$(echo "$result" | jq '.data.voters | length' 2>/dev/null || echo "0")
    
    if [ "$voter_count" = "0" ]; then
        echo -e "${YELLOW}No active voters${NC}\n"
        return 0
    fi
    
    # Display header
    printf "${CYAN}%-20s %-12s %-12s %-10s %-15s %-10s${NC}\n" \
        "Address" "Stake" "Reputation" "Tier" "Votes" "Accuracy"
    echo -e "${BLUE}────────────────────────────────────────────────────────────────────────────${NC}"
    
    # Display each voter
    for i in $(seq 0 $((voter_count - 1))); do
        local address=$(echo "$result" | jq -r ".data.voters[$i].address" | cut -c1-18)
        local stake=$(echo "$result" | jq -r ".data.voters[$i].stake")
        local reputation=$(echo "$result" | jq -r ".data.voters[$i].reputation")
        local tier=$(echo "$result" | jq -r ".data.voters[$i].reputationTier")
        local total_votes=$(echo "$result" | jq -r ".data.voters[$i].totalVotes")
        local correct_votes=$(echo "$result" | jq -r ".data.voters[$i].correctVotes")
        local accuracy=$(echo "$result" | jq -r ".data.voters[$i].accuracyPercentage")
        local name=$(echo "$result" | jq -r ".data.voters[$i].name")
        
        # Color code reputation
        local rep_color="$GREEN"
        if [ "$reputation" -lt 40 ]; then
            rep_color="$RED"
        elif [ "$reputation" -lt 70 ]; then
            rep_color="$YELLOW"
        fi
        
        # Format accuracy
        local accuracy_fmt=$(printf "%.1f%%" "$accuracy")
        
        # Display name if available
        local display_name="$address"
        if [ "$name" != "null" ] && [ -n "$name" ]; then
            display_name="$name"
        fi
        
        printf "%-20s %-12s ${rep_color}%-12s${NC} %-10s %-15s %-10s\n" \
            "$display_name" "$stake" "$reputation" "$tier" "$correct_votes/$total_votes" "$accuracy_fmt"
    done
    
    echo ""
}

# Function to check and display alerts
display_alerts() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  System Alerts${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    local has_alerts=false
    
    # Check average reputation
    if [ -n "$STATS_AVG_REPUTATION" ] && [ "$STATS_AVG_REPUTATION" != "N/A" ]; then
        local avg_rep_int=$(printf "%.0f" "$STATS_AVG_REPUTATION")
        if [ "$avg_rep_int" -lt "$ALERT_THRESHOLD_LOW_REPUTATION" ]; then
            echo -e "${RED}⚠️  Low average reputation: ${avg_rep_int} (threshold: ${ALERT_THRESHOLD_LOW_REPUTATION})${NC}"
            has_alerts=true
        fi
    fi
    
    # Check for expired queries
    if [ -n "$STATS_TOTAL_QUERIES" ] && [ -n "$STATS_RESOLVED_QUERIES" ] && [ -n "$STATS_ACTIVE_QUERIES" ]; then
        local expired_queries=$((STATS_TOTAL_QUERIES - STATS_RESOLVED_QUERIES - STATS_ACTIVE_QUERIES))
        if [ "$expired_queries" -gt "$ALERT_THRESHOLD_EXPIRED_QUERIES" ]; then
            echo -e "${YELLOW}⚠️  High number of expired queries: ${expired_queries} (threshold: ${ALERT_THRESHOLD_EXPIRED_QUERIES})${NC}"
            has_alerts=true
        fi
    fi
    
    # Check for queries with low vote participation
    local query='{ activeQueries { id minVotes voteCount } }'
    local result=$(query_graphql "$query")
    
    if ! echo "$result" | grep -q "errors"; then
        local query_count=$(echo "$result" | jq '.data.activeQueries | length' 2>/dev/null || echo "0")
        
        for i in $(seq 0 $((query_count - 1))); do
            local id=$(echo "$result" | jq -r ".data.activeQueries[$i].id")
            local min_votes=$(echo "$result" | jq -r ".data.activeQueries[$i].minVotes")
            local vote_count=$(echo "$result" | jq -r ".data.activeQueries[$i].voteCount")
            
            if [ "$vote_count" -lt "$min_votes" ]; then
                local vote_rate=$((vote_count * 100 / min_votes))
                if [ "$vote_rate" -lt "$ALERT_THRESHOLD_LOW_VOTES" ]; then
                    echo -e "${YELLOW}⚠️  Query #${id} has low vote participation: ${vote_count}/${min_votes} (${vote_rate}%)${NC}"
                    has_alerts=true
                fi
            fi
        done
    fi
    
    if [ "$has_alerts" = false ]; then
        echo -e "${GREEN}✓ No alerts - All systems operational${NC}"
    fi
    
    echo ""
}



# Main monitoring loop
monitor_loop() {
    while true; do
        clear_screen
        print_header
        
        display_statistics
        display_active_queries
        display_top_voters
        display_alerts
        
        if [ "$RUN_ONCE" = true ]; then
            break
        fi
        
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${CYAN}Refreshing in ${REFRESH_INTERVAL} seconds... (Press Ctrl+C to exit)${NC}"
        
        sleep "$REFRESH_INTERVAL"
    done
}

# Trap Ctrl+C for clean exit
trap 'echo -e "\n${GREEN}Monitoring stopped${NC}"; exit 0' INT

# Start monitoring
monitor_loop
