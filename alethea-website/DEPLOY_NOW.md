# 🚀 Deploy Alethea Website to Vercel - Quick Start

## Fastest Way (5 Minutes)

### Step 1: Open Vercel
Go to: **https://vercel.com/new**

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Select repository: **mdlog/alethea-network**
3. Click "Import"

### Step 3: Configure
```
Project Name: alethea-website
Framework: Next.js (auto-detected)
Root Directory: alethea-website ⚠️ IMPORTANT!
Build Command: npm run build (auto-detected)
Output Directory: .next (auto-detected)
```

### Step 4: Deploy
Click "Deploy" button and wait 2-3 minutes ⏱️

### Step 5: Get Your URL
You'll get: `https://alethea-website-xxx.vercel.app`

---

## Add Custom Domain (alethea.network)

### In Vercel Dashboard:
1. Go to project → Settings → Domains
2. Add domain: `alethea.network`

### In Cloudflare DNS:
Add A record:
```
Type: A
Name: @
Content: 76.76.21.21
Proxy: OFF (gray cloud)
```

### Wait & Verify:
- Wait 5-10 minutes
- Click "Verify" in Vercel
- SSL auto-provisions ✅

---

## That's It! 🎉

Your website is now live at:
- **https://alethea.network** (after DNS setup)
- **https://alethea-website.vercel.app** (Vercel URL)

"Launch App" button → https://vote.alethea.network ✅

---

## Need Help?
See full guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
