# Alethea Oracle: Hub-and-Spoke Architecture

## Overview

The Alethea Oracle Registry uses a Hub-and-Spoke architecture to enable scalable, trustless oracle resolution across multiple Linera chains.

```
                              ┌─────────────────────────────────┐
                              │         HUB CHAIN               │
                              │      (Alethea Main)             │
                              │                                 │
                              │  ┌───────────────────────────┐  │
                              │  │   Registry (HUB MODE)     │  │
                              │  │                           │  │
                              │  │ - Global voter registry   │  │
                              │  │ - Reputation scores       │  │
                              │  │ - Voting happens HERE     │  │
                              │  │ - Resolution authority    │  │
                              │  └───────────────────────────┘  │
                              └───────────────┬─────────────────┘
                                              │
                     Cross-chain messaging (SAME APP = Registry)
                                              │
          ┌───────────────────────────────────┼───────────────────────────────────┐
          │                                   │                                   │
          ▼                                   ▼                                   ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│    SPOKE CHAIN 1        │     │    SPOKE CHAIN 2        │     │    SPOKE CHAIN 3        │
│   (Market Dev A)        │     │   (Market Dev B)        │     │   (DeFi Dev C)          │
│                         │     │                         │     │                         │
│ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │
│ │Registry (INSTANCE)  │ │     │ │Registry (INSTANCE)  │ │     │ │Registry (INSTANCE)  │ │
│ │                     │ │     │ │                     │ │     │ │                     │ │
│ │- Forwards queries   │ │     │ │- Forwards queries   │ │     │ │- Forwards queries   │ │
│ │- Receives callbacks │ │     │ │- Receives callbacks │ │     │ │- Receives callbacks │ │
│ │- Local cache        │ │     │ │- Local cache        │ │     │ │- Local cache        │ │
│ └──────────┬──────────┘ │     │ └──────────┬──────────┘ │     │ └──────────┬──────────┘ │
│            │            │     │            │            │     │            │            │
│   call_application()    │     │   call_application()    │     │   call_application()    │
│            │            │     │            │            │     │            │            │
│            ▼            │     │            ▼            │     │            ▼            │
│ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │     │ ┌─────────────────────┐ │
│ │   Market App A      │ │     │ │   Market App B      │ │     │ │   Insurance App     │ │
│ │   (different app)   │ │     │ │   (different app)   │ │     │ │   (different app)   │ │
│ └─────────────────────┘ │     │ └─────────────────────┘ │     │ └─────────────────────┘ │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

## Key Concepts

### Hub Mode
- Master registry deployed on Alethea's main chain
- Stores all voters and their reputation
- Processes votes and determines resolution
- Sends resolution callbacks to Instances

### Instance Mode
- Local proxy deployed on developer chains
- Forwards queries to Hub via cross-chain messaging
- Receives resolution callbacks from Hub
- Consumer apps call Instance via `call_application()` (trustless!)

## Why Hub-and-Spoke?

### Linera Constraints
1. **Cross-chain messaging** only works for the **same application** on different chains
2. **Different applications** must be on the **same chain** to use `call_application()`
3. **Deploying to a chain** requires **ownership** of that chain

### Solution
- Registry (same app) can communicate across chains
- Consumer apps (different apps) call local Registry Instance
- Developers don't need access to Alethea chain

## Developer Onboarding

### Step 1: Request Registry Instance
```bash
# Developer requests Registry app on their chain
linera request-application <REGISTRY_APP_ID> --target-chain-id <DEV_CHAIN>
```

This creates a Registry Instance on the developer's chain that:
1. Automatically connects to Hub
2. Forwards queries to Hub
3. Receives resolution callbacks

### Step 2: Deploy Consumer App
```bash
# Deploy your app to YOUR OWN chain
linera publish-and-create \
  market_contract.wasm market_service.wasm \
  --json-argument '{"registry_app_id":"<REGISTRY_INSTANCE_ON_YOUR_CHAIN>"}'
