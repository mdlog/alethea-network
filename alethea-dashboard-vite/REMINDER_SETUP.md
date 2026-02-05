# 📧 Email Reminder System - Setup Guide

Sistem reminder email untuk Alethea Oracle Network yang mengirimkan notifikasi sebelum deadline query.

## ✨ Fitur

- ✅ Email reminder otomatis sebelum deadline
- ✅ Pilihan waktu reminder (24h, 12h, 6h, 3h, 1h, 30m, 15m)
- ✅ Reminder untuk commit phase dan reveal phase
- ✅ Email template yang profesional dan responsive
- ✅ Unsubscribe functionality
- ✅ Support multiple email providers (Gmail, Outlook, SendGrid, dll)

## 📋 Prerequisites

- Node.js 18+ 
- Email account dengan SMTP access
- Domain: **alethea.network**
- Email: **notifications@alethea.network**

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd alethea-dashboard-vite
npm install
```

Dependencies yang ditambahkan:
- `nodemailer` - Email sending library
- `@types/nodemailer` - TypeScript types

### 2. Configure Email Settings

Copy file `.env.reminder.example` ke `.env.reminder`:

```bash
cp .env.reminder.example .env.reminder
```

Edit `.env.reminder` dengan kredensial SMTP Anda:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@alethea.network
SMTP_PASSWORD=your-app-password-here
DASHBOARD_URL=https://dashboard.alethea.network
REMINDER_API_PORT=3001
```

### 3. Setup Gmail (Recommended)

Jika menggunakan Gmail:

1. **Enable 2-Factor Authentication**
   - Buka: https://myaccount.google.com/security
   - Aktifkan 2-Step Verification

2. **Generate App Password**
   - Buka: https://myaccount.google.com/apppasswords
   - Pilih "Mail" dan "Other (Custom name)"
   - Masukkan "Alethea Reminder"
   - Copy password yang dihasilkan (16 karakter)

3. **Update .env.reminder**
   ```env
   SMTP_USER=notifications@alethea.network
   SMTP_PASSWORD=abcd efgh ijkl mnop  # App password dari step 2
   ```

### 4. Start Services

**Development (All services):**
```bash
npm run dev:all
```

Ini akan menjalankan:
- Vite dev server (port 5173)
- Inbox processor
- Reminder API (port 3001)

**Production:**
```bash
# Start reminder API
npm run reminder

# In another terminal, start main app
npm run dev
```

### 5. Test Email Service

Buka browser console dan test:

```javascript
// Test subscribe
fetch('http://localhost:3001/api/reminders/subscribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    queryId: '1',
    reminderTimes: ['1h', '30m']
  })
}).then(r => r.json()).then(console.log);
```

## 📧 Email Providers Setup

### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
```

### SendGrid (Recommended for Production)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
```

## 🎯 How It Works

### 1. User Flow

1. User clicks "Remind me" button on HomePage
2. Modal opens with reminder options
3. User enters email and selects reminder times
4. System subscribes user to reminders
5. Scheduler checks queries every minute
6. Sends email at appropriate times

### 2. Reminder Times

- **24h before** - Early warning
- **12h before** - Mid-point reminder
- **6h before** - Getting close
- **3h before** - Urgent reminder
- **1h before** - Last hour warning
- **30m before** - Final reminder
- **15m before** - Very urgent

### 3. Email Content

Emails include:
- Query ID and description
- Time remaining (countdown)
- Current phase (Commit/Reveal)
- Direct link to vote
- Phase explanation
- Unsubscribe link

## 🔧 API Endpoints

### Subscribe to Reminder
```http
POST /api/reminders/subscribe
Content-Type: application/json

{
  "email": "user@example.com",
  "queryId": "1",
  "reminderTimes": ["24h", "1h"]
}
```

### Unsubscribe from Reminder
```http
POST /api/reminders/unsubscribe
Content-Type: application/json

{
  "email": "user@example.com",
  "queryId": "1"
}
```

