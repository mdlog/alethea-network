# Alethea Network - Correct Architecture Design
## Dispute Resolution Oracle Protocol

**Version:** 2.0 (Corrected)
**Date:** November 17, 2025

---

## 🎯 Core Identity

**Alethea Network adalah Dispute Resolution Oracle Protocol yang dibangun di Linera blockchain.**

### What Alethea IS
✅ **Oracle Resolution Layer** - Provides resolution service for any DApp
✅ **Voter Registry** - Manages registered voters with stake and reputation
✅ **Vote Aggregation Engine** - Collects and aggregates votes using multiple strategies
✅ **Incentive System** - Rewards accurate voters, penalizes dishonest ones

### What Alethea IS NOT
❌ **Prediction Market Platform** - Does not create or manage markets
❌ **Trading Platform** - Does not handle trading or liquidity
❌ **Settlement System** - DApps handle their own settlement

---

## 🏗️ Complete Architecture


```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ECOSYSTEM LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Prediction   │  │   Insurance  │  │    Sports    │  │   Gaming   │ │
│  │   Market     │  │     DApp     │  │   Betting    │  │    DApp    │ │
│  │    DApp      │  │              │  │     DApp     │  │            │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                 │                 │                 │         │
│         └─────────────────┴─────────────────┴─────────────────┘         │
│                                   │                                     │
│                    Resolution Request Interface                         │
└───────────────────────────────────┼──────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      ALETHEA NETWORK CORE                                │
│                  (Dispute Resolution Oracle)                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    VOTER REGISTRY                               │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │  Voter Selection Algorithm                                │  │    │
│  │  │  - Based on Stake Power                                   │  │    │
│  │  │  - Based on Reputation Score                              │  │    │
│  │  │  - Weighted Selection (Stake × Reputation)                │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  │                                                                 │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ Voter A  │  │ Voter B  │  │ Voter C  │  │ Voter D  │      │    │
│  │  │──────────│  │──────────│  │──────────│  │──────────│      │    │
│  │  │Stake:    │  │Stake:    │  │Stake:    │  │Stake:    │      │    │
│  │  │ 10,000   │  │ 5,000    │  │ 15,000   │  │ 8,000    │      │    │
│  │  │Rep: 85   │  │Rep: 70   │  │Rep: 92   │  │Rep: 78   │      │    │
│  │  │Power:    │  │Power:    │  │Power:    │  │Power:    │      │    │
│  │  │ 850k     │  │ 350k     │  │ 1,380k   │  │ 624k     │      │    │
│  │  │Tier:     │  │Tier:     │  │Tier:     │  │Tier:     │      │    │
│  │  │ Expert   │  │ Inter.   │  │ Master   │  │ Expert   │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                   │                                     │
│                                   ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  RESOLUTION ENGINE                               │   │
│  │                                                                  │   │
│  │  1. Query Reception                                             │   │
│  │     ├─ Receive resolution request from DApp                     │   │
│  │     ├─ Validate query parameters                                │   │
│  │     └─ Create resolution session                                │   │
│  │                                                                  │   │
│  │  2. Voter Selection                                             │   │
│  │     ├─ Calculate voter power (Stake × Reputation)               │   │
│  │     ├─ Select top N voters based on power                       │   │
│  │     ├─ Notify selected voters                                   │   │
│  │     └─ Set voting deadline                                      │   │
│  │                                                                  │   │
│  │  3. Vote Collection                                             │   │
│  │     ├─ Collect votes from selected voters                       │   │
│  │     ├─ Validate vote submissions                                │   │
│  │     ├─ Record votes on-chain                                    │   │
│  │     └─ Track voting participation                               │   │
│  │                                                                  │   │
│  │  4. Vote Aggregation                                            │   │
│  │     ├─ Apply resolution strategy:                               │   │
│  │     │   • Majority: Most common answer                          │   │
│  │     │   • Median: Middle value (for numbers)                    │   │
│  │     │   • Weighted: By stake power                              │   │
│  │     │   • Reputation-Weighted: By reputation score              │   │
│  │     ├─ Calculate confidence score                               │   │
│  │     └─ Determine final result                                   │   │
│  │                                                                  │   │
│  │  5. Result Publication                                          │   │
│  │     ├─ Publish result on-chain                                  │   │
│  │     ├─ Notify requesting DApp                                   │   │
│  │     └─ Make result publicly queryable                           │   │
│  │                                                                  │   │
│  │  6. Reward Distribution                                         │   │
│  │     ├─ Identify correct voters                                  │   │
│  │     ├─ Calculate reward shares                                  │   │
│  │     ├─ Distribute rewards from pool                             │   │
│  │     └─ Update voter reputations                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
                         ┌─────────────────┐
                         │  Resolution     │
                         │    Result       │
                         │  + Confidence   │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   DApp Uses     │
                         │   Result to     │
                         │   Settle        │
                         └─────────────────┘
```


