# 💰 Alethea Network - Economic Model & Incentive Mechanism

**Last Updated:** November 20, 2025  
**Purpose:** Dokumentasi lengkap sistem ekonomi, rewards, penalties, dan ranking voters

---

## 🎯 Overview

Alethea Network menggunakan **economic security model** untuk memastikan voters memberikan resolution yang jujur dan akurat. Model ini menggabungkan:

1. **Stake** - Voters harus stake tokens sebagai jaminan
2. **Reputation** - Track record akurasi voting
3. **Rewards** - Incentive untuk voting yang benar
4. **Penalties (Slashing)** - Punishment untuk voting yang salah/curang
5. **Power-Based Ranking** - Peringkat berdasarkan Stake × Reputation

---

## 👤 Voter Lifecycle

### **Phase 1: Registration**

```
User → Connect Wallet → Register as Voter → Stake Tokens
```

**Requirements:**
- Minimum stake: **100 tokens**
- Wallet connection (Dynamic multi-chain)
- Account-based registration (no app deployment)

**Process:**
```rust
pub fn register_voter(
    &mut self,
    stake: Amount,
    name: Option<String>,
    metadata_url: Option<String>
) {
    require!(stake >= MIN_STAKE, "Insufficient stake");
    
    let voter = Voter {
        address: self.caller(),
        stake: stake,
        locked_stake: Amount::ZERO,
        reputation: 50,  // Initial reputation (Novice)
        reputation_tier: ReputationTier::Novice,
        total_votes: 0,
        correct_votes: 0,
        registered_at: system_time(),
        is_active: true,
    };
    
    self.voters.insert(voter.address, voter);
}
```

**Initial State:**
- Stake: 100+ tokens
- Reputation: 50 (Novice tier)
- Reputation Weight: 1.0x
- Power: 100 × 1.0 = 100
- Rank: Based on power

---

### **Phase 2: Voter Selection**

**Power Calculation:**
```
Power = Stake × Reputation Weight

Reputation Tiers:
- Novice (0-40):      1.0x weight
- Intermediate (41-70): 1.2x weight
- Expert (71-90):     1.5x weight
- Master (91-100):    2.0x weight
```

**Selection Process:**
```rust
pub fn select_voters_for_query(&self, query_id: u64, count: usize) -> Vec<Owner> {
    // Calculate power for all active voters
    let mut voter_powers: Vec<(Owner, u64)> = self.voters
        .iter()
        .filter(|(_, v)| v.is_active)
        .map(|(owner, voter)| {
            let power = voter.stake.saturating_mul(voter.reputation_weight());
            (*owner, power)
        })
        .collect();
    
    // Sort by power (descending)
    voter_powers.sort_by(|a, b| b.1.cmp(&a.1));
    
    // Select top N voters
    voter_powers
        .into_iter()
        .take(count)
        .map(|(owner, _)| owner)
        .collect()
}
```

**Example:**
```
Query #123 needs 10 voters

Voter Rankings:
1. Alice:   Stake: 10,000 × Reputation: 2.0x (Master)   = Power: 20,000 ✅ Selected
2. Bob:     Stake: 8,000  × Reputation: 1.5x (Expert)   = Power: 12,000 ✅ Selected
3. Charlie: Stake: 5,000  × Reputation: 1.5x (Expert)   = Power: 7,500  ✅ Selected
4. David:   Stake: 6,000  × Reputation: 1.2x (Inter.)   = Power: 7,200  ✅ Selected
5. Eve:     Stake: 5,000  × Reputation: 1.2x (Inter.)   = Power: 6,000  ✅ Selected
...
10. Jack:   Stake: 2,000  × Reputation: 1.0x (Novice)   = Power: 2,000  ✅ Selected
11. Kate:   Stake: 1,500  × Reputation: 1.0x (Novice)   = Power: 1,500  ❌ Not Selected
```

---

### **Phase 3: Voting & Resolution**

