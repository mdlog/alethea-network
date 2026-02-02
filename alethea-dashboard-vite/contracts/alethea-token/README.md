# ALETHEA Token

Native fungible token for the Alethea Oracle Network built on Linera blockchain.

## 🎯 Features

- ✅ **Standard Token Operations**: Transfer, mint, burn with permission checks
- ✅ **Staking Mechanism**: Stake tokens to participate in oracle voting with lock support
- ✅ **Vesting Schedules**: Time-locked token distribution with cliff and linear vesting
- ✅ **Governance System**: Token-weighted voting on protocol decisions
- ✅ **Reward Distribution**: Earn tokens by participating in oracle voting
- ✅ **Cross-Chain Integration**: Native support for Registry V2 integration via messages
- ✅ **GraphQL API**: Complete query interface for all token data

## 📊 Token Specifications

```
Name: Alethea
Symbol: ALTH
Decimals: 18
Initial Supply: 1,000,000,000 ALTH (1 billion)
Max Supply: Unlimited (inflationary, controlled by governance)
```

## 🚀 Quick Start

### Prerequisites

- Rust 1.75+
- Linera CLI installed
- WebAssembly target: `rustup target add wasm32-unknown-unknown`

### Build

```bash
# From alethea-contract directory
cd alethea-token

# Build for wasm32
cargo build --release --target wasm32-unknown-unknown
```

The compiled contracts will be at:
- `../target/wasm32-unknown-unknown/release/alethea-token-contract.wasm`
- `../target/wasm32-unknown-unknown/release/alethea-token-service.wasm`

### Deploy to Local Network

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy to local network
./deploy.sh local
```

### Deploy to Testnet

```bash
# Set your admin wallet
export ADMIN_WALLET=your_wallet_address

# Deploy to Conway testnet
./deploy.sh testnet
```

## 📖 Usage Examples

### Basic Token Operations

#### Query Balance

```graphql
query {
  balance(owner: "your_wallet_address")
}
```

#### Transfer Tokens

```bash
linera project run-operation \
  --json '{
    "Transfer": {
      "owner": "your_wallet_address",
      "to": "recipient_address",
      "amount": "1000000000000000000"
    }
  }'
```

### Staking Operations

#### Stake Tokens

```bash
linera project run-operation \
  --json '{
    "Stake": {
      "owner": "your_wallet_address",
      "amount": "1000000000000000000000"
    }
  }'
```

#### Query Staking Info

```graphql
query {
  stakingInfo(owner: "your_wallet_address") {
    stakedAmount
    canUnstake
    lockReason
    lockedUntil
  }
}
```

#### Unstake Tokens

```bash
linera project run-operation \
  --json '{
    "Unstake": {
      "owner": "your_wallet_address",
      "amount": "500000000000000000000"
    }
  }'
```

### Governance

#### Create Proposal

```bash
linera project run-operation \
  --json '{
    "CreateProposal": {
      "proposer": "your_wallet_address",
      "title": "Increase Minimum Stake",
      "description": "Proposal to increase minimum stake to 1000 ALETHEA",
      "proposal_type": {
        "ParameterChange": {
          "parameter": "min_stake",
          "new_value": "1000000000000000000000"
        }
      },
      "voting_duration": 604800,
      "quorum_percentage": 20
    }
  }'
```

#### Vote on Proposal

```bash
linera project run-operation \
  --json '{
    "VoteOnProposal": {
      "voter": "your_wallet_address",
      "proposal_id": 1,
      "support": true
    }
  }'
```

#### Query Proposal

```graphql
query {
  proposal(id: 1) {
    id
    title
    description
    votesFor
    votesAgainst
    status
    quorumReached
  }
}
```

### Vesting

#### Query Vesting Schedule

```graphql
query {
  vestingSchedule(owner: "beneficiary_address") {
    totalAmount
    releasedAmount
    remainingAmount
    claimableNow
    cliffEnd
    vestingEnd
  }
}
```

#### Claim Vested Tokens

```bash
linera project run-operation \
  --json '{
    "ClaimVested": {
      "owner": "your_wallet_address"
    }
  }'
```

### Rewards

#### Query Pending Rewards

```graphql
query {
  pendingRewards(owner: "your_wallet_address")
}
```

#### Claim Rewards

```bash
linera project run-operation \
  --json '{
    "ClaimRewards": {
      "owner": "your_wallet_address"
    }
  }'