---

## 🔑 Key Components Detail

### 1. Voter Registry System

**Purpose:** Manage registered voters with stake and reputation tracking

**Voter Power Calculation:**
```
Voter Power = Stake Amount × Reputation Score

Example:
- Voter A: 10,000 tokens × 85 reputation = 850,000 power
- Voter B: 5,000 tokens × 70 reputation = 350,000 power
- Voter C: 15,000 tokens × 92 reputation = 1,380,000 power
```

**Reputation Tiers:**
```
Tier          | Reputation | Vote Weight Multiplier
--------------|------------|----------------------
Novice        | 0-25       | 0.5x
Intermediate  | 26-50      | 1.0x
Expert        | 51-75      | 1.5x
Master        | 76-100     | 2.0x
```

**Voter Selection Algorithm:**
```rust
pub fn select_voters(
    query_id: u64,
    min_voters: u32,
    max_voters: u32,
) -> Vec<VoterId> {
    // 1. Get all active voters
    let active_voters = get_active_voters();
    
    // 2. Calculate power for each voter
    let mut voter_powers: Vec<(VoterId, u128)> = active_voters
        .iter()
        .map(|v| (v.id, v.stake * v.reputation as u128))
        .collect();
    
    // 3. Sort by power (descending)
    voter_powers.sort_by(|a, b| b.1.cmp(&a.1));
    
    // 4. Select top N voters
    voter_powers
        .iter()
        .take(max_voters as usize)
        .map(|(id, _)| *id)
        .collect()
}
```

**Registration Requirements:**
- Minimum stake: 100 tokens (configurable)
- Valid account address
- Optional: name, metadata URL
- Stake locked until unregistration

**Reputation Updates:**
```rust
pub fn update_reputation(
    voter_id: VoterId,
    vote_correct: bool,
    query_importance: u32,
) {
    let current_rep = get_reputation(voter_id);
    
    if vote_correct {
        // Increase reputation (max 100)
        let increase = query_importance / 10;
        set_reputation(voter_id, min(100, current_rep + increase));
    } else {
        // Decrease reputation (min 0)
        let decrease = query_importance / 5;
        set_reputation(voter_id, max(0, current_rep - decrease));
    }
}
```

### 2. Resolution Engine

**Query Structure:**
```rust
pub struct ResolutionQuery {
    pub id: u64,
    pub requester: AccountOwner,
    pub question: String,
    pub outcomes: Vec<String>,
    pub strategy: ResolutionStrategy,
    pub min_votes: u32,
    pub reward_pool: Amount,
    pub voting_deadline: Timestamp,
    pub resolution_deadline: Timestamp,
    pub status: QueryStatus,
}
```

**Resolution Strategies:**

1. **Majority Voting**
```rust
pub fn resolve_majority(votes: Vec<Vote>) -> String {
    let mut counts: HashMap<String, u32> = HashMap::new();
    for vote in votes {
        *counts.entry(vote.answer).or_insert(0) += 1;
    }
    counts.into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(answer, _)| answer)
        .unwrap()
}
```

2. **Weighted by Stake**
```rust
pub fn resolve_weighted_stake(votes: Vec<Vote>) -> String {
    let mut weighted: HashMap<String, u128> = HashMap::new();
    for vote in votes {
        let voter = get_voter(vote.voter_id);
        *weighted.entry(vote.answer).or_insert(0) += voter.stake;
    }
    weighted.into_iter()
        .max_by_key(|(_, weight)| *weight)
        .map(|(answer, _)| answer)
        .unwrap()
}
```

