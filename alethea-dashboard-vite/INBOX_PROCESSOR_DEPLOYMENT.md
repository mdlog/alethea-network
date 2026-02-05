# Inbox Processor Deployment Guide

## Current Issue (2026-02-05)

**Problem:** Inbox processor at `nectiq.xyz` is using wrong Linera service URL.

```bash
# Current (WRONG):
curl https://nectiq.xyz/health
{"lineraServiceUrl":"http://localhost:8080"}  ❌

# Should be (CORRECT):
{"lineraServiceUrl":"https://evonft.xyz"}  ✅
```

## Quick Fix (Immediate)

SSH to nectiq.xyz server and run:

```bash
# Stop current process
pm2 stop inbox-processor
# OR
pkill -f inbox-processor

# Set environment variable and restart
export LINERA_SERVICE_URL=https://evonft.xyz
pm2 restart inbox-processor
# OR
npm run inbox
```

## Permanent Fix (Recommended)

### Option 1: Using PM2 (Recommended)

1. **Upload ecosystem.config.js** to server:
```bash
scp server/ecosystem.config.js user@nectiq.xyz:/path/to/alethea-dashboard-vite/
```

2. **Start with PM2:**
```bash
cd /path/to/alethea-dashboard-vite
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Enable auto-start on reboot
```

3. **Verify:**
```bash
pm2 logs inbox-processor
curl https://nectiq.xyz/health
```

### Option 2: Using Systemd Service

1. **Create service file:**
```bash
sudo nano /etc/systemd/system/inbox-processor.service
```

2. **Add configuration:**
```ini
[Unit]
Description=Alethea Inbox Processor
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/alethea-dashboard-vite
Environment="NODE_ENV=production"
Environment="LINERA_SERVICE_URL=https://evonft.xyz"
Environment="INBOX_HOST=0.0.0.0"
Environment="PORT=4003"
ExecStart=/usr/bin/node server/inbox-processor.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/inbox-processor.log
StandardError=append:/var/log/inbox-processor-error.log

[Install]
WantedBy=multi-user.target
```

3. **Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable inbox-processor
sudo systemctl start inbox-processor
sudo systemctl status inbox-processor
```

### Option 3: Using Shell Script

1. **Make script executable:**
```bash
chmod +x server/inbox-processor-production.sh
```

2. **Run in background:**
```bash
nohup ./server/inbox-processor-production.sh > inbox-processor.log 2>&1 &
```

## Verification Steps

After deployment, verify everything works:

### 1. Check Health Endpoint
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

### 2. Test Inbox Processing
```bash
curl -X POST https://nectiq.xyz/process-inbox \
  -H "Content-Type: application/json" \
  -d '{"chainId":"YOUR_CHAIN_ID"}'
```

### 3. Test Faucet
1. Go to https://vote.alethea.network
2. Connect wallet
3. Click "Request ALTH Tokens"
4. Tokens should appear within 10-15 seconds

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs inbox-processor
pm2 status
```

### Systemd Monitoring
```bash
sudo systemctl status inbox-processor
sudo journalctl -u inbox-processor -f
```

### Manual Logs
```bash
tail -f inbox-processor.log
tail -f logs/inbox-processor-out.log
```

## Troubleshooting

### Issue: Service not starting
```bash
# Check if port is already in use
sudo lsof -i :4003

# Kill existing process
sudo kill -9 $(sudo lsof -t -i:4003)
```

### Issue: Can't reach Linera service
```bash
# Test from server
curl -I https://evonft.xyz

# Should return HTTP 200
```

### Issue: CORS errors
Make sure inbox processor has CORS enabled (already configured in code).

## Environment Variables

Required environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `LINERA_SERVICE_URL` | `https://evonft.xyz` | Production Linera service URL |
| `INBOX_HOST` | `0.0.0.0` | Listen on all interfaces |
| `PORT` | `4003` | Inbox processor port |
| `NODE_ENV` | `production` | Environment mode |

## Cloudflare Tunnel Configuration

If using Cloudflare Tunnel for nectiq.xyz:

```yaml
# config.yml
tunnel: YOUR_TUNNEL_ID
credentials-file: /path/to/credentials.json

ingress:
  - hostname: nectiq.xyz
    service: http://localhost:4003
  - service: http_status:404
```

## Security Checklist

- [ ] Firewall allows port 4003 (if needed)
- [ ] HTTPS enabled via Cloudflare
- [ ] Rate limiting configured
- [ ] Logs rotation enabled
- [ ] Process auto-restart on failure
- [ ] Monitoring alerts set up

## Deployment Checklist

- [ ] Environment variables set correctly
- [ ] Service starts without errors
- [ ] Health endpoint returns correct URL
- [ ] Can process inbox successfully
- [ ] Faucet works end-to-end
- [ ] Logs are being written
- [ ] Auto-restart configured
- [ ] Monitoring set up

## Related Files

- `server/inbox-processor.js` - Main service code
- `server/ecosystem.config.js` - PM2 configuration
- `server/inbox-processor-production.sh` - Startup script
- `.env.local` - Frontend environment variables

## Support

If issues persist after following this guide:

1. Check server logs
2. Verify Linera service is accessible
3. Test with curl commands
4. Check Cloudflare tunnel status
5. Review firewall rules

## Status

- **Last Updated:** 2026-02-05
- **Current Status:** ❌ Needs fix (wrong LINERA_SERVICE_URL)
- **Priority:** HIGH (blocks faucet functionality)
- **ETA:** 5 minutes to fix
