# Quick Fix: Faucet Token Tidak Masuk

## Masalah
Request faucet sukses tapi token tidak masuk ke wallet.

## Solusi Cepat (User)

### Langkah 1: Request Token
1. Buka dashboard: https://alethea.network
2. Klik "Request ALTH Tokens"
3. Tunggu pesan "Tokens sent!" ✅

### Langkah 2: Terima Token (PENTING!)
1. **Klik tombol "Refresh Balance (Receive Tokens)"**
2. Tunggu 2-3 detik
3. Balance akan terupdate

### Jika Masih Belum Masuk
1. Tunggu 10-15 detik lagi
2. Klik "Refresh Balance" sekali lagi
3. Atau gunakan "Force Process Inbox" di Debug Info (scroll ke bawah)

## Solusi Permanen (Admin)

### Option 1: Restart Inbox Processor (Recommended)

```bash
# Stop inbox processor yang lama
pkill -f inbox-processor

# Start dengan host 0.0.0.0 (accessible dari network)
cd alethea-dashboard-vite
INBOX_HOST=0.0.0.0 npm run inbox
```

Atau tambahkan ke `.env.local`:
```bash
INBOX_HOST=0.0.0.0
```

### Option 2: Setup Auto-Process Cron

Buat cron job yang auto-process inbox setiap 30 detik:

```bash
# Buat script
cat > ~/auto-process-inbox.sh << 'EOF'
#!/bin/bash
# Auto-process inbox for all active chains

# Get all chains from dashboard
CHAINS=$(curl -s http://localhost:8080 -H "Content-Type: application/json" \
  -d '{"query": "{ chains { list } }"}' | jq -r '.data.chains.list[]')

# Process each chain
for CHAIN in $CHAINS; do
  echo "Processing inbox for chain: $CHAIN"
  curl -s -X POST http://localhost:4003/process-inbox \
    -H "Content-Type: application/json" \
    -d "{\"chainId\": \"$CHAIN\"}" > /dev/null 2>&1
done
EOF

chmod +x ~/auto-process-inbox.sh

# Add to crontab (every 30 seconds)
(crontab -l 2>/dev/null; echo "* * * * * ~/auto-process-inbox.sh") | crontab -
(crontab -l 2>/dev/null; echo "* * * * * sleep 30 && ~/auto-process-inbox.sh") | crontab -
```

### Option 3: Update Frontend untuk Auto-Retry

Frontend sudah ada auto-retry, tapi perlu pastikan inbox processor accessible:

1. Check inbox processor running:
```bash
ps aux | grep inbox-processor
```

2. Check accessible dari network:
```bash
# Dari komputer lain
curl http://YOUR_SERVER_IP:4003/health
```

3. Jika tidak accessible, restart dengan `INBOX_HOST=0.0.0.0`

## Verifikasi

### Check Inbox Status
```bash
CHAIN_ID="your_chain_id"
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ chain(chainId: \\\"$CHAIN_ID\\\") { inbox { messages { id } } } }\"}"
```

### Check Balance
```bash
CHAIN_ID="your_chain_id"
TOKEN_APP_ID="dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd"
OWNER="your_owner_address"

curl -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$TOKEN_APP_ID" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"{ balance(owner: \\\"$OWNER\\\") }\"}"
```

### Manual Process Inbox
```bash
CHAIN_ID="your_chain_id"
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"mutation { processInbox(chainId: \\\"$CHAIN_ID\\\") }\"}"
```

## Root Cause

Cross-chain message dari treasury ke user chain perlu:
1. **Propagation time**: 5-10 detik
2. **Inbox processing**: Harus di-trigger manual atau auto

Ketika akses dari komputer lain:
- Backend inbox processor (port 4003) default hanya listen di `localhost`
- Request dari komputer lain tidak bisa reach inbox processor
- User harus manual klik "Refresh Balance" untuk trigger WASM query yang process inbox

## Monitoring

### Check Inbox Processor Logs
```bash
# Jika running via npm
tail -f alethea-dashboard-vite/inbox-processor.log

# Jika running via systemd
journalctl -u inbox-processor -f
```

### Check Linera Service Logs
```bash
# Find linera service process
ps aux | grep "linera service"

# Check logs (if redirected to file)
tail -f /path/to/linera-service.log
```

## Production Setup

Untuk production, sebaiknya:

1. **Run inbox processor as systemd service**
```bash
sudo nano /etc/systemd/system/inbox-processor.service
```

```ini
[Unit]
Description=Alethea Inbox Processor
After=network.target

[Service]
Type=simple
User=mdlog
WorkingDirectory=/path/to/alethea-network/alethea-dashboard-vite
Environment="INBOX_HOST=0.0.0.0"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run inbox
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable inbox-processor
sudo systemctl start inbox-processor
sudo systemctl status inbox-processor
```

2. **Setup nginx reverse proxy**
```nginx
location /process-inbox {
    proxy_pass http://localhost:4003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

3. **Add monitoring**
```bash
# Healthcheck every minute
* * * * * curl -f http://localhost:4003/health || systemctl restart inbox-processor
```
