# Production Deployment Guide - Alethea Network

## Overview

Alethea Network terdiri dari beberapa komponen yang perlu di-deploy:

1. **Linera Service** (port 8080) - Blockchain node
2. **Dashboard Frontend** (port 4002) - React app via Vite
3. **Inbox Processor** (port 4003) - Backend untuk process cross-chain messages
4. **Explorer** - Deployed di Vercel

## Current Production URLs

- **Dashboard**: https://vote.alethea.network
- **Explorer**: https://alethea-explorer.vercel.app
- **Linera Service**: https://evonft.xyz (port 8080)
- **Inbox Processor**: https://nectiq.xyz (port 4003)

## 1. Linera Service Setup

### Install Linera
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Clone Linera protocol
git clone https://github.com/linera-io/linera-protocol.git
cd linera-protocol

# Build
cargo build --release

# Install
cargo install --path linera-service
```

### Run Linera Service
```bash
# Start service
linera service --port 8080 &

# Or with systemd
sudo nano /etc/systemd/system/linera-service.service
```

```ini
[Unit]
Description=Linera Blockchain Service
After=network.target

[Service]
Type=simple
User=mdlog
WorkingDirectory=/home/mdlog
ExecStart=/usr/local/bin/linera service --port 8080
Restart=always
RestartSec=10
StandardOutput=append:/var/log/linera-service.log
StandardError=append:/var/log/linera-service-error.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable linera-service
sudo systemctl start linera-service
```

### Expose via Cloudflare Tunnel (evonft.xyz)
```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create linera-service

# Configure tunnel
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/mdlog/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: evonft.xyz
    service: http://localhost:8080
  - service: http_status:404
```

```bash
# Run tunnel
cloudflared tunnel run linera-service

# Or as service
sudo cloudflared service install
sudo systemctl start cloudflared
```

## 2. Inbox Processor Setup

### Install Dependencies
```bash
cd alethea-network/alethea-dashboard-vite
npm install
```

### Configure Environment
```bash
nano .env.local
```

```bash
# Add inbox processor host
INBOX_HOST=0.0.0.0
```

### Run Inbox Processor
```bash
# Development
npm run inbox

# Or with systemd
sudo nano /etc/systemd/system/inbox-processor.service
```

```ini
[Unit]
Description=Alethea Inbox Processor
After=network.target linera-service.service

[Service]
Type=simple
User=mdlog
WorkingDirectory=/home/mdlog/alethea-network/alethea-dashboard-vite
Environment="INBOX_HOST=0.0.0.0"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run inbox
Restart=always
RestartSec=10
StandardOutput=append:/var/log/inbox-processor.log
StandardError=append:/var/log/inbox-processor-error.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable inbox-processor
sudo systemctl start inbox-processor
```

### Expose via Cloudflare Tunnel (nectiq.xyz)
```bash
# Create tunnel
cloudflared tunnel create inbox-processor

# Configure
nano ~/.cloudflared/config-inbox.yml
```

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/mdlog/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: nectiq.xyz
    service: http://localhost:4003
  - service: http_status:404
```

```bash
# Run tunnel
cloudflared tunnel --config ~/.cloudflared/config-inbox.yml run inbox-processor
```

## 3. Dashboard Frontend Setup

### Build for Production
```bash
cd alethea-network/alethea-dashboard-vite
npm run build
```

### Configure Environment
```bash
nano .env.local
```

```bash
# Production environment
VITE_TOKEN_APP_ID=dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
VITE_TOKEN_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec

# Network
VITE_LINERA_RPC=https://rpc.testnet-conway.linera.net
VITE_FAUCET_URL=https://faucet.testnet-conway.linera.net
VITE_NETWORK=Conway Testnet

# Service URLs (empty for Vite proxy in dev, set for production)
VITE_SERVICE_URL=https://evonft.xyz
VITE_INBOX_PROCESSOR_URL=https://nectiq.xyz

# Admin
VITE_ADMIN_OWNER=0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7
```

### Run with PM2 (Recommended)
```bash
# Install PM2
npm install -g pm2

# Start dashboard
pm2 start npm --name "alethea-dashboard" -- run dev

# Or for production build
pm2 start npm --name "alethea-dashboard" -- run preview

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup
```

### Or with systemd
```bash
sudo nano /etc/systemd/system/alethea-dashboard.service
```

```ini
[Unit]
Description=Alethea Dashboard
After=network.target

[Service]
Type=simple
User=mdlog
WorkingDirectory=/home/mdlog/alethea-network/alethea-dashboard-vite
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run preview
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Expose via Cloudflare Tunnel (alethea.network)
```bash
# Create tunnel
cloudflared tunnel create alethea-dashboard

# Configure
nano ~/.cloudflared/config-dashboard.yml
```

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/mdlog/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: alethea.network
    service: http://localhost:4002
  - hostname: www.alethea.network
    service: http://localhost:4002
  - service: http_status:404
```

```bash
# Run tunnel
cloudflared tunnel --config ~/.cloudflared/config-dashboard.yml run alethea-dashboard
```

