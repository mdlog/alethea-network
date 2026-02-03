# Production Setup Guide

## ⚠️ Current Issue: Cannot Connect to Linera Service

Explorer di Vercel tidak bisa connect ke `localhost:8080` karena Linera service Anda running di local machine.

## 🔧 Solutions:

### Option 1: Deploy Linera Service to Public Server (RECOMMENDED)

1. **Deploy Linera to VPS/Cloud:**
   - DigitalOcean Droplet
   - AWS EC2
   - Google Cloud VM
   - Hetzner
   
2. **Get Public URL:**
   ```
   https://linera.yourdomain.com
   ```

3. **Update Vercel Environment Variables:**
   ```bash
   VITE_API_URL=https://linera.yourdomain.com
   ```

4. **Update database.ts:**
   ```typescript
   const LINERA_SERVICE_URL = import.meta.env.VITE_API_URL || '';
   ```

5. **Redeploy Vercel**

### Option 2: Use Cloudflare Tunnel (Quick & Free)

1. **Install Cloudflare Tunnel:**
   ```bash
   # Download cloudflared
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. **Create Tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```

3. **Get Public URL:**
   ```
   https://random-name.trycloudflare.com
   ```

4. **Add to Vercel Environment Variables:**
   ```bash
   VITE_API_URL=https://random-name.trycloudflare.com
   ```

### Option 3: Use ngrok (Quick Testing)

1. **Install ngrok:**
   ```bash
   snap install ngrok
   ```

2. **Expose Local Service:**
   ```bash
   ngrok http 8080
   ```

3. **Get Public URL:**
   ```
   https://abc123.ngrok.io
   ```

4. **Add to Vercel:**
   ```bash
   VITE_API_URL=https://abc123.ngrok.io
   ```

### Option 4: Vercel Serverless Function Proxy

Already created: `api/proxy.ts`

1. **Add Environment Variable in Vercel:**
   ```bash
   LINERA_SERVICE_URL=http://your-server-ip:8080
   ```

2. **Update database.ts to use proxy:**
   ```typescript
   const LINERA_SERVICE_URL = '/api/proxy';
   ```

3. **Redeploy**

## 🧪 Testing Locally First

Before deploying, test locally:

```bash
cd alethea-explorer-new
npm install
npm run dev
```

Open: http://localhost:3001

If it works locally but not on Vercel, it's definitely the API connection issue.

## 📊 Check Current Status

1. **Open Browser Console** on Vercel deployment
2. Look for errors like:
   - `Failed to fetch`
   - `CORS error`
   - `Network error`
   - `ERR_CONNECTION_REFUSED`

3. **Check Network Tab:**
   - See which API calls are failing
   - Check the URLs being called

## ✅ Verification Checklist

After fixing:
- [ ] Network Status shows "Connected"
- [ ] Blocks list loads
- [ ] Chains list loads
- [ ] Can click on block to see details
- [ ] Search chain ID works
- [ ] No console errors

## 🆘 Need Help?

Share:
1. Browser console errors
2. Network tab screenshot
3. Current Vercel URL
4. Where is your Linera service running?

---

**Current Status**: Explorer deployed but cannot connect to Linera service (expected - service is on localhost)

**Next Step**: Choose one of the options above to expose Linera service publicly
