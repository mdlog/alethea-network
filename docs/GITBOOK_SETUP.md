# 🏛️ Alethea Network - GitBook Documentation Setup

## 📚 Structure Created

```
docs/
├── README.md                 # Home page
├── SUMMARY.md               # Table of contents
├── .gitbook.yaml           # GitBook configuration
├── book.json               # GitBook plugins & settings
├── getting-started/
│   ├── introduction.md
│   ├── what-is-alethea.md
│   ├── key-concepts.md
│   ├── installation.md
│   └── quick-start.md
├── core-concepts/
│   ├── architecture.md
│   ├── market-chain.md
│   ├── voter-chain.md
│   ├── commit-reveal.md
│   ├── reputation-system.md
│   ├── amm-mechanism.md
│   └── cross-chain.md
├── developer-guide/
│   ├── quickstart.md
│   ├── environment-setup.md
│   ├── building.md
│   ├── local-network.md
│   ├── deploying.md
│   └── testing.md
├── api-reference/
│   ├── graphql-overview.md
│   ├── market-chain-api/
│   └── voter-chain-api/
├── integration-guide/
│   ├── overview.md
│   ├── linera-dapps.md
│   ├── evm-chains.md
│   └── oracle-as-service.md
├── use-cases/
├── tutorials/
├── deployment/
├── economics/
├── governance/
├── security/
├── resources/
├── contributing/
└── about/
```

## 🚀 How to Deploy to GitBook

### Option 1: GitBook Cloud (Recommended)

1. **Create GitBook Account**
   ```
   Go to: https://www.gitbook.com/
   Sign up with GitHub
   ```

2. **Create New Space**
   ```
   Click: New Space
   Choose: Import from GitHub
   Select: alethea-network/alethea-network repository
   Set path: /docs
   ```

3. **Configure Integration**
   ```
   Settings → Integrations
   Enable: GitHub Sync
   Branch: master or main
   Directory: docs/
   ```

4. **Customize**
   ```
   Settings → General
   - Title: Alethea Network Documentation
   - Description: Divine Truth for Modern Markets
   - Logo: Upload your logo
   - Domain: docs.aletheanetwork.io
   ```

5. **Publish**
   ```
   Click: Publish
   Your docs are live! 🎉
   ```

### Option 2: Self-Hosted GitBook

1. **Install GitBook CLI**
   ```bash
   npm install -g gitbook-cli
   ```

2. **Initialize**
   ```bash
   cd /home/mdlog/Project-MDlabs/linera-new/docs
   gitbook init
   ```

3. **Install Plugins**
   ```bash
   gitbook install
   ```

4. **Build**
   ```bash
   gitbook build
   ```

5. **Serve Locally**
   ```bash
   gitbook serve
   # Visit: http://localhost:4000
   ```

6. **Deploy to GitHub Pages**
   ```bash
   # Build static site
   gitbook build

   # Copy to gh-pages branch
   git checkout -b gh-pages
   cp -r _book/* .
   git add .
   git commit -m "Deploy documentation"
   git push origin gh-pages

   # Enable GitHub Pages in repo settings
   # Point to gh-pages branch
   ```

### Option 3: GitBook + Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Build Script (package.json)**
   ```json
   {
     "scripts": {
       "docs:build": "gitbook build",
       "docs:serve": "gitbook serve"
     }
   }
   ```

3. **Deploy**
   ```bash
   cd docs
   vercel --prod
   ```

4. **Auto-Deploy**
   ```
   Connect GitHub repo to Vercel
   Set build command: npm run docs:build
   Set output directory: _book
   ```

## 📝 Content To-Do List

### High Priority
- [ ] Complete `getting-started/` section
- [ ] Write `core-concepts/` pages
- [ ] Create GraphQL API reference
- [ ] Add code examples

### Medium Priority
- [ ] Tutorial pages
- [ ] Integration guides
- [ ] Deployment instructions
- [ ] FAQ

