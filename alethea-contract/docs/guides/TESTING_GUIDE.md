# Testing Guide - Cross-Chain Voter Registration

## Quick Start

### 1. Start Services

```bash
# Terminal 1: Linera Service
linera service --port 8080

# Terminal 2: Next.js Dev Server
cd alethea-dashboard
npm run dev
```

### 2. Test Registration

1. Open browser: `http://localhost:3000`
2. Connect Dynamic wallet
3. Click "Register as Voter"
4. Enter stake amount (minimum 100)
5. Enter name (optional)
6. Click "Register"
7. Wait for confirmation (~5-10 seconds)

### 3. Verify Registration

```bash
# Check voter count
curl -s -X POST "http://localhost:8080/chains/8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef/applications/456ee1b4f0e7aaf83a1c438ff43b6d92b2595794fe3e971234c2ae684346c47f" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voterCount }"}' | jq .

# Expected: {"data":{"voterCount":1}}
```

## Manual API Test

Test the backend API directly:

```bash
curl -X POST http://localhost:3000/api/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": "8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef",
    "applicationId": "456ee1b4f0e7aaf83a1c438ff43b6d92b2595794fe3e971234c2ae684346c47f",
    "message": {
      "RegisterVoter": {
        "stake": "1000",
        "name": "Test Voter",
        "metadata_url": null
      }
    }
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Message sent successfully",
  "certificateHash": "abc123..."
}
```

## Troubleshooting

### Issue: API returns 500 error

**Cause**: Linera CLI not found or wallet not configured

**Solution**:
```bash
# Check Linera CLI
which linera

# Check wallet
linera wallet show
```

### Issue: Message sent but voter count stays 0

**Cause**: Message not processed yet or wrong chain ID

**Solution**:
```bash
# Wait longer (up to 30 seconds)
sleep 10

# Sync chain
linera sync 8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef

# Check again
curl -s -X POST "http://localhost:8080/chains/.../applications/..." \
  -d '{"query": "{ voterCount }"}'
```

### Issue: Frontend shows "Failed to send message"

**Cause**: Backend API not running or wrong URL

**Solution**:
```bash
# Check Next.js is running
curl http://localhost:3000/api/send-message

# Check logs in terminal
# Look for errors in Next.js dev server output
```

## Success Criteria

✅ Voter count increases from 0 to 1  
✅ Voter appears in voters list  
✅ Voter has correct stake amount  
✅ Voter has correct name  
✅ No errors in console

## Environment Variables

Make sure these are set in `alethea-dashboard/.env.local`:

```bash
NEXT_PUBLIC_CHAIN_ID=8a80fe20530eb03889f28ac1fda8628430c30b2564763522e1b7268eaecdf7ef
NEXT_PUBLIC_APP_ID=456ee1b4f0e7aaf83a1c438ff43b6d92b2595794fe3e971234c2ae684346c47f
NEXT_PUBLIC_REGISTRY_ID=456ee1b4f0e7aaf83a1c438ff43b6d92b2595794fe3e971234c2ae684346c47f
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080
```

## Next Steps After Successful Test

1. Test other operations (vote, claim rewards)
2. Test with multiple voters
3. Test error cases (insufficient stake, duplicate registration)
4. Add proper error handling
5. Add loading states
6. Add success notifications

---

**Ready to test!** 🚀