```

### Step 3: Use Oracle
Your app can now call the local Registry Instance via `call_application()`:

```rust
// In your contract
let registry_app_id = self.state.registry_app_id.get();
let response = self.runtime.call_application(
    true,  // authenticated
    registry_app_id,
    &Operation::CreateQuery { ... },
);
```

## Message Flow

### Query Creation
```
Consumer App ──call_application()──► Registry Instance ──cross-chain──► Hub
                                                                         │
                                                                    Create Query
                                                                         │
Consumer App ◄──call_application()── Registry Instance ◄──cross-chain──┘
                                     (QueryCreatedOnHub)
```

### Query Resolution
```
                                            Hub
                                             │
                                        Voters vote
                                             │
                                        Resolution
                                             │
Consumer App ◄──call_application()── Registry Instance ◄──cross-chain──┘
                                     (QueryResolvedFromHub)
```

## Benefits

| Aspect | Benefit |
|--------|---------|
| **Scalability** | Unlimited developer chains |
| **Self-service** | Developers use `request-application` |
| **Trustless** | `call_application()` + cross-chain = fully trustless |
| **Isolation** | Each app isolated, no resource competition |
| **Decentralized** | Voting on Hub, execution distributed |

## Comparison with Alternatives

| Architecture | Trustless | Scalable | Self-service |
|--------------|-----------|----------|--------------|
| Single Chain + Multi-Owner | ✅ | ❌ | ❌ |
| Frontend Orchestration | ❌ | ✅ | ✅ |
| **Hub-and-Spoke** | ✅ | ✅ | ✅ |

## Current Deployment

### Hub (Alethea Chain)
- Chain ID: `36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2`
- Registry App ID: `d7179163b28ee5d94087fcfc0208191c6451381cf0003325190a0cd461a30c47`

### Instantiation Arguments

**For Hub:**
```json
"Hub"
```

**For Instance:**
```json
{
  "Instance": {
    "hub_chain_id": "36dd869563b74586a953019006de56c838fae5731af5cd6fb0d660eca634a6e2"
  }
}
```

## Deployment Script

Use the automated deployment script:

```bash
cd alethea-contract
./scripts/deploy-hub-and-spoke.sh
```

This script will:
1. Deploy Registry as Hub on your default chain
2. Create a new developer chain
3. Request Registry Instance on developer chain
4. Deploy Simple Market with Hub-and-Spoke mode

## Manual Deployment

### Step 1: Deploy Registry as Hub

```bash
# Build
cargo build --release --target wasm32-unknown-unknown -p oracle-registry-v2

# Deploy as Hub
linera publish-and-create \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm \
  --json-argument '"Hub"'
```

### Step 2: Request Instance on Developer Chain

```bash
# Developer requests Registry Instance on their chain
linera request-application <HUB_APP_ID> --target-chain-id <DEV_CHAIN_ID>
```

### Step 3: Deploy Market with Hub-and-Spoke Mode

```bash
# Build
cargo build --release --target wasm32-unknown-unknown -p simple-market

# Deploy with use_local_instance=true
linera publish-and-create \
  target/wasm32-unknown-unknown/release/simple_market_contract.wasm \
  target/wasm32-unknown-unknown/release/simple_market_service.wasm \
  --json-argument '{
    "registry_app_id": "<INSTANCE_APP_ID>",
    "registry_chain_id": "<DEV_CHAIN_ID>",
    "use_local_instance": true
  }'
```

## Simple Market Integration Modes

The Simple Market supports two integration modes:

### 1. Hub-and-Spoke Mode (Recommended)

```json
{
  "registry_app_id": "<INSTANCE_APP_ID>",
  "registry_chain_id": "<DEV_CHAIN_ID>",
  "use_local_instance": true
}
```

- Market calls local Registry Instance via `call_application()`
- Instance forwards to Hub automatically
- Fully trustless, on-chain verification

### 2. Legacy Cross-Chain Mode

```json
{
  "registry_app_id": "<HUB_APP_ID>",
  "registry_chain_id": "<HUB_CHAIN_ID>",
  "use_local_instance": false
}
```

- Market sends cross-chain messages directly to Hub
- Requires Hub chain ID configuration
- Works but less elegant than Hub-and-Spoke