3. **Weighted by Reputation**
```rust
pub fn resolve_weighted_reputation(votes: Vec<Vote>) -> String {
    let mut weighted: HashMap<String, u128> = HashMap::new();
    for vote in votes {
        let voter = get_voter(vote.voter_id);
        let tier_multiplier = get_tier_multiplier(voter.reputation);
        *weighted.entry(vote.answer).or_insert(0) += 
            (voter.reputation as u128) * tier_multiplier;
    }
    weighted.into_iter()
        .max_by_key(|(_, weight)| *weight)
        .map(|(answer, _)| answer)
        .unwrap()
}
```

4. **Median (for numerical data)**
```rust
pub fn resolve_median(votes: Vec<Vote>) -> String {
    let mut values: Vec<f64> = votes
        .iter()
        .filter_map(|v| v.answer.parse::<f64>().ok())
        .collect();
    values.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let mid = values.len() / 2;
    values[mid].to_string()
}
```

### 3. Reward Distribution System

**Reward Calculation:**
```rust
pub fn distribute_rewards(
    query_id: u64,
    final_result: String,
    reward_pool: Amount,
) {
    // 1. Get all votes for this query
    let votes = get_votes_for_query(query_id);
    
    // 2. Identify correct voters
    let correct_voters: Vec<VoterId> = votes
        .iter()
        .filter(|v| v.answer == final_result)
        .map(|v| v.voter_id)
        .collect();
    
    // 3. Calculate total power of correct voters
    let total_power: u128 = correct_voters
        .iter()
        .map(|id| {
            let voter = get_voter(*id);
            voter.stake * voter.reputation as u128
        })
        .sum();
    
    // 4. Distribute rewards proportionally
    for voter_id in correct_voters {
        let voter = get_voter(voter_id);
        let voter_power = voter.stake * voter.reputation as u128;
        let share = (voter_power as f64) / (total_power as f64);
        let reward = Amount::from_tokens(
            (reward_pool.as_tokens() as f64 * share) as u64
        );
        
        transfer_reward(voter_id, reward);
        update_reputation(voter_id, true, query.importance);
    }
    
    // 5. Penalize incorrect voters
    let incorrect_voters: Vec<VoterId> = votes
        .iter()
        .filter(|v| v.answer != final_result)
        .map(|v| v.voter_id)
        .collect();
    
    for voter_id in incorrect_voters {
        update_reputation(voter_id, false, query.importance);
    }
}
```


---

## 🔄 Complete Resolution Workflow

### Example: Prediction Market Integration

**Scenario:** Polymarket-like DApp needs to resolve "Will Bitcoin reach $100k in 2025?"

#### Phase 1: Market Creation (DApp Side)
```typescript
// DApp creates prediction market
const market = await predictionMarket.createMarket({
  question: "Will Bitcoin reach $100k in 2025?",
  outcomes: ["Yes", "No"],
  deadline: "2025-12-31T23:59:59Z",
  resolutionSource: "Alethea Network"
});

// Users trade on the market
// ... trading happens ...
```

#### Phase 2: Market Closes (DApp Side)
```typescript
// When deadline passes, DApp requests resolution
const resolutionRequest = await aletheaClient.requestResolution({
  marketId: market.id,
  question: "Will Bitcoin reach $100k in 2025?",
  outcomes: ["Yes", "No"],
  strategy: "WeightedByReputation",
  minVotes: 5,
  rewardPool: "1000", // 1000 tokens for voters
  votingDeadline: Date.now() + 86400000, // 24 hours
});

console.log("Resolution requested:", resolutionRequest.id);
```

#### Phase 3: Voter Selection (Alethea Side)
```rust
// Alethea receives resolution request
pub fn handle_resolution_request(request: ResolutionRequest) {
    // 1. Create query
    let query = create_query(request);
    
    // 2. Select voters based on power
    let selected_voters = select_voters(
        query.id,
        request.min_votes,
        10 // max voters
    );
    
    // 3. Notify voters
    for voter_id in selected_voters {
        notify_voter(voter_id, query.id);
    }
    
    // 4. Set voting deadline
    set_voting_deadline(query.id, request.voting_deadline);
}
```

