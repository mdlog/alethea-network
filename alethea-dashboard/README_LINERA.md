# Linera Integration - Quick Reference

## 🚀 Quick Start

```bash
npm run dev
# Open: http://localhost:4000/linera-demo
```

## 📚 Documentation

| File | Description |
|------|-------------|
| [LINERA_QUICKSTART.md](./LINERA_QUICKSTART.md) | Quick start guide - **START HERE** |
| [LINERA_INTEGRATION.md](./LINERA_INTEGRATION.md) | Full technical documentation |
| [INTEGRATION_WITH_ALETHEA.md](./INTEGRATION_WITH_ALETHEA.md) | Integration with Alethea features |

## 📁 Key Files

```
lib/services/linera-client.ts      # Core service
hooks/useLineraClient.ts           # React hooks
components/LineraWalletConnect.tsx # Wallet UI
components/LineraCounterDemo.tsx   # Counter demo
app/linera-demo/page.tsx           # Demo page
```

## 💻 Usage

### Initialize & Connect
```typescript
import { useLineraClient } from '@/hooks/useLineraClient';

const { initialize, createWallet, isReady } = useLineraClient();

useEffect(() => {
  initialize();
}, []);
```

### Query
```typescript
const { graphqlQuery } = useLineraClient();

const result = await graphqlQuery(`
  query { markets { id question } }
`);
```

### Mutation
```typescript
const { graphqlMutation } = useLineraClient();

await graphqlMutation(`
  mutation { 
    createMarket(question: "Test?", outcomes: ["Yes", "No"]) 
  }
`);
```

### Notifications
```typescript
import { useLineraNotifications } from '@/hooks/useLineraClient';

useLineraNotifications((notification) => {
  if (notification.reason?.NewBlock) {
    refreshData();
  }
}, true);
```

## 🔧 Configuration

`.env.local`:
```env
NEXT_PUBLIC_FAUCET_URL=https://faucet.testnet-conway.linera.net
NEXT_PUBLIC_COUNTER_APP_ID=2b1a0df8868206a4b7d6c2fdda911e4355d6c0115b896d4947ef8e535ee3e6b8
NEXT_PUBLIC_REGISTRY_ID=640853a9c9d51e73d0e304d094d19bf5ff693cb16c178f4733312a55d73219f6
```

## ✅ Features

- ✅ WebAssembly integration
- ✅ Wallet management
- ✅ GraphQL query/mutation
- ✅ Real-time notifications
- ✅ React hooks
- ✅ TypeScript support

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| WebAssembly not loading | Check import map in layout.tsx |
| Faucet timeout | Wait and retry |
| Notifications not working | Ensure wallet connected |

## 📖 Learn More

- [Linera Docs](https://linera.dev)
- [Linera Web Tutorial](https://linera.dev/developers/web)

---

**Status**: ✅ Ready for Testing
**Version**: 1.0.0
