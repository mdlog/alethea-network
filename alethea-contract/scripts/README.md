# 🛠️ Alethea Network Scripts

**Last Updated:** November 13, 2025

---

## 📋 Script Index

### Active Scripts (Current Deployment)

Located in: `scripts/`

#### Deployment Scripts
- **`deploy-registry.sh`** - Deploy Oracle Registry
- **`deploy-market-chain.sh`** - Deploy Market Chain
- **`deploy-voter.sh`** - Deploy Voter instance
- **`deploy-to-conway.sh`** - Complete Conway testnet deployment

#### Testing Scripts
Located in: `scripts/tests/`

- **`initialize-voters-fresh.sh`** - Initialize and register voters to registry
- **`test-workflow-fresh.sh`** - Test complete workflow (create market → vote → resolve)
- **`restart-dashboard.sh`** - Restart dashboard with updated configuration
- **`deploy-fresh-network.sh`** - Deploy all applications to fresh chain
- **`deploy-fresh-complete.sh`** - Complete fresh deployment with setup

#### Utility Scripts
- **`create-market-5min.sh`** - Create test market with 5-minute deadline
- **`monitor-protocol.sh`** - Monitor protocol statistics
- **`setup-local-testnet.sh`** - Setup local testnet environment

#### Account-Based Registry Scripts
- **`deploy-account-based-registry.sh`** - Deploy account-based oracle registry v2
- **`onboard-voter-account-based.sh`** - Register as a voter (simplified onboarding)
- **`create-query-account-based.sh`** - Create queries/markets on the registry
- **`vote-account-based.sh`** - Submit votes on active queries
- **`monitor-account-based-registry.sh`** - Real-time monitoring dashboard (NEW!)
- **`VOTING_GUIDE.md`** - Comprehensive voting guide and documentation

---

## 🗳️ Account-Based Voting

**New in November 2025** - Simplified voting without application deployment

### Account-Based Scripts

Located in: `scripts/`

#### Deployment & Setup
- **`deploy-account-based-registry.sh`** - Deploy registry with account-based voting
- **`onboard-voter-account-based.sh`** - Register as a voter (30 seconds)

#### Voting Operations
- **`create-query-account-based.sh`** - Create queries/markets
- **`vote-account-based.sh`** - Submit votes on queries

#### Monitoring
- **`monitor-account-based-registry.sh`** - Real-time monitoring dashboard (NEW!)

#### Documentation
- **`VOTING_GUIDE.md`** - Complete voting guide with examples

### Quick Start (Account-Based)

```bash
# 1. Deploy registry
./scripts/deploy-account-based-registry.sh
source .env.account-based-registry

# 2. Register as voter
./scripts/onboard-voter-account-based.sh

# 3. Create a query
./scripts/create-query-account-based.sh

# 4. Vote on queries
./scripts/vote-account-based.sh
```

### vote-account-based.sh

**Purpose:** Interactive voting on queries/markets

**Usage:**
```bash
./scripts/vote-account-based.sh
```

**What it does:**
1. Displays all active queries
2. Lets you select a query to vote on
3. Shows available outcomes
4. Accepts your vote and confidence level
5. Submits vote to the registry
6. Verifies vote was recorded

**Features:**
- ✅ Interactive query selection
- ✅ Outcome validation
- ✅ Confidence level setting (0-100)
- ✅ Vote verification
- ✅ Helpful error messages
- ✅ Post-vote guidance

**Example:**
```bash
$ ./scripts/vote-account-based.sh

Active Queries:

Query #1
  Description: Will Bitcoin reach $50,000 by end of month?
  Outcomes: Yes, No
  Strategy: Majority
  Votes: 2/3 (minimum)
  Time Remaining: 4h 30m 15s

Enter the Query ID you want to vote on:
Query ID: 1

Available Outcomes:
  1) Yes
  2) No

Select your vote (enter number or outcome text):
Vote: 1

How confident are you in this vote? (0-100)
Confidence: 85

Vote Summary:
  • Query ID: 1
  • Description: Will Bitcoin reach $50,000 by end of month?
  • Your Vote: Yes
  • Confidence: 85%

Submit this vote? (y/n) y

✓ Vote submitted successfully!
✓ Vote recorded! (3/3 votes)
```

**See Also:** `scripts/VOTING_GUIDE.md` for detailed documentation

### monitor-account-based-registry.sh

**Purpose:** Real-time monitoring dashboard for the account-based oracle registry

**Usage:**
```bash
# Basic usage (refreshes every 5 seconds)
./scripts/monitor-account-based-registry.sh

# Custom refresh interval
./scripts/monitor-account-based-registry.sh -i 10

# Run once and exit (no continuous monitoring)
./scripts/monitor-account-based-registry.sh -o

# With environment variables
REFRESH_INTERVAL=3 ./scripts/monitor-account-based-registry.sh
```