## 4. Explorer Setup (Vercel)

Explorer sudah di-deploy di Vercel. Untuk update:

```bash
cd alethea-network/alethea-explorer-new

# Update environment variables di Vercel dashboard
# VITE_API_URL=https://evonft.xyz

# Push changes
git add .
git commit -m "Update explorer"
git push origin main

# Vercel akan auto-deploy
```

## 5. Nginx Reverse Proxy (Alternative)

Jika tidak menggunakan Cloudflare Tunnel, bisa pakai Nginx:

```bash
sudo nano /etc/nginx/sites-available/alethea
```

```nginx
# Linera Service (evonft.xyz)
server {
    listen 80;
    server_name evonft.xyz;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Inbox Processor (nectiq.xyz)
server {
    listen 80;
    server_name nectiq.xyz;

    location / {
        proxy_pass http://localhost:4003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Dashboard (alethea.network)
server {
    listen 80;
    server_name alethea.network www.alethea.network;

    location / {
        proxy_pass http://localhost:4002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/alethea /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d evonft.xyz -d nectiq.xyz -d alethea.network -d www.alethea.network
```

## 6. Monitoring & Maintenance

### Check Service Status
```bash
# Linera service
sudo systemctl status linera-service
curl http://localhost:8080/health

# Inbox processor
sudo systemctl status inbox-processor
curl http://localhost:4003/health

# Dashboard
sudo systemctl status alethea-dashboard
curl http://localhost:4002
```

### View Logs
```bash
# Linera service
sudo journalctl -u linera-service -f

# Inbox processor
sudo journalctl -u inbox-processor -f

# Dashboard
sudo journalctl -u alethea-dashboard -f

# Or if using log files
tail -f /var/log/linera-service.log
tail -f /var/log/inbox-processor.log
```

### Auto-restart on Failure
All systemd services configured with `Restart=always` will auto-restart on failure.

### Backup Wallet
```bash
# Backup wallet state
cp ~/.config/linera/wallet.json ~/backups/wallet-$(date +%Y%m%d).json

# Backup with encryption
tar czf - ~/.config/linera | gpg -c > ~/backups/linera-wallet-$(date +%Y%m%d).tar.gz.gpg
```

### Update Deployment
```bash
# Pull latest changes
cd alethea-network
git pull origin main

# Rebuild dashboard
cd alethea-dashboard-vite
npm install
npm run build

# Restart services
sudo systemctl restart inbox-processor
sudo systemctl restart alethea-dashboard

# Or with PM2
pm2 restart alethea-dashboard
```

## 7. Security Checklist

- [ ] Firewall configured (UFW/iptables)
- [ ] SSH key-only authentication
- [ ] Fail2ban installed
- [ ] SSL certificates installed
- [ ] Regular backups scheduled
- [ ] Monitoring alerts setup
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Wallet encrypted and backed up

## 8. Performance Optimization

### Enable Caching
```nginx
# In nginx config
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m;

location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout http_500 http_502 http_503 http_504;
}
```

### PM2 Cluster Mode
```bash
# Run dashboard in cluster mode
pm2 start npm --name "alethea-dashboard" -i max -- run preview
```

### Database Optimization
```bash
# If using PostgreSQL for indexing
sudo nano /etc/postgresql/14/main/postgresql.conf

# Increase shared_buffers, work_mem, etc.
```

## 9. Troubleshooting

### Faucet Not Working
1. Check inbox processor is running: `curl https://nectiq.xyz/health`
2. Check Linera service: `curl https://evonft.xyz`
3. Process inbox manually: `curl -X POST https://nectiq.xyz/process-inbox -d '{"chainId":"YOUR_CHAIN"}'`
4. Check logs: `sudo journalctl -u inbox-processor -n 100`

### Dashboard Not Loading
1. Check service: `sudo systemctl status alethea-dashboard`
2. Check port: `netstat -tulpn | grep 4002`
3. Check Cloudflare tunnel: `cloudflared tunnel info alethea-dashboard`
4. Check browser console for errors

### Cross-Chain Messages Not Received
1. Check inbox: `curl -X POST https://evonft.xyz -d '{"query":"{ chain(chainId:\"YOUR_CHAIN\") { inbox { messages { id } } } }"}'`
2. Process inbox: `curl -X POST https://nectiq.xyz/process-inbox -d '{"chainId":"YOUR_CHAIN"}'`
3. Check treasury balance: Ensure treasury has enough tokens

## 10. Cost Estimation

### Server Requirements
- **VPS**: 2 CPU, 4GB RAM, 50GB SSD (~$10-20/month)
- **Cloudflare Tunnel**: Free
- **Vercel**: Free (Hobby plan)
- **Domain**: ~$10-15/year

### Total Monthly Cost
- ~$10-20/month for VPS
- Free for other services
- **Total: $10-20/month**

## Support

For issues or questions:
- GitHub: https://github.com/mdlog/alethea-network
- Documentation: See README.md and other docs in repo
