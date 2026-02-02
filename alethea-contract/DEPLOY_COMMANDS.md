# Command Deployment Manual - Mengikuti DEPLOYMENT_SUCCESS_FACTORS.md

## 📋 Prerequisites
- Wallet sudah dikonfigurasi untuk Conway testnet
- Chain dengan owner sudah tersedia
- Build contracts sudah selesai

---

## 🔧 Step-by-Step Commands

### Step 1: Build Contracts
```bash
cd /media/mdlog/mdlog/Project-MDlabs/alethea-network/alethea-contract
cargo build --release --target wasm32-unknown-unknown
```

**Verifikasi:**
```bash
ls -lh target/wasm32-unknown-unknown/release/alethea-token-contract.wasm
ls -lh target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm
```

---

### Step 2: Get Default Chain & Owner
```bash
linera wallet show | grep -A 5 "AccountOwner"
```

**Catat:**
- Chain ID: `9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec`
- Owner: `0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7`

---

### Step 3: Publish Token Module (Step 1/2)
```bash
linera publish-module \
    target/wasm32-unknown-unknown/release/alethea-token-contract.wasm \
    target/wasm32-unknown-unknown/release/alethea-token-service.wasm
```

**Output yang dicari:**
- Module ID (130 karakter hex) - contoh: `abc123...xyz789`

**Simpan Module ID:**
```bash
TOKEN_MODULE_ID="<MODULE_ID_DARI_OUTPUT>"
```

**Tunggu 10 detik untuk blob replication:**
```bash
sleep 10
```

---

### Step 4: Create Token Application (Step 2/2)

**Siapkan init JSON:**
```bash
cat > /tmp/token_init.json <<EOF
{
    "accounts": {
        "0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7": "1000000000."
    },
    "admin": "0xf53bade3e76939a3ede4a22993d877fdbabe5394b98a6b83cdfbac9f317e6ca7"
}
EOF
```

**Siapkan params JSON:**
```bash
cat > /tmp/token_params.json <<EOF
{
    "name": "Alethea",
    "symbol": "ALTH",
    "decimals": 18,
    "registry_app_id": null,
    "min_stake_amount": "100.",
    "max_stake_amount": "10000000.",
    "max_stake_per_user": "1000000."
}
EOF
```

**Create Application:**
```bash
linera create-application \
    "$TOKEN_MODULE_ID" \
    --json-parameters "$(cat /tmp/token_params.json)" \
    --json-argument "$(cat /tmp/token_init.json)"
```

**Simpan Application ID:**
```bash
TOKEN_APP_ID="<APP_ID_DARI_OUTPUT>"  # 64 karakter hex
```

---

### Step 5: Publish Registry Module (Step 1/2)
```bash
linera publish-module \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
    target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm
```

**Simpan Module ID:**
```bash
REGISTRY_MODULE_ID="<MODULE_ID_DARI_OUTPUT>"
```

**Tunggu 10 detik:**
```bash
sleep 10
```

---

### Step 6: Create Registry Application (Step 2/2)

**PENTING: Format init argument sesuai enum variant:**
```bash
linera create-application \
    "$REGISTRY_MODULE_ID" \
    --json-argument '"Hub"'
```

**Catatan:** 
- Gunakan `'"Hub"'` (string literal dengan quotes ganda)
- Bukan `'{"Hub": null}'` atau `'Hub'` tanpa quotes

**Simpan Application ID:**
```bash
REGISTRY_APP_ID="<APP_ID_DARI_OUTPUT>"
```

---

### Step 7: Sync & Process Inbox (CRITICAL!)

**Stop service jika running:**
```bash
pkill -f "linera service" || true
sleep 2
```

**Sync chain:**
```bash
linera sync
```

**Process inbox (memproses instantiation message):**
```bash
linera process-inbox
```

**Verifikasi output:**
- Harus ada pesan "Processed incoming messages" atau "0 blocks" (sudah diproses)

---

### Step 8: Verify Deployment

**Start service:**
```bash
linera service --port 8080 > /tmp/linera-service.log 2>&1 &
sleep 5
```

**Check Token Application:**
```bash
linera application info "$TOKEN_APP_ID"
```

**Check Registry Application:**
```bash
linera application info "$REGISTRY_APP_ID"
```

**Test GraphQL Query (jika service running):**
```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { parameters { minStake } }"
  }'
```

**Expected:** Tidak ada error `BcsError(Eof)` atau `RuntimeError: unreachable`

---

## 📝 Update Environment Variables

**Update `.env.local` di dashboard:**
```bash
cd /media/mdlog/mdlog/Project-MDlabs/alethea-network/alethea-dashboard-vite

cat > .env.local <<EOF
VITE_TOKEN_APP_ID=$TOKEN_APP_ID
VITE_REGISTRY_APP_ID=$REGISTRY_APP_ID
VITE_CHAIN_ID=9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec
VITE_LINERA_RPC=https://rpc.testnet-conway.linera.net
VITE_NETWORK=Conway Testnet
EOF
```

---

## 🔍 Troubleshooting

### Error: "Round number should be MultiLeader(1)"
**Solusi:** Testnet Conway sedang tidak stabil. Tunggu beberapa menit dan coba lagi.

### Error: "BcsError(Eof)" setelah deployment
**Solusi:** 
1. Pastikan `process-inbox` sudah dijalankan
2. Pastikan `state.save()` ada di `contract.rs` setelah `instantiate()`
3. Pastikan format init argument benar: `'"Hub"'`

### Error: "Blob not found ApplicationDescription"
**Solusi:**
1. Gunakan 2-step deployment (publish-module dulu, baru create-application)
2. Tunggu 10 detik setelah publish-module
3. Jangan gunakan `publish-and-create` di testnet

### Error: "Failed to deserialize instantiation argument"
**Solusi:**
- Pastikan format: `'"Hub"'` untuk enum variant `Hub`
- Bukan `'{"Hub": null}'` atau `'Hub'`

---

## ✅ Checklist Deployment

- [ ] Build berhasil tanpa error
- [ ] Module ID Token berhasil di-extract (130 chars)
- [ ] Delay 10 detik setelah publish Token module
- [ ] Application ID Token berhasil di-extract (64 chars)
- [ ] Module ID Registry berhasil di-extract (130 chars)
- [ ] Delay 10 detik setelah publish Registry module
- [ ] Application ID Registry berhasil di-extract (64 chars)
- [ ] Init argument format benar: `'"Hub"'`
- [ ] Service di-stop sebelum sync
- [ ] `linera sync` berhasil
- [ ] `linera process-inbox` berhasil
- [ ] Service di-start kembali
- [ ] GraphQL query berhasil (tidak ada BcsError)
- [ ] Environment variables di-update

---

## 📚 Referensi

- [DEPLOYMENT_SUCCESS_FACTORS.md](./docs/DEPLOYMENT_SUCCESS_FACTORS.md)
- [deploy-2step-stable.sh](./scripts/deploy-2step-stable.sh)