### Get Statistics (Admin)
```http
GET /api/reminders/stats
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

## 📁 File Structure

```
alethea-dashboard-vite/
├── server/
│   ├── email-service.js          # Email sending logic
│   ├── reminder-scheduler.js     # Reminder scheduling
│   └── reminder-api.js            # Express API server
├── src/
│   └── components/
│       └── ReminderModal.tsx      # UI component
├── .env.reminder.example          # Example config
└── REMINDER_SETUP.md             # This file
```

## 🔒 Security Best Practices

1. **Never commit .env.reminder** - Add to .gitignore
2. **Use App Passwords** - Don't use main account password
3. **Rotate credentials** - Change passwords regularly
4. **Rate limiting** - Implement in production
5. **Email validation** - Verify email addresses
6. **Unsubscribe** - Always provide opt-out option

## 🚀 Production Deployment

### 1. Use Professional Email Service

Untuk production, gunakan service seperti:
- **SendGrid** (Recommended) - 100 emails/day free
- **Mailgun** - 5,000 emails/month free
- **AWS SES** - Very cheap, reliable
- **Postmark** - Great deliverability

### 2. Environment Variables

Set di production server:
```bash
export SMTP_HOST=smtp.sendgrid.net
export SMTP_PORT=587
export SMTP_USER=apikey
export SMTP_PASSWORD=your-api-key
export DASHBOARD_URL=https://dashboard.alethea.network
```

### 3. Process Manager

Gunakan PM2 untuk keep service running:

```bash
# Install PM2
npm install -g pm2

# Start reminder service
pm2 start server/reminder-api.js --name alethea-reminder

# Save configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

### 4. Monitoring

Monitor email delivery:
```bash
# Check logs
pm2 logs alethea-reminder

# Monitor status
pm2 status
```

## 🐛 Troubleshooting

### Email not sending

1. **Check SMTP credentials**
   ```bash
   node -e "require('./server/email-service.js').verifyEmailConfig()"
   ```

2. **Check firewall** - Port 587 harus terbuka

3. **Check spam folder** - Email mungkin masuk spam

4. **Enable "Less secure app access"** (Gmail) - Atau gunakan App Password

### API not responding

1. **Check if service running**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check logs**
   ```bash
   npm run reminder
   ```

3. **Check port availability**
   ```bash
   lsof -i :3001
   ```

## 📊 Monitoring & Analytics

### Email Delivery Stats

Check stats via API:
```bash
curl http://localhost:3001/api/reminders/stats
```

### Database (Future Enhancement)

Untuk production, consider using database:
- PostgreSQL - Store subscriptions
- Redis - Cache and rate limiting
- MongoDB - Flexible schema

## 🎨 Customization

### Email Template

Edit `server/email-service.js` function `sendQueryReminder()` untuk customize:
- Colors
- Logo
- Content
- Footer links

### Reminder Times

Edit `src/components/ReminderModal.tsx` untuk add/remove options:
```typescript
const reminderOptions = [
    { value: '24h', label: '24 hours before' },
    { value: '1h', label: '1 hour before' },
    // Add more...
];
```

## 📝 TODO / Future Enhancements

- [ ] Database integration (PostgreSQL)
- [ ] User preferences page
- [ ] Batch email sending
- [ ] Email templates library
- [ ] A/B testing for email content
- [ ] Analytics dashboard
- [ ] SMS notifications (Twilio)
- [ ] Push notifications (Web Push API)
- [ ] Telegram bot integration
- [ ] Discord webhook integration

## 🤝 Support

Jika ada masalah:
1. Check logs: `npm run reminder`
2. Verify config: `.env.reminder`
3. Test SMTP: `telnet smtp.gmail.com 587`
4. Check documentation: https://nodemailer.com

## 📄 License

Part of Alethea Oracle Network

---

**Email:** notifications@alethea.network  
**Website:** https://alethea.network  
**Dashboard:** https://dashboard.alethea.network