**Selected Voters Example:**
```
Voter C: Power 1,380,000 (15k stake × 92 rep) ✅ Selected
Voter A: Power 850,000 (10k stake × 85 rep) ✅ Selected
Voter D: Power 624,000 (8k stake × 78 rep) ✅ Selected
Voter B: Power 350,000 (5k stake × 70 rep) ✅ Selected
Voter E: Power 200,000 (4k stake × 50 rep) ✅ Selected
```

#### Phase 4: Vote Submission (Voter Side)
```typescript
// Voters submit their votes
await aletheaClient.submitVote({
  queryId: resolutionRequest.id,
  answer: "Yes", // or "No"
  evidence: "https://coinmarketcap.com/...", // optional
});
```

**Votes Collected:**
```
Voter C (Master, 92 rep): "Yes"
Voter A (Expert, 85 rep): "Yes"
Voter D (Expert, 78 rep): "No"
Voter B (Intermediate, 70 rep): "Yes"
Voter E (Intermediate, 50 rep): "Yes"
```

#### Phase 5: Vote Aggregation (Alethea Side)
```rust
// After voting deadline, aggregate votes
pub fn aggregate_votes(query_id: u64) -> ResolutionResult {
    let query = get_query(query_id);
    let votes = get_votes_for_query(query_id);
    
    let result = match query.strategy {
        ResolutionStrategy::WeightedByReputation => {
            resolve_weighted_reputation(votes)
        },
        // ... other strategies
    };
    
    let confidence = calculate_confidence(votes, result);
    
    ResolutionResult {
        query_id,
        result,
        confidence,
        voter_count: votes.len(),
        resolved_at: Timestamp::now(),
    }
}
```

**Calculation (Weighted by Reputation):**
```
"Yes" votes:
- Voter C: 92 × 2.0 (Master) = 184
- Voter A: 85 × 1.5 (Expert) = 127.5
- Voter B: 70 × 1.0 (Intermediate) = 70
- Voter E: 50 × 1.0 (Intermediate) = 50
Total "Yes": 431.5

"No" votes:
- Voter D: 78 × 1.5 (Expert) = 117
Total "No": 117

Result: "Yes" (431.5 > 117)
Confidence: 78.7% (431.5 / 548.5)
```

#### Phase 6: Result Publication (Alethea Side)
```rust
// Publish result on-chain
pub fn publish_result(result: ResolutionResult) {
    // 1. Store result
    store_resolution_result(result);
    
    // 2. Emit event
    emit_resolution_event(result);
    
    // 3. Notify requester
    notify_requester(result.query_id, result.result);
}
```

#### Phase 7: Reward Distribution (Alethea Side)
```rust
// Distribute rewards to correct voters
pub fn distribute_rewards(query_id: u64) {
    let query = get_query(query_id);
    let result = get_resolution_result(query_id);
    
    // Correct voters: C, A, B, E (voted "Yes")
    // Total power: 1,380k + 850k + 350k + 200k = 2,780k
    
    // Voter C: (1,380k / 2,780k) × 1000 = 496.4 tokens
    // Voter A: (850k / 2,780k) × 1000 = 305.8 tokens
    // Voter B: (350k / 2,780k) × 1000 = 125.9 tokens
    // Voter E: (200k / 2,780k) × 1000 = 71.9 tokens
    
    distribute_rewards_to_correct_voters(query_id, result.result);
    
    // Update reputations
    // Correct voters: +5 reputation
    // Incorrect voters: -10 reputation
    update_voter_reputations(query_id, result.result);
}
```

#### Phase 8: Market Settlement (DApp Side)
```typescript
// DApp polls for resolution result
const result = await aletheaClient.getResolutionResult(resolutionRequest.id);

if (result.status === "Resolved") {
  // Settle market based on result
  await predictionMarket.settleMarket(market.id, result.result);
  
  // "Yes" position holders get paid
  // "No" position holders lose
  
  console.log(`Market settled: ${result.result}`);
  console.log(`Confidence: ${result.confidence}%`);
}
```


