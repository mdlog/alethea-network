# Callback Monitoring - Implementation Complete ✅

## 🎉 Status: Implementasi Selesai

Callback monitoring mechanism sudah ditambahkan ke Simple Market frontend untuk testing callback mechanism antara Simple Market DApp dan Oracle Registry.

## 📁 Files yang Dibuat/Diupdate

### New Files Created:

1. **`src/hooks/useOracleQuery.ts`**
   - Hook untuk query Oracle Registry
   - Check query status
   - Determine if query is final

2. **`src/hooks/useCallbackEvents.ts`**
   - Hook untuk detect dan track callback events
   - Polling mechanism untuk check query status
   - Auto-detect callback events berdasarkan status changes

3. **`src/components/CallbackMonitor.tsx`**
   - Component untuk display callback events
   - Real-time status updates
   - Visual indicators untuk event status

4. **`src/pages/MarketDetailPage.tsx`**
   - Detail page untuk satu market
   - Integrated dengan CallbackMonitor
   - Full market information display

### Updated Files:

1. **`src/App.tsx`**
   - Added route untuk `/markets/:id`

2. **`src/pages/MarketsPage.tsx`**
   - Added navigation ke Market Detail Page
   - Added "View Details" button di MarketCard

## 🚀 Cara Menggunakan

### 1. Start Development Server

```bash
cd alethea-market
npm install  # Jika belum install dependencies
npm run dev
```

Frontend akan berjalan di `http://localhost:4004`

### 2. Testing Callback Flow

#### Step 1: Create Market
1. Buka `http://localhost:4004`
2. Click "Create Market"
3. Masukkan question (contoh: "Will BTC close above $100k on Feb 1, 2026?")
4. Set duration (misalnya 5 minutes untuk testing)
5. Click "Create Market"

#### Step 2: Request Resolution
1. Setelah market expired, click "Request Resolution"
2. Market status akan berubah ke "Voting"
3. Query ID akan muncul di market card

#### Step 3: View Callback Monitor
1. Click "View Details" atau click pada question untuk buka Market Detail Page
2. Di sidebar kanan, akan muncul **Callback Monitor** component
3. Monitor akan menunjukkan:
   - ⏳ **QueryCreated (Pending)** - Waiting for query creation
   - Setelah query created: ✅ **QueryCreated** - Query ID displayed
   - ⏳ **QueryResolved (Pending)** - Waiting for oracle resolution
   - Setelah query resolved: ✅ **QueryResolved** - Result displayed
   - ⏳ **QueryFinalized (Pending)** - Waiting for dispute window
   - Setelah finalized: ✅ **QueryFinalized** - Final result, safe to settle

#### Step 4: Monitor Voting Progress
1. Click link "Query #X" untuk buka Oracle Dashboard
2. Atau click "Vote in Oracle" untuk vote pada query
3. Setelah voters vote, query akan resolved
4. Callback Monitor akan auto-update dengan QueryResolved event

#### Step 5: Verify Callback Received
1. Setelah query resolved, check Callback Monitor
2. Should see:
   - ✅ QueryResolved callback received
   - Result displayed
   - Is Final status
3. Setelah dispute window passed:
   - ✅ QueryFinalized callback received
   - Market status updated to "Resolved"
   - "Claim Payout" button enabled

## 🔍 Features

### CallbackMonitor Component

- **Real-time Event Display**: Shows all callback events dengan timestamp
- **Status Indicators**: 
  - 🟢 Green = Received
  - 🟡 Yellow = Pending
  - 🔵 Blue = Processed
- **Query Info**: Display query ID dengan link ke Oracle Dashboard
- **Refresh Button**: Manual refresh untuk check latest status
- **Event Details**: Show result, isFinal flag, dan description

### useCallbackEvents Hook

- **Auto Polling**: Poll Oracle Registry setiap 5 detik untuk check query status
- **Event Detection**: Auto-detect callback events berdasarkan status changes
- **Pending Events**: Show pending events untuk expected callbacks
- **Status Tracking**: Track previous query status untuk detect changes

### MarketDetailPage

- **Full Market Info**: Display semua market details
- **Callback Monitor**: Integrated callback monitoring
- **Action Buttons**: Request Resolution, Vote, Claim Payout
- **Auto Refresh**: Auto-refresh market data setiap 10 detik

## 📊 Callback Flow Visualization

```
Market Created
    ↓
Request Resolution
    ↓
⏳ QueryCreated (Pending)
    ↓
✅ QueryCreated (Received) - Query ID: X
    ↓
⏳ QueryResolved (Pending) - Waiting for votes...
    ↓
✅ QueryResolved (Received) - Result: Yes
    ↓
⏳ QueryFinalized (Pending) - Waiting for dispute window...
    ↓
✅ QueryFinalized (Received) - Final Result: Yes
    ↓
Market Status: Resolved
    ↓
Claim Payout Available
```

## 🧪 Testing Checklist

Gunakan Callback Monitor untuk verify setiap step:

- [ ] Market created successfully
- [ ] Resolution requested
- [ ] ✅ QueryCreated callback received (dengan Query ID)
- [ ] Query ID linked to market
- [ ] ⏳ QueryResolved pending (waiting for votes)
- [ ] Voters voted (check via Oracle Dashboard)
- [ ] ✅ QueryResolved callback received (dengan result)
- [ ] ⏳ QueryFinalized pending (waiting for dispute window)
- [ ] ✅ QueryFinalized callback received (isFinal = true)
- [ ] Market status updated to "Resolved"
- [ ] Winning outcome displayed
- [ ] "Claim Payout" button enabled

## 🔧 Configuration

Pastikan `.env.local` sudah dikonfigurasi dengan benar:

```env
VITE_CHAIN_ID=<market_chain_id>
VITE_MARKET_APP_ID=<simple_market_app_id>
VITE_REGISTRY_APP_ID=<oracle_registry_app_id>
VITE_REGISTRY_CHAIN_ID=<registry_chain_id>
VITE_SERVICE_URL=http://localhost:8080  # atau kosong untuk Vite proxy
```

## 📝 Notes

1. **Polling Interval**: Default 5 detik untuk check query status. Bisa diubah di `useCallbackEvents` hook.

2. **Oracle Registry URL**: Callback Monitor menggunakan `http://localhost:4002` untuk link ke Oracle Dashboard. Pastikan Oracle Dashboard berjalan di port tersebut.

3. **Query Status Detection**: Callback events di-detect berdasarkan perubahan status query di Oracle Registry, bukan dari actual callback messages (karena callback messages tidak accessible dari frontend).

4. **Real-time Updates**: Market Detail Page auto-refresh setiap 10 detik untuk update market status.

## 🎯 Next Steps

1. **Test End-to-End**: 
   - Create market
   - Request resolution
   - Monitor callbacks
   - Verify market settlement

2. **Verify Callback Mechanism**:
   - Check registry logs untuk confirm callbacks dikirim
   - Verify market status updated setelah callback
   - Test claim payout setelah resolution

3. **Enhancement** (Optional):
   - Add WebSocket support untuk real-time updates (jika Linera support)
   - Add callback event history
   - Add dispute handling UI

---

**Status**: ✅ **Implementation Complete - Ready for Testing**
