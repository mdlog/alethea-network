# Vercel Deployment Guide - Alethea Website

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel Dashboard (Easiest)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/new
   - Login with your GitHub account

2. **Import Repository**
   - Click "Add New..." → "Project"
   - Select your GitHub repository: `mdlog/alethea-network`
   - Click "Import"

3. **Configure Project**
   ```
   Project Name: alethea-website
   Framework Preset: Next.js
   Root Directory: alethea-website
   Build Command: npm run build (auto-detected)
   Output Directory: .next (auto-detected)
   Install Command: npm install (auto-detected)
   ```

4. **Environment Variables** (Optional)
   - No environment variables needed for this project
   - All URLs are hardcoded in the code

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like: `https://alethea-website-xxx.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from alethea-website folder**
   ```bash
   cd alethea-website
   vercel
   ```

4. **Follow prompts:**
   ```
   ? Set up and deploy "~/alethea-network/alethea-website"? [Y/n] Y
   ? Which scope do you want to deploy to? [Your Account]
   ? Link to existing project? [y/N] N
   ? What's your project's name? alethea-website
   ? In which directory is your code located? ./
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Custom Domain Setup (alethea.network)

### Step 1: Add Domain in Vercel

1. Go to your project in Vercel Dashboard
2. Click "Settings" → "Domains"
3. Add domain: `alethea.network`
4. Add domain: `www.alethea.network` (optional)

### Step 2: Configure DNS (Cloudflare)

**For Root Domain (alethea.network):**

1. Go to Cloudflare Dashboard → DNS
2. Add/Update A record:
   ```
   Type: A
   Name: @
   Content: 76.76.21.21
   Proxy: DNS only (gray cloud)
   TTL: Auto
   ```

**For WWW Subdomain (optional):**

1. Add CNAME record:
   ```
   Type: CNAME
   Name: www
   Content: cname.vercel-dns.com
   Proxy: DNS only (gray cloud)
   TTL: Auto
   ```

### Step 3: Verify Domain in Vercel

1. Wait 5-10 minutes for DNS propagation
2. Click "Verify" in Vercel Dashboard
3. Once verified, Vercel will automatically provision SSL certificate

### Step 4: Set as Production Domain

1. In Vercel Dashboard → Domains
2. Click "..." next to `alethea.network`
3. Select "Set as Primary Domain"

## Automatic Deployments

Once connected to GitHub, Vercel will automatically:

- ✅ Deploy on every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Run build checks before deployment
- ✅ Provide deployment URLs for testing

## Build Configuration

The project uses Next.js 15 with the following configuration:

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**Framework:** Next.js 15.1.6  
**Node Version:** 18.x or higher  
**Build Time:** ~2-3 minutes  
**Output:** Static + Server-side rendering

## Environment Variables

This project doesn't require environment variables. All URLs are hardcoded:

- Dashboard: `https://vote.alethea.network`
- GitHub: `https://github.com/mdlog/alethea-network`

If you need to add environment variables later:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add variables for Production, Preview, and Development
3. Redeploy to apply changes

## Deployment Checklist

- [ ] Repository pushed to GitHub
- [ ] Vercel account connected to GitHub
- [ ] Project imported in Vercel
- [ ] Root directory set to `alethea-website`
- [ ] Build successful (check deployment logs)
- [ ] Preview URL working
- [ ] Custom domain added (alethea.network)
- [ ] DNS configured in Cloudflare
- [ ] Domain verified in Vercel
- [ ] SSL certificate provisioned
- [ ] Set as primary domain
- [ ] Test "Launch App" button → redirects to vote.alethea.network

## Troubleshooting

### Build Fails

**Error: "Module not found"**
```bash
# Solution: Clear cache and rebuild
vercel --force
```

**Error: "Build exceeded maximum duration"**
```bash
# Solution: Optimize build (already optimized in this project)
# Check vercel.json configuration
```

### Domain Not Working

**DNS not propagating:**
```bash
# Check DNS propagation
dig alethea.network
nslookup alethea.network

# Wait 5-30 minutes for global propagation
```

**SSL Certificate Issues:**
- Ensure DNS is pointing to Vercel (not proxied through Cloudflare)
- Wait for automatic SSL provisioning (5-10 minutes)
- Check Vercel Dashboard → Domains → SSL status

### Preview Deployments

Every push to a branch creates a preview deployment:
- URL format: `https://alethea-website-git-[branch]-[username].vercel.app`
- Perfect for testing before merging to main

## Performance Optimization

Vercel automatically provides:

- ✅ Global CDN (Edge Network)
- ✅ Automatic image optimization
- ✅ Brotli compression
- ✅ HTTP/2 & HTTP/3 support
- ✅ Smart caching
- ✅ DDoS protection

## Monitoring

**Analytics:**
- Go to Vercel Dashboard → Analytics
- View page views, performance metrics, and Core Web Vitals

**Logs:**
- Go to Vercel Dashboard → Deployments → [Deployment] → Logs
- View build logs and runtime logs

## Rollback

If deployment has issues:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

## Cost

**Hobby Plan (Free):**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Custom domains

**Pro Plan ($20/month):**
- Everything in Hobby
- More bandwidth
- Team collaboration
- Advanced analytics

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Vercel Support:** https://vercel.com/support

## Quick Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs [deployment-url]

# Remove deployment
vercel rm [deployment-name]
```

## Post-Deployment

After successful deployment:

1. ✅ Test website: https://alethea.network
2. ✅ Test "Launch App" button → https://vote.alethea.network
3. ✅ Test mobile responsiveness
4. ✅ Check page load speed
5. ✅ Verify all animations working
6. ✅ Test all navigation links

## Continuous Deployment

Vercel is now watching your repository:

- Push to `main` → Auto-deploy to production
- Create PR → Auto-create preview deployment
- Merge PR → Auto-deploy to production

**Deployment URL Pattern:**
- Production: `https://alethea.network`
- Preview: `https://alethea-website-git-[branch].vercel.app`
- Latest: `https://alethea-website.vercel.app`

---

**Status:** Ready to deploy  
**Estimated Time:** 5-10 minutes  
**Difficulty:** Easy (Vercel handles everything)
