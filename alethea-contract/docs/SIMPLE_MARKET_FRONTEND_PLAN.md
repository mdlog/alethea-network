# Simple Market Frontend - Testing Callback Mechanism

## 🎯 Tujuan

Membuat Simple Market dengan frontend lengkap untuk melakukan **end-to-end testing** callback mechanism antara:
- Simple Market DApp → Oracle Registry → Callback → Simple Market Settlement

## 📋 Status Saat Ini

### ✅ Yang Sudah Ada

1. **Simple Market Contract** (`alethea-contract/simple-market/`)
   - ✅ Contract logic lengkap
   - ✅ Callback handler (`handle_oracle_callback`)
   - ✅ GraphQL service layer
   - ✅ Integration dengan Oracle Registry

2. **Oracle Registry**
   - ✅ Callback mechanism sudah diimplementasi
   - ✅ Mengirim 3 jenis callback (QueryResolved, QueryFinalized, QueryResolutionCallback)

### ❌ Yang Belum Ada

1. **Frontend untuk Simple Market**
   - ❌ Tidak ada UI untuk create market
   - ❌ Tidak ada UI untuk place bet
   - ❌ Tidak ada UI untuk melihat status market
   - ❌ Tidak ada UI untuk claim payout
   - ❌ Tidak ada monitoring callback events

## 🏗️ Rencana Implementasi

### Phase 1: Setup Frontend Project

**Lokasi**: `alethea-simple-market-frontend/` (baru)

**Tech Stack**:
- **Framework**: Vite + React + TypeScript (sama seperti dashboard utama)
- **Styling**: Tailwind CSS (konsisten dengan dashboard)
- **Linera Client**: Menggunakan Linera SDK yang sama
- **State Management**: React Context atau Zustand

**Struktur**:
```
alethea-simple-market-frontend/
├── src/
│   ├── components/
│   │   ├── MarketCard.tsx          # Card untuk display market
│   │   ├── CreateMarketForm.tsx    # Form create market
│   │   ├── PlaceBetForm.tsx        # Form place bet
│   │   ├── MarketDetail.tsx        # Detail market dengan status
│   │   ├── CallbackMonitor.tsx     # Monitor callback events
│   │   └── ClaimPayoutButton.tsx   # Button claim payout
│   ├── pages/
│   │   ├── MarketsPage.tsx         # List semua markets
│   │   └── MarketDetailPage.tsx    # Detail satu market
│   ├── hooks/
│   │   ├── useSimpleMarket.ts      # Hook untuk GraphQL queries
│   │   ├── useMarketOperations.ts  # Hook untuk mutations
│   │   └── useCallbackEvents.ts    # Hook untuk monitor callbacks
│   ├── lib/
│   │   ├── graphql.ts              # GraphQL client untuk Simple Market
│   │   └── linera-client.ts        # Linera client setup
│   └── contexts/
│       └── LineraContext.tsx       # Linera wallet context
├── package.json
└── vite.config.ts
```

### Phase 2: Core Features

#### 2.1 Create Market
- Form input: Question, End Time
- Submit → Call GraphQL mutation `createMarket`
- Show market ID setelah created
- Auto-refresh market list

#### 2.2 Request Resolution
- Button "Request Resolution" di market detail
- Submit → Call GraphQL mutation `requestResolution`
- Show loading state
- Monitor untuk QueryCreated callback
- Update market status ke "Voting"

#### 2.3 Place Bet
- Form: Market ID, Outcome (Yes/No), Stake Amount
- Submit → Call GraphQL mutation `placeBet`
- Show bet confirmation
- Update market pools (yesPool, noPool)

#### 2.4 Monitor Callbacks
- **Real-time monitoring** untuk callback events:
  - `QueryCreated` → Update market dengan query ID
  - `QueryResolved` → Show resolution result (tapi belum final)
  - `QueryFinalized` → Mark market as resolved, enable claim payout
  - `QueryDisputed` → Show dispute info
  - `DisputeResolved` → Final result after dispute

#### 2.5 Claim Payout
- Button "Claim Payout" muncul setelah market resolved
- Submit → Call GraphQL mutation `claimPayout`
- Show payout amount
- Update user balance

### Phase 3: Callback Testing Features

#### 3.1 Callback Event Log
- **Dedicated panel** untuk menampilkan semua callback events
- Real-time updates menggunakan polling atau WebSocket (jika available)
- Show:
  - Timestamp
  - Callback type
  - Query ID
  - Result
  - Is Final flag
  - Market ID (dari callback_data)

