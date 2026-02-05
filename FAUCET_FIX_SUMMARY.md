# Faucet Fix Summary

## Problem
Ketika user dari komputer lain request faucet, status menunjukkan "sukses" tapi token tidak masuk ke wallet.

## Root Cause
Cross-chain message dari treasury ke user chain perlu diproses melalui inbox. Backend inbox processor (port 4003) hanya listen di `localhost`, sehingga tidak bisa diakses dari komputer lain.

## Solution Implemented

### 1. Expose Inbox Processor via https://nectiq.xyz ✅
Inbox processor sudah di-expose menggunakan Cloudflare Tunnel atau reverse proxy.

### 2. Update Dashboard Configuration ✅
File yang diupdate:
- `alethea-dashboard-vite/.env.local` - Tambah `VITE_INBOX_PROCESSOR_URL=https://nectiq.xyz`
- `alethea-dashboard-vite/src/components/TokenFaucet.tsx` - Support remote inbox processor URL
- `alethea-dashboard-vite/server/inbox-processor.js` - Listen on `0.0.0.0` instead of `localhost`

### 3. Smart Endpoint Selection ✅
Dashboard sekarang otomatis memilih endpoint:
- **Production** (dari komputer lain): Gunakan `https://nectiq.xyz/process-inbox-retry`
- **Development** (localhost): Gunakan Vite proxy `/process-inbox-retry`

## How It Works Now

```
User Request Faucet
    ↓
Treasury Transfer (via https://evonft.xyz)
    ↓
Cross-Chain Message (5-10s propagation)
    ↓
Inbox Processor (via https://nectiq.xyz) ← NOW ACCESSIBLE!
    ↓
Process Inbox on User Chain
    ↓
Token Received! ✅
```

## Testing

### Test dari Komputer Lain
1. Buka https://alethea.network
2. Connect wallet
3. Klik "Request ALTH Tokens"
4. Token akan otomatis masuk dalam 10-15 detik

### Verify Inbox Processor
```bash
# Check health
curl https://nectiq.xyz/health

# Should return:
# {"status":"ok","service":"inbox-processor"}
```

### Manual Process Inbox (if needed)
```bash
curl -X POST https://nectiq.xyz/process-inbox \
  -H "Content-Type: application/json" \
  -d '{"chainId":"YOUR_CHAIN_ID"}'
```

## User Instructions

### Normal Flow (Automatic)
1. Request tokens
2. Wait 10-15 seconds
3. Token akan otomatis masuk

### If Token Not Received
1. Klik "Refresh Balance (Receive Tokens)"
2. Atau gunakan "Force Process Inbox" di Debug Info

## Configuration Files

### Environment Variables (.env.local)
```bash
# Inbox processor URL for remote access
VITE_INBOX_PROCESSOR_URL=https://nectiq.xyz

# Linera service URL
VITE_SERVICE_URL=https://evonft.xyz

# Other configs...
VITE_TOKEN_APP_ID=dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

### Inbox Processor (server/inbox-processor.js)
```javascript
// Listen on all interfaces
const HOST = process.env.INBOX_HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`Inbox Processor running on http://${HOST}:${PORT}`);
});
```

### TokenFaucet Component
```typescript
// Use remote URL if set, otherwise use Vite proxy
const INBOX_PROCESSOR_URL = import.meta.env.VITE_INBOX_PROCESSOR_URL || '';
const inboxEndpoint = INBOX_PROCESSOR_URL 
    ? `${INBOX_PROCESSOR_URL}/process-inbox-retry`
    : '/p