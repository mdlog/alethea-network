# Faucet Not Working - Root Cause Analysis & Fix

## Problem
Faucet tidak berfungsi ketika user request tokens. Transfer dari treasury berhasil, tapi inbox processing gagal.

## Root Cause Found ✅

**Inbox Processor Configuration Error**

```bash
# Current (WRONG):
curl https://nectiq.xyz/health
{"status":"ok","service":"inbox-processor","lineraServiceUrl":"http://localhost:8080"}

# Should be (CORRECT):
{"status":"ok","service":"inbox-processor","lineraServiceUrl":"https://evonft.xyz"}
```

**Problem:** Inbox processor di `nectiq.xyz` masih pointing ke `localhost:8080` instead of production Linera service `https://evonft.xyz`.

## Impact

1. ✅ **Transfer Step** - Works fine (treasury → user chain)
2. ❌ **Inbox Processing** - Fails because inbox processor can't reach Linera service
3. ❌ **Token Receipt** - User never receives tokens

## Solution

### Fix Inbox Processor Environment Variable

On the server running inbox processor (nectiq.xyz):

```bash
# Set environment variable
export LINERA_SERVICE_URL=https://evonft.xyz

# Restart inbox processor
pm2 restart inbox-processor
# OR
npm run inbox
```

### Verify Fix

```bash
curl https://nectiq.xyz/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "inbox-processor",
  "lineraServiceUrl": "https://evonft.xyz"
}
```

## Testing After Fix

1. **Request tokens** from faucet
2. **Check logs** - Should see successful inbox processing
3. **Verify balance** - Tokens should appear immediately

## Alternative Workaround (Until Fixed)

Users can manually process inbox using browser console:

```javascript
// In browser console on dashboard
const chainId = "YOUR_CHAIN_ID"; // Get from Debug Info
const response = await fetch('https://evonft.xyz', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `mutation { processInbox(chainId: "${chainId}") }`
  })
});
const result = await response.json();
console.log(result);
```

Then click "Refresh Balance" button.

## Files to Update

1. **Server Environment** (nectiq.xyz)
   ```bash
   # /etc/environment or ~/.bashrc
   LINERA_SERVICE_URL=https://evonft.xyz
   ```

2. **PM2 Ecosystem** (if using PM2)
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'inbox-processor',
       script: './server/inbox-processor.js',
       env: {
         LINERA_SERVICE_URL: 'https://evonft.xyz',
         INBOX_HOST: '0.0.0.0',
         PORT: 4003
       }
     }]
   }
   ```

3. **Systemd Service** (if using systemd)
   ```ini
   # /etc/systemd/system/inbox-processor.service
   [Service]
   Environment="LINERA_SERVICE_URL=https://evonft.xyz"
   Environment="INBOX_HOST=0.0.0.0"
   Environment="PORT=4003"
   ```

## Verification Checklist

- [ ] Inbox processor health check shows correct Linera service URL
- [ ] Faucet request completes successfully
- [ ] Tokens appear in user balance immediately
- [ ] No errors in inbox processing logs
- [ ] Multiple users can request tokens without issues

## Related Files

- `alethea-dashboard-vite/server/inbox-processor.js` - Inbox processor code
- `alethea-dashboard-vite/src/components/TokenFaucet.tsx` - Faucet UI
- `alethea-dashboard-vite/.env.local` - Frontend environment variables

## Status

- **Identified:** 2026-02-05
- **Root Cause:** Inbox processor using localhost instead of production URL
- **Fix Required:** Update LINERA_SERVICE_URL environment variable on nectiq.xyz server
- **Priority:** HIGH (blocks faucet functionality)
