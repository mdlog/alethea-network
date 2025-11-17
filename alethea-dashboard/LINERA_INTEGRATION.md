# Linera Integration Documentation

## Overview

Implementasi integrasi Linera client library ke dalam Alethea Dashboard. Integrasi ini memungkinkan dashboard untuk berinteraksi langsung dengan blockchain Linera menggunakan WebAssembly.

## Arsitektur

### 1. Service Layer (`lib/services/linera-client.ts`)

Service utama yang mengelola koneksi dan interaksi dengan Linera:

- **Initialization**: Initialize WebAssembly binary
- **Wallet Management**: Create/load wallet
- **Application Backend**: Connect ke aplikasi Linera
- **Query/Mutation**: Execute GraphQL operations
- **Notifications**: Real-time updates dari blockchain

### 2. React Hooks (`hooks/useLineraClient.ts`)

Custom hooks untuk integrasi dengan React:

- `useLineraClient()`: Main hook untuk Linera operations
- `useLineraNotifications()`: Hook untuk listen notifications

### 3. Components

#### LineraWalletConnect (`components/LineraWalletConnect.tsx`)
- UI untuk connect/create wallet
- Display chain ID dan status
- Load wallet dari JSON

#### LineraCounterDemo (`components/LineraCounterDemo.tsx`)
- Demo counter application
- Real-time updates via notifications
- GraphQL query & mutation examples

### 4. Demo Page (`app/linera-demo/page.tsx`)
- Full demo page dengan wallet connection
- Counter demo
- Feature showcase

## Setup

### 1. Install Dependencies

```bash
npm install @linera/client
```

### 2. Environment Variables

Tambahkan ke `.env.local`:

```env
# Linera Configuration
NEXT_PUBLIC_FAUCET_URL=https://faucet.testnet-conway.linera.net
NEXT_PUBLIC_COUNTER_APP_ID=2b1a0df8868206a4b7d6c2fdda911e4355d6c0115b896d4947ef8e535ee3e6b8
```

### 3. Import Map

Import map sudah ditambahkan di `app/layout.tsx`:

```typescript
<Script
    id="linera-importmap"
    type="importmap"
    strategy="beforeInteractive"
    dangerouslySetInnerHTML={{
        __html: JSON.stringify({
            imports: {
                '@linera/client': './node_modules/@linera/client/dist/linera_web.js'
            }
        })
    }}
/>
```

## Usage

### Basic Usage

```typescript
import { useLineraClient } from '@/hooks/useLineraClient';

function MyComponent() {
  const { 
    initialize, 
    createWallet, 
    graphqlQuery, 
    isReady 
  } = useLineraClient();

  // Initialize
  useEffect(() => {
    initialize();
  }, []);

  // Create wallet
  const handleConnect = async () => {
    const { chainId } = await createWallet();
    console.log('Connected to chain:', chainId);
  };

  // Query
  const fetchData = async () => {
    const result = await graphqlQuery('query { value }');
    console.log(result);
  };

  return (
    <div>
      {!isReady && <button onClick={handleConnect}>Connect</button>}
      {isReady && <button onClick={fetchData}>Fetch Data</button>}
    </div>
  );
}
```

### With Notifications

```typescript
import { useLineraNotifications } from '@/hooks/useLineraClient';

function MyComponent() {
  useLineraNotifications((notification) => {
    if (notification.reason?.NewBlock) {
      console.log('New block!');
      // Refresh data
    }
  }, true);

  return <div>Listening for updates...</div>;
}
```

### GraphQL Operations

```typescript
// Query
const result = await graphqlQuery(`
  query {
    markets {
      id
      question
      status
    }
  }
`);

// Mutation
const result = await graphqlMutation(`
  mutation {
    createMarket(
      question: "Will it rain tomorrow?",
      outcomes: ["Yes", "No"],
      deadline: ${Date.now() + 86400000}
    ) {
      id
      question
    }
  }
`);
```

## Features

### ✅ Implemented

1. **WebAssembly Integration**
   - Automatic initialization
   - Browser-based execution

2. **Wallet Management**
   - Create wallet from faucet
   - Load wallet from JSON
   - Chain ID management

