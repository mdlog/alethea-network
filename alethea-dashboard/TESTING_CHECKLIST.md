# Linera Integration - Testing Checklist

## 🧪 Pre-Testing Setup

- [ ] Dashboard running: `npm run dev`
- [ ] Browser opened: `http://localhost:4000/linera-demo`
- [ ] Browser console open (F12)
- [ ] Network tab open (for debugging)

## ✅ Basic Functionality Tests

### 1. Page Load
- [ ] Demo page loads without errors
- [ ] No console errors on initial load
- [ ] All components render correctly
- [ ] Navigation link works in header

### 2. WebAssembly Initialization
- [ ] "Initialize Linera" button visible
- [ ] Click button works
- [ ] Loading state shows
- [ ] Success message appears
- [ ] Console shows: "Linera WebAssembly initialized successfully"
- [ ] Time taken: ~1-2 seconds

### 3. Wallet Creation
- [ ] "Create Wallet (Testnet)" button appears after init
- [ ] Click button works
- [ ] Loading state shows "Creating..."
- [ ] Faucet connection successful
- [ ] Chain ID displayed
- [ ] Console shows: "Wallet created successfully"
- [ ] Time taken: ~3-5 seconds

### 4. Counter Demo
- [ ] Counter component becomes active after wallet creation
- [ ] Initial count displays (should be 0 or current value)
- [ ] "+ Increment" button enabled
- [ ] Click increment works
- [ ] Loading state shows "Incrementing..."
- [ ] Count updates after increment
- [ ] Console shows: "New block detected"

### 5. Real-time Notifications
- [ ] After increment, notification received
- [ ] Console shows: "Received notification"
- [ ] Counter updates automatically
- [ ] No manual refresh needed
- [ ] Notification latency < 1 second

## 🔍 Advanced Tests

### 6. Multiple Increments
- [ ] Click increment 3 times rapidly
- [ ] All increments processed
- [ ] Final count correct (initial + 3)
- [ ] No errors in console
- [ ] UI remains responsive

### 7. Error Handling
- [ ] Disconnect network (airplane mode)
- [ ] Try to increment
- [ ] Error message displays
- [ ] Error is user-friendly
- [ ] Reconnect network
- [ ] Try again - should work

### 8. State Persistence
- [ ] Create wallet
- [ ] Note chain ID
- [ ] Refresh page
- [ ] State resets (expected - no persistence yet)
- [ ] Can create new wallet

### 9. UI/UX
- [ ] All buttons have proper states (enabled/disabled)
- [ ] Loading indicators work
- [ ] Success messages clear
- [ ] Error messages helpful
- [ ] Responsive design works
- [ ] Mobile view acceptable

### 10. Performance
- [ ] WebAssembly loads in < 3 seconds
- [ ] Wallet creation in < 10 seconds
- [ ] Query response in < 1 second
- [ ] Mutation response in < 2 seconds
- [ ] Notification latency < 1 second
- [ ] No memory leaks (check DevTools)

## 🐛 Edge Cases

### 11. Rapid Actions
- [ ] Click initialize multiple times
- [ ] Only initializes once
- [ ] No duplicate requests

### 12. Invalid States
- [ ] Try to query before wallet creation
- [ ] Proper error message
- [ ] Try to mutate before wallet creation
- [ ] Proper error message

### 13. Network Issues
- [ ] Slow network (throttle in DevTools)
- [ ] Timeout handling works
- [ ] Error messages appropriate
- [ ] Retry mechanism works

### 14. Browser Compatibility
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Test in Edge
- [ ] WebAssembly supported in all

## 📊 Console Checks

### Expected Console Logs (Success Path)

```
✅ Initialization:
- "Initializing Linera WebAssembly..."
- "Linera WebAssembly initialized successfully"

✅ Wallet Creation:
- "Connecting to faucet: https://faucet.testnet-conway.linera.net"
- "Creating wallet from faucet..."
- "Creating client..."
- "Claiming chain..."
- "Wallet created successfully. Chain ID: [chain_id]"

✅ Query:
- "Getting application backend for: [app_id]"
- "Querying backend: [query]"
- "Query response: [data]"

✅ Mutation:
- "Querying backend: [mutation]"
- "Query response: [result]"

✅ Notification:
- "Received notification: [notification_data]"
- "New block detected, updating count..."
```

### Expected Console Errors (None)

- [ ] No red errors in console
- [ ] No unhandled promise rejections
- [ ] No CORS errors
- [ ] No 404 errors
- [ ] No WebAssembly errors

## 🔧 Network Tab Checks

### Expected Requests

1. **WebAssembly Binary**
   - [ ] Request to `linera_web.wasm`
   - [ ] Status: 200
   - [ ] Size: ~few MB
   - [ ] Type: application/wasm

2. **Faucet Requests**
   - [ ] POST to faucet URL
   - [ ] Status: 200
   - [ ] Response contains wallet data

3. **GraphQL Requests**
   - [ ] POST to application endpoint
   - [ ] Content-Type: application/json
   - [ ] Status: 200
   - [ ] Response contains data

## 📝 Test Results Template

```
Date: _______________
Tester: _______________
Browser: _______________
OS: _______________

Basic Tests:        [ ] Pass  [ ] Fail
Advanced Tests:     [ ] Pass  [ ] Fail
Edge Cases:         [ ] Pass  [ ] Fail
Console Checks:     [ ] Pass  [ ] Fail
Network Checks:     [ ] Pass  [ ] Fail

Issues Found:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

Notes:
_______________________________________________
_______________________________________________
_______________________________________________

Overall Status:     [ ] Pass  [ ] Fail
```

## 🚨 Critical Issues (Must Fix)

- [ ] WebAssembly fails to load
- [ ] Wallet creation always fails
- [ ] Queries never return
- [ ] Mutations never complete
- [ ] Notifications never received
- [ ] Page crashes
- [ ] Memory leaks

## ⚠️ Non-Critical Issues (Can Fix Later)

- [ ] Slow performance
- [ ] UI glitches
- [ ] Minor console warnings
- [ ] Styling issues
- [ ] Mobile layout issues

## ✅ Success Criteria

All of the following must pass:

1. ✅ WebAssembly initializes successfully
2. ✅ Wallet can be created from faucet
3. ✅ Chain ID is displayed
4. ✅ Counter query returns value
5. ✅ Counter increment works
6. ✅ Notifications are received
7. ✅ UI updates in real-time
8. ✅ No critical errors
9. ✅ Performance acceptable
10. ✅ User experience smooth

## 📞 Support

If tests fail:

1. Check [LINERA_QUICKSTART.md](./LINERA_QUICKSTART.md)
2. Check [LINERA_INTEGRATION.md](./LINERA_INTEGRATION.md)
3. Review console logs
4. Check network tab
5. Verify configuration
6. Try in different browser
7. Clear cache and retry

## 🎯 Next Steps After Testing

If all tests pass:
- [ ] Document any issues found
- [ ] Create GitHub issues for bugs
- [ ] Plan integration with Alethea features
- [ ] Consider production deployment

If tests fail:
- [ ] Document failure details
- [ ] Check troubleshooting guide
- [ ] Review implementation
- [ ] Fix issues
- [ ] Re-test

---

**Testing Date**: _______________
**Tested By**: _______________
**Result**: [ ] PASS [ ] FAIL
**Notes**: _______________________________________________
