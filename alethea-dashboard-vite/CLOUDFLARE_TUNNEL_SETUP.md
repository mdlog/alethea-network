# 🌐 Cloudflare Tunnel Setup

## Current Issue:
- `evonft.xyz` - Domain tidak resolve
- `nectiq.xyz` - Returns 404

## Solution: Setup Cloudflare Tunnel

### Step 1: Install cloudflared

```bash
# Download cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify
cloudflared --version
```

### Step 2: Login to Cloudflare

```bash
cloudflared tunnel login
```

Browser akan terbuka, pilih domain `alethea.network`

### Step 3: Create Tunnel

```bash
# Create tunnel
cloudflared tunnel create alethea-dashboard

# Note the Tunnel ID yang muncul
```

### Step 4: Configure Tunnel

Create file `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/mdlog/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Dashboard
  - hostname: dashboard.alethea.network
    service: http://localhost:5173
  
  # Linera Service
  - hostname: service.alethea.network
    service: http://localhost:8080
  
  # Inbox Processor
  - hostname: inbox.alethea.network
    service: http://localhost:3000
  
  # Catch-all
  - service: http_status:404
```

### Step 5: Add DNS Records

```bash
# Add CNAME for dashboard
cloudflared tunnel route dns alethea-dashboard dashboard.alethea.network

# Add CNAME for service
cloudflared tunnel route dns alethea-dashboard service.alethea.network

# Add CNAME for inbox
cloudflared tunnel route dns alethea-dashboard inbox.alethea.network
```

### Step 6: Run Tunnel

```bash
# Test run
cloudflared tunnel run alethea-dashboard

# Or run as service
cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Step 7: Update .env.local

```env
VITE_SERVICE_URL=https://service.alethea.network
VITE_INBOX_PROCESSOR_URL=https://inbox.alethea.network
```

## Alternative: Use Existing Domains

Jika `evonft.xyz` dan `nectiq.xyz` adalah domain Anda:

1. **Check domain status:**
   - Login ke registrar
   - Verify domain tidak expired
   - Check DNS settings

2. **Point to Cloudflare:**
   - Add domain to Cloudflare
   - Update nameservers
   - Setup tunnel

3. **Update .env.local** dengan URL yang benar

## For Now: Use Local Development

Untuk development lokal, kosongkan URL:

```env
VITE_SERVICE_URL=
VITE_INBOX_PROCESSOR_URL=
```

Vite akan otomatis proxy ke localhost.