---

## 📊 Comparison: Alethea vs UMA

| Feature | UMA Protocol | Alethea Network |
|---------|-------------|-----------------|
| **Purpose** | Dispute resolution oracle | Dispute resolution oracle |
| **Blockchain** | Ethereum + L2s | Linera |
| **Approach** | Optimistic (assume true) | Voting-based (always vote) |
| **Voters** | UMA token holders | Registered voters with stake |
| **Selection** | Anyone with UMA | Selected by stake × reputation |
| **Voting** | Only when disputed | Every query requires votes |
| **Speed** | Fast (if no dispute) | Consistent (voting period) |
| **Security** | Economic game theory | Stake + reputation system |
| **Reputation** | No reputation system | Built-in reputation tracking |
| **Strategies** | Single (majority) | Multiple (majority, median, weighted) |
| **Integration** | Any DApp | Any DApp |

### When to Use Alethea vs UMA

**Use Alethea when:**
- ✅ You want proactive resolution (not optimistic)
- ✅ You need reputation-weighted voting
- ✅ You want multiple resolution strategies
- ✅ You're building on Linera blockchain
- ✅ You want predictable resolution timeline

**Use UMA when:**
- ✅ You want optimistic approach (faster if no dispute)
- ✅ You're on Ethereum ecosystem
- ✅ You want battle-tested system
- ✅ You need immediate resolution (with dispute risk)

---

## 🔐 Security & Incentive Model

### Economic Security

**Stake Requirements:**
```
Minimum Stake: 100 tokens
Recommended Stake: 1,000+ tokens for higher selection probability
Maximum Stake: Unlimited
```

**Voter Incentives:**

**Correct Vote:**
- ✅ Earn proportional reward from pool
- ✅ Increase reputation (+5 to +20 based on query importance)
- ✅ Higher chance of future selection
- ✅ Unlock staked tokens

**Incorrect Vote:**
- ❌ No reward
- ❌ Decrease reputation (-10 to -30 based on query importance)
- ❌ Lower chance of future selection
- ❌ Potential stake slash (for malicious behavior)

### Sybil Resistance

**Multiple Layers:**
1. **Stake Requirement** - Economic barrier to entry
2. **Reputation System** - Long-term behavior tracking
3. **Power-Based Selection** - Higher stake + reputation = more influence
4. **Historical Tracking** - Accuracy rate visible on-chain

### Collusion Prevention

**Mechanisms:**
1. **Voter Selection** - Not all voters participate in every query
2. **Reputation Weighting** - Trusted voters have more influence
3. **Multiple Strategies** - Different aggregation methods
4. **Transparent Records** - All votes public and auditable
5. **Slashing** - Severe penalties for proven collusion

### Attack Scenarios & Mitigations

**Scenario 1: Whale Attack (Large Stake)**
```
Attack: Single entity stakes 1M tokens to dominate voting
Mitigation: 
- Reputation still matters (new voter starts at 0 reputation)
- Takes time to build reputation
- Other voters with high reputation can counterbalance
```

**Scenario 2: Sybil Attack (Many Accounts)**
```
Attack: Create many accounts with minimum stake
Mitigation:
- Voter selection based on power (stake × reputation)
- Low-power voters rarely selected
- Economic cost of many accounts
```

**Scenario 3: Reputation Farming**
```
Attack: Vote correctly on easy queries to farm reputation
Mitigation:
- Query importance affects reputation gain
- Important queries give more reputation
- Easy queries give minimal reputation
```

**Scenario 4: Coordinated Voting**
```
Attack: Group of voters coordinate to vote incorrectly
Mitigation:
- Reputation loss for incorrect votes
- Long-term cost outweighs short-term gain
- Transparent voting records enable detection
```

---

## 🛠️ Technical Implementation

### Smart Contract Structure

