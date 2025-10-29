# 🏛️ GitBook Cloud Setup Guide - Alethea Network

Complete step-by-step guide to deploy Alethea Network documentation to GitBook Cloud.

---

## 📋 Prerequisites

Before starting, make sure you have:
- [ ] GitHub account
- [ ] Git installed on your computer
- [ ] Documentation files ready in `/docs` folder
- [ ] GitHub repository created (or ready to create)

---

## 🚀 Step 1: Prepare Your Repository

### 1.1 Create GitHub Repository

```bash
# Navigate to your project
cd /home/mdlog/Project-MDlabs/linera-new

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Alethea Network with GitBook docs"

# Create repo on GitHub (via web or CLI)
# Then add remote:
git remote add origin https://github.com/YOUR_USERNAME/alethea-network.git

# Push to GitHub
git push -u origin main
```

### 1.2 Verify Documentation Structure

Make sure your `docs/` folder has:
```
docs/
├── README.md          ✅
├── SUMMARY.md         ✅
├── .gitbook.yaml      ✅
├── book.json          ✅
└── getting-started/   ✅
    ├── introduction.md
    └── what-is-alethea.md
```

---

## 🌐 Step 2: Sign Up for GitBook Cloud

### 2.1 Go to GitBook Website

1. Open browser and go to: **https://www.gitbook.com/**
2. Click **"Sign Up"** button (top right)

### 2.2 Choose Sign-Up Method

**Option A: Sign up with GitHub (Recommended)**
```
1. Click "Sign up with GitHub"
2. Authorize GitBook to access your GitHub
3. Select which repositories to give access
4. Complete profile setup
```

**Option B: Sign up with Email**
```
1. Enter your email
2. Create password
3. Verify email
4. Complete profile
```

### 2.3 Choose Plan

```
Free Plan (Recommended for start):
✅ Public documentation
✅ Unlimited pages
✅ GitHub sync
✅ Custom domain
✅ Search functionality

Paid Plans (for later):
- Plus: $8/month - Private docs
- Pro: $12/month - Team collaboration
- Enterprise: Custom pricing
```

Click **"Continue with Free"**

---

## 📚 Step 3: Create Your Documentation Space

### 3.1 Create New Space

1. After login, you'll see the dashboard
2. Click **"New Space"** or **"Create a space"** button
3. You'll see three options:

```
┌─────────────────────────────────────────┐
│  1. Import from GitHub       (Choose)   │
│  2. Start from scratch                  │
│  3. Import from GitBook v1              │
└─────────────────────────────────────────┘
```

4. Select **"Import from GitHub"**

### 3.2 Connect GitHub Repository

1. Click **"Select a repository"**
2. You'll see list of your GitHub repos
3. Find and select: **alethea-network** (or your repo name)
4. Click **"Install & Authorize"** if prompted

### 3.3 Configure Import Settings

```
Repository:     alethea-network
Branch:         main (or master)
Root path:      /docs          ← IMPORTANT!
```

Fill in the form:
- **Space name:** Alethea Network Documentation
- **Description:** Divine Truth for Modern Markets - Decentralized Oracle Platform
- **Visibility:** Public
- **Root directory:** `/docs`

Click **"Import"**

### 3.4 Wait for Import

GitBook will:
```
⏳ Scanning repository...
⏳ Reading documentation structure...
⏳ Processing markdown files...
⏳ Building navigation...
⏳ Generating search index...
✅ Done!
```

This takes 1-3 minutes.

---

## ⚙️ Step 4: Configure Your Space

### 4.1 Basic Settings

Click **"Settings"** in left sidebar:

```
General Settings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Name:           Alethea Network Documentation
Slug:           alethea-network (this becomes your URL)
Description:    Divine Truth for Modern Markets
Visibility:     Public
```

### 4.2 Customize Appearance

Go to **"Customize"** tab:

```
Theme Settings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Logo:           Upload Alethea logo (PNG, 120x120px)
Favicon:        Upload favicon (32x32px)
Cover:          Upload banner (1200x630px)

Color Scheme:
  Primary:      #D4AF37 (Olympic Gold)
  Background:   #FAFAFA (White Gold)
  Text:         #2C5F8D (Deep Blue)

Typography:
  Heading:      Cinzel (if available) or default
  Body:         Inter or default
```

### 4.3 Navigation Settings

```
Navigation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☑ Show page outline
☑ Show breadcrumbs
☑ Group pages by section
☑ Enable search
☑ Show page contributors (from GitHub)
```

