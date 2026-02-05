# 📧 Gmail SMTP Setup - Temporary Solution

## Situasi:
- Domain: alethea.network (di Hostinger)
- DNS: Managed by Cloudflare (untuk tunnel)
- Problem: Tidak bisa login Cloudflare sekarang
- Solution: Gunakan Gmail SMTP sementara untuk development

## ⚠️ Important Notes:

**Email akan terlihat seperti:**
```
From: Alethea Oracle <your-gmail@gmail.com>
```

Bukan:
```
From: Alethea Oracle <notifications@alethea.network>
```

**Ini HANYA untuk:**
- ✅ Development & Testing
- ✅ Verify functionality works
- ❌ BUKAN untuk Production

**Untuk Production:**
- HARUS recovery Cloudflare account
- Setup MX, SPF, DKIM records
- Gunakan notifications@alethea.network

## 🚀 Setup Gmail SMTP (5 menit)

### Step 1: Enable 2FA di Gmail

1. Go to: https://myaccount.google.com/security
2. Scroll ke "2-Step Verification"
3. Klik "Get Started"
4. Follow instructions

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)**
4. Enter name: **Alethea Reminder**
5. Click **Generate**
6. Copy 16-character password (format: abcd efgh ijkl mnop)

### Step 3: Update Configuration

Edit file `.env.reminder`:

```env
# Gmail SMTP Configuration (Temporary)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop

# Display Name (tetap Alethea Oracle)
EMAIL_FROM_NAME=Alethea Oracle
EMAIL_FROM_ADDRESS=your-gmail@gmail.com

# Dashboard URL
DASHBOARD_URL=https://dashboard.alethea.network
REMINDER_API_PORT=3001
```

**Replace:**
- `your-gmail@gmail.com` → Gmail Anda
- `abcd efgh ijkl mnop` → App password dari step 2

### Step 4: Test

```bash
# Test email service
npm run test:email:debug adiadi2411@gmail.com
```

Email akan dikirim dari Gmail Anda dengan nama "Alethea Oracle".

## 📊 Comparison

### Gmail SMTP (Sekarang):
```
From: Alethea Oracle <your-gmail@gmail.com>
Limit: 500 emails/day
Status: ✅ Works immediately
Use: Development/Testing only
```

### Hostinger SMTP (Setelah DNS setup):
```
From: Alethea Oracle <notifications@alethea.network>
Limit: Sesuai Hostinger plan (biasanya unlimited)
Status: ⏳ Need Cloudflare DNS setup
Use: Production ready
```

## 🎯 Roadmap

### Phase 1: Development (Sekarang)
- ✅ Use Gmail SMTP
- ✅ Test functionality
- ✅ Develop features

### Phase 2: Production (Setelah akses Cloudflare)
- 🔐 Recovery Cloudflare account
- 📝 Add DNS records (MX, SPF, DKIM)
- 🔄 Switch back to Hostinger SMTP
- ✅ Email dari notifications@alethea.network

## 🔧 DNS Records yang Perlu Ditambahkan Nanti

Setelah bisa akses Cloudflare, tambahkan:

```
MX Records:
- mx1.hostinger.com (Priority: 10)
- mx2.hostinger.com (Priority: 20)

TXT Records:
- @ → v=spf1 include:_spf.hostinger.com ~all
- default._domainkey → [DKIM dari Hostinger]
- _dmarc → v=DMARC1; p=none; rua=mailto:dmarc@alethea.network
```

## 📞 Cloudflare Recovery Resources

**Forgot Password:**
- https://dash.cloudflare.com/forgot-password

**Support:**
- https://support.cloudflare.com
- Email: support@cloudflare.com

**Community:**
- https://community.cloudflare.com

## ✅ Next Steps

1. **Now:** Setup Gmail SMTP untuk development
2. **ASAP:** Recovery Cloudflare account
3. **After recovery:** Setup DNS records
4. **Finally:** Switch to Hostinger SMTP

---

**Remember:** Gmail SMTP is temporary. For production with `notifications@alethea.network`, you MUST setup DNS in Cloudflare.