**Commit Phase:**
```rust
pub fn commit_vote(&mut self, query_id: u64, commit_hash: String) {
    let voter = self.caller();
    
    // Check if voter is selected for this query
    require!(
        self.is_voter_selected(query_id, voter),
        "Not selected for this query"
    );
    
    // Lock stake during voting
    let voter_info = self.voters.get_mut(&voter).unwrap();
    voter_info.locked_stake += VOTE_LOCK_AMOUNT;
    
    // Store commit
    let query = self.queries.get_mut(&query_id).unwrap();
    query.commits.insert(voter, commit_hash);
}
```

**Reveal Phase:**
```rust
pub fn reveal_vote(
    &mut self,
    query_id: u64,
    value: String,
    salt: String,
    confidence: u8
) {
    let voter = self.caller();
    
    // Verify hash matches commit
    let commit_hash = self.calculate_hash(&value, &salt);
    let stored_hash = query.commits.get(&voter).unwrap();
    require!(commit_hash == *stored_hash, "Hash mismatch");
    
    // Store reveal
    query.reveals.insert(voter, Vote {
        value: value,
        confidence: confidence,
        timestamp: system_time(),
    });
}
```

---

### **Phase 4: Reward Distribution**

**After Query Resolution:**

```rust
pub fn distribute_rewards(&mut self, query_id: u64) {
    let query = self.queries.get(&query_id).unwrap();
    let result = query.result.as_ref().unwrap();
    
    // Identify correct and incorrect voters
    let mut correct_voters = Vec::new();
    let mut incorrect_voters = Vec::new();
    let mut total_correct_power = 0u64;
    
    for (voter, vote) in &query.reveals {
        let voter_info = self.voters.get(voter).unwrap();
        let power = voter_info.calculate_power();
        
        if vote.value == *result {
            correct_voters.push((*voter, power));
            total_correct_power += power;
        } else {
            incorrect_voters.push(*voter);
        }
    }
    
    // Distribute rewards proportionally to correct voters
    let total_reward = query.reward_amount;
    
    for (voter, power) in correct_voters {
        // Calculate proportional reward
        let reward_share = (power as f64 / total_correct_power as f64) * total_reward;
        
        // Transfer reward
        self.transfer_reward(voter, reward_share);
        
        // Increase reputation
        self.increase_reputation(voter, CORRECT_VOTE_BONUS);
        
        // Update stats
        let voter_info = self.voters.get_mut(&voter).unwrap();
        voter_info.correct_votes += 1;
        voter_info.total_votes += 1;
    }
    
    // Apply penalties to incorrect voters
    for voter in incorrect_voters {
        // Slash stake
        self.slash_stake(voter, INCORRECT_VOTE_PENALTY);
        
        // Decrease reputation
        self.decrease_reputation(voter, INCORRECT_VOTE_PENALTY_REP);
        
        // Update stats
        let voter_info = self.voters.get_mut(&voter).unwrap();
        voter_info.total_votes += 1;
    }
    
    // Unlock stakes
    for (voter, _) in &query.reveals {
        let voter_info = self.voters.get_mut(voter).unwrap();
        voter_info.locked_stake -= VOTE_LOCK_AMOUNT;
    }
}
```

---

## 💰 Reward Mechanism

### **Reward Calculation**

**Formula:**
```
Voter Reward = (Voter Power / Total Correct Power) × Total Reward Pool

Where:
- Voter Power = Stake × Reputation Weight
- Total Correct Power = Sum of all correct voters' power
- Total Reward Pool = Query reward amount
```

**Example:**

```
Query #123 Reward Pool: 1,000 tokens
Result: "Yes"

Correct Voters:
1. Alice:   Power: 20,000 → Reward: (20,000/45,000) × 1,000 = 444.44 tokens
2. Bob:     Power: 12,000 → Reward: (12,000/45,000) × 1,000 = 266.67 tokens
3. Charlie: Power: 7,500  → Reward: (7,500/45,000)  × 1,000 = 166.67 tokens
4. David:   Power: 5,500  → Reward: (5,500/45,000)  × 1,000 = 122.22 tokens

Total Correct Power: 45,000
Total Distributed: 1,000 tokens ✅

Incorrect Voters:
5. Eve:     Power: 6,000  → Penalty: -50 tokens (slashed)
6. Frank:   Power: 3,000  → Penalty: -50 tokens (slashed)
```

