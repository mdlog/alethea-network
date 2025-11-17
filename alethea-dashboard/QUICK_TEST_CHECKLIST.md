# ⚡ Quick Test Checklist

**5-Minute Essential Tests**

---

## 🏠 Home Page (http://localhost:4000/)

### Visual Check:
- [ ] Page loads without errors
- [ ] **No testnet banner** (localhost)
- [ ] 4 stats cards display (Total Markets, Active, Resolved, Voters)
- [ ] Markets grid displays
- [ ] Header with navigation
- [ ] Footer with info

### Functionality:
- [ ] Search box works
- [ ] Filter buttons work (All, OPEN, RESOLVED)
- [ ] Refresh button works
- [ ] "Create Market" button opens form

---

## 📝 Create Market

### Test Flow:
1. [ ] Click "Create Market" button
2. [ ] Modal/form opens
3. [ ] Fill in:
   - Question: "Test Market?"
   - Outcomes: "Yes", "No"
   - Deadline: Tomorrow
4. [ ] Click Submit
5. [ ] Success message appears
6. [ ] Market appears in list

---

## 👥 Voters Page (http://localhost:4000/voters)

### Visual Check:
- [ ] Page loads
- [ ] Registration form displays
- [ ] Voter list displays (if any voters)

### Test Registration:
1. [ ] Fill form:
   - Address: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`
   - Stake: 100
   - Name: "Test Voter"
2. [ ] Click Register
3. [ ] Progress states show:
   - [ ] Submitting
   - [ ] Certificate hash
   - [ ] Confirming (progress bar)
4. [ ] Result displays (success/timeout/error)

---

## 💼 Wallet Page (http://localhost:4000/wallet)

### Test MetaMask:
- [ ] Page loads
- [ ] "Connect MetaMask" button visible
- [ ] Click connects to MetaMask
- [ ] Address displays after connection
- [ ] Disconnect works

---

## 🔗 Navigation Test

Click each menu item:
- [ ] Markets (home)
- [ ] Voters
- [ ] Wallet
- [ ] Linera Demo
- [ ] Docs (opens external link)

All pages load without errors.

---

## 🎨 UI Components

### Header:
- [ ] Logo displays
- [ ] Navigation menu works
- [ ] MetaMask button works
- [ ] Create Market button works
- [ ] Refresh button works

### TestnetBanner:
- [ ] **NOT visible on localhost** ✅
- [ ] (Would show on testnet)

### Footer:
- [ ] Displays at bottom
- [ ] Shows "Conway Testnet"
- [ ] Shows SDK version

---

## 🔍 Browser Console

Open DevTools (F12):
- [ ] No red errors
- [ ] No critical warnings
- [ ] Network requests succeed

---

## 📱 Responsive Test

Resize browser window:
- [ ] Mobile (< 768px): Cards stack vertically
- [ ] Tablet (768-1024px): 2 columns
- [ ] Desktop (> 1024px): 3 columns

---

## ⚡ Performance

- [ ] Page loads in < 3 seconds
- [ ] No lag when typing
- [ ] Smooth animations
- [ ] No freezing

---

## 🎯 Critical Features (Must Work)

1. ✅ Home page loads
2. ✅ Markets display
3. ✅ Navigation works
4. ✅ Create market form opens
5. ✅ Voter registration form works
6. ✅ No console errors
7. ✅ No testnet banner on localhost
8. ✅ MetaMask connection works

---

## 📊 Test Result

```
Date: _______________
Time: _______________

✅ Passed: ___ / 8
❌ Failed: ___

Status: [ ] PASS  [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚨 Common Issues

### Issue: Port 4000 not responding
```bash
# Restart dashboard
./restart-dashboard-4000.sh
```

### Issue: Console errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
npm run dev -- -p 4000
```

### Issue: MetaMask not connecting
- Check MetaMask is installed
- Check MetaMask is unlocked
- Try refreshing page

---

## ✅ Success Criteria

**All tests pass if:**
- ✅ No console errors
- ✅ All pages load
- ✅ Navigation works
- ✅ Forms display correctly
- ✅ No testnet banner on localhost
- ✅ Basic operations work

---

**Time to complete: ~5 minutes**

For detailed testing, see [COMPLETE_TESTING_GUIDE.md](./COMPLETE_TESTING_GUIDE.md)
