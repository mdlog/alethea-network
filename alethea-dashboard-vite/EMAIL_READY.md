# ✅ Email Service Configured & Ready!

Email reminder system sudah dikonfigurasi dengan **Hostinger SMTP** untuk **notifications@alethea.network**

## 📧 Konfigurasi Aktif

```
✅ Email: notifications@alethea.network
✅ Provider: Hostinger
✅ SMTP Host: smtp.hostinger.com
✅ SMTP Port: 465 (SSL)
✅ Status: CONFIGURED
```

## 🚀 Quick Start (3 Langkah)

### 1. Install Dependencies

```bash
cd alethea-dashboard-vite
npm install
```

### 2. Test Email Service

Test koneksi SMTP (tanpa kirim email):
```bash
npm run test:email
```

Test dengan kirim email ke alamat Anda:
```bash
npm run test:email your-email@example.com
```

### 3. Start Services

**Development (Semua service):**
```bash
npm run dev:all
```

Ini akan menjalankan:
- ✅ Vite dev server (http://localhost:5173)
- ✅ Inbox processor
- ✅ Reminder API (http://localhost:3001)

**Atau jalankan terpisah:**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Reminder API
npm run reminder
```

## 🎯 Cara Menggunakan

### Di Dashboard:

1. Buka http://localhost:5173
2. Klik tombol **"Remind me"** di HomePage
3. Masukkan email Anda
4. Pilih waktu reminder (24h, 1h, dll)
5. Klik **"Set Reminder"**
6. ✅ Done! Email akan dikirim otomatis sebelum deadline

### Test Manual via API:

```bash
curl -X POST http://localhost:3001/api/reminders/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "queryId": "1",
    "reminderTimes": ["1h", "30m"]
  }'
```

## 📧 Email Template Preview

Email yang dikirim akan terlihat seperti ini:

```
From: Alethea Oracle <notifications@alethea.network>
Subject: 🔔 Query #1 Commit Phase - 1 hour remaining

┌─────────────────────────────────────┐
│   ⏰ Query Deadline Reminder        │
│   Alethea Oracle Network            │
└─────────────────────────────────────┘

🔒 Commit Phase Ending Soon!
Don't miss your chance to vote on this query.

⏱️ Time Remaining: 1 hour

📝 Query #1
Will Bitcoin reach $100,000 by end of 2024?

📅 Deadline: Monday, February 5, 2026, 10:00 PM

🔒 Commit Phase
During the commit phase, you submit your vote 
privately. Your vote is encrypted and hidden 
from other voters to prevent bias.

[🗳️ Vote Now]

Remember to return during the reveal phase 
to complete your vote!
```

## 🔧 Troubleshooting

### Email tidak terkirim?

1. **Cek koneksi SMTP:**
   ```bash
   npm run test:email
   ```

2. **Cek logs:**
   ```bash
   npm run reminder
   # Lihat output di terminal
   ```

3. **Cek spam folder** - Email mungkin masuk spam

4. **Verify credentials** - Pastikan password benar di `.env.reminder`

### Port sudah digunakan?

Jika port 3001 sudah digunakan, edit `.env.reminder`:
```env
REMINDER_API_PORT=3002
```

### SMTP Error?

Jika ada error "Invalid login", pastikan:
- ✅ Email: notifications@alethea.network
- ✅ Password benar
- ✅ SMTP Host: smtp.hostinger.com
- ✅ Port: 465
- ✅ Secure: true

## 📊 Monitor Status

### Check API Health:
```bash
curl http://localhost:3001/health
```

### Check Statistics:
```bash
curl http://localhost:3001/api/reminders/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalQueries": 5,
    "totalSubscribers": 23,
    "totalSent": 47
  }
}
```

## 🎨 Customization

### Ubah Email Template

Edit file: `server/email-service.js`
Function: `sendQueryReminder()`

### Ubah Reminder Times

Edit file: `src/components/ReminderModal.tsx`
Array: `reminderOptions`

### Ubah Dashboard URL

Edit file: `.env.reminder`
```env
DASHBOARD_URL=https://your-domain.com
```

## 🚀 Production Deployment

### 1. Update Dashboard URL

Edit `.env.reminder`:
```env
DASHBOARD_URL=https://dashboard.alethea.network
```

### 2. Start dengan PM2

```bash
# Install PM2
npm install -g pm2

# Start reminder service
pm2 start server/reminder-api.js --name alethea-reminder

# Save configuration
pm2 save

# Auto-restart on reboot
pm2 startup
```

### 3. Monitor

```bash
# Check status
pm2 status

# View logs
pm2 logs alethea-reminder

# Restart if needed
pm2 restart alethea-reminder
```

## 📝 Files Created

```
alethea-dashboard-vite/
├── .env.reminder                    ✅ Email configuration (CONFIGURED)
├── server/
│   ├── email-service.js            ✅ Email sending (READY)
│   ├── reminder-scheduler.js       ✅ Scheduling logic (READY)
│   ├── reminder-api.js             ✅ API server (READY)
│   └── test-email.js               ✅ Test script (NEW)
├── src/components/
│   └── ReminderModal.tsx           ✅ UI component (READY)
└── EMAIL_READY.md                  ✅ This file
```

## ✨ Features

- ✅ Email reminder otomatis
- ✅ Multiple reminder times (24h, 12h, 6h, 3h, 1h, 30m, 15m)
- ✅ Professional email template
- ✅ Responsive design
- ✅ Commit & Reveal phase reminders
- ✅ Unsubscribe functionality
- ✅ Statistics tracking
- ✅ Hostinger SMTP configured

## 🎉 Ready to Use!

Email service sudah siap digunakan. Jalankan:

```bash
npm install
npm run dev:all
```

Lalu buka http://localhost:5173 dan test fitur "Remind me"!

---

**Email:** notifications@alethea.network  
**Provider:** Hostinger  
**Status:** ✅ CONFIGURED & READY