### 4.4 Integrations

Go to **"Integrations"** tab:

**Enable GitHub Sync:**
```
✅ Auto-sync on push
✅ Two-way sync (edit in GitBook → updates GitHub)
✅ Show GitHub edit link on pages
```

**Optional Integrations:**
```
□ Google Analytics (add tracking ID)
□ Slack (for notifications)
□ Intercom (for support chat)
□ Custom scripts
```

---

## 🌐 Step 5: Configure Custom Domain

### 5.1 Purchase Domain (if not done)

Recommended domains:
```
Primary:        docs.aletheanetwork.io
Alternative:    alethea.network
                docs.alethea.network
```

Buy from:
- Namecheap
- Google Domains
- Cloudflare

### 5.2 Add Domain to GitBook

1. Go to **Settings → Domain**
2. Click **"Add a custom domain"**
3. Enter your domain: `docs.aletheanetwork.io`
4. GitBook will show DNS settings:

```
DNS Configuration Needed:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type:     CNAME
Name:     docs (or @)
Value:    hosting.gitbook.io
TTL:      3600 (1 hour)
```

### 5.3 Configure DNS

Go to your domain provider (e.g., Namecheap):

**For Subdomain (docs.aletheanetwork.io):**
```
Type:     CNAME
Host:     docs
Value:    hosting.gitbook.io
TTL:      Automatic
```

**For Root Domain (alethea.network):**
```
Type:     A Record
Host:     @
Value:    [IP provided by GitBook]
TTL:      Automatic

Type:     CNAME
Host:     www
Value:    hosting.gitbook.io
TTL:      Automatic
```

### 5.4 Verify Domain

1. Wait 5-60 minutes for DNS propagation
2. Go back to GitBook Settings → Domain
3. Click **"Verify"**
4. GitBook will check DNS and enable SSL

```
✅ Domain verified
✅ SSL certificate issued
✅ HTTPS enabled
```

Your docs are now live at: **https://docs.aletheanetwork.io** 🎉

---

## ✅ Step 6: Publish & Test

### 6.1 Publish Your Documentation

1. Click **"Publish"** button (top right)
2. Confirm: **"Publish changes"**
3. Your docs are now public! ✅

### 6.2 Test Your Documentation

Open in browser:
```
Default URL:    https://alethea-network.gitbook.io/docs
Custom URL:     https://docs.aletheanetwork.io (if configured)
```

Test:
- [ ] Home page loads
- [ ] Navigation works
- [ ] Search works
- [ ] Code blocks display correctly
- [ ] Images load
- [ ] Internal links work
- [ ] Mobile responsive

---

## 🔄 Step 7: Setup Auto-Sync Workflow

### 7.1 How Auto-Sync Works

```
Developer updates docs → Pushes to GitHub → GitBook auto-updates
                                              (within 1-2 minutes)
```

### 7.2 Test Auto-Sync

1. Edit a file locally:
```bash
cd /home/mdlog/Project-MDlabs/linera-new/docs
nano getting-started/introduction.md
# Make a small change
```

2. Commit and push:
```bash
git add .
git commit -m "docs: update introduction"
git push origin main
```

3. Wait 1-2 minutes
4. Refresh GitBook → changes should appear! ✅

### 7.3 Configure Sync Settings

In GitBook Settings → Integrations → GitHub:

```
Auto-sync Settings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

☑ Enable auto-sync
☑ Sync on every push to main branch
☑ Show "Edit on GitHub" button
☑ Enable change requests (PRs become GitBook drafts)

Branch:         main
Path:           /docs
```

---

## 🎨 Step 8: Customize Advanced Settings

### 8.1 Add Custom Header/Footer

Settings → Customize → Custom HTML:

```html
<!-- Custom Header -->
<div style="background: linear-gradient(135deg, #D4AF37 0%, #4A90E2 100%); padding: 10px; text-align: center; color: white;">
  🏛️ <strong>Alethea Network</strong> - Divine Truth for Modern Markets
</div>

<!-- Custom Footer -->
<footer style="text-align: center; padding: 20px; border-top: 1px solid #eee;">
  <p>© 2025 Alethea Network. Truth is our only master.</p>
  <p>
    <a href="https://github.com/alethea-network">GitHub</a> •
    <a href="https://twitter.com/AletheaNetwork">Twitter</a> •
    <a href="https://discord.gg/alethea">Discord</a>
  </p>
</footer>
```

### 8.2 Add Custom CSS

