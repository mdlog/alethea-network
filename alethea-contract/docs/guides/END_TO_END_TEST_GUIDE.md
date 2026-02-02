# End-to-End Test Guide

**Purpose:** Test complete flow from market creation to oracle resolution  
**Duration:** ~10 minutes  
**Status:** Ready to run

---

## 🎯 What We're Testing

### Complete Flow:
```
1. Market Creation
   ↓
2. Market Expiration (5 minutes)
   ↓
3. Auto-Trigger (no duplicates!)
   ↓
4. Cross-Chain Message to Registry
   ↓
5. Oracle Query Creation
   ↓
6. Voter Selection
   ↓
7. Vote Submission
   ↓
8. Query Resolution
   ↓
9. Market Resolution
```

---

## 📋 Prerequisites

### 1. Dashboard Must Be Restarted
**IMPORTANT:** Dashboard needs restart to use new Market Chain ID

```bash
# Stop dashboard
pkill -f "next dev"

# Clear cache
cd alethea-dashboard
rm -rf .next

# Start dashboard
npm run dev
```

**Verify:** Open http://localhost:3000 and check it loads

### 2. Services Running
```bash
# Check Linera service
ps aux | grep "linera service"

# If not running
linera service --port 8080 &
```

### 3. Environment Loaded
```bash
source .env.fresh
```

---

## 🚀 Running the Test

### Option 1: Automated Script (Recommended)

```bash
./test_end_to_end.sh
```

**What it does:**
1. Verifies registry configuration
2. Creates test market (5 min deadline)
3. Monitors countdown
4. Checks status changes
5. Verifies oracle query creation
6. Provides summary

**Interactive:** Script pauses at each step for verification

### Option 2: Manual Steps

#### Step 1: Verify Registry
```bash
source .env.fresh
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ registryConfigured registryChainId registryAppId }"}' | jq '.'
```

**Expected:**
```json
{
  "registryConfigured": true,
  "registryChainId": "8a80fe20...",
  "registryAppId": "6cf34d72..."
}
```

#### Step 2: Create Market
```bash
source .env.fresh
CURRENT=$(date +%s)
DEADLINE_MICROS=$(( (CURRENT + 300) * 1000000 ))

curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { createMarket(question: \\\"Test: E2E flow?\\\", outcomes: [\\\"Yes\\\", \\\"No\\\"], resolutionDeadline: \\\"${DEADLINE_MICROS}\\\", initialLiquidity: \\\"1000000\\\") }\"}" | jq '.'
```

#### Step 3: Monitor Dashboard
1. Open http://localhost:3000
2. Open browser console (F12)
3. Watch for market in Upcoming tab
4. Wait 5 minutes
5. Watch for auto-trigger message
6. Market should move to Active tab

#### Step 4: Check Status
```bash
source .env.fresh
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_CHAIN_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ markets { id status } }"}' | jq '.'
```

**Expected:** `status: "WAITING_RESOLUTION"`

#### Step 5: Process Inbox
```bash
source .env.fresh
linera process-inbox $CHAIN_ID
```

#### Step 6: Check Oracle Query
```bash
source .env.fresh
curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$ORACLE_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ queries { id question status } }"}' | jq '.'
```

**Expected:** New query with our market question

---

## ✅ Success Criteria

### Must Pass:
- [ ] Registry configured
- [ ] Market created
- [ ] Market expires after 5 minutes
- [ ] Auto-trigger fires (console message)
- [ ] **Auto-trigger fires ONLY ONCE** (no duplicates)
- [ ] Market status changes to `WAITING_RESOLUTION`
- [ ] Market moves to Active tab
- [ ] Oracle query created
- [ ] Query matches market question

### Bonus (if time permits):
- [ ] Vote on oracle query
- [ ] Query resolves
- [ ] Market receives resolution
- [ ] Can claim winnings

---

## 🔍 What to Watch For

### Browser Console
```
Expected Messages:
✅ "📊 Loading data from Oracle Registry and Market Chain..."
✅ "✅ Markets loaded: 1"
✅ "📋 Market market-0: { status: 'OPEN', ... }"
✅ "🤖 Auto-triggering resolution for expired market 0"  ← ONCE ONLY!
✅ "✅ Resolution requested for market 0"
✅ "📋 Market market-0: { status: 'WAITING_RESOLUTION', ... }"
✅ "✅ Market market-0 added to Active tab (WAITING_RESOLUTION)"

Should NOT See:
❌ "🤖 Auto-triggering resolution for expired market 0"  ← DUPLICATE
❌ "🤖 Auto-triggering resolution for expired market 0"  ← DUPLICATE
```