**Reward Benefits:**
- ✅ Higher power = Higher reward
- ✅ Proportional distribution (fair)
- ✅ Incentivizes accurate voting
- ✅ Compounds with reputation growth

---

## ⚠️ Penalty Mechanism (Slashing)

### **Types of Penalties**

#### **1. Incorrect Vote Penalty**
```rust
const INCORRECT_VOTE_PENALTY: Amount = 50; // tokens
const INCORRECT_VOTE_PENALTY_REP: i32 = -3; // reputation points

pub fn slash_stake(&mut self, voter: Owner, amount: Amount) {
    let voter_info = self.voters.get_mut(&voter).unwrap();
    
    // Slash from stake
    if voter_info.stake >= amount {
        voter_info.stake -= amount;
    } else {
        // If insufficient stake, slash all
        voter_info.stake = Amount::ZERO;
        voter_info.is_active = false; // Deactivate voter
    }
    
    // Add to protocol treasury
    self.treasury += amount;
}
```

**Impact:**
- Lose 50 tokens from stake
- Lose 3 reputation points
- If stake < minimum → Deactivated
- Power decreases → Lower selection chance

#### **2. No-Show Penalty**
```rust
// If voter selected but didn't vote
const NO_SHOW_PENALTY: Amount = 100; // tokens
const NO_SHOW_PENALTY_REP: i32 = -5; // reputation points
```

**Impact:**
- Lose 100 tokens (higher than incorrect vote)
- Lose 5 reputation points
- Damages reputation more severely

#### **3. Malicious Behavior Penalty**
```rust
// If voter caught manipulating (e.g., hash mismatch, double voting)
const MALICIOUS_PENALTY: Amount = 500; // tokens
const MALICIOUS_PENALTY_REP: i32 = -20; // reputation points
```

**Impact:**
- Lose 500 tokens (severe)
- Lose 20 reputation points (severe)
- Likely drops to Novice tier
- May be deactivated if stake too low

---

## 📊 Reputation System

### **Reputation Tiers**

```rust
pub enum ReputationTier {
    Novice,       // 0-40:  1.0x weight
    Intermediate, // 41-70: 1.2x weight
    Expert,       // 71-90: 1.5x weight
    Master,       // 91-100: 2.0x weight
}

impl Voter {
    pub fn reputation_weight(&self) -> f64 {
        match self.reputation_tier {
            ReputationTier::Novice => 1.0,
            ReputationTier::Intermediate => 1.2,
            ReputationTier::Expert => 1.5,
            ReputationTier::Master => 2.0,
        }
    }
    
    pub fn calculate_power(&self) -> u64 {
        (self.stake as f64 * self.reputation_weight()) as u64
    }
}
```

### **Reputation Changes**

**Increase (Correct Vote):**
```rust
pub fn increase_reputation(&mut self, voter: Owner, amount: i32) {
    let voter_info = self.voters.get_mut(&voter).unwrap();
    
    voter_info.reputation = (voter_info.reputation + amount).min(100);
    voter_info.reputation_tier = self.calculate_tier(voter_info.reputation);
}

// Example:
// Reputation: 48 (Intermediate) + 5 = 53 (Intermediate)
// Reputation: 68 (Intermediate) + 5 = 73 (Expert) ✨ Tier Up!
```

**Decrease (Incorrect Vote):**
```rust
pub fn decrease_reputation(&mut self, voter: Owner, amount: i32) {
    let voter_info = self.voters.get_mut(&voter).unwrap();
    
    voter_info.reputation = (voter_info.reputation - amount).max(0);
    voter_info.reputation_tier = self.calculate_tier(voter_info.reputation);
}

// Example:
// Reputation: 75 (Expert) - 3 = 72 (Expert)
// Reputation: 42 (Intermediate) - 3 = 39 (Novice) ⚠️ Tier Down!
```

