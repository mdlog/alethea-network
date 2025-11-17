# Linera Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              React Application                          │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │   Wallet     │  │   Counter    │  │  Demo Page   │ │    │
│  │  │   Connect    │  │    Demo      │  │              │ │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │    │
│  │         │                 │                  │          │    │
│  │         └─────────────────┴──────────────────┘          │    │
│  │                           │                              │    │
│  │                           ▼                              │    │
│  │                  ┌─────────────────┐                    │    │
│  │                  │  React Hooks    │                    │    │
│  │                  │  - useLinera    │                    │    │
│  │                  │  - useNotify    │                    │    │
│  │                  └────────┬────────┘                    │    │
│  │                           │                              │    │
│  └───────────────────────────┼──────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         LineraClientService (Singleton)                 │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ initialize() │  │ createWallet │  │   query()    │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  │                                                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │  mutation()  │  │ onNotify()   │  │  getState()  │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  │                                                          │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                    │
│                             ▼                                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         @linera/client Library                          │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │         WebAssembly Binary                        │  │    │
│  │  │  (linera_web.wasm)                               │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │         JavaScript Bindings                       │  │    │
│  │  │  (linera_web.js)                                 │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  └──────────────────────────┬───────────────────────────────┘    │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Linera Network  │
                    │  (Testnet)       │
                    └──────────────────┘
```

## Component Flow

### 1. Initialization Flow

```
User Action
    │
    ▼
[Click "Initialize"]
    │
    ▼
useLineraClient.initialize()
    │
    ▼
LineraClientService.initialize()
    │
    ▼
linera.default() ← Load WebAssembly
    │
    ▼
State: initialized = true
    │
    ▼
UI: Show "Create Wallet" button
```

### 2. Wallet Creation Flow

```
User Action
    │
    ▼
[Click "Create Wallet"]
    │
    ▼
useLineraClient.createWallet()
    │
    ▼
LineraClientService.createWalletFromFaucet()
    │
    ├─→ new Faucet(url)
    │       │
    │       ▼
    │   faucet.createWallet()
    │       │
    │       ▼
    │   new Client(wallet)
    │       │
    │       ▼
    │   faucet.claimChain(client)
    │       │
    │       ▼
    │   Return { wallet, chainId }
    │
    ▼
setupNotifications()
    │
    ▼
State: wallet, client, chainId set
    │
    ▼
UI: Show chain ID & enable features
```

### 3. Query Flow

```
User Action / Component Mount
    │
    ▼
useLineraClient.graphqlQuery(query)
    │
    ▼
LineraClientService.graphqlQuery(query)
    │
    ├─→ Get backend (if not cached)
    │       │
    │       ▼
    │   client.frontend().application(appId)
    │
    ▼
backend.query(JSON.stringify({ query }))
    │
    ▼
[Network Request to Linera]
    │
    ▼
Response from blockchain
    │
    ▼
JSON.parse(response)
    │
    ▼
Return data to component
    │
    ▼
UI: Update with data
```

### 4. Mutation Flow

```
User Action
    │
    ▼
[Click "Increment" / Submit Form]
    │
    ▼
useLineraClient.graphqlMutation(mutation)
    │
    ▼
LineraClientService.graphqlMutation(mutation)
    │
    ▼
backend.query(JSON.stringify({ query: mutation }))
    │
    ▼
[Propose new block to Linera]
    │
    ▼
Block created
    │
    ├─→ Notification triggered
    │       │
    │       ▼
    │   client.onNotification(callback)
    │       │
    │       ▼
    │   All registered callbacks called
    │       │
    │       ▼
    │   useLineraNotifications callback
    │       │
    │       ▼
    │   Component refreshes data
    │
    ▼
Return mutation result
    │
    ▼
UI: Show success / Update state
```

### 5. Notification Flow

```
Blockchain Event (New Block / Message)
    │
    ▼
Linera Client detects change
    │
    ▼
client.onNotification() triggered
    │
    ▼
LineraClientService.notificationCallbacks[]
    │
    ├─→ Callback 1 (Counter component)
    │       │
    │       ▼
    │   updateCount()
    │
    ├─→ Callback 2 (Market list)
    │       │
    │       ▼
    │   refreshMarkets()
    │
    └─→ Callback N (Other components)
            │
            ▼
        Custom logic