### Low Priority
- [ ] Economics details
- [ ] Governance documentation
- [ ] Press kit
- [ ] Community guidelines

## 🎨 Customization

### Add Custom Logo
```
docs/assets/
├── logo.png           (120x120)
├── logo-dark.png      (120x120)
├── favicon.ico        (32x32)
└── banner.png         (1200x630)
```

### Custom CSS
```css
/* docs/styles/website.css */
.book-summary {
    background: linear-gradient(135deg, #D4AF37 0%, #4A90E2 100%);
}

h1, h2, h3 {
    color: #2C5F8D;
}

.book-header h1 {
    font-family: 'Cinzel', serif;
}
```

### Custom Domain

1. **Buy Domain**
   ```
   Recommended: aletheanetwork.io
   Alternative: docs.alethea.network
   ```

2. **Configure DNS**
   ```
   CNAME: docs.aletheanetwork.io → your-gitbook.gitbook.io
   ```

3. **Update GitBook Settings**
   ```
   Settings → Domain
   Enter: docs.aletheanetwork.io
   Verify ownership
   ```

## 🔧 GitBook Features to Use

### Code Blocks with Syntax Highlighting
```rust
// Rust code will be highlighted
pub struct Market {
    id: u64,
    question: String,
}
```

### Hints & Callouts
{% hint style="info" %}
This is an info callout
{% endhint %}

{% hint style="success" %}
Success message
{% endhint %}

{% hint style="warning" %}
Warning message
{% endhint %}

{% hint style="danger" %}
Danger alert
{% endhint %}

### Tabs
{% tabs %}
{% tab title="Rust" %}
```rust
let market = Market::new();
```
{% endtab %}

{% tab title="GraphQL" %}
```graphql
query {
  markets {
    id
  }
}
```
{% endtab %}
{% endtabs %}

### Expandable Sections
<details>
<summary>Click to expand</summary>
Hidden content here
</details>

### API Method Template
{% api-method method="post" host="http://localhost:8080" path="/graphql" %}
{% api-method-summary %}
Create Market
{% endapi-method-summary %}
{% endapi-method %}

## 📊 Analytics

### Add Google Analytics
```json
// book.json
{
  "plugins": ["ga"],
  "pluginsConfig": {
    "ga": {
      "token": "UA-XXXXX-Y"
    }
  }
}
```

### Add Plausible Analytics
```html
<!-- In custom header -->
<script defer data-domain="docs.aletheanetwork.io" src="https://plausible.io/js/script.js"></script>
```

## 🌐 Internationalization

### Add Multiple Languages
```
docs/
├── en/           # English (default)
├── id/           # Indonesian
├── zh/           # Chinese
└── LANGS.md      # Language selector
```

```markdown
# LANGS.md
* [English](en/)
* [Bahasa Indonesia](id/)
* [中文](zh/)
```

## 📱 Mobile Optimization

GitBook automatically:
- ✅ Responsive design
- ✅ Mobile-friendly navigation
- ✅ Touch-optimized
- ✅ Progressive Web App ready

## 🔍 SEO Optimization

### Meta Tags (in README.md)
```markdown
---
description: Decentralized oracle platform with commit-reveal voting on Linera
keywords: blockchain, oracle, linera, prediction markets, defi
---
```

### Sitemap
Automatically generated at: `/sitemap.xml`

## 🎯 Next Steps

1. **Fill Content**
   - Complete all section pages
   - Add code examples
   - Include screenshots

2. **Deploy to GitBook Cloud**
   - Create account
   - Import repository
   - Configure custom domain

3. **Promote Documentation**
   - Link from main website
   - Share on social media
   - Add to README.md

4. **Maintain**
   - Keep in sync with code
   - Update for new features
   - Fix broken links

---

**Alethea Network** - Divine Truth for Modern Markets 🏛️

Documentation URL: https://docs.aletheanetwork.io (when deployed)

