# Clean Deployment Guide
## Fresh Start with Voter Selection

**Date:** November 17, 2025

---

## 🎯 Overview

This guide will help you:
1. Clean all existing Linera wallets and chains
2. Create a fresh environment
3. Deploy Alethea Oracle with voter selection
4. Test the new features

---

## ⚠️ Important Notes

**What Will Be Deleted:**
- `~/.config/linera/` - All wallet data
- `~/.local/share/linera/` - All chain data
- `.env.fresh` - Environment configuration
- `oracle-api-backend/.env` - Backend config
- `alethea-dashboard/.env.local` - Frontend config

**What Will Be Created:**
- New wallet with testnet account
- New chain ID
- New owner address
- Fresh environment files

**Backup First (Optional):**
```bash
# Backup old environment
cp .env.fresh .env.fresh.backup
cp -r ~/.config/linera ~/.config/linera.backup
```

---

## 🚀 Step-by-Step Process

### Step 1: Clean Environment

Run the clean script:

```bash
./clean_and_reset.sh
```

**What it does:**
1. Stops all Linera services
2. Removes wallet directory (`~/.config/linera/`)
3. Removes data directory (`~/.local/share/linera/`)
4. Removes old environment files
5. Initializes new wallet with testnet
6. Creates new `.env.fresh`
7. Starts Linera service

**Expected Output:**
```
==========================================
Clean and Reset Complete!
==========================================

📋 New Environment:
  Chain ID: [NEW_CHAIN_ID]
  Owner: [NEW_OWNER]
  Wallet: ~/.config/linera/
  Data: ~/.local/share/linera/

🔗 Services:
  Linera Service: http://localhost:8080 ✓ Running
```

**Verify:**
```bash
# Check new chain ID
source .env.fresh
echo $CHAIN_ID

# Check wallet
linera wallet show

# Check service
curl http://localhost:8080
```

### Step 2: Deploy Contract

Run the deployment script:

```bash
./deploy_fresh.sh
```

**What it does:**
1. Loads new environment
2. Checks Linera service
3. Builds contract with voter selection
4. Deploys to blockchain
5. Extracts new APP_ID
6. Updates all configuration files
7. Tests GraphQL endpoint
8. Builds backend

**Expected Output:**
```
==========================================
Deployment Complete!
==========================================

📋 Deployment Summary:
  Chain ID: [CHAIN_ID]
  Owner: [OWNER]
  APP_ID: [NEW_APP_ID]

✨ Features Deployed:
  ✓ Voter selection by power
  ✓ Only selected voters can vote
  ✓ Power-based rewards
```

**Verify:**
```bash
# Check APP_ID
source .env.fresh
echo $APP_ID

# Test GraphQL
curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voterCount }"}'
```

### Step 3: Start Services

**Terminal 1 - Backend:**
```bash
cd oracle-api-backend
cargo run --release
```

**Expected Output:**
```
🚀 ALETHEA ORACLE BACKEND
📡 Listening on: http://0.0.0.0:3001
🔗 GraphQL URL: http://localhost:8080
⛓️  Chain ID: [CHAIN_ID]
📱 App ID: [APP_ID]
✅ Server ready!
```

**Terminal 2 - Frontend:**
```bash
cd alethea-dashboard
npm run dev
```

**Expected Output:**
```
▲ Next.js 15.0.3
- Local:        http://localhost:3000
✓ Ready in 2.1s
```

### Step 4: Test Voter Selection

**4.1 Register First Voter (Alice)**

```bash
# Via dashboard: http://localhost:3000/test-polling
# Or via backend API:

curl -X POST http://localhost:3001/api/transaction/register-voter \
  -H "Content-Type: application/json" \
  -d '{
    "voter_address": "0x1234...",
    "stake": "1000",
    "name": "Alice"
  }'
```

**Expected:**
- Certificate hash received
- Voter registered with:
  - Stake: 1,000
  - Reputation: 50 (default)
  - Power: 50,000 (1,000 × 50)

**4.2 Register More Voters**

Register at least 5 voters with different stakes:

```bash
# Bob - High stake
stake: 15000, reputation: 50, power: 750,000

# Carol - Medium stake
stake: 10000, reputation: 50, power: 500,000

# Dave - Medium stake
stake: 8000, reputation: 50, power: 400,000

# Eve - Low stake
stake: 5000, reputation: 50, power: 250,000

# Alice - Low stake
stake: 1000, reputation: 50, power: 50,000
```

**4.3 Create Query**

```graphql
mutation {
  createQuery(
    description: "Will Bitcoin reach $100k in 2025?",
    outcomes: ["Yes", "No"],
    strategy: "Majority",
    minVotes: 3,
    rewardAmount: "1000"
  )
}
```

**Expected:**
- Query created with ID
- Top 6 voters selected (3 × 2 = 6 max voters)
- Selected: Bob, Carol, Dave, Eve, and 2 more

**4.4 Check Selected Voters**

```graphql
query {
  query(id: 1) {
    id
    description
    selectedVoterCount
    selectedVoters
    minVotes
    maxVoters
  }
}
```

**Expected Response:**
```json
{
  "data": {
    "query": {
      "id": 1,
      "description": "Will Bitcoin reach $100k in 2025?",
      "selectedVoterCount": 6,
      "selectedVoters": [
        "0xBob...",
        "0xCarol...",
        "0xDave...",
        "0xEve...",
        "0xFrank...",
        "0xGrace..."
      ],
      "minVotes": 3,
      "maxVoters": 6
    }
  }
}
```

