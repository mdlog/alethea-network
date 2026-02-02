# Cross-Chain Messaging Flow: Alethea Market → Registry

## Yang Berkomunikasi dalam Cross-Chain Messaging

### **Pertanyaan**: Apakah yang berkomunikasi adalah App ID Market dengan Chain ID Registry?

**Jawaban**: **Ya, tapi lebih tepatnya:**

1. **Sender**: Market contract instance (dengan **Market App ID**) di **Market Chain**
2. **Target**: **Registry Chain** (menggunakan **Registry Chain ID**)
3. **Receiver**: Registry contract instance (dengan **Registry App ID**) di **Registry Chain**

### Penjelasan Detail

#### 1. **Chain ID untuk Mengirim Message ke Registry**

**Chain ID**: `registry_chain_id` yang disimpan di state contract Simple Market

**Sumber**: Di-set saat instantiation contract dari parameter deployment

**Lokasi di Code**:
```rust
// Di contract.rs line 499-502
let registry_chain_id = match *self.state.registry_chain_id.get() {
    Some(id) => id,
    None => panic!("Registry chain ID not configured"),
};

// Message dikirim ke chain ini (line 552)
self.runtime
    .prepare_message(message)
    .with_authentication()
    .with_tracking()
    .send_to(registry_chain_id);  // ← Chain ID yang digunakan
```

**Yang terjadi**:
- Market contract (di Market chain) mengirim message ke **Registry Chain** (Chain ID)
- Message type: `Message::OracleRequest` (shared message type)
- Linera akan route message ke Registry contract di Registry chain karena Registry contract memiliki handler untuk `Message::OracleRequest`

#### 2. **Chain ID untuk Callback dari Registry**

**Chain ID**: `callback_chain` = chain ID dari Simple Market contract itu sendiri

**Lokasi di Code**:
```rust
// Di contract.rs line 508
let callback_chain = self.runtime.chain_id();  // Chain ID dari market contract
```