```

## Data Flow Diagram

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ (1) Click / Input
       ▼
┌─────────────────────┐
│  React Component    │
│  - State            │
│  - Event Handlers   │
└──────┬──────────────┘
       │
       │ (2) Call hook
       ▼
┌─────────────────────┐
│  useLineraClient    │
│  - Wrapper          │
│  - State sync       │
└──────┬──────────────┘
       │
       │ (3) Call service
       ▼
┌─────────────────────┐
│ LineraClientService │
│  - Business logic   │
│  - State management │
└──────┬──────────────┘
       │
       │ (4) Call library
       ▼
┌─────────────────────┐
│  @linera/client     │
│  - WebAssembly      │
│  - Network layer    │
└──────┬──────────────┘
       │
       │ (5) Network request
       ▼
┌─────────────────────┐
│  Linera Blockchain  │
│  - Validators       │
│  - State machine    │
└──────┬──────────────┘
       │
       │ (6) Response / Notification
       ▼
┌─────────────────────┐
│  @linera/client     │
│  - Parse response   │
│  - Trigger callbacks│
└──────┬──────────────┘
       │
       │ (7) Return data
       ▼
┌─────────────────────┐
│ LineraClientService │
│  - Process data     │
│  - Update state     │
└──────┬──────────────┘
       │
       │ (8) Update hook state
       ▼
┌─────────────────────┐
│  useLineraClient    │
│  - Trigger re-render│
└──────┬──────────────┘
       │
       │ (9) Re-render
       ▼
┌─────────────────────┐
│  React Component    │
│  - Updated UI       │
└──────┬──────────────┘
       │
       │ (10) Display
       ▼
┌─────────────┐
│   User      │
└─────────────┘
```

## State Management

```
┌────────────────────────────────────────────┐
│      LineraClientState                     │
├────────────────────────────────────────────┤
│  initialized: boolean                      │
│  wallet: Wallet | null                     │
│  client: Client | null                     │
│  chainId: string | null                    │
│  backend: Backend | null                   │
└────────────────────────────────────────────┘
                    │
                    │ Managed by
                    ▼
┌────────────────────────────────────────────┐
│      LineraClientService                   │
├────────────────────────────────────────────┤
│  private state: LineraClientState          │
│  private callbacks: Function[]             │
├────────────────────────────────────────────┤
│  + initialize()                            │
│  + createWallet()                          │
│  + query()                                 │
│  + mutation()                              │
│  + onNotification()                        │
│  + getState()                              │
└────────────────────────────────────────────┘
                    │
                    │ Exposed via
                    ▼
┌────────────────────────────────────────────┐
│      useLineraClient Hook                  │
├────────────────────────────────────────────┤
│  state: LineraClientState                  │
│  loading: boolean                          │
│  error: string | null                      │
├────────────────────────────────────────────┤
│  + initialize()                            │
│  + createWallet()                          │
│  + graphqlQuery()                          │
│  + graphqlMutation()                       │
│  + isReady: boolean                        │
└────────────────────────────────────────────┘
                    │
                    │ Used by
                    ▼
┌────────────────────────────────────────────┐
│      React Components                      │
└────────────────────────────────────────────┘
```

## Error Handling Flow

```
Error Occurs
    │
    ├─→ Network Error
    │       │
    │       ▼
    │   Caught in service
    │       │
    │       ▼
    │   Wrapped with context
    │       │
    │       ▼
    │   Thrown to hook
    │
    ├─→ GraphQL Error
    │       │
    │       ▼
    │   Parsed from response
    │       │
    │       ▼
    │   Thrown to hook
    │
    └─→ WebAssembly Error
            │
            ▼
        Caught in initialize
            │
            ▼
        Thrown to hook
            │
            ▼
┌────────────────────────┐
│  useLineraClient       │
│  - Set error state     │
│  - Set loading = false │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  Component             │
│  - Display error UI    │
│  - Show retry button   │
└────────────────────────┘
```

## Performance Optimization

```
┌─────────────────────────────────────────┐
│  Optimization Strategies                │
├─────────────────────────────────────────┤
│                                         │
│  1. Singleton Service                   │
│     - Single instance                   │
│     - Shared state                      │
│     - No re-initialization              │
│                                         │
│  2. Backend Caching                     │
│     - Cache application backend         │
│     - Reuse for multiple queries        │
│                                         │
│  3. Notification Batching               │
│     - Single listener                   │
│     - Multiple callbacks                │
│     - Efficient event handling          │
│                                         │
│  4. React Optimization                  │
│     - useCallback for functions         │
│     - useMemo for computed values       │
│     - Proper dependency arrays          │
│                                         │
│  5. WebAssembly Caching                 │
│     - Browser caches WASM binary        │
│     - Fast subsequent loads             │
│                                         │
└─────────────────────────────────────────┘
```

## Security Considerations

```
┌─────────────────────────────────────────┐
│  Security Layers                        │
├─────────────────────────────────────────┤
│                                         │
│  1. Wallet Security                     │
│     - Private keys in memory only       │
│     - No logging of sensitive data      │
│     - Secure wallet creation            │
│                                         │
│  2. Network Security                    │
│     - HTTPS for faucet                  │
│     - Validated responses               │
│     - Timeout protection                │
│                                         │
│  3. Input Validation                    │
│     - Sanitize GraphQL queries          │
│     - Validate user input               │
│     - Type checking                     │
│                                         │
│  4. Error Handling                      │
│     - No sensitive data in errors       │
│     - Safe error messages               │
│     - Graceful degradation              │
│                                         │
└─────────────────────────────────────────┘
```

---

**Last Updated**: November 16, 2025
**Version**: 1.0.0
