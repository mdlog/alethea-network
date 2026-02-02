# Callback Monitoring Enhancement untuk Simple Market Frontend

## 📋 Status Saat Ini

### ✅ Yang Sudah Ada di `alethea-market`

1. **Core Features**
   - ✅ Create Market (`CreateMarketModal.tsx`)
   - ✅ Place Bet (`BetModal.tsx`)
   - ✅ Request Resolution (`handleRequestResolution`)
   - ✅ Market List dengan auto-refresh (30 detik)
   - ✅ Market Status Display (Open, Voting, Resolved)

2. **Infrastructure**
   - ✅ Linera Context setup
   - ✅ GraphQL client untuk Simple Market
   - ✅ Auto-refresh mechanism (polling)

### ❌ Yang Belum Ada (Perlu Ditambahkan)

1. **Callback Event Monitoring**
   - ❌ Tidak ada UI untuk menampilkan callback events
   - ❌ Tidak ada real-time monitoring untuk callback
   - ❌ Tidak ada log callback events

2. **Callback Flow Visualization**
   - ❌ Tidak ada visualisasi callback flow
   - ❌ Tidak ada status tracking untuk setiap callback step

3. **Testing Tools**
   - ❌ Tidak ada testing checklist
   - ❌ Tidak ada verification tools untuk callback

## 🎯 Rencana Enhancement

### Phase 1: Callback Event Monitor Component

**File Baru**: `alethea-market/src/components/CallbackMonitor.tsx`

**Features**:
- Real-time display callback events untuk market tertentu
- Show callback types: QueryCreated, QueryResolved, QueryFinalized
- Timestamp untuk setiap callback
- Status indicator (pending, received, processed)

**UI Design**:
```
┌─────────────────────────────────────────┐
│  Callback Events for Market #1         │
├─────────────────────────────────────────┤
│  ✅ QueryCreated                        │
│     Query ID: 10                        │
│     Received: 2026-02-01 14:30:00      │
│                                          │
│  ⏳ QueryResolved (Pending)             │
│     Waiting for oracle resolution...   │
│                                          │
│  ⏳ QueryFinalized (Pending)            │
│     Waiting for dispute window...       │
└─────────────────────────────────────────┘
```

### Phase 2: Enhanced Market Detail Page

**File Baru**: `alethea-market/src/pages/MarketDetailPage.tsx`

**Features**:
- Detail lengkap satu market
- Callback monitor untuk market tersebut
- Query status dari Oracle Registry
- Callback flow visualization
- Testing checklist

### Phase 3: Callback Polling Hook

**File Baru**: `alethea-market/src/hooks/useCallbackEvents.ts`

**Features**:
- Polling untuk check query status di Oracle Registry
- Detect callback events berdasarkan market status changes
- Auto-update UI ketika callback diterima

### Phase 4: Integration dengan Oracle Registry

**Enhancement**: Update `MarketsPage.tsx` dan `MarketDetailPage.tsx`

**Features**:
- Query Oracle Registry untuk check query status
- Link query ID ke market
- Show voting progress
- Show resolution result

## 🚀 Implementation Details

### 1. CallbackMonitor Component

```typescript
interface CallbackEvent {
    type: 'QueryCreated' | 'QueryResolved' | 'QueryFinalized' | 'QueryDisputed' | 'DisputeResolved';
    queryId?: string;
    timestamp?: string;
    result?: string;
    isFinal?: boolean;
    status: 'pending' | 'received' | 'processed';
}

interface Props {
    marketId: string;
    queryId?: string;
}

export default function CallbackMonitor({ marketId, queryId }: Props) {
    // Poll Oracle Registry untuk check query status
    // Detect callback events berdasarkan status changes
    // Display events dengan timeline
}
```

### 2. Enhanced Market Card

**Update**: `MarketsPage.tsx` - `MarketCard` component

**Add**:
- Link ke Market Detail Page
- Callback status indicator
- Query ID display dengan link ke Oracle Registry

### 3. Market Detail Page

**New File**: `alethea-market/src/pages/MarketDetailPage.tsx`

**Features**:
- Full market information
- Callback Monitor component
- Query status dari Oracle Registry
- Callback flow diagram
- Testing checklist

### 4. Callback Polling Hook

**New File**: `alethea-market/src/hooks/useCallbackEvents.ts`

```typescript
export function useCallbackEvents(marketId: string, queryId?: string) {
    const [events, setEvents] = useState<CallbackEvent[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Poll Oracle Registry untuk check query status
    // Detect callback berdasarkan status changes
    // Return events array
    
    return { events, loading, refresh };
}
```

### 5. Oracle Registry Integration

**Update**: `alethea-market/src/contexts/LineraContext.tsx`

**Add**:
- Method untuk query Oracle Registry
- Helper untuk check query status
- Helper untuk parse callback events

## 📊 Testing Flow dengan Enhancement

### Step-by-Step Testing:

1. **Create Market**
   - ✅ Market created
   - ✅ Market ID displayed

2. **Request Resolution**
   - ✅ Click "Request Resolution"
   - ✅ CallbackMonitor shows: "⏳ QueryCreated (Pending)"
   - ✅ Poll Oracle Registry
   - ✅ When query created: "✅ QueryCreated - Query ID: X"

