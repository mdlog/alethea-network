# 🧪 Complete Testing Guide - Alethea Dashboard

**Comprehensive checklist untuk test semua fitur dashboard**

---

## 📋 Table of Contents

1. [Dashboard Home (Markets)](#1-dashboard-home-markets)
2. [Voters Page](#2-voters-page)
3. [Wallet Page](#3-wallet-page)
4. [Linera Demo](#4-linera-demo)
5. [Register Page](#5-register-page)
6. [Test Pages](#6-test-pages)
7. [UI Components](#7-ui-components)
8. [Integration Tests](#8-integration-tests)

---

## 1. Dashboard Home (Markets)

**URL:** `http://localhost:4000/`

### A. Page Load & Display
- [ ] Page loads without errors
- [ ] No console errors in browser
- [ ] TestnetBanner **NOT visible** (localhost)
- [ ] Header displays correctly
- [ ] Footer displays correctly

### B. Statistics Cards
- [ ] **Total Markets** card displays
- [ ] **Active Markets** card displays
- [ ] **Resolved Markets** card displays
- [ ] **Total Voters** card displays
- [ ] Numbers update correctly
- [ ] Icons display properly

### C. Search & Filter
- [ ] Search box is functional
- [ ] Can type in search box
- [ ] Search filters markets by question
- [ ] Filter buttons work (All, OPEN, RESOLVED)
- [ ] Active filter is highlighted
- [ ] Results update in real-time

### D. Markets Grid
- [ ] Markets display in grid layout
- [ ] Market cards show:
  - [ ] Question
  - [ ] Outcomes
  - [ ] Status (OPEN/RESOLVED)
  - [ ] Deadline
  - [ ] Creator address
- [ ] Cards are clickable
- [ ] Responsive layout (mobile/tablet/desktop)

### E. Create Market Feature
- [ ] "Create Market" button visible in header
- [ ] Click opens modal/form
- [ ] Form displays correctly:
  - [ ] Question input
  - [ ] Outcomes inputs (min 2)
  - [ ] Add/Remove outcome buttons
  - [ ] Deadline picker (date & time)
  - [ ] Submit button
  - [ ] Cancel button
- [ ] Form validation works:
  - [ ] Required fields checked
  - [ ] Minimum 2 outcomes required
  - [ ] Deadline must be future
- [ ] Submit creates market
- [ ] Success message displays
- [ ] Modal closes after success
- [ ] Markets list refreshes

### F. Refresh Feature
- [ ] Refresh button in header
- [ ] Click triggers data reload
- [ ] Loading spinner shows
- [ ] "Last updated" timestamp updates
- [ ] Auto-refresh every 30 seconds works

---

## 2. Voters Page

**URL:** `http://localhost:4000/voters`

### A. Page Load
- [ ] Page loads without errors
- [ ] Header displays
- [ ] Navigation works

### B. Voter Registration
- [ ] Registration form displays
- [ ] Form fields:
  - [ ] Wallet Address input
  - [ ] Stake Amount input (min 100)
  - [ ] Name input
  - [ ] Register button
- [ ] Form validation:
  - [ ] Address format validation (0x + 64 hex)
  - [ ] Stake minimum check
  - [ ] Required fields check
- [ ] Submit triggers registration
- [ ] Loading states display:
  - [ ] Submitting spinner
  - [ ] Pending state
  - [ ] Confirming with progress bar
  - [ ] Certificate hash shown
- [ ] Success state displays
- [ ] Error handling works
- [ ] Timeout handling works

### C. Voter List
- [ ] List of registered voters displays
- [ ] Each voter shows:
  - [ ] Name
  - [ ] Address
  - [ ] Stake amount
  - [ ] Status
  - [ ] Reputation (if enabled)
- [ ] List updates after registration

### D. Voter Info Component
- [ ] Shows current voter status
- [ ] Displays voter details
- [ ] Updates in real-time

---

## 3. Wallet Page

**URL:** `http://localhost:4000/wallet`

### A. Page Load
- [ ] Page loads without errors
- [ ] Wallet info displays

### B. MetaMask Connection
- [ ] "Connect MetaMask" button visible (if not connected)
- [ ] Click triggers MetaMask popup
- [ ] Connection successful
- [ ] Address displays after connection
- [ ] Disconnect button works
- [ ] Account switching detected

### C. Wallet Information
- [ ] Shows connected address
- [ ] Shows balance (if available)
- [ ] Shows network info
- [ ] Copy address button works

### D. Linera Wallet
- [ ] Linera wallet info displays
- [ ] Chain ID shown
- [ ] Application ID shown
- [ ] Service URL shown

---

## 4. Linera Demo

**URL:** `http://localhost:4000/linera-demo`

### A. Page Load
- [ ] Page loads without errors
- [ ] Demo interface displays

### B. Counter Demo (if available)
- [ ] Counter displays current value
- [ ] Increment button works
- [ ] Decrement button works
- [ ] Value updates in real-time

### C. Linera Client Status
- [ ] Shows connection status
- [ ] Shows chain information
- [ ] Shows application information

---

## 5. Register Page

**URL:** `http://localhost:4000/register`

### A. Page Load
- [ ] Page loads without errors
- [ ] Registration form displays

### B. Voter Registration (Alternative UI)
- [ ] Form displays correctly
- [ ] All fields functional
- [ ] Validation works
- [ ] Submit works
- [ ] Success/error handling

---

## 6. Test Pages

### A. Test Polling Page
**URL:** `http://localhost:4000/test-polling`

- [ ] Page loads
- [ ] Polling test interface displays
- [ ] Instructions clear
- [ ] Test form works
- [ ] Polling progress shows

### B. Test Environment Page
**URL:** `http://localhost:4000/test-env`

- [ ] Page loads
- [ ] Environment variables display
- [ ] Configuration shown correctly
- [ ] All env vars visible

---

## 7. UI Components

### A. Header Component
- [ ] Logo displays
- [ ] Navigation menu works:
  - [ ] Markets link
  - [ ] Voters link
  - [ ] Wallet link
  - [ ] Linera Demo link
  - [ ] Analytics link (if available)
  - [ ] Docs link (external)
- [ ] MetaMask button works
- [ ] Create Market button works
- [ ] Refresh button works
- [ ] Last update timestamp shows
- [ ] Responsive on mobile

### B. TestnetBanner Component
- [ ] **Hidden on localhost** ✅
- [ ] Would show on testnet URLs
- [ ] Dismissible (X button)
- [ ] Visual indicators display
- [ ] Text is clear and readable

### C. Footer Component
- [ ] Displays at bottom
- [ ] Shows project info
- [ ] Shows network info (Conway Testnet)
- [ ] Shows SDK version
- [ ] Documentation link works

### D. Market Card Component
- [ ] Displays market info correctly
- [ ] Status badge shows (OPEN/RESOLVED)
- [ ] Deadline formatted correctly
- [ ] Outcomes list displays
- [ ] Hover effects work
- [ ] Click navigation works

### E. Stats Card Component
- [ ] Icon displays
- [ ] Title shows
- [ ] Value displays
- [ ] Color coding correct
- [ ] Animation works

---

## 8. Integration Tests

### A. End-to-End Flow: Create Market
1. [ ] Navigate to home page
2. [ ] Click "Create Market"
3. [ ] Fill in form:
   - [ ] Question: "Will it rain tomorrow?"
   - [ ] Outcomes: "Yes", "No"
   - [ ] Deadline: Tomorrow
4. [ ] Submit form
5. [ ] Wait for confirmation
6. [ ] Verify market appears in list
7. [ ] Verify stats updated

### B. End-to-End Flow: Register Voter
1. [ ] Navigate to voters page
2. [ ] Fill registration form:
   - [ ] Address: Valid hex address
   - [ ] Stake: 100 tokens
   - [ ] Name: "Test Voter"
3. [ ] Submit form
4. [ ] Watch progress:
   - [ ] Submitting state
   - [ ] Certificate hash shown
   - [ ] Confirming with progress bar
5. [ ] Handle result:
   - [ ] Success: Voter added to list
   - [ ] Timeout: Clear explanation shown
   - [ ] Error: Error message displayed

### C. End-to-End Flow: Wallet Connection
1. [ ] Navigate to wallet page
2. [ ] Click "Connect MetaMask"
3. [ ] Approve in MetaMask
4. [ ] Verify connection:
   - [ ] Address displays
   - [ ] Status shows "Connected"
5. [ ] Test disconnect
6. [ ] Verify disconnection

### D. Data Refresh Flow
1. [ ] Load home page
2. [ ] Note current stats
3. [ ] Click refresh button
4. [ ] Verify:
   - [ ] Loading indicator shows
   - [ ] Data reloads
   - [ ] Timestamp updates
5. [ ] Wait 30 seconds
6. [ ] Verify auto-refresh works

---

## 9. Performance Tests

### A. Load Time
- [ ] Initial page load < 3 seconds
- [ ] Navigation between pages < 1 second
- [ ] Data refresh < 2 seconds

### B. Responsiveness
- [ ] No lag when typing in forms
- [ ] Smooth animations
- [ ] No freezing during operations

### C. Memory
- [ ] No memory leaks
- [ ] Stable memory usage
- [ ] No console warnings

---

## 10. Browser Compatibility

Test in multiple browsers:

### Chrome/Chromium
- [ ] All features work
- [ ] No console errors
- [ ] MetaMask works

### Firefox
- [ ] All features work
- [ ] No console errors
- [ ] MetaMask works

### Safari (if available)
- [ ] All features work
- [ ] No console errors

---

## 11. Responsive Design

Test on different screen sizes:

### Mobile (320px - 767px)
- [ ] Layout adapts correctly
- [ ] Navigation menu works
- [ ] Forms are usable
- [ ] Cards stack vertically
- [ ] Text is readable

### Tablet (768px - 1023px)
- [ ] Layout adapts correctly
- [ ] Grid shows 2 columns
- [ ] All features accessible

### Desktop (1024px+)
- [ ] Full layout displays
- [ ] Grid shows 3 columns
- [ ] All features optimal

---

## 12. Error Handling

### A. Network Errors
- [ ] Graceful handling when backend down
- [ ] Clear error messages
- [ ] Retry options available

### B. Form Errors
- [ ] Validation errors clear
- [ ] Field-level error messages
- [ ] Submit disabled when invalid

### C. Transaction Errors
- [ ] Error messages displayed
- [ ] Retry option available
- [ ] User can recover

---

## 13. Accessibility

### A. Keyboard Navigation
- [ ] Can tab through all elements
- [ ] Enter key submits forms
- [ ] Escape closes modals
- [ ] Focus indicators visible

### B. Screen Reader
- [ ] ARIA labels present
- [ ] Alt text on images
- [ ] Semantic HTML used

### C. Color Contrast
- [ ] Text readable
- [ ] Sufficient contrast
- [ ] Color not sole indicator

---

## 📊 Test Results Template

```
Date: _______________
Tester: _______________
Browser: _______________
Screen Size: _______________

Total Tests: ___
Passed: ___
Failed: ___
Skipped: ___

Pass Rate: ___%

Critical Issues: _______________
Minor Issues: _______________
Notes: _______________
```

---

## 🚀 Quick Test (5 minutes)

Minimal test untuk verify basic functionality:

1. [ ] Home page loads
2. [ ] No console errors
3. [ ] Stats display
4. [ ] Markets display
5. [ ] Navigation works
6. [ ] Create market button works
7. [ ] Voters page loads
8. [ ] Wallet page loads
9. [ ] MetaMask connection works
10. [ ] No testnet banner on localhost

---

## 🎯 Priority Tests

### High Priority (Must Work):
1. ✅ Home page loads
2. ✅ Markets display
3. ✅ Create market works
4. ✅ Voter registration works
5. ✅ Navigation works

### Medium Priority (Should Work):
6. ✅ Search/filter works
7. ✅ Refresh works
8. ✅ Wallet connection works
9. ✅ Stats update correctly
10. ✅ Responsive design

### Low Priority (Nice to Have):
11. ✅ Animations smooth
12. ✅ Auto-refresh works
13. ✅ Test pages work
14. ✅ Demo page works

---

## 📝 Notes

- **TestnetBanner**: Should be hidden on localhost (port 4000)
- **Backend**: Some features require backend API running on port 3001
- **Linera Service**: Should be running on port 8080
- **MetaMask**: Required for wallet features

---

**Happy Testing!** 🧪

Gunakan checklist ini untuk memastikan semua fitur berfungsi dengan baik.