### Dashboard UI
```
Upcoming Tab:
- Market appears here initially
- Shows countdown timer
- After expiration, should disappear

Active Tab:
- Market should appear here after auto-trigger
- Shows "Waiting for oracle voting" or similar
- Can see oracle query (if created)

Past Tab:
- Market appears here after resolution
```

---

## 🐛 Troubleshooting

### Issue: Auto-Trigger Not Firing

**Symptoms:**
- Market expired but no console message
- Market still in Upcoming tab

**Solutions:**
1. Check dashboard is running
2. Check browser tab is active (not minimized)
3. Hard refresh (Ctrl+Shift+R)
4. Check console for errors

### Issue: Duplicate Triggers

**Symptoms:**
- Multiple "Auto-triggering" messages
- Multiple blockchain transactions

**This Should NOT Happen!**
- If you see this, the fix didn't work
- Report immediately with console logs

### Issue: Oracle Query Not Created

**Symptoms:**
- Market status is `WAITING_RESOLUTION`
- But no oracle query exists

**Solutions:**
1. Process inbox: `linera process-inbox $CHAIN_ID`
2. Wait 30 seconds
3. Check again
4. If still missing, check Registry message handler

### Issue: Market Not Moving to Active Tab

**Symptoms:**
- Status is `WAITING_RESOLUTION`
- But market still in Upcoming tab

**Solutions:**
1. Hard refresh browser
2. Clear browser cache
3. Restart dashboard
4. Check console for categorization logs

---

## 📊 Expected Timeline

```
Time 0:00 - Market created
Time 0:10 - Market appears in Upcoming tab
Time 5:00 - Deadline passes
Time 5:10 - Auto-trigger fires (within 10s)
Time 5:11 - Market status changes
Time 5:12 - Market moves to Active tab
Time 5:15 - Cross-chain message sent
Time 5:20 - Inbox processed
Time 5:25 - Oracle query created (if successful)
Time 5:30 - Test complete
```

---

## 📝 Test Report Template

```markdown
## End-to-End Test Report

**Date:** November 20, 2025
**Tester:** [Your Name]
**Duration:** [X] minutes

### Results

#### Phase 1: Setup
- [ ] Registry configured
- [ ] Market created
- [ ] Dashboard loaded

#### Phase 2: Expiration
- [ ] Market expired after 5 minutes
- [ ] Auto-trigger fired
- [ ] **No duplicate triggers** ← CRITICAL
- [ ] Console logs clean

#### Phase 3: Status Change
- [ ] Market status → WAITING_RESOLUTION
- [ ] Market moved to Active tab
- [ ] UI updated correctly

#### Phase 4: Oracle Integration
- [ ] Cross-chain message sent
- [ ] Inbox processed
- [ ] Oracle query created
- [ ] Query matches market

### Issues Found
[List any issues]

### Console Logs
```
[Paste relevant logs]
```

### Screenshots
[Attach if available]

### Conclusion
- [ ] Test PASSED
- [ ] Test FAILED
- [ ] Test PARTIAL (specify what worked)
```

---

## 🎯 Key Metrics

### Performance
- Market creation: < 2 seconds
- Auto-trigger delay: < 10 seconds after expiration
- Status update: < 1 second
- Cross-chain message: < 30 seconds
- Oracle query creation: < 60 seconds

### Reliability
- Auto-trigger success rate: 100%
- Duplicate trigger rate: 0% ← CRITICAL
- Status update accuracy: 100%
- Tab categorization: 100%

---

## 🎉 Success!

If all criteria pass:
- ✅ Auto-trigger working (no duplicates!)
- ✅ Tab categorization correct
- ✅ Status mapping working
- ✅ Cross-chain messaging functional
- ✅ Oracle integration complete

**Congratulations! The system is working end-to-end!** 🎊

---

**Created:** November 20, 2025  
**Last Updated:** 10:20 UTC  
**Status:** Ready for testing