**What it monitors:**
1. **Protocol Statistics**
   - Total and active voters
   - Total and locked stake
   - Query statistics (created, resolved, active)
   - Vote statistics
   - Reward distribution
   - Protocol treasury
   - Average reputation
   - Resolution rate

2. **Active Queries**
   - Top 5 active queries
   - Vote progress (current/minimum)
   - Time remaining
   - Reward amounts
   - Decision strategy

3. **Top Voters**
   - Top 5 voters by reputation
   - Stake amounts
   - Reputation scores and tiers
   - Voting accuracy
   - Total and correct votes

4. **System Alerts**
   - Low average reputation warnings
   - High number of expired queries
   - Queries with low vote participation
   - Protocol status changes

**Features:**
- ✅ Real-time updates with configurable refresh interval
- ✅ Color-coded display for easy reading
- ✅ Automatic alert detection
- ✅ Reputation tier classification
- ✅ Vote progress indicators
- ✅ Human-readable time formatting
- ✅ Clean terminal UI with borders

**Configuration:**
```bash
# Environment variables
export REFRESH_INTERVAL=5                      # Refresh every 5 seconds
export ALERT_THRESHOLD_LOW_VOTES=50            # Alert if vote rate < 50%
export ALERT_THRESHOLD_LOW_REPUTATION=30       # Alert if avg reputation < 30
export ALERT_THRESHOLD_EXPIRED_QUERIES=5       # Alert if > 5 expired queries
```

**Example Output:**
```
╔════════════════════════════════════════════════════════════════════════════╗
║  🔮 Account-Based Oracle Registry Monitor                                  ║
╠════════════════════════════════════════════════════════════════════════════╣
║  Registry ID: a1b2c3d4e5f6...                                              ║
║  Chain ID:    e0123456789a...                                              ║
║  Updated:     2025-11-14 10:30:45                                          ║
╚════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Protocol Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Voters:              15                   Active Voters:         15
Total Stake:               150000               Locked Stake:          25000
Average Stake:             10000                Average Reputation:    72.5

Total Queries:             42                   Resolved Queries:      38
Active Queries:            3                    Resolution Rate:       90.5%
Total Votes:               156                  Avg Votes/Query:       3.7

Total Rewards Distributed: 5000
Reward Pool Balance:       2000
Protocol Treasury:         500

Protocol Status:           ✓ Active

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗳️  Active Queries (Top 5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Query #42 ✓
  Description: Will Bitcoin reach $50,000 by end of month?...
  Strategy: Majority  |  Votes: 5/3  |  Time: 4h 30m  |  Reward: 100

Query #41 ⏳
  Description: What will be the average temperature in NYC tomorrow?...
  Strategy: Median  |  Votes: 2/3  |  Time: 12h 15m  |  Reward: 150

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Top Voters (by Reputation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Address              Stake        Reputation   Tier       Votes           Accuracy
────────────────────────────────────────────────────────────────────────────
Alice                15000        95           Master     38/40           95.0%
Bob                  12000        88           Expert     25/28           89.3%
Charlie              10000        75           Expert     18/22           81.8%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  System Alerts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ No alerts - All systems operational

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Refreshing in 5 seconds... (Press Ctrl+C to exit)
```

**Requirements:**
- Linera service running on port 8080
- Account-based registry deployed
- `.env.account-based-registry` or `.env.fresh` file with registry configuration
- `jq` command-line JSON processor installed

**See Also:** 
- `scripts/deploy-account-based-registry.sh` - Deploy the registry first
- `scripts/VOTING_GUIDE.md` - Complete voting guide

### Benefits of Account-Based Voting

✅ **Simple**: No application deployment needed
✅ **Fast**: Vote in seconds, not minutes  
✅ **Cheap**: Lower gas costs (single chain)
✅ **Reliable**: No cross-chain message issues
✅ **Scalable**: Can handle thousands of voters

---

## 🗂️ Archived Scripts

Located in: `scripts/archive/`

Contains scripts from previous deployments and experiments:
- Old deployment scripts
- Previous test workflows
- Historical voter registration scripts
- Deprecated utility scripts

---

## 🚀 Quick Start

### Initialize Fresh Deployment

```bash
# 1. Load environment
source .env.fresh

# 2. Initialize voters
./scripts/tests/initialize-voters-fresh.sh

# 3. Test workflow
./scripts/tests/test-workflow-fresh.sh
```

### Restart Dashboard

```bash
./scripts/tests/restart-dashboard.sh
```

---

## 📖 Script Documentation

### initialize-voters-fresh.sh

