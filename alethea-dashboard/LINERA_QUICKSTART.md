# Linera Integration - Quick Start

## 🚀 Quick Start

### 1. Install Package

Package `@linera/client` sudah terinstall. Jika belum:

```bash
npm install @linera/client
```

### 2. Start Dashboard

```bash
npm run dev
```

### 3. Access Demo

Buka browser: `http://localhost:4000/linera-demo`

### 4. Test Flow

1. **Initialize Linera**
   - Click tombol "Initialize Linera"
   - Wait for WebAssembly to load

2. **Create Wallet**
   - Click "Create Wallet (Testnet)"
   - Wallet akan dibuat via faucet
   - Chain ID akan ditampilkan

3. **Test Counter**
   - Counter demo akan aktif setelah wallet connected
   - Click "+ Increment" untuk menambah counter
   - Perhatikan update real-time via notifications

## 📁 File Structure

```
alethea-dashboard/
├── lib/
│   └── services/
│       └── linera-client.ts          # Service utama
├── hooks/
│   └── useLineraClient.ts            # React hooks
├── components/
│   ├── LineraWalletConnect.tsx       # Wallet UI
│   └── LineraCounterDemo.tsx         # Counter demo
├── app/
│   ├── layout.tsx                    # Import map setup
│   └── linera-demo/
│       └── page.tsx                  # Demo page
└── LINERA_INTEGRATION.md             # Full documentation
```

## 🔧 Configuration

Environment variables di `.env.local`:

```env
NEXT_PUBLIC_FAUCET_URL=https://faucet.testnet-conway.linera.net
NEXT_PUBLIC_COUNTER_APP_ID=2b1a0df8868206a4b7d6c2fdda911e4355d6c0115b896d4947ef8e535ee3e6b8
```

## 💡 Usage Example

```typescript
import { useLineraClient } from '@/hooks/useLineraClient';

function MyComponent() {
  const { initialize, createWallet, graphqlQuery, isReady } = useLineraClient();

  useEffect(() => {
    initialize();
  }, []);

  const connect = async () => {
    const { chainId } = await createWallet();
    console.log('Connected:', chainId);
  };

  return (
    <button onClick={connect} disabled={!isReady}>
      Connect Wallet
    </button>
  );
}
```

## 🎯 Key Features

- ✅ WebAssembly integration
- ✅ Wallet management (create/load)
- ✅ GraphQL query & mutation
- ✅ Real-time notifications
- ✅ React hooks
- ✅ TypeScript support

## 📚 Documentation

Lihat [LINERA_INTEGRATION.md](./LINERA_INTEGRATION.md) untuk dokumentasi lengkap.

## 🐛 Troubleshooting

### WebAssembly tidak load
- Check browser console
- Verify import map di layout.tsx
- Refresh page

### Faucet timeout
- Check network connection
- Try again setelah beberapa detik
- Verify faucet URL

### Notifications tidak bekerja
- Ensure wallet connected
- Check browser console
- Verify client initialized

## 🔗 Resources

- [Linera Docs](https://linera.dev)
- [Linera Web Tutorial](https://linera.dev/developers/web)
- [GitHub Repo](https://github.com/mdlog/alethea-docs)

---

**Ready to test!** 🎉