**Yang terjadi**:
- Registry contract (di Registry chain) mengirim callback ke **Market Chain** (Chain ID)
- Message type: `Message::OracleCallback` (shared message type)
- Linera akan route callback ke Market contract di Market chain karena Market contract memiliki handler untuk `Message::OracleCallback`

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  SIMPLE MARKET CONTRACT                                     │
│  App ID: <MARKET_APP_ID>                                    │
│  Chain ID: <MARKET_CHAIN_ID>                                │
│  (contoh: 9d0d233f813d271ff282485ba47d344995d36b9d06c40...) │
│                                                             │
│  State:                                                     │
│  - registry_chain_id: <REGISTRY_CHAIN_ID>  ← Dari instantiation
│  - registry_app_id: <REGISTRY_APP_ID>                      │
│                                                             │
│  request_resolution(market_id) {                            │
│    registry_chain_id = state.registry_chain_id.get()        │
│    callback_chain = runtime.chain_id()  ← Chain market sendiri
│    callback_app = runtime.application_id()  ← App ID market sendiri
│                                                             │
│    message = OracleRequest {                                │
│      callback_chain: <MARKET_CHAIN_ID>,  ← Untuk callback   │
│      callback_app: <MARKET_APP_ID>,      ← Untuk callback   │
│      ...                                                     │
│    }                                                         │
│                                                             │
│    // Mengirim dari Market App ID ke Registry Chain ID       │
│    send_to(registry_chain_id)  ← Kirim ke Registry chain   │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Cross-chain message
                        │ From: Market App ID (Market Chain)
                        │ To: Registry Chain ID
                        │ Message Type: Message::OracleRequest
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  ORACLE REGISTRY CONTRACT                                    │
│  App ID: <REGISTRY_APP_ID>                                  │
│  Chain ID: <REGISTRY_CHAIN_ID>                              │
│  (contoh: 9d0d233f813d271ff282485ba47d344995d36b9d06c40...) │
│                                                             │
│  execute_message(message: Message::OracleRequest) {         │
│    // Linera route message ke Registry karena               │
│    // Registry memiliki handler untuk Message::OracleRequest │
│                                                             │
│    handle_create_query_from_market(message) {               │
│      // Process query creation                              │
│      // ... voting happens here ...                         │
│                                                             │
│      // After resolution, send callback:                    │
│      callback = OracleCallback {                            │
│        request_id: market_id,                               │
│        result: winning_outcome,                             │
│        ...                                                   │
│      }                                                       │
│                                                             │
│      // Mengirim dari Registry App ID ke Market Chain ID    │
│      send_to(callback_chain)  ← Kirim kembali ke Market chain │
│    }                                                         │
│  }                                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Cross-chain callback
                        │ From: Registry App ID (Registry Chain)
                        │ To: Market Chain ID
                        │ Message Type: Message::OracleCallback
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  SIMPLE MARKET CONTRACT                                      │
│  App ID: <MARKET_APP_ID>                                    │
│  Chain ID: <MARKET_CHAIN_ID>                                │
│                                                             │
│  execute_message(message: Message::OracleCallback) {        │
│    // Linera route callback ke Market karena                │
│    // Market memiliki handler untuk Message::OracleCallback │
│                                                             │
│    handle_oracle_callback(callback) {                       │
│      // Update market status                                │
│      // Enable payouts                                       │
│    }                                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Bagaimana Linera Route Message?

### 1. **Message Routing Mechanism**

Di Linera, ketika mengirim cross-chain message:

1. **Sender**: Market contract (Market App ID) di Market Chain mengirim message
2. **Target**: Message dikirim ke **Registry Chain** (Registry Chain ID)
3. **Routing**: Linera akan route message ke aplikasi di Registry Chain yang memiliki **Message type yang sesuai**

### 2. **Shared Message Types**

Market dan Registry menggunakan **shared message types** dari `alethea-oracle-messages`:

- `Message::OracleRequest` - untuk request dari Market ke Registry
- `Message::OracleCallback` - untuk callback dari Registry ke Market

Karena menggunakan shared types, Linera dapat route message dengan benar:
- `Message::OracleRequest` → diterima oleh Registry contract (karena Registry memiliki handler)
- `Message::OracleCallback` → diterima oleh Market contract (karena Market memiliki handler)

### 3. **App ID vs Chain ID**

- **App ID**: Mengidentifikasi aplikasi (contract) di seluruh Linera network
- **Chain ID**: Mengidentifikasi chain (blockchain) di Linera network
- **Cross-chain messaging**: Menggunakan **Chain ID** sebagai target, tapi message akan diterima oleh aplikasi dengan **Message type yang sesuai** di chain tersebut

## Konfigurasi Saat Deployment

### Instantiation Argument Format

```json
{
  "registry_app_id": "<REGISTRY_APP_ID>",
  "registry_chain_id": "<REGISTRY_CHAIN_ID>",  ← Chain ID untuk mengirim message
  "use_local_instance": false
}
```

### Contoh dari Script Deployment

```bash
# Dari rebuild-and-redeploy-market.sh
REGISTRY_CHAIN_ID="9d0d233f813d271ff282485ba47d344995d36b9d06c40fed7d6cf55ab9e95fec"
REGISTRY_APP_ID="f51da82d9521ae359becc31fbf09b8a2020b6237e760c5a6d565610965103990"

INIT_ARG="{\"registry_app_id\":\"$REGISTRY_APP_ID\",\"registry_chain_id\":\"$REGISTRY_CHAIN_ID\",\"use_local_instance\":\"true\"}"
```

## Catatan Penting

1. **Yang Berkomunikasi**:
   - **Sender**: Market contract (Market App ID) di Market Chain
   - **Target**: Registry Chain (Registry Chain ID)
   - **Receiver**: Registry contract (Registry App ID) di Registry Chain

2. **Chain ID untuk Mengirim**: `registry_chain_id` dari state contract (di-set saat instantiation)

3. **Chain ID untuk Callback**: `callback_chain` = chain ID dari market contract sendiri (`runtime.chain_id()`)

4. **Message Routing**: Linera route message berdasarkan **Message type**, bukan App ID. Karena Market dan Registry menggunakan shared message types, routing bekerja dengan benar.

5. **Kedua Chain Bisa Sama**: Jika Market dan Registry di chain yang sama, `registry_chain_id` = `callback_chain`

6. **Kedua Chain Bisa Berbeda**: Jika Market dan Registry di chain berbeda, message akan dikirim cross-chain

## Kesimpulan

**Pertanyaan**: Apakah yang berkomunikasi adalah App ID Market dengan Chain ID Registry?

**Jawaban**: **Ya, tepatnya:**
- **Market contract** (Market App ID) di **Market Chain** mengirim message ke **Registry Chain** (Registry Chain ID)
- Message diterima oleh **Registry contract** (Registry App ID) di **Registry Chain**
- Routing dilakukan berdasarkan **Message type** (shared types), bukan App ID

## Verifikasi Chain ID yang Digunakan

Untuk melihat chain ID yang digunakan oleh contract yang sudah deployed:

```bash
# Query market contract untuk melihat state
# (perlu implementasi query di service layer)
```

Atau cek dari deployment script yang digunakan:
- `alethea-contract/scripts/rebuild-and-redeploy-market.sh` (line 27)
- `alethea-market/.env.local` (line 16) - hanya untuk frontend reference

## Troubleshooting

**Problem**: Message tidak sampai ke Registry

**Kemungkinan Penyebab**:
1. `registry_chain_id` salah saat instantiation
2. Registry chain tidak aktif atau tidak sync
3. Message stuck di inbox (perlu `linera process-inbox`)

**Solusi**:
1. Verifikasi `registry_chain_id` di deployment script
2. Cek status Registry chain: `linera service status`
3. Process inbox manual: `linera process-inbox --with-chain-id <REGISTRY_CHAIN_ID>`