**4.5 Test Voting Permissions**

**Bob (Selected) - Should Work:**
```bash
# Bob submits vote
curl -X POST http://localhost:3001/api/transaction/submit-vote \
  -d '{"query_id": 1, "value": "Yes"}'

# Expected: Success ✓
```

**Alice (Not Selected) - Should Fail:**
```bash
# Alice tries to vote
curl -X POST http://localhost:3001/api/transaction/submit-vote \
  -d '{"query_id": 1, "value": "Yes"}'

# Expected: Error ✗
# "You are not selected to vote on this query.
#  Only 6 selected voters can participate."
```

**4.6 Resolve Query**

After enough votes:

```graphql
mutation {
  resolveQuery(queryId: 1)
}
```

**4.7 Check Rewards**

```graphql
query {
  voter(address: "0xBob...") {
    address
    stake
    reputation
    power
    # Check pending rewards
  }
}
```

**Expected:**
- Correct voters receive rewards proportional to power
- Bob (highest power) gets largest share
- Reputations updated

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Clean environment successful
- [ ] New wallet created
- [ ] New chain ID obtained
- [ ] Contract deployed
- [ ] APP_ID extracted
- [ ] GraphQL endpoint working
- [ ] Backend starts successfully
- [ ] Frontend starts successfully

### Voter Selection
- [ ] Register 5+ voters with different stakes
- [ ] Create query with min 3 votes
- [ ] Verify top N voters selected
- [ ] Selected voter can vote (success)
- [ ] Non-selected voter cannot vote (error)
- [ ] Error message is clear

### Power-Based Rewards
- [ ] Resolve query with multiple correct voters
- [ ] Check reward distribution
- [ ] Verify rewards proportional to power
- [ ] Verify reputation updates
- [ ] Higher power = higher reward

### Edge Cases
- [ ] Query with more min_votes than voters
- [ ] All voters have same power
- [ ] Only 1 voter registered
- [ ] Voter increases stake after selection
- [ ] Multiple queries simultaneously

---

## 📊 Expected Results

### Before (Old System)
```
❌ Any voter can vote on any query
❌ Rewards split equally
❌ No power mechanism
❌ Vulnerable to sybil attacks
```

### After (New System)
```
✅ Only selected voters can vote
✅ Selection by power (stake × reputation)
✅ Rewards proportional to power
✅ Sybil resistant
✅ Scalable and efficient
```

---

## 🔧 Troubleshooting

### Issue: Clean script fails

**Error:** "Resource temporarily unavailable"

**Solution:**
```bash
# Kill all Linera processes
pkill -9 linera

# Remove lock files manually
rm -rf ~/.config/linera/wallet.db/default/LOCK

# Try again
./clean_and_reset.sh
```

### Issue: Deployment fails

**Error:** "Failed to extract APP_ID"

**Solution:**
```bash
# Deploy manually
cd oracle-registry-v2
linera project publish-and-create

# Copy APP_ID from output
# Update .env.fresh manually
nano .env.fresh
# Set APP_ID=<your_app_id>
```

### Issue: GraphQL test fails

**Error:** "Connection refused"

**Solution:**
```bash
# Check Linera service
curl http://localhost:8080

# If not running, start it
linera service --port 8080 &

# Wait and try again
sleep 3
```

### Issue: Backend won't start

**Error:** "APP_ID not set"

**Solution:**
```bash
# Check backend .env
cat oracle-api-backend/.env

# If missing, create it
source .env.fresh
cat > oracle-api-backend/.env << EOF
LINERA_GRAPHQL_URL=http://localhost:8080
CHAIN_ID=$CHAIN_ID
APP_ID=$APP_ID
PORT=3001
EOF
```

---

## 📝 Post-Deployment

### Save Important Information

Create a backup file:

```bash
cat > deployment_info.txt << EOF
Deployment Date: $(date)
Chain ID: $CHAIN_ID
Owner: $OWNER
APP_ID: $APP_ID
GraphQL: http://localhost:8080/chains/$CHAIN_ID/applications/$APP_ID
Backend: http://localhost:3001
Frontend: http://localhost:4000
EOF
```

### Update Documentation

Update README.md with new IDs:

```bash
# Update README with new environment
sed -i "s/CHAIN_ID=.*/CHAIN_ID=$CHAIN_ID/" README.md
sed -i "s/APP_ID=.*/APP_ID=$APP_ID/" README.md
```

---

## 🎉 Success Criteria

**Deployment is successful when:**

1. ✅ Clean environment created
2. ✅ New wallet and chain initialized
3. ✅ Contract deployed with voter selection
4. ✅ GraphQL endpoint responding
5. ✅ Backend starts without errors
6. ✅ Frontend loads correctly
7. ✅ Voter registration works
8. ✅ Voter selection by power works
9. ✅ Voting permissions enforced
10. ✅ Power-based rewards distributed

---

## 📚 Next Steps

After successful deployment:

1. **Test thoroughly** - Run all test cases
2. **Document results** - Record test outcomes
3. **Monitor performance** - Check for issues
4. **Iterate** - Fix any bugs found
5. **Prepare for production** - When ready

---

## 🔗 Related Documentation

- **VOTER_SELECTION_IMPLEMENTED.md** - Implementation details
- **USER_GUIDE_BECOMING_VOTER.md** - User guide
- **ALETHEA_CORRECT_ARCHITECTURE.md** - Architecture
- **IMPLEMENTATION_GAP_ANALYSIS.md** - What was fixed

---

**Clean deployment process complete! Ready for fresh start! 🚀**

