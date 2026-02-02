# 🔍 Contract Not Found in Wallet - Diagnosis

**Issue:** Contract App ID exists in `deployment-info.txt` but not found in wallet

---

## 🔍 Possible Causes

1. **Contract deployed but not in current wallet**
   - Contract exists on chain but wallet doesn't track it
   - Need to check if contract is accessible on chain

2. **Different wallet used**
   - Deployment used different wallet than current session
   - Need to use correct wallet or redeploy

3. **Chain reset or recreated**
   - Chain was reset after deployment
   - Contract no longer exists

4. **Deployment failed silently**
   - `publish-and-create` appeared successful but actually failed
   - App ID was extracted from error message or wrong output

---

## ✅ Solutions

### **Solution 1: Check if Contract Exists on Chain**

Even if contract is not in wallet, it might still exist on the chain:

```bash
# Start service
pkill -f "linera service" 2>/dev/null || true
sleep 2
linera service --port 8080 > /dev/null 2>&1 &
sleep 5

# Test contract
CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
REGISTRY_APP_ID="1735c8a06c17b74918b614ba8b044a32ed30accc075e87ab836fefbf95c8c892"

curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}'
```

**If contract is accessible:**
- Contract exists but not tracked in wallet
- You can use it directly via GraphQL
- Or add it to wallet: `linera request-application $REGISTRY_APP_ID`

**If contract is NOT accessible:**
- Contract doesn't exist → Need to redeploy

### **Solution 2: Redeploy Contract**

If contract doesn't exist, redeploy:

```bash
cd alethea-contract/scripts

# Stop service
pkill -f "linera service"

# Redeploy
./deploy-complete-system.sh

# After deployment, process inbox
pkill -f "linera service"
sleep 2
linera sync
linera process-inbox
sleep 5

# Start service and test
linera service --port 8080 &
sleep 5
./start-service-and-test.sh
```

### **Solution 3: Check Wallet and Chain**

```bash
# Show current wallet
linera wallet show

# Check if expected chain ID exists
linera wallet show | grep "9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"

# If chain doesn't exist, you're using wrong wallet
# Or chain was reset
```

---

## 🎯 Recommended Action

1. **First, check if contract exists on chain** (Solution 1)
   - If yes → Use it or add to wallet
   - If no → Redeploy (Solution 2)

2. **If redeploying, make sure:**
   - Using correct wallet
   - Chain is synced
   - Process inbox after deployment
   - Test with `start-service-and-test.sh`

---

**Last Updated:** 1 Februari 2026