### **Reputation Impact**

**Example Progression:**

```
New Voter:
- Reputation: 50 (Novice)
- Stake: 1,000 tokens
- Power: 1,000 × 1.0 = 1,000

After 10 Correct Votes (+50 reputation):
- Reputation: 100 (Master) ✨
- Stake: 1,000 tokens (unchanged)
- Power: 1,000 × 2.0 = 2,000 (2x increase!)

After 5 Incorrect Votes (-15 reputation):
- Reputation: 85 (Expert)
- Stake: 750 tokens (slashed 250)
- Power: 750 × 1.5 = 1,125
```

---

## 🏆 Voter Ranking System

### **Leaderboard Calculation**

```rust
pub fn get_voter_leaderboard(&self, limit: usize) -> Vec<VoterRank> {
    let mut rankings: Vec<VoterRank> = self.voters
        .iter()
        .filter(|(_, v)| v.is_active)
        .map(|(owner, voter)| {
            let power = voter.calculate_power();
            let accuracy = if voter.total_votes > 0 {
                (voter.correct_votes as f64 / voter.total_votes as f64) * 100.0
            } else {
                0.0
            };
            
            VoterRank {
                address: *owner,
                stake: voter.stake,
                reputation: voter.reputation,
                reputation_tier: voter.reputation_tier,
                power: power,
                total_votes: voter.total_votes,
                correct_votes: voter.correct_votes,
                accuracy_rate: accuracy,
                rank: 0, // Will be set after sorting
            }
        })
        .collect();
    
    // Sort by power (descending)
    rankings.sort_by(|a, b| b.power.cmp(&a.power));
    
    // Assign ranks
    for (i, rank) in rankings.iter_mut().enumerate() {
        rank.rank = i + 1;
    }
    
    rankings.into_iter().take(limit).collect()
}
```

### **Leaderboard Display**

```
╔════╦═══════════╦═══════╦════════════╦═══════╦════════╦══════════╦══════════╗
║ #  ║ Address   ║ Stake ║ Reputation ║ Tier  ║ Power  ║ Accuracy ║ Votes    ║
╠════╬═══════════╬═══════╬════════════╬═══════╬════════╬══════════╬══════════╣
║ 1  ║ Alice     ║ 10,000║ 95 (Master)║ 2.0x  ║ 20,000 ║ 95.2%    ║ 42/44    ║
║ 2  ║ Bob       ║ 8,000 ║ 85 (Expert)║ 1.5x  ║ 12,000 ║ 91.7%    ║ 33/36    ║
║ 3  ║ Charlie   ║ 5,000 ║ 78 (Expert)║ 1.5x  ║ 7,500  ║ 88.9%    ║ 24/27    ║
║ 4  ║ David     ║ 6,000 ║ 55 (Inter.)║ 1.2x  ║ 7,200  ║ 75.0%    ║ 15/20    ║
║ 5  ║ Eve       ║ 5,000 ║ 60 (Inter.)║ 1.2x  ║ 6,000  ║ 80.0%    ║ 12/15    ║
╚════╩═══════════╩═══════╩════════════╩═══════╩════════╩══════════╩══════════╝
```

---

## 💡 Economic Incentives

### **Why Voters Vote Honestly**

#### **1. Financial Incentive**
- ✅ Correct vote → Earn rewards
- ❌ Incorrect vote → Lose stake (slashed)
- **Net Effect:** Honesty is profitable

#### **2. Reputation Incentive**
- ✅ Correct vote → Reputation increases → Higher power → More selection → More rewards
- ❌ Incorrect vote → Reputation decreases → Lower power → Less selection → Less rewards
- **Net Effect:** Long-term honesty compounds

#### **3. Selection Incentive**
- Higher power → Higher selection chance
- More selections → More opportunities to earn
- **Net Effect:** Maintain high power to maximize earnings

