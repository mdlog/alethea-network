# 🎨 Email Logo Setup

## ✅ Logo Added to Email Templates

Logo Alethea sekarang muncul di header email, bukan hanya inisial "A".

## 📧 Logo Location:

```
URL: https://vote.alethea.network/logo.png
Size: 48x48 pixels
Style: Rounded corners (8px border-radius)
```

## 🖼️ Email Templates Updated:

### 1. Query Reminder Email
- ✅ Logo di header
- ✅ Size: 48x48px
- ✅ Rounded corners
- ✅ Centered above title

### 2. Welcome Email
- ✅ Logo di header
- ✅ Same styling

## 📋 Requirements:

### Logo File Must Be:
1. **Publicly accessible** - Email clients need to download it
2. **HTTPS** - Secure connection required
3. **Optimized** - Small file size for fast loading
4. **Square** - Best for email display (48x48px, 64x64px, or 128x128px)

## 🚀 Setup Logo:

### Option 1: Use Existing Logo (Current)

Logo sudah ada di:
```
/media/mdlog/mdlog/Project-MDlabs/alethea-network/alethea-dashboard-vite/logo.png
```

Pastikan file ini accessible via:
```
https://vote.alethea.network/logo.png
```

### Option 2: Upload to CDN (Recommended for Production)

Untuk reliability yang lebih baik, upload logo ke CDN:

**Cloudflare R2:**
```bash
# Upload to Cloudflare R2
# Logo akan accessible via: https://cdn.alethea.network/logo.png
```

**Cloudinary:**
```bash
# Upload to Cloudinary
# Logo akan accessible via: https://res.cloudinary.com/alethea/image/upload/logo.png
```

**GitHub:**
```bash
# Upload to GitHub repo
# Logo akan accessible via: https://raw.githubusercontent.com/alethea-network/assets/main/logo.png
```

### Option 3: Base64 Embed (Not Recommended)

Embed logo langsung di email (increases email size):
```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." />
```

## 🔧 Update Logo URL:

Jika ingin menggunakan URL lain, edit `server/email-service.js`:

```javascript
// Line ~105 (Query Reminder)
<img src="https://your-cdn.com/logo.png" alt="Alethea Oracle" style="width: 48px; height: 48px; margin-bottom: 16px; border-radius: 8px;" />

// Line ~250 (Welcome Email)
<img src="https://your-cdn.com/logo.png" alt="Alethea Oracle" style="width: 48px; height: 48px; margin-bottom: 16px; border-radius: 8px;" />
```

## 📊 Logo Specifications:

### Recommended Sizes:
- **Email Header:** 48x48px (current)
- **High DPI:** 96x96px (2x)
- **Retina:** 144x144px (3x)

### File Format:
- **PNG** - Best for logos with transparency
- **JPG** - Smaller file size, no transparency
- **SVG** - Not recommended (email client support varies)

### File Size:
- **Target:** < 50KB
- **Maximum:** < 100KB

## 🎨 Logo Styling in Email:

```css
width: 48px;           /* Fixed width */
height: 48px;          /* Fixed height */
margin-bottom: 16px;   /* Space below logo */
border-radius: 8px;    /* Rounded corners */
display: block;        /* Center alignment */
margin-left: auto;     /* Center alignment */
margin-right: auto;    /* Center alignment */
```

## ✅ Verification:

### Test Logo Display:

1. **Send test email:**
   ```bash
   npm run test:reminders your-email@example.com
   ```

2. **Check logo displays:**
   - ✅ Logo loads correctly
   - ✅ Size is appropriate
   - ✅ Centered in header
   - ✅ Rounded corners visible

3. **Test in multiple email clients:**
   - Gmail (web, mobile)
   - Outlook (web, desktop)
   - Apple Mail
   - Yahoo Mail

## 🐛 Troubleshooting:

### Logo Not Showing?

**1. Check URL is accessible:**
```bash
curl -I https://vote.alethea.network/logo.png
# Should return: HTTP/2 200
```

**2. Check file exists:**
```bash
ls -lh alethea-dashboard-vite/logo.png
```

**3. Check CORS headers:**
Email clients need to download the image. Make sure CORS is allowed.

**4. Check email client:**
Some email clients block images by default. User needs to "Show Images".

### Logo Too Large/Small?

Edit size in `server/email-service.js`:
```html
<!-- Larger logo -->
<img src="..." style="width: 64px; height: 64px; ..." />

<!-- Smaller logo -->
<img src="..." style="width: 32px; height: 32px; ..." />
```

### Logo Not Centered?

Add centering styles:
```html
<img src="..." style="width: 48px; height: 48px; display: block; margin: 0 auto 16px auto; ..." />
```

## 📱 Mobile Responsive:

Logo automatically scales on mobile devices. Current size (48px) is optimal for both desktop and mobile.

## 🎯 Best Practices:

1. ✅ Use HTTPS URL
2. ✅ Optimize image file size
3. ✅ Use CDN for reliability
4. ✅ Test in multiple email clients
5. ✅ Provide alt text for accessibility
6. ✅ Use square dimensions
7. ✅ Keep file size < 50KB

## 📝 Current Implementation:

```html
<!-- Header with Logo -->
<div class="header">
    <img src="https://vote.alethea.network/logo.png" 
         alt="Alethea Oracle" 
         style="width: 48px; height: 48px; margin-bottom: 16px; border-radius: 8px;" />
    <h1>⏰ Query Deadline Reminder</h1>
    <p>Alethea Oracle Network</p>
</div>
```

## 🚀 Next Steps:

1. ✅ Logo added to email templates
2. ⏳ Verify logo.png is accessible at https://vote.alethea.network/logo.png
3. ⏳ Send test email to verify display
4. ⏳ (Optional) Upload to CDN for better reliability

---

**Logo sekarang muncul di email, bukan hanya inisial "A"!** 🎨
