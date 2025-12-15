# Alethea Token Integration

Dashboard ini telah diintegrasikan penuh dengan `alethea-token` contract untuk mendukung semua fitur token termasuk stake, claim rewards, withdraw, treasury, dan slashing.

## Fitur yang Terintegrasi

### 1. Token Balance
- Menampilkan balance token user di header (compact view)
- Halaman Token dengan detail lengkap

### 2. Stake Management
- **Add Stake**: Menambah stake untuk meningkatkan voting weight
- **Withdraw Stake**: Menarik stake yang tidak terkunci
- **Locked Stake**: Menampilkan stake yang terkunci karena active votes

### 3. Rewards
- **Claim Rewards**: Klaim reward dari voting yang benar
- **Pending Rewards**: Menampilkan reward yang tersedia untuk diklaim
- **Reward Pool**: Info total reward pool protocol

### 4. Treasury
- **Protocol Treasury**: Total dana treasury protocol
- **Reward Pool Balance**: Dana yang tersedia untuk rewards
- **Total Distributed**: Total rewards yang sudah didistribusikan
- **Total Staked**: Total stake dari semua voters

### 5. Slashing
- **Risk Level**: Indikator risiko slashing (Low/Medium/High)
- **Potential Slash**: Estimasi jumlah yang bisa di-slash
- **Slashing Rules**: Penjelasan aturan slashing

### 6. Token Transfer
- Transfer token ke address lain
- Quick amount buttons
- Max button untuk transfer semua balance

## Konfigurasi

Tambahkan environment variables berikut di `.env.local`:

```env
# Token Configuration
VITE_TOKEN_APP_ID=<your-token-app-id>
VITE_TOKEN_CHAIN_ID=<token-chain-id>
```

## Komponen Baru

| Komponen | Lokasi | Deskripsi |
|----------|--------|-----------|
| `TokenContext` | `src/contexts/TokenContext.tsx` | Context untuk token operations |
| `TokenBalance` | `src/components/TokenBalance.tsx` | Menampilkan balance token |
| `ClaimRewards` | `src/components/ClaimRewards.tsx` | UI untuk claim rewards |
| `WithdrawStake` | `src/components/WithdrawStake.tsx` | UI untuk withdraw stake |
| `TreasuryInfo` | `src/components/TreasuryInfo.tsx` | Info treasury protocol |
| `TransferToken` | `src/components/TransferToken.tsx` | Transfer token |
| `SlashingInfo` | `src/components/SlashingInfo.tsx` | Info slashing risk |
| `TokenPage` | `src/pages/TokenPage.tsx` | Halaman token lengkap |

## Routes

| Path | Halaman | Deskripsi |
|------|---------|-----------|
| `/` | HomePage | Dashboard utama |
| `/voters` | VotersPage | Daftar voters |
| `/queries` | QueriesPage | Daftar queries |
| `/profile` | ProfilePage | Profile user dengan stake/rewards/slashing |
| `/token` | TokenPage | Halaman token management |

## GraphQL Queries

### Token Contract
```graphql
# Get token info
query {
    tokenInfo {
        name
        symbol
        decimals
        totalSupply
        totalMinted
        totalBurned
    }
}

# Get balance
query {
    balance(owner: "chain-id")
}
```

### Registry Contract
```graphql
# Get statistics
query {
    statistics {
        protocolTreasury
        rewardPoolBalance
        totalRewardsDistributed
        totalStake
    }
}

# Claim rewards
mutation {
    claimRewards
}

# Withdraw stake
mutation {
    withdrawStake(amount: "100")
}
```

## Alur Integrasi

1. User connect wallet → Chain ID tersimpan
2. Dashboard load token balance dari token contract
3. Dashboard load voter profile dari registry contract
4. User bisa:
   - Add stake (transfer token ke registry)
   - Withdraw stake (tarik dari registry)
   - Claim rewards (dari registry)
   - Transfer token (langsung di token contract)
   - Lihat slashing risk

## Catatan Teknis

- Token balance di-query langsung ke token contract via HTTP
- Stake operations di-handle oleh registry contract
- Rewards dihitung berdasarkan correct votes
- Slashing risk dihitung berdasarkan accuracy percentage