```css
/* Custom styling */
.book-header {
  background: linear-gradient(135deg, #D4AF37 0%, #4A90E2 100%);
}

h1, h2, h3 {
  color: #2C5F8D;
}

code {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}
```

### 8.3 Add Analytics

Settings → Integrations → Analytics:

**Google Analytics:**
```
Tracking ID: UA-XXXXX-Y (or G-XXXXXXXXXX for GA4)
```

**Plausible Analytics (privacy-friendly):**
```
Domain: docs.aletheanetwork.io
```

### 8.4 Add Search Console

For SEO, add to Google Search Console:
```
1. Go to: https://search.google.com/search-console
2. Add property: docs.aletheanetwork.io
3. Verify ownership (via DNS or HTML tag)
4. Submit sitemap: https://docs.aletheanetwork.io/sitemap.xml
```

---

## 👥 Step 9: Invite Team Members (Optional)

If you have a team:

1. Settings → Members
2. Click **"Invite member"**
3. Enter email addresses
4. Set permissions:
   ```
   - Admin:    Full access
   - Editor:   Can edit docs
   - Reader:   View only
   ```

---

## 🔍 Step 10: SEO Optimization

### 10.1 Add Meta Tags

In each markdown file, add frontmatter:

```markdown
---
description: Comprehensive guide to Alethea Network oracle platform
keywords: blockchain, oracle, linera, prediction markets
---

# Your Page Title
```

### 10.2 Configure Social Sharing

Settings → Social:

```
Open Graph Settings:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Title:          Alethea Network Documentation
Description:    Divine Truth for Modern Markets
Image:          [Upload social share image 1200x630]
Twitter Card:   Summary with large image
Twitter Handle: @AletheaNetwork
```

---

## 📊 Step 11: Monitor & Maintain

### 11.1 Check Analytics

Regularly check:
- Page views
- Popular pages
- Search queries
- User behavior

### 11.2 Update Content

Keep docs synchronized with code:
```bash
# When you update code
1. Update docs in /docs folder
2. Commit and push
3. GitBook auto-updates
4. Verify changes live
```

### 11.3 Monitor Feedback

Enable feedback widget:
```
Settings → Feedback
☑ Enable "Was this helpful?" buttons
☑ Collect user feedback
☑ Email notifications for feedback
```

---

## ✅ Checklist: Post-Setup

After setup is complete, verify:

- [ ] Documentation is live
- [ ] Custom domain working (if configured)
- [ ] HTTPS enabled
- [ ] Auto-sync from GitHub working
- [ ] Search functionality working
- [ ] Navigation structure correct
- [ ] Code syntax highlighting working
- [ ] Images displaying correctly
- [ ] Mobile responsive
- [ ] Analytics configured
- [ ] SEO meta tags added
- [ ] Social sharing configured
- [ ] Team members invited (if needed)
- [ ] Feedback widget enabled

---

## 🎉 You're Done!

Your Alethea Network documentation is now live on GitBook Cloud! 🏛️

**URLs:**
- Default: `https://alethea-network.gitbook.io/docs`
- Custom: `https://docs.aletheanetwork.io` (if configured)

**Next Steps:**
1. Share docs link on social media
2. Add link to main website
3. Update README.md with docs link
4. Continue writing remaining pages
5. Monitor analytics and user feedback

---

## 🆘 Troubleshooting

### Issue: Import Failed
```
Solution:
- Check .gitbook.yaml is in correct location
- Verify README.md exists in /docs
- Ensure SUMMARY.md has valid syntax
- Check repository permissions
```

### Issue: Auto-Sync Not Working
```
Solution:
- Verify GitHub integration is enabled
- Check webhook settings in GitHub repo
- Ensure correct branch is configured
- Re-authorize GitBook in GitHub
```

### Issue: Custom Domain Not Working
```
Solution:
- Wait 24-48 hours for DNS propagation
- Verify DNS records are correct
- Check domain registrar settings
- Try DNS flush: `nslookup docs.aletheanetwork.io`
```

### Issue: Images Not Loading
```
Solution:
- Use relative paths: ./images/logo.png
- Ensure images committed to git
- Check image file permissions
- Verify image URLs in markdown
```

---

## 📚 Resources

- **GitBook Documentation:** https://docs.gitbook.com/
- **GitBook Support:** https://support.gitbook.com/
- **GitBook Community:** https://community.gitbook.com/
- **Markdown Guide:** https://www.gitbook.com/features/markdown

---

**Alethea Network** - Divine Truth for Modern Markets 🏛️

*Documentation powered by GitBook Cloud*