3. **Wait for Voting**
   - ✅ CallbackMonitor shows: "⏳ QueryResolved (Pending)"
   - ✅ Link to Oracle Dashboard untuk vote
   - ✅ Show voting progress

4. **Query Resolved**
   - ✅ Polling detects query resolved
   - ✅ CallbackMonitor shows: "✅ QueryResolved - Result: Yes"
   - ✅ Market status updated to "Voting" (waiting for finalization)

5. **Query Finalized**
   - ✅ Polling detects dispute window passed
   - ✅ CallbackMonitor shows: "✅ QueryFinalized - Final Result: Yes"
   - ✅ Market status updated to "Resolved"
   - ✅ Winning outcome displayed
   - ✅ "Claim Payout" button enabled

## 🔧 Technical Implementation

### 1. Polling Strategy

```typescript
// Poll Oracle Registry setiap 5 detik untuk markets dengan status "Voting"
useEffect(() => {
    if (market.status === 'voting' && market.queryId) {
        const interval = setInterval(async () => {
            // Query Oracle Registry untuk check query status
            const queryStatus = await checkQueryStatus(market.queryId);
            
            // Detect callback events berdasarkan status changes
            if (queryStatus.status === 'Resolved' && !events.find(e => e.type === 'QueryResolved')) {
                // Add QueryResolved event
            }
            
            if (queryStatus.isFinal && !events.find(e => e.type === 'QueryFinalized')) {
                // Add QueryFinalized event
            }
        }, 5000);
        
        return () => clearInterval(interval);
    }
}, [market.status, market.queryId]);
```

### 2. Oracle Registry Query

```typescript
const REGISTRY_URL = `${SERVICE_URL}/chains/${REGISTRY_CHAIN_ID}/applications/${REGISTRY_APP_ID}`;

async function checkQueryStatus(queryId: string) {
    const response = await fetch(REGISTRY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            query: `query { query(id: ${queryId}) { id status result resolvedAt disputeWindowEnd } }`
        }),
    });
    
    const result = await response.json();
    return result.data.query;
}
```

### 3. Callback Event Detection

```typescript
function detectCallbackEvents(
    previousStatus: string | null,
    currentStatus: string,
    query: any
): CallbackEvent[] {
    const events: CallbackEvent[] = [];
    
    // QueryCreated: ketika queryId muncul di market
    if (query.id && !previousStatus) {
        events.push({
            type: 'QueryCreated',
            queryId: query.id.toString(),
            timestamp: new Date().toISOString(),
            status: 'received'
        });
    }
    
    // QueryResolved: ketika query status = Resolved
    if (currentStatus === 'Resolved' && previousStatus !== 'Resolved') {
        events.push({
            type: 'QueryResolved',
            queryId: query.id.toString(),
            result: query.result,
            timestamp: query.resolvedAt,
            status: 'received'
        });
    }
    
    // QueryFinalized: ketika dispute window passed
    if (query.disputeWindowEnd) {
        const disputeEnd = new Date(parseInt(query.disputeWindowEnd) / 1000);
        if (disputeEnd < new Date() && currentStatus === 'Resolved') {
            events.push({
                type: 'QueryFinalized',
                queryId: query.id.toString(),
                result: query.result,
                isFinal: true,
                timestamp: disputeEnd.toISOString(),
                status: 'received'
            });
        }
    }
    
    return events;
}
```

## 📝 Files yang Perlu Dibuat/Update

### New Files:
1. `alethea-market/src/components/CallbackMonitor.tsx`
2. `alethea-market/src/pages/MarketDetailPage.tsx`
3. `alethea-market/src/hooks/useCallbackEvents.ts`
4. `alethea-market/src/hooks/useOracleQuery.ts` (helper untuk query Oracle Registry)

### Updated Files:
1. `alethea-market/src/pages/MarketsPage.tsx`
   - Add link ke Market Detail Page
   - Add callback status indicator di MarketCard

2. `alethea-market/src/contexts/LineraContext.tsx`
   - Add method untuk query Oracle Registry
   - Add helper untuk check query status

3. `alethea-market/.env.local`
   - Add `VITE_REGISTRY_APP_ID` (sudah ada)
   - Add `VITE_REGISTRY_CHAIN_ID` (sudah ada)

## ✅ Success Criteria

Setelah enhancement, kita harus bisa:

1. ✅ **See QueryCreated callback** ketika resolution requested
2. ✅ **See QueryResolved callback** ketika query resolved
3. ✅ **See QueryFinalized callback** ketika dispute window passed
4. ✅ **Auto-update market status** berdasarkan callback events
5. ✅ **Visualize callback flow** dengan timeline
6. ✅ **Test end-to-end** callback mechanism dengan UI

## 🎯 Next Steps

1. **Implement CallbackMonitor component**
2. **Create MarketDetailPage**
3. **Add polling hook untuk Oracle Registry**
4. **Update MarketsPage dengan callback indicators**
5. **Test end-to-end flow**

---

**Status**: 📋 Planning Complete - Ready for Implementation

**Priority**: 🔥 High (Essential untuk testing callback mechanism)