```

## 🔧 Admin Operations

### Mint Tokens (Admin Only)

```bash
linera project run-operation \
  --json '{
    "Mint": {
      "to": "recipient_address",
      "amount": "1000000000000000000000"
    }
  }'
```

### Burn Tokens (Admin Only)

```bash
linera project run-operation \
  --json '{
    "Burn": {
      "from": "holder_address",
      "amount": "500000000000000000000"
    }
  }'
```

### Pause Protocol (Admin Only)

```bash
linera project run-operation --json '{"Pause": {}}'
```

### Unpause Protocol (Admin Only)

```bash
linera project run-operation --json '{"Unpause": {}}'
```

## 📊 GraphQL Queries

### Token Information

```graphql
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
```

### Supply Metrics

```graphql
query {
  supplyMetrics {
    totalSupply
    circulatingSupply
    stakedSupply
    vestedSupply
    burnedSupply
  }
}
```

### Total Staked

```graphql
query {
  totalStaked
}
```

### Total Rewards Distributed

```graphql
query {
  totalRewardsDistributed
}
```

## 🔗 Cross-Chain Integration

ALETHEA Token supports cross-chain messages for integration with other applications:

### Lock Stake (from Registry V2)

```rust
Message::LockStake {
    owner: voter_account,
    amount: stake_amount,
    reason: "Voting on query #123".to_string(),
}
```

### Unlock Stake

```rust
Message::UnlockStake {
    owner: voter_account,
    amount: stake_amount,
}
```

### Credit Reward

```rust
Message::CreditReward {
    recipient: voter_account,
    amount: reward_amount,
}
```

## 🏗️ Architecture

### State Structure

```rust
pub struct AletheaToken {
    // Basic token state
    pub balances: MapView<AccountOwner, Amount>,
    pub total_supply: RegisterView<Amount>,
    
    // Staking state
    pub staked_balances: MapView<AccountOwner, Amount>,
    pub stake_locks: MapView<AccountOwner, StakeLock>,
    
    // Vesting state
    pub vesting_schedules: MapView<AccountOwner, VestingSchedule>,
    
    // Governance state
    pub proposals: MapView<u64, Proposal>,
    pub votes: MapView<(u64, AccountOwner), Vote>,
    
    // Rewards state
    pub pending_rewards: MapView<AccountOwner, Amount>,
    
    // Admin state
    pub admin: RegisterView<Option<AccountOwner>>,
    pub is_paused: RegisterView<bool>,
}
```

### Permission Model

All operations require explicit permission checks:
- `Transfer`, `Stake`, `Unstake` → Requires owner permission
- `Mint`, `Burn`, `Pause`, `Unpause` → Requires admin permission
- `CreateProposal`, `VoteOnProposal` → Requires proposer/voter permission
- `ClaimVested`, `ClaimRewards` → Requires claimer permission

## 🧪 Testing

```bash
# Run unit tests
cargo test

# Run with output
cargo test -- --nocapture
```

## 📝 Development

### Project Structure

```
alethea-token/
├── src/
│   ├── lib.rs          # Module exports
│   ├── state.rs        # State definitions & types
│   ├── contract.rs     # Contract implementation
│   └── service.rs      # GraphQL service
├── Cargo.toml          # Dependencies
├── linera.toml         # Deployment config
├── deploy.sh           # Deployment script
└── README.md           # This file
```

### Adding New Features

1. Update `Operation` enum in `state.rs`
2. Implement handler in `contract.rs`
3. Add GraphQL queries in `service.rs`
4. Update this README with examples

## 🔐 Security Considerations

- All operations use `check_account_permission()` for authentication
- Staking locks prevent unstaking during active votes
- Vesting schedules enforce cliff and linear release
- Admin operations are protected by permission checks
- Protocol can be paused in emergency situations

## 📄 License

MIT OR Apache-2.0

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All tests pass
- Code follows Rust best practices
- Documentation is updated
- Permission checks are in place

## 📞 Support

For issues and questions:
- GitHub Issues: [alethea-contract](https://github.com/mdlog/alethea-contract)
- Documentation: See design.md and requirements.md in `.kiro/specs/alethea-token/`

## 🎯 Roadmap

- [x] Core token functionality
- [x] Staking mechanism
- [x] Vesting schedules
- [x] Governance system
- [x] Reward distribution
- [ ] Dashboard integration
- [ ] Registry V2 integration
- [ ] Advanced governance features
- [ ] Token delegation
- [ ] Snapshot voting

---

Built with ❤️ for the Alethea Oracle Network