#### **4. Compounding Effect**
```
Honest Voter Cycle:
Vote Correctly → Earn Reward → Increase Reputation → 
Higher Power → More Selections → More Rewards → 
Stake More → Even Higher Power → Cycle Continues ✨

Dishonest Voter Cycle:
Vote Incorrectly → Lose Stake → Decrease Reputation → 
Lower Power → Fewer Selections → Fewer Rewards → 
Can't Recover Stake → Even Lower Power → Deactivated ❌
```

---

## 📈 Example Scenarios

### **Scenario 1: Honest Voter (Alice)**

```
Month 1:
- Initial: Stake: 1,000, Reputation: 50 (Novice), Power: 1,000
- Votes: 10 queries, 9 correct, 1 incorrect
- Rewards: +450 tokens
- Penalties: -50 tokens
- Reputation: +42 (now 92 - Master!)
- End: Stake: 1,400, Reputation: 92, Power: 2,800

Month 2:
- Start: Power: 2,800 (higher selection chance)
- Votes: 15 queries (selected more), 14 correct, 1 incorrect
- Rewards: +700 tokens
- Penalties: -50 tokens
- Reputation: +67 (capped at 100)
- End: Stake: 2,050, Reputation: 100, Power: 4,100

Month 3:
- Start: Power: 4,100 (top voter!)
- Votes: 20 queries, 19 correct, 1 incorrect
- Rewards: +950 tokens
- Penalties: -50 tokens
- End: Stake: 2,950, Reputation: 100, Power: 5,900

Result: 3x stake growth, Master tier, top rankings! 🚀
```

### **Scenario 2: Dishonest Voter (Eve)**

```
Month 1:
- Initial: Stake: 1,000, Reputation: 50 (Novice), Power: 1,000
- Votes: 10 queries, 5 correct, 5 incorrect (trying to manipulate)
- Rewards: +250 tokens
- Penalties: -250 tokens
- Reputation: +10 (now 60 - Intermediate)
- End: Stake: 1,000, Reputation: 60, Power: 1,200

Month 2:
- Start: Power: 1,200
- Votes: 8 queries, 3 correct, 5 incorrect (still dishonest)
- Rewards: +150 tokens
- Penalties: -250 tokens
- Reputation: -30 (now 30 - Novice)
- End: Stake: 900, Reputation: 30, Power: 900

Month 3:
- Start: Power: 900 (lower selection)
- Votes: 5 queries, 2 correct, 3 incorrect
- Rewards: +100 tokens
- Penalties: -150 tokens
- Reputation: -19 (now 11)
- End: Stake: 850, Reputation: 11, Power: 850

Result: Declining stake, low reputation, fewer selections ❌
```

---

## ✅ Implementation Status

### **Currently Implemented:**
- ✅ Voter registration with stake
- ✅ Power-based selection
- ✅ Reputation tiers (4 tiers)
- ✅ Reputation weight multipliers
- ✅ Voter leaderboard
- ✅ Accuracy tracking

### **Partially Implemented:**
- ⚠️ Reward distribution (logic exists, needs testing)
- ⚠️ Slashing mechanism (logic exists, needs testing)
- ⚠️ Reputation updates (logic exists, needs testing)

### **Needs Implementation:**
- ❌ Automatic reward distribution after resolution
- ❌ Automatic slashing for incorrect votes
- ❌ No-show penalty
- ❌ Malicious behavior detection
- ❌ Stake locking during voting
- ❌ Treasury management

---

## 🎯 Summary

**Alethea Economic Model:**

1. **Stake to Participate** - Minimum 100 tokens
2. **Power = Stake × Reputation** - Ranking system
3. **Top Voters Selected** - Quality over quantity
4. **Correct Vote → Rewards** - Proportional to power
5. **Incorrect Vote → Slashing** - Lose stake & reputation
6. **Reputation Compounds** - Long-term incentive
7. **Honest Voters Win** - Economic game theory

**Result:** Self-sustaining ecosystem where honesty is the most profitable strategy! 💰✨

---

**Built with ❤️ on Linera Blockchain**