**Purpose:** Initialize and register 3 voters to the Oracle Registry

**Usage:**
```bash
source .env.fresh
./scripts/tests/initialize-voters-fresh.sh
```

**What it does:**
1. Initializes Voter 1, 2, 3 with registry ID
2. Registers all voters to Registry
3. Verifies registration (should show totalVoters: 3)

**Output:**
- Success: "✓ Voter X registration attempted"
- Verification: Shows protocol stats with voter count

---

### test-workflow-fresh.sh

**Purpose:** Test complete oracle workflow

**Usage:**
```bash
source .env.fresh
./scripts/tests/test-workflow-fresh.sh
```

**What it does:**
1. Verifies setup (3 voters registered)
2. Creates test market
3. Waits for deadline
4. Provides commands for resolution and voting

**Output:**
- Market ID
- Market details
- Next steps for testing

---

### restart-dashboard.sh

**Purpose:** Restart Alethea Dashboard with fresh configuration

**Usage:**
```bash
./scripts/tests/restart-dashboard.sh
```

**What it does:**
1. Stops existing dashboard process on port 4000
2. Verifies .env.local configuration
3. Shows current configuration
4. Starts dashboard in development mode

**Output:**
- Configuration details
- Dashboard URL: http://localhost:4000

---

### deploy-fresh-network.sh

**Purpose:** Deploy all applications to a fresh chain

**Usage:**
```bash
./scripts/tests/deploy-fresh-network.sh
```

**What it does:**
1. Builds all contracts
2. Deploys Oracle Registry
3. Deploys Voter Template
4. Deploys 3 Voter instances
5. Deploys Market Chain
6. Updates .env.fresh

**Output:**
- All application IDs
- Updated environment file
- Next steps

---

## 🔧 Script Development

### Creating New Scripts

**Template:**
```bash
#!/bin/bash
# Script Name - Brief description

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment
source .env.fresh

echo -e "${BLUE}Starting script...${NC}"

# Your code here

echo -e "${GREEN}✓ Script completed${NC}"
```

### Best Practices
1. Always use `set -e` to exit on errors
2. Load `.env.fresh` for environment variables
3. Use colored output for better readability
4. Add error handling and validation
5. Document what the script does
6. Make scripts executable: `chmod +x script.sh`

---

## 📊 Script Categories

### By Purpose

**Deployment** (7 scripts)
- Deploy individual components
- Complete system deployment
- Fresh chain deployment

**Testing** (5 scripts)
- Workflow testing
- Integration testing
- Component testing

**Utilities** (8 scripts)
- Monitoring
- Configuration
- Maintenance

**Archived** (30+ scripts)
- Historical scripts
- Deprecated workflows
- Old deployments

---

## 🧪 Testing Scripts

### Running Tests

```bash
# Test Registry
curl http://localhost:8080/chains/${CHAIN_ID}/applications/${ALETHEA_REGISTRY_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ protocolStats { totalMarkets totalVoters } }"}'

# Test Market Chain
curl http://localhost:8080/chains/${CHAIN_ID}/applications/${MARKET_CHAIN_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ markets { id question status } }"}'

# Test Voter
curl http://localhost:8080/chains/${CHAIN_ID}/applications/${VOTER_1_ID} \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voterStats { totalVotes reputation } }"}'
```

---

## 🚨 Troubleshooting

### Common Issues

**Script not executable:**
```bash
chmod +x script.sh
```

**Environment not loaded:**
```bash
source .env.fresh
```

**Service not running:**
```bash
linera service --port 8080
```

**Database locked:**
```bash
# Stop service first
pkill -f "linera service"
# Then run script
```

---

## 📝 Script Maintenance

### Regular Tasks
- [ ] Update scripts when application IDs change
- [ ] Archive old scripts after major updates
- [ ] Test scripts after Linera updates
- [ ] Document new scripts
- [ ] Remove deprecated scripts

### Version Control
- Keep scripts in git
- Tag major script updates
- Document breaking changes
- Maintain changelog

---

## 🎯 Script Roadmap

### Completed ✅
- [x] Voter initialization scripts
- [x] Workflow testing scripts
- [x] Dashboard restart script
- [x] Fresh deployment scripts

### Planned 📋
- [ ] Automated testing suite
- [ ] Performance benchmarking scripts
- [ ] Backup and restore scripts
- [ ] Migration scripts
- [ ] Monitoring dashboards

---

## 📞 Support

### Getting Help
1. Check script documentation above
2. Review script source code
3. Check logs: `/tmp/linera-service-*.log`
4. See main documentation: `docs/`

### Reporting Issues
- Include script name
- Provide error output
- Share environment details
- Check archived scripts for similar issues

---

