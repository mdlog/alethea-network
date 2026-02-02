# Deploy Simple Market untuk Testing Callback

## 🎯 Tujuan

Deploy Simple Market contract di chain yang sama dengan Oracle Registry terbaru untuk testing callback mechanism.

## 📋 Prerequisites

1. Oracle Registry sudah deployed:
   - App ID: `f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990`
   - Chain ID: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`

2. Linera service berjalan di `http://localhost:8080`

3. Rust toolchain dengan target `wasm32-unknown-unknown`

## 🚀 Deployment Steps

### Step 1: Build Simple Market

```bash
cd alethea-contract
cargo build --release --target wasm32-unknown-unknown -p simple-market
```

Verify WASM files:
```bash
ls -la target/wasm32-unknown-unknown/release/simple_market*.wasm
```

### Step 2: Set Default Chain

Set default chain ke chain Registry:

```bash
linera wallet set-default 9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

Verify:
```bash
linera wallet show
```

### Step 3: Deploy Simple Market

Deploy dengan Registry App ID yang baru:

```bash
cd alethea-contract

REGISTRY_APP_ID="f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990"
REGISTRY_CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"

linera publish-and-create \
  target/wasm32-unknown-unknown/release/simple_market_contract.wasm \
  target/wasm32-unknown-unknown/release/simple_market_service.wasm \
  --json-argument "{\"registry_app_id\":\"$REGISTRY_APP_ID\",\"registry_chain_id\":\"$REGISTRY_CHAIN_ID\",\"use_local_instance\":false}" \
  --required-application-ids "$REGISTRY_APP_ID"
```

**Catat output:**
- `MARKET_APP_ID` = Application ID yang muncul (64 karakter hex)

### Step 4: Update Frontend Configuration

Update `.env.local` di `alethea-market`:

```bash
cd ../alethea-market
```

Edit `.env.local` dan update:

```env
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
VITE_MARKET_APP_ID=<MARKET_APP_ID_DARI_STEP_3>
VITE_REGISTRY_APP_ID=f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990
VITE_REGISTRY_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
```

### Step 5: Verify Deployment

Test GraphQL query:

```bash
MARKET_APP_ID="<MARKET_APP_ID_DARI_STEP_3>"
CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"

curl -s -X POST "http://localhost:8080/chains/$CHAIN_ID/applications/$MARKET_APP_ID" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ markets { id question status } }"}'
```

Should return empty array `[]` (no markets yet) atau list of markets.

## ✅ Verification Checklist

- [ ] Simple Market contract built successfully
- [ ] Simple Market deployed to chain `9d0d233f...`
- [ ] Market App ID obtained
- [ ] `.env.local` updated dengan Market App ID
- [ ] GraphQL query works
- [ ] Frontend bisa connect ke Market contract

## 🔧 Troubleshooting

### Error: "Application ID not found"

**Problem**: Market App ID tidak valid atau chain ID salah.

**Solution**: 
1. Verify Market App ID dari deployment output
2. Verify chain ID sama dengan Registry chain ID
3. Check `.env.local` format (no spaces, no quotes)

### Error: "Registry application not found"

**Problem**: Registry App ID tidak valid atau tidak accessible.

**Solution**:
1. Verify Registry App ID: `f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990`
2. Verify Registry chain ID: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`
3. Test Registry GraphQL endpoint:
   ```bash
   curl -s -X POST "http://localhost:8080/chains/9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec/applications/f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990" \
     -H "Content-Type: application/json" \
     -d '{"query": "{ statistics { totalQueriesCreated } }"}'
   ```

### Error: "Failed to create market"

**Problem**: Market contract tidak bisa connect ke Registry.

**Solution**:
1. Verify `required-application-ids` include Registry App ID
2. Check instantiation argument format
3. Verify Registry contract sudah instantiated

## 📝 Notes

- Simple Market dan Registry harus di **chain yang sama** untuk testing callback
- `use_local_instance: false` karena kita menggunakan cross-chain messaging (bukan call_application)
- Setelah deployment, restart frontend untuk load new configuration

---

**Status**: 📋 Ready for Deployment
