# ✅ Post-Deployment Checklist

**Deployment Date:** 2026-02-01 02:09  
**New App IDs:**
- Token: `9b80d0b05dea2bc4c0128ec2a4914a93b7e0f3c1afa9aeae1ed1dd688630882a`
- Registry: `7f5be019da6868f6dce772fda632fa7a26b5762d61ee6602c4d91efb8576b672`
- Chain: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

---

## ✅ Step 1: Verify Contract Instantiation

```bash
# Start service
pkill -f "linera service" 2>/dev/null || true
sleep 2
linera service --port 8080 > /tmp/linera-service.log 2>&1 &
sleep 5

# Test Registry Contract
CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
REGISTRY_APP_ID="7f5be019da6868f6dce772fda632fa7a26b5762d61ee6602c4d91efb8576b672"

curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
  -H 'Content-Type: application/json' \
  -d '{"query": "{ parameters { minStake } }"}'
```

**Expected:** Should return `{"data": {"parameters": {"minStake": "100000000000000000000"}}}`

**If error "Failed to load state":**
- Contract not instantiated yet
- Wait a bit longer (sometimes takes time)
- Or check if instantiation message exists

---

## ✅ Step 2: Update Dashboard Configuration

Update `.env.local` in dashboard:

```bash
cd alethea-dashboard-vite
```

Update these values:
```env
VITE_TOKEN_APP_ID=9b80d0b05dea2bc4c0128ec2a4914a93b7e0f3c1afa9aeae1ed1dd688630882a
VITE_REGISTRY_APP_ID=7f5be019da6868f6dce772fda632fa7a26b5762d61ee6602c4d91efb8576b672
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

**Note:** File already updated automatically.

---

## ✅ Step 3: Set Token Configuration

After contract is instantiated, set token config in registry:

```bash
# Via Dashboard (Recommended):
# 1. Open dashboard: http://localhost:5173
# 2. Go to Admin section
# 3. Set Token Config:
#    - Token App ID: 9b80d0b05dea2bc4c0128ec2a4914a93b7e0f3c1afa9aeae1ed1dd688630882a
#    - Token Chain ID: 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Or via GraphQL (if service is running):
CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
REGISTRY_APP_ID="7f5be019da6868f6dce772fda632fa7a26b5762d61ee6602c4d91efb8576b672"
TOKEN_APP_ID="9b80d0b05dea2bc4c0128ec2a4914a93b7e0f3c1afa9aeae1ed1dd688630882a"

curl -X POST http://localhost:8080/chains/$CHAIN_ID/applications/$REGISTRY_APP_ID \
  -H 'Content-Type: application/json' \
  -d "{\"query\": \"mutation { setTokenConfig(tokenAppId: \\\"$TOKEN_APP_ID\\\", tokenChainId: \\\"$CHAIN_ID\\\") { success message } }\"}"
```

---

## ✅ Step 4: Set Initial Parameters (For Inflation Control)

Set protocol launch timestamp and inflation parameters:

```bash
# Via Dashboard (Recommended):
# 1. Go to Admin section
# 2. Set Protocol Launch Timestamp: Current timestamp (in microseconds)
# 3. Update Inflation Control:
#    - Total Supply: 1000000000000000000000000000 (1B ALTH in attos)
#    - Expected Queries Per Year: 10000

# Current timestamp in microseconds (example):
# date +%s000000
```

---

## ✅ Step 5: Restart Dashboard

```bash
cd alethea-dashboard-vite
npm run dev
```

Dashboard akan berjalan di: **http://localhost:5173**

---

## ✅ Step 6: Test Basic Functionality

1. **Request Faucet Tokens**
   - Go to dashboard
   - Request tokens from faucet
   - Verify balance increases

2. **Register as Voter**
   - Register with minimum stake (100 ALTH)
   - Verify stake is locked

3. **Create Query**
   - Create a test query
   - Verify query appears in list

4. **Vote on Query**
   - Commit vote
   - Reveal vote
   - Verify vote is counted

---

## ⚠️ Troubleshooting

### Contract Not Instantiated

If contract test shows "Failed to load state":

1. **Wait longer** - Sometimes instantiation takes time
2. **Check if instantiation message exists:**
   ```bash
   pkill -f "linera service"
   linera sync
   linera process-inbox
   ```
3. **If still not instantiated, check deployment logs** for errors

### Token Config Not Set

- Token config is required for reward minting
- Set it via dashboard or GraphQL mutation
- Verify with: `curl ... -d '{"query": "{ parameters { tokenAppId } }"}'`

---

**Last Updated:** 2026-02-01 02:09