**For the latest scripts, always check the `scripts/tests/` directory.**


---

## 🚀 Oracle-as-a-Service Deployment (v2)

**New in November 2025** - Refactored architecture with external market support

### V2 Deployment Scripts

Located in: `scripts/`

#### Core Deployment
- **`deploy-registry-v2.sh`** - Deploy Registry v2 with Oracle-as-a-Service features
- **`deploy-market-chain-v2.sh`** - Deploy Market Chain v2 as Registry consumer
- **`deploy-external-dapp.sh`** - Deploy example external dApp

#### Testing
- **`test-oracle-as-a-service.sh`** - End-to-end validation tests

### Quick Start (V2)

```bash
# Terminal 1: Start Linera service
linera service --port 8080

# Terminal 2: Deploy everything
bash scripts/deploy-registry-v2.sh
source .env.registry-v2

bash scripts/deploy-market-chain-v2.sh
source .env.market-chain-v2

bash scripts/deploy-external-dapp.sh
source .env.external-dapp

bash scripts/test-oracle-as-a-service.sh
```

### V2 Features

**Registry v2:**
- ✅ External market registration
- ✅ Resolution callback mechanism
- ✅ Market source tracking (Internal/External)
- ✅ Fee management for external markets
- ✅ Callback retry logic with exponential backoff

**Market Chain v2:**
- ✅ Uses Registry as external service
- ✅ Receives resolution callbacks
- ✅ No direct resolution logic
- ✅ Acts as external dApp consumer

**Example External dApp:**
- ✅ Demonstrates SDK integration
- ✅ Market creation with Oracle registration
- ✅ Resolution callback handling
- ✅ Automatic winnings distribution

### V2 Environment Files

After deployment, you'll have:
- `.env.registry-v2` - Registry v2 configuration
- `.env.market-chain-v2` - Market Chain v2 configuration
- `.env.external-dapp` - External dApp configuration

### V2 Documentation

For detailed information:
- `.kiro/specs/oracle-as-a-service-refactoring/QUICK_DEPLOYMENT.md` - Quick reference
- `.kiro/specs/oracle-as-a-service-refactoring/DEPLOYMENT_GUIDE.md` - Complete guide
- `.kiro/specs/oracle-as-a-service-refactoring/TASK_10_VERIFICATION.md` - Verification checklist

### V2 Script Details

#### deploy-registry-v2.sh

**Purpose:** Deploy Registry with Oracle-as-a-Service features

**What it does:**
1. Builds Registry contract
2. Deploys with configurable parameters
3. Tests external market registration
4. Generates `.env.registry-v2`

**Output:**
- Registry v2 Application ID
- GraphQL endpoint URL
- Protocol stats verification

#### deploy-market-chain-v2.sh

**Purpose:** Deploy Market Chain as Registry consumer

**What it does:**
1. Builds Market Chain contract
2. Configures Registry v2 ID
3. Deploys to testnet
4. Tests market queries

**Output:**
- Market Chain v2 Application ID
- GraphQL endpoint URL
- Market query verification

#### deploy-external-dapp.sh

**Purpose:** Deploy example external dApp

**What it does:**
1. Builds external dApp contract
2. Configures Oracle Registry ID
3. Deploys to testnet
4. Updates SDK example .env

**Output:**
- External dApp Application ID
- GraphQL endpoint URL
- SDK configuration

#### test-oracle-as-a-service.sh

**Purpose:** End-to-end validation of Oracle-as-a-Service

**What it does:**
1. Verifies all components deployed
2. Creates test market from external dApp
3. Simulates voter votes
4. Verifies Registry resolution
5. Checks callback delivery
6. Monitors logs for errors

**Output:**
- Test results for each step
- Market resolution status
- Callback delivery status
- Comprehensive test summary

### V2 vs V1 Comparison

| Feature | V1 (Legacy) | V2 (Oracle-as-a-Service) |
|---------|-------------|--------------------------|
| Architecture | Monolithic | Service-oriented |
| External Markets | ❌ No | ✅ Yes |
| Callbacks | ❌ No | ✅ Yes |
| Market Chain | Tightly coupled | Decoupled consumer |
| SDK | ❌ No | ✅ Yes |
| Fee Management | Basic | Advanced |
| Source Tracking | ❌ No | ✅ Yes |

### Migration from V1 to V2

To migrate from V1 to V2:

1. **Deploy V2 components** (V1 continues running)
2. **Test V2 functionality** with example dApp
3. **Update integrations** to use Registry v2
4. **Deprecate V1** after validation

See migration guide: `docs/MIGRATION_GUIDE.md`

---

**Last Updated:** November 13, 2025 - Added Oracle-as-a-Service v2 scripts
