# 🔄 Dashboard Restart Instructions

## ✅ Preparation Complete

All processes on port 4000 have been stopped. The dashboard is ready to restart with all the latest updates.

---

## 🚀 Start Dashboard (Port 4000)

### Option 1: Using the restart script (Recommended)
```bash
cd alethea-dashboard
./restart-dashboard-4000.sh
```

### Option 2: Manual start
```bash
cd alethea-dashboard
npm run dev -- -p 4000
```

---

## 🌐 Access Dashboard

Once started, open your browser:
```
http://localhost:4000
```

---

## ✨ What to Expect

### On Localhost (Port 4000):
- ✅ **No testnet banner** - Banner is hidden on localhost
- ✅ **All features work** - Voter registration, market creation
- ✅ **Fast responses** - Local development speed

### Updated Components:
- ✅ **TestnetBanner** - Smart auto-detection
- ✅ **Registry ID** - Latest deployment (3fdcb1e9...)
- ✅ **Type Safety** - All TypeScript errors fixed
- ✅ **Better UX** - Clear messaging

---

## 🧪 Quick Test Checklist

After starting, verify:

1. **Dashboard Loads**
   - [ ] No errors in browser console
   - [ ] No testnet banner visible (localhost)
   - [ ] All pages accessible

2. **Voter Registration**
   - [ ] Form displays correctly
   - [ ] Can enter wallet address
   - [ ] Submission works
   - [ ] Progress indicators show

3. **Market Creation**
   - [ ] Form displays correctly
   - [ ] Can add/remove outcomes
   - [ ] Deadline picker works
   - [ ] Submission works

4. **Navigation**
   - [ ] All menu items work
   - [ ] Pages load without errors
   - [ ] Wallet connection works

---

## 🔧 Configuration

Your current setup:
```bash
Chain ID: 95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4
Registry ID: 640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
Port: 4000
```

---

## 📊 What Changed

### 1. TestnetBanner Component
- Auto-detects testnet vs localhost
- Only shows on testnet URLs
- Enhanced visual design
- Clear messaging about delays

### 2. Registry Configuration
- Updated to latest deployment ID
- Matches .env.local
- Proper endpoint types

### 3. Type Safety
- All TypeScript errors fixed
- Proper null checks
- Clean ESLint output

---

## 🐛 Troubleshooting

### Issue: Port 4000 already in use
```bash
# Kill any remaining processes
pkill -f "next dev -p 4000"

# Or use different port
npm run dev -- -p 3000
```

### Issue: Build errors
```bash
# Clean and rebuild
rm -rf .next
npm run build
npm run dev -- -p 4000
```

### Issue: Changes not showing
```bash
# Hard refresh browser
Ctrl + Shift + R (Linux/Windows)
Cmd + Shift + R (Mac)

# Or clear .next cache
rm -rf .next/cache
```

---

## 📚 Documentation

- **[START_HERE.md](./START_HERE.md)** - Quick start guide
- **[UI_UPDATE_COMPLETE.md](./UI_UPDATE_COMPLETE.md)** - Full details
- **[UI_UPDATES_SUMMARY.md](./UI_UPDATES_SUMMARY.md)** - Technical summary

---

## 🎯 Next Steps

1. **Start the dashboard** (see commands above)
2. **Open browser** to http://localhost:4000
3. **Test features** - Use the checklist above
4. **Verify updates** - Check that banner is hidden on localhost
5. **Test on testnet** - Update .env.local to see banner

---

## ✅ Summary

- ✅ Old processes stopped
- ✅ Port 4000 available
- ✅ All updates applied
- ✅ Ready to start

**Run this command to start:**
```bash
./restart-dashboard-4000.sh
```

Or simply:
```bash
npm run dev -- -p 4000
```

---

**Happy testing!** 🚀
