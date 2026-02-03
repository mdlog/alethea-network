# Vercel Deployment Guide - Alethea Explorer

## 📋 Prerequisites
- GitHub repository: `https://github.com/mdlog/alethea-network.git`
- Vercel account (free tier works)
- Explorer code in subdirectory: `alethea-explorer-new/`

## 🚀 Deployment Steps

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Repository**
   - Select "Import Git Repository"
   - Choose: `mdlog/alethea-network`
   - Click "Import"

3. **Configure Project**
   ```
   Project Name: alethea-explorer
   Framework Preset: Vite
   Root Directory: alethea-explorer-new
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables** (Optional)
   Add these if needed:
   ```
   VITE_CHAIN_ID=your_chain_id
   VITE_REGISTRY_APP_ID=your_registry_app_id
   VITE_TOKEN_APP_ID=your_token_app_id
   VITE_NETWORK=Conway Testnet
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your explorer will be live at: `https://alethea-explorer.vercel.app`

### Option 2: Via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Explorer Directory**
   ```bash
   cd alethea-explorer-new
   vercel
   ```

4. **Follow Prompts**
   - Set up and deploy? Yes
   - Which scope? Your account
   - Link to existing project? No
   - Project name: alethea-explorer
   - Directory: ./ (current directory)
   - Override settings? No

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## 🔧 Configuration Files

### vercel.json (Optional - Already configured in package.json)
If you need custom configuration, create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/linera",
      "destination": "http://localhost:8080"
    },
    {
      "source": "/chains/:path*",
      "destination": "http://localhost:8080/chains/:path*"
    }
  ]
}
```

### Environment Variables (.env.local)
Create `.env.local` for local development:

```bash
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990
VITE_TOKEN_APP_ID=dac6b92743e8f02acd8367b75aef1dba6e91618c1c4fb863b73b87ec55a33ddd
VITE_NETWORK=Conway Testnet
```

## 🔄 Automatic Deployments

Vercel will automatically deploy when you push to GitHub:

- **Push to `main` branch** → Production deployment
- **Push to other branches** → Preview deployment
- **Pull Requests** → Preview deployment with unique URL

## 🌐 Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

Example:
- `explorer.alethea.network`
- `alethea-explorer.com`

## 📊 Monitoring

After deployment, you can monitor:
- **Analytics**: Vercel Dashboard → Analytics
- **Logs**: Vercel Dashboard → Deployments → View Logs
- **Performance**: Vercel Dashboard → Speed Insights

## 🐛 Troubleshooting

### Build Fails
```bash
# Check build locally first
cd alethea-explorer-new
npm install
npm run build
```

### Environment Variables Not Working
- Make sure variables start with `VITE_`
- Redeploy after adding variables
- Check Vercel Dashboard → Settings → Environment Variables

### API Proxy Issues
If you need to proxy to Linera service:
1. Add proxy configuration in `vite.config.ts`
2. Or use Vercel serverless functions

### Port Issues
Vercel uses port 3000 by default. If you need different port:
```json
// vercel.json
{
  "devCommand": "npm run dev -- --port 3005"
}
```

## 📝 Post-Deployment Checklist

- [ ] Explorer loads successfully
- [ ] Network status shows "Connected"
- [ ] Can view blocks list
- [ ] Can view chains list
- [ ] Search functionality works
- [ ] Block details page works
- [ ] Chain search in header works
- [ ] Responsive design works on mobile

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel Docs**: https://vercel.com/docs
- **Vite Deployment**: https://vitejs.dev/guide/static-deploy.html
- **Your Repository**: https://github.com/mdlog/alethea-network

## 🎯 Expected URLs

After deployment:
- **Production**: `https://alethea-explorer.vercel.app`
- **Preview (branches)**: `https://alethea-explorer-git-[branch].vercel.app`
- **Custom Domain**: `https://your-domain.com` (if configured)

## 💡 Tips

1. **Use Preview Deployments**: Test changes in preview before merging to main
2. **Environment Variables**: Use different values for production vs preview
3. **Build Time**: First build takes longer, subsequent builds are cached
4. **Monorepo**: Vercel handles monorepos well, each subdirectory can be separate project
5. **Free Tier**: Includes 100GB bandwidth, unlimited deployments

## 🚨 Important Notes

- **Backend Required**: Explorer needs Linera service running
- **CORS**: Make sure Linera service allows requests from Vercel domain
- **API Endpoints**: Update API endpoints in production environment variables
- **WebSocket**: If using WebSocket, configure properly in Vercel

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify environment variables
4. Test build locally first
5. Contact Vercel support (very responsive)

---

**Deployment Status**: ✅ Ready to Deploy
**Last Updated**: February 3, 2026
**Version**: 1.0.0