```
oracle-registry-v2/
├── src/
│   ├── contract.rs          # Core contract logic
│   │   ├── Voter management
│   │   ├── Query handling
│   │   ├── Vote collection
│   │   ├── Resolution logic
│   │   └── Reward distribution
│   │
│   ├── service.rs           # GraphQL service layer
│   │   ├── Queries (voter info, query status)
│   │   └── Mutations (register, vote, resolve)
│   │
│   ├── state.rs             # State management
│   │   ├── Voter registry
│   │   ├── Query storage
│   │   ├── Vote records
│   │   └── Resolution results
│   │
│   └── lib.rs               # Type definitions
│       ├── Voter struct
│       ├── Query struct
│       ├── Vote struct
│       └── Resolution struct
│
└── tests/
    └── integration_test.rs  # Full workflow tests
```

### Key Data Structures

```rust
// Voter with stake and reputation
pub struct Voter {
    pub address: AccountOwner,
    pub stake: Amount,
    pub reputation: u32,        // 0-100
    pub total_votes: u32,
    pub correct_votes: u32,
    pub registered_at: Timestamp,
    pub name: Option<String>,
    pub metadata_url: Option<String>,
}

// Resolution query
pub struct Query {
    pub id: u64,
    pub requester: AccountOwner,
    pub question: String,
    pub outcomes: Vec<String>,
    pub strategy: ResolutionStrategy,
    pub min_votes: u32,
    pub reward_pool: Amount,
    pub voting_deadline: Timestamp,
    pub resolution_deadline: Timestamp,
    pub status: QueryStatus,
    pub importance: u32,        // 1-100
}

// Vote submission
pub struct Vote {
    pub query_id: u64,
    pub voter_id: VoterId,
    pub answer: String,
    pub evidence: Option<String>,
    pub submitted_at: Timestamp,
}

// Resolution result
pub struct ResolutionResult {
    pub query_id: u64,
    pub result: String,
    pub confidence: f64,        // 0.0-1.0
    pub voter_count: u32,
    pub resolved_at: Timestamp,
}

// Resolution strategies
pub enum ResolutionStrategy {
    Majority,                   // Simple majority
    WeightedByStake,           // Weighted by stake amount
    WeightedByReputation,      // Weighted by reputation
    Median,                    // Median value (for numbers)
}
```

### GraphQL API

**Queries:**
```graphql
type Query {
  # Voter information
  voter(address: String!): Voter
  voters(limit: Int, offset: Int): [Voter!]!
  voterCount: Int!
  
  # Query information
  query(id: ID!): ResolutionQuery
  queries(status: QueryStatus, limit: Int): [ResolutionQuery!]!
  
  # Resolution results
  resolutionResult(queryId: ID!): ResolutionResult
  
  # Statistics
  voterStats(address: String!): VoterStats
  networkStats: NetworkStats
}
```

**Mutations:**
```graphql
type Mutation {
  # Voter operations
  registerVoter(
    stake: String!,
    name: String,
    metadataUrl: String
  ): Voter!
  
  unregisterVoter: Boolean!
  
  # Query operations
  createQuery(
    question: String!,
    outcomes: [String!]!,
    strategy: ResolutionStrategy!,
    minVotes: Int!,
    rewardPool: String!,
    votingDeadline: String!,
    importance: Int
  ): ResolutionQuery!
  
  # Voting operations
  submitVote(
    queryId: ID!,
    answer: String!,
    evidence: String
  ): Vote!
  
  # Resolution operations
  resolveQuery(queryId: ID!): ResolutionResult!
}
```


---

## 🎯 Use Cases & Integration Examples

### 1. Prediction Market (Polymarket-style)

**DApp:** Decentralized prediction market
**Need:** Trustless resolution of market outcomes

```typescript
// Market creation
const market = await createMarket({
  question: "Will ETH reach $5000 in Q1 2026?",
  outcomes: ["Yes", "No"],
  deadline: "2026-03-31T23:59:59Z"
});

// Request resolution from Alethea
const resolution = await aletheaClient.requestResolution({
  marketId: market.id,
  question: market.question,
  outcomes: market.outcomes,
  strategy: "WeightedByReputation",
  minVotes: 7,
  rewardPool: "500"
});

// Poll for result
const result = await aletheaClient.pollResolution(resolution.id);

// Settle market
await market.settle(result.outcome);
```

### 2. Parametric Insurance

**DApp:** Weather-based crop insurance
**Need:** Verify weather data for claim settlement