#### 3.2 Callback Flow Visualization
- Visual flow diagram menunjukkan:
  ```
  Market Created
    ↓
  Request Resolution → Oracle Registry
    ↓
  Query Created (Callback #1)
    ↓
  Voters Vote
    ↓
  Query Resolved (Callback #2)
    ↓
  Query Finalized (Callback #3) → Market Settled
  ```

#### 3.3 Testing Checklist
- Checkbox list untuk verify setiap step:
  - [ ] Market created successfully
  - [ ] Resolution requested
  - [ ] QueryCreated callback received
  - [ ] Query ID linked to market
  - [ ] Voters voted (check via Oracle Registry)
  - [ ] QueryResolved callback received
  - [ ] QueryFinalized callback received
  - [ ] Market status updated to Resolved
  - [ ] Payout claimable
  - [ ] Payout claimed successfully

### Phase 4: Integration Testing

#### 4.1 End-to-End Test Flow

1. **Setup**
   - Deploy Simple Market contract
   - Configure frontend dengan Simple Market App ID
   - Connect wallet

2. **Create Market**
   - Create market: "Will BTC close above $100k on Feb 1, 2026?"
   - Verify market created
   - Get market ID

3. **Request Resolution**
   - Click "Request Resolution"
   - Monitor for QueryCreated callback
   - Verify query ID linked to market
   - Check Oracle Registry for query status

4. **Wait for Resolution** (atau trigger manual)
   - Voters vote on query (via Oracle Registry dashboard)
   - Query resolved
   - Monitor for QueryResolved callback
   - Monitor for QueryFinalized callback

5. **Verify Settlement**
   - Check market status = Resolved
   - Check winning outcome
   - Verify payout claimable
   - Claim payout
   - Verify balance updated

#### 4.2 Debugging Tools

- **GraphQL Query Inspector**: Show raw GraphQL queries/responses
- **Callback Event Inspector**: Show raw callback messages
- **State Inspector**: Show current market state
- **Network Inspector**: Show Linera messages sent/received

## 🚀 Implementation Steps

### Step 1: Initialize Frontend Project

```bash
cd alethea-contract
npm create vite@latest alethea-simple-market-frontend -- --template react-ts
cd alethea-simple-market-frontend
npm install
npm install @linera-sdk/core tailwindcss postcss autoprefixer
npm install -D @types/node
```

### Step 2: Setup Linera Client

Copy Linera context dari `alethea-dashboard-vite` dan adapt untuk Simple Market.

### Step 3: Create GraphQL Client

Setup GraphQL client untuk Simple Market service endpoint.

### Step 4: Implement Core Components

Buat components satu per satu:
1. MarketCard
2. CreateMarketForm
3. MarketDetail
4. PlaceBetForm
5. CallbackMonitor

### Step 5: Implement Callback Monitoring

- Polling untuk check market status
- Listen untuk callback events (jika WebSocket available)
- Update UI real-time

### Step 6: Testing

- Manual testing dengan real Oracle Registry
- Verify callback flow end-to-end
- Document results

## 📊 Expected Results

Setelah implementasi, kita harus bisa:

1. ✅ **Create market** dari frontend
2. ✅ **Request resolution** dan melihat QueryCreated callback
3. ✅ **Monitor query resolution** di Oracle Registry
4. ✅ **Receive QueryResolved callback** di Simple Market
5. ✅ **Receive QueryFinalized callback** dan auto-settle market
6. ✅ **Claim payout** setelah market resolved

## 🔍 Verification Checklist

- [ ] Market created via frontend
- [ ] Resolution requested via frontend
- [ ] QueryCreated callback received and displayed
- [ ] Query ID linked to market correctly
- [ ] QueryResolved callback received and displayed
- [ ] QueryFinalized callback received and displayed
- [ ] Market status updated to Resolved automatically
- [ ] Payout claimable after resolution
- [ ] Payout claimed successfully
- [ ] All callback events logged in UI

## 📝 Notes

- Frontend akan menggunakan **same Linera wallet** sebagai dashboard utama
- Simple Market contract sudah memiliki **callback handler** yang lengkap
- Testing akan menggunakan **real Oracle Registry** yang sudah deployed
- Callback monitoring bisa menggunakan **polling** (check market status periodically) atau **event listening** (jika Linera support)

## 🎯 Success Criteria

**Callback mechanism dianggap berhasil jika:**
1. Market created dan resolution requested
2. QueryCreated callback diterima dan ditampilkan di UI
3. Setelah query resolved, QueryResolved callback diterima
4. QueryFinalized callback diterima dan market auto-settled
5. User bisa claim payout setelah resolution

---

**Status**: 📋 Planning Complete - Ready for Implementation
