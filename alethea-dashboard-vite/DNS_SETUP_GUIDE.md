# 🔧 DNS Setup Guide untuk Email

## ❌ Masalah Ditemukan:

Domain **alethea.network** belum dikonfigurasi untuk email:
- ❌ No MX Records
- ❌ No SPF Record
- ❌ No DKIM Record

## ✅ Solusi: Setup DNS di Cloudflare

### Step 1: Login Cloudflare

1. Go to: https://dash.cloudflare.com
2. Login dengan akun Anda
3. Select domain: **alethea.network**
4. Go to: **DNS** → **Records**

### Step 2: Tambahkan MX Records

Klik **"Add record"** dan tambahkan 2 MX records:

**MX Record 1 (Primary):**
```
Type: MX
Name: @
Mail server: mx1.hostinger.com
Priority: 10
TTL: Auto
Proxy status: DNS only (grey cloud)
```

**MX Record 2 (Backup):**
```
Type: MX
Name: @
Mail server: mx2.hostinger.com
Priority: 20
TTL: Auto
Proxy status: DNS only (grey cloud)
```

### Step 3: Tambahkan SPF Record

**SPF Record:**
```
Type: TXT
Name: @
Content: v=spf1 include:_spf.hostinger.com ~all
TTL: Auto
```

### Step 4: Dapatkan & Tambahkan DKIM

**Dapatkan DKIM dari Hostinger:**

1. Login: https://hpanel.hostinger.com
2. Email → Email Accounts
3. Klik "DKIM Settings" atau "Authentication"
4. Enable DKIM
5. Copy DKIM record value

**Tambahkan ke Cloudflare:**
```
Type: TXT
Name: default._domainkey
Content: [paste DKIM value dari Hostinger]
TTL: Auto
```

DKIM biasanya seperti ini:
```
v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

### Step 5: (Optional) Tambahkan DMARC

```
Type: TXT
Name: _dmarc
Content: v=DMARC1; p=none; rua=mailto:dmarc@alethea.network
TTL: Auto
```

## ⏱️ Tunggu Propagasi

- **Waktu:** 5-30 menit (maksimal 24 jam)
- **Cek status:** `npm run check:dns`

## ✅ Verifikasi Setup

Setelah menambahkan records, tunggu 10-15 menit lalu test:

```bash
# Cek DNS records
npm run check:dns

# Test email lagi
npm run test:email:debug adiadi2411@gmail.com
```

## 🚀 Solusi Sementara: Gmail SMTP

Sambil menunggu DNS propagasi, gunakan Gmail SMTP:

### Setup Gmail:

1. **Enable 2FA:**
   - https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - https://myaccount.google.com/apppasswords
   - Select: Mail → Other (Custom name)
   - Name: "Alethea Reminder"
   - Copy 16-character password

3. **Update .env.reminder:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASSWORD=abcd efgh ijkl mnop
   ```

4. **Test:**
   ```bash
   npm run test:email:debug adiadi2411@gmail.com
   ```

## 📊 Expected DNS Records

Setelah setup selesai, `npm run check:dns` harus menunjukkan:

```
✅ MX Records: mx1.hostinger.com, mx2.hostinger.com
✅ SPF Record: v=spf1 include:_spf.hostinger.com ~all
✅ DKIM Record: v=DKIM1; k=rsa; p=...
✅ DMARC Record: v=DMARC1; p=none; ...
```

## 🆘 Troubleshooting

### DNS tidak update setelah 1 jam?

1. Clear Cloudflare cache
2. Check Cloudflare DNS settings
3. Verify records are "DNS only" (grey cloud)

### Masih tidak bisa kirim email?

1. Contact Hostinger support
2. Verify email account active
3. Check email quota/limits

### Email masih masuk spam?

Normal untuk domain baru. Solusi:
1. Warm up domain (kirim email bertahap)
2. Ask recipients to whitelist
3. Build email reputation over time

## 📞 Support

**Cloudflare Support:**
- https://support.cloudflare.com

**Hostinger Support:**
- https://www.hostinger.com/contact

---

**Setelah DNS setup selesai, email reminder system akan bekerja sempurna!** ✨