```typescript
// Insurance claim
const claim = await insurance.fileClaim({
  policyId: "CROP-2025-001",
  event: "Rainfall below 100mm in December 2025",
  location: "Iowa, USA"
});

// Request verification from Alethea
const verification = await aletheaClient.requestResolution({
  marketId: claim.id,
  question: "Was rainfall in Iowa below 100mm in Dec 2025?",
  outcomes: ["Yes", "No"],
  strategy: "WeightedByReputation",
  minVotes: 5,
  rewardPool: "200"
});

// Get result
const result = await aletheaClient.getResolution(verification.id);

// Process claim
if (result.outcome === "Yes") {
  await insurance.payoutClaim(claim.id);
}
```

### 3. Sports Betting

**DApp:** Decentralized sports betting platform
**Need:** Verify game outcomes

```typescript
// Create bet
const bet = await sportsBook.createBet({
  event: "Lakers vs Warriors - 2025-12-25",
  question: "Who won the game?",
  outcomes: ["Lakers", "Warriors", "Draw"]
});

// After game ends, request resolution
const resolution = await aletheaClient.requestResolution({
  marketId: bet.id,
  question: bet.question,
  outcomes: bet.outcomes,
  strategy: "Majority",
  minVotes: 10,
  rewardPool: "1000"
});

// Settle bets
const result = await aletheaClient.getResolution(resolution.id);
await sportsBook.settleBets(bet.id, result.outcome);
```

### 4. DAO Governance

**DApp:** DAO with off-chain voting
**Need:** Verify off-chain vote results

```typescript
// DAO proposal
const proposal = await dao.createProposal({
  title: "Increase treasury allocation",
  votingPeriod: 7 * 24 * 60 * 60 // 7 days
});

// After voting ends, verify results
const verification = await aletheaClient.requestResolution({
  marketId: proposal.id,
  question: `Did proposal ${proposal.id} pass with >50% yes votes?`,
  outcomes: ["Yes", "No"],
  strategy: "WeightedByReputation",
  minVotes: 5,
  rewardPool: "300"
});

// Execute proposal if passed
const result = await aletheaClient.getResolution(verification.id);
if (result.outcome === "Yes") {
  await dao.executeProposal(proposal.id);
}
```

### 5. NFT Rarity Oracle

**DApp:** Dynamic NFT platform
**Need:** Verify real-world events for NFT trait updates

```typescript
// NFT with dynamic traits
const nft = await dynamicNFT.mint({
  tokenId: 1234,
  trait: "Championship Winner",
  condition: "Team wins 2026 World Cup"
});

// After event, verify outcome
const verification = await aletheaClient.requestResolution({
  marketId: nft.tokenId,
  question: "Did [Team] win 2026 World Cup?",
  outcomes: ["Yes", "No"],
  strategy: "Majority",
  minVotes: 15,
  rewardPool: "500"
});

// Update NFT trait
const result = await aletheaClient.getResolution(verification.id);
if (result.outcome === "Yes") {
  await dynamicNFT.updateTrait(nft.tokenId, "Championship Winner", true);
}
```

---

## 📈 Scalability & Performance

### Voter Selection Optimization

**Challenge:** Selecting voters from large registry efficiently

**Solution:**
```rust
// Use indexed data structure for fast selection
pub struct VoterIndex {
    by_power: BTreeMap<u128, Vec<VoterId>>,  // Sorted by power
    by_reputation: BTreeMap<u32, Vec<VoterId>>,  // Sorted by reputation
}

// O(log n) selection instead of O(n)
pub fn select_top_voters(n: usize) -> Vec<VoterId> {
    self.by_power
        .iter()
        .rev()  // Descending order
        .flat_map(|(_, voters)| voters)
        .take(n)
        .cloned()
        .collect()
}
```

### Parallel Query Processing

**Challenge:** Handle multiple queries simultaneously

**Solution:**
- Each query is independent
- Parallel vote collection
- Concurrent resolution processing
- Linera's microchain architecture enables parallelism

### State Management

**Challenge:** Efficient storage of voters, queries, votes

