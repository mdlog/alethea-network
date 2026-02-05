# 🌐 Domain Update Summary

## Updated Domain:

```
OLD: https://dashboard.alethea.network
NEW: https://vote.alethea.network
```

## ✅ Files Updated:

### 1. Configuration Files
- ✅ `alethea-dashboard-vite/.env.reminder`
- ✅ `alethea-dashboard-vite/.env.reminder.example`

### 2. Documentation Files
- ✅ `README.md`
- ✅ `PRODUCTION_DEPLOYMENT.md`
- ✅ `alethea-dashboard-vite/EMAIL_EXAMPLES.md`

### 3. Email Service
- ✅ `server/email-service.js` (uses DASHBOARD_URL env variable)
- ✅ `server/send-test-reminders.js` (uses DASHBOARD_URL env variable)

## 📧 Email Links Updated:

All email templates now use **https://vote.alethea.network**:

- Vote button: `https://vote.alethea.network/queries`
- Dashboard link: `https://vote.alethea.network`
- Documentation: `https://vote.alethea.network/docs`
- Profile settings: `https://vote.alethea.network/profile`

## 🔗 Website Link:

Main website remains: **https://alethea.network**

## 🚀 Next Steps:

### 1. Update Environment Variable

Make sure `.env.reminder` has:
```env
DASHBOARD_URL=https://vote.alethea.network
```

### 2. Restart Services

```bash
# Restart reminder API to load new config
pm2 restart alethea-reminder

# Or if running manually
npm run reminder
```

### 3. Test Email

```bash
npm run test:reminders your-email@example.com
```

Check that all links in email point to `vote.alethea.network`

### 4. Update DNS (If Needed)

If `vote.alethea.network` is a new subdomain:

1. Login to Cloudflare
2. Add DNS record:
   ```
   Type: CNAME
   Name: vote
   Target: alethea.network (or your server)
   Proxy: Enabled (orange cloud)
   ```

3. Or setup Cloudflare Tunnel:
   ```bash
   cloudflared tunnel route dns <tunnel-name> vote.alethea.network
   ```

## 📊 Domain Structure:

```
alethea.network              → Main website
vote.alethea.network         → Dashboard/Voting interface
service.alethea.network      → Linera service (optional)
inbox.alethea.network        → Inbox processor (optional)
notifications@alethea.network → Email sender
```

## ✅ Verification Checklist:

- [x] Configuration files updated
- [x] Documentation updated
- [x] Email templates updated
- [ ] DNS configured for vote.alethea.network
- [ ] Services restarted
- [ ] Test email sent and verified

---

**All documentation and email templates now use vote.alethea.network!** ✨