3. **Application Backend**
   - Connect to any Linera application
   - GraphQL query interface
   - Mutation support

4. **Real-time Notifications**
   - Listen for new blocks
   - Listen for messages
   - Automatic state updates

5. **React Integration**
   - Custom hooks
   - Type-safe API
   - Error handling

### 🚧 Future Enhancements

1. **Multi-chain Support**
   - Switch between chains
   - Manage multiple wallets

2. **Transaction History**
   - View past transactions
   - Export history

3. **Advanced Queries**
   - Query builder UI
   - Saved queries

4. **Wallet Persistence**
   - LocalStorage integration
   - Encrypted storage

## API Reference

### LineraClientService

```typescript
class LineraClientService {
  // Initialize WebAssembly
  async initialize(): Promise<void>

  // Create wallet from faucet
  async createWalletFromFaucet(): Promise<{ wallet: any; chainId: string }>

  // Load wallet from JSON
  async loadWalletFromJson(walletJson: string): Promise<void>

  // Get application backend
  async getApplicationBackend(applicationId: string): Promise<any>

  // Execute query
  async query(queryString: string, applicationId?: string): Promise<any>

  // Execute GraphQL query
  async graphqlQuery(query: string, applicationId?: string): Promise<any>

  // Execute GraphQL mutation
  async graphqlMutation(mutation: string, applicationId?: string): Promise<any>

  // Register notification callback
  onNotification(callback: (notification: any) => void): () => void

  // Get current state
  getState(): LineraClientState

  // Check if ready
  isReady(): boolean

  // Reset state
  reset(): void
}
```

### useLineraClient Hook

```typescript
interface UseLineraClientReturn {
  state: LineraClientState;
  initialize: () => Promise<void>;
  createWallet: () => Promise<{ wallet: any; chainId: string }>;
  loadWallet: (walletJson: string) => Promise<void>;
  query: (queryString: string, applicationId?: string) => Promise<any>;
  graphqlQuery: (query: string, applicationId?: string) => Promise<any>;
  graphqlMutation: (mutation: string, applicationId?: string) => Promise<any>;
  isReady: boolean;
  error: string | null;
  loading: boolean;
}
```

## Testing

### Access Demo Page

1. Start development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:4000/linera-demo`

3. Test workflow:
   - Click "Initialize Linera"
   - Click "Create Wallet (Testnet)"
   - Wait for wallet creation
   - Try incrementing the counter
   - Observe real-time updates

## Troubleshooting

### WebAssembly Not Loading

**Problem**: WebAssembly binary fails to load

**Solution**: 
- Check import map configuration
- Verify `@linera/client` package is installed
- Check browser console for errors

### Faucet Connection Failed

**Problem**: Cannot connect to faucet

**Solution**:
- Verify faucet URL is correct
- Check network connectivity
- Try again after a few seconds

### Notifications Not Working

**Problem**: Not receiving real-time updates

**Solution**:
- Ensure wallet is connected
- Check notification callback is registered
- Verify client is initialized

## Best Practices

1. **Always Initialize First**
   ```typescript
   useEffect(() => {
     initialize();
   }, []);
   ```

2. **Handle Errors Gracefully**
   ```typescript
   try {
     await createWallet();
   } catch (error) {
     console.error('Failed:', error);
     // Show user-friendly message
   }
   ```

3. **Clean Up Notifications**
   ```typescript
   useEffect(() => {
     const unsubscribe = lineraClient.onNotification(callback);
     return unsubscribe; // Clean up on unmount
   }, []);
   ```

4. **Check Ready State**
   ```typescript
   if (!isReady) {
     return <div>Please connect wallet first</div>;
   }
   ```

## Resources

- [Linera Documentation](https://linera.dev)
- [Linera Web Tutorial](https://linera.dev/developers/web)
- [GraphQL Documentation](https://graphql.org)
- [WebAssembly Guide](https://webassembly.org)

## Support

Untuk pertanyaan atau issues:
- GitHub: [alethea-docs](https://github.com/mdlog/alethea-docs)
- Discord: Linera Community

---

**Last Updated**: November 16, 2025
**Version**: 1.0.0