**Solution:**
```rust
// Separate state for different data types
pub struct OracleState {
    voters: BTreeMap<VoterId, Voter>,
    queries: BTreeMap<QueryId, Query>,
    votes: BTreeMap<QueryId, Vec<Vote>>,
    results: BTreeMap<QueryId, ResolutionResult>,
}

// Indexed access for fast lookups
// O(log n) instead of O(n)
```

---

## 🚀 Deployment & Operations

### Deployment Checklist

**1. Contract Deployment**
```bash
cd oracle-registry-v2
linera project publish-and-create
# Note APP_ID for configuration
```

**2. Backend Configuration**
```bash
cd oracle-api-backend
nano .env
# Set CHAIN_ID, APP_ID, GRAPHQL_URL
cargo build --release
```

**3. Frontend Configuration**
```bash
cd alethea-dashboard
nano .env.local
# Set NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_APP_ID
npm run build
```

**4. Initial Voter Registration**
```bash
# Register initial voters for bootstrapping
./scripts/register_initial_voters.sh
```

### Monitoring & Maintenance

**Key Metrics to Monitor:**
- Total registered voters
- Active voters (voted in last 30 days)
- Average reputation score
- Query resolution time
- Vote participation rate
- Reward distribution amounts

**Health Checks:**
```bash
# Check voter count
curl -X POST $GRAPHQL_URL \
  -d '{"query": "{ voterCount }"}'

# Check active queries
curl -X POST $GRAPHQL_URL \
  -d '{"query": "{ queries(status: ACTIVE) { id question } }"}'

# Check network stats
curl -X POST $GRAPHQL_URL \
  -d '{"query": "{ networkStats { totalVoters totalQueries } }"}'
```

---

## 📝 Summary

### Alethea Network Identity

**What it IS:**
✅ Dispute Resolution Oracle Protocol
✅ Voter Registry with Stake & Reputation
✅ Vote Aggregation Engine
✅ Incentive Distribution System
✅ DApp-Agnostic Resolution Layer

**What it IS NOT:**
❌ Prediction Market Platform
❌ Trading/Betting Interface
❌ Liquidity Provider
❌ Market Settlement System

### Core Value Proposition

**For DApp Developers:**
- Trustless resolution without building own oracle
- Multiple resolution strategies
- Reputation-weighted voting
- Economic security through staking
- Easy integration via GraphQL

**For Voters:**
- Earn rewards for accurate voting
- Build reputation over time
- Influence proportional to stake + reputation
- Transparent and fair system

**For End Users:**
- Trustless dispute resolution
- Decentralized consensus
- Transparent voting records
- Confidence scores for results

### Competitive Advantages

**vs UMA Protocol:**
- ✅ Proactive voting (not optimistic)
- ✅ Reputation system
- ✅ Multiple resolution strategies
- ✅ Linera blockchain (faster, cheaper)

**vs Chainlink:**
- ✅ Decentralized voting (not node operators)
- ✅ Stake-based security
- ✅ Transparent resolution process
- ✅ Community-driven

**vs Augur:**
- ✅ Resolution layer only (not full market)
- ✅ DApp-agnostic
- ✅ Flexible integration
- ✅ Modern blockchain (Linera)

---

## 🎯 Next Steps

### Phase 1: Core Implementation ✅
- [x] Voter registration
- [x] Stake management
- [x] Reputation tracking
- [x] Query creation
- [x] Vote submission
- [x] Resolution strategies
- [x] Reward distribution

### Phase 2: Backend & Frontend ✅
- [x] Transaction executor backend
- [x] GraphQL integration
- [x] Polling system
- [x] Dashboard UI
- [x] Testing framework

### Phase 3: Production Readiness (Current)
- [ ] Mainnet deployment
- [ ] DApp integration examples
- [ ] Documentation completion
- [ ] Security audit
- [ ] Performance optimization

### Phase 4: Ecosystem Growth (Future)
- [ ] Partner with prediction market DApps
- [ ] Integrate with insurance protocols
- [ ] Support gaming platforms
- [ ] Expand to other blockchains
- [ ] Build developer tools

---

**Alethea Network: The Dispute Resolution Oracle for Web3** 🔮

**Built on Linera. Powered by Community. Secured by Stakes.** 🚀

