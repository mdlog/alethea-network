# Account-Based Voting Guide

## Overview

The `vote-account-based.sh` script provides an interactive interface for submitting votes on queries/markets in the account-based oracle registry.

## Prerequisites

1. **Registry Deployed**: The account-based registry must be deployed
   ```bash
   ./scripts/deploy-account-based-registry.sh
   ```

2. **Voter Registered**: You must be registered as a voter
   ```bash
   ./scripts/onboard-voter-account-based.sh
   ```

3. **Active Queries**: There must be active queries to vote on
   ```bash
   ./scripts/create-query-account-based.sh
   ```

4. **Linera Service Running**: The Linera service must be running
   ```bash
   linera service --port 8080
   ```

## Usage

### Interactive Mode

Simply run the script and follow the prompts:

```bash
./scripts/vote-account-based.sh
```

The script will guide you through:
1. Loading environment configuration
2. Checking prerequisites
3. Displaying active queries
4. Selecting a query to vote on
5. Choosing your vote outcome
6. Setting confidence level (0-100)
7. Confirming and submitting your vote
8. Verifying the vote was recorded

### Example Session

```
╔════════════════════════════════════════════════════════════╗
║     Account-Based Voting                                   ║
║     Alethea Oracle Network                                ║
╚════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════
Step 1: Loading Environment
═══════════════════════════════════════════════════════════

✓ Loaded .env.account-based-registry
ℹ Registry ID: e476187f6ddfeb0218c4d5cb55f5fce79ee0b6f8b8935c5f6e8c3e8c3e8c3e8c
ℹ Chain ID: e476187f6ddfeb0218c4d5cb55f5fce79ee0b6f8b8935c5f6e8c3e8c3e8c3e8c

═══════════════════════════════════════════════════════════
Step 2: Checking Prerequisites
═══════════════════════════════════════════════════════════

✓ Linera CLI installed
✓ Linera service running
✓ Registry accessible

═══════════════════════════════════════════════════════════
Step 3: Viewing Active Queries
═══════════════════════════════════════════════════════════

Fetching active queries...

✓ Found 2 active queries

Active Queries:

Query #1
  Description: Will Bitcoin reach $50,000 by end of month?
  Outcomes: Yes, No
  Strategy: Majority
  Votes: 2/3 (minimum)
  Time Remaining: 4h 30m 15s

Query #2
  Description: What will be the ETH price range tomorrow?
  Outcomes: Below $2500, $2500-$3000, Above $3000
  Strategy: WeightedByReputation
  Votes: 1/5 (minimum)
  Time Remaining: 23h 45m 0s

═══════════════════════════════════════════════════════════
Step 4: Select Query
═══════════════════════════════════════════════════════════

Enter the Query ID you want to vote on:
Query ID: 1

✓ Query #1: Will Bitcoin reach $50,000 by end of month?

═══════════════════════════════════════════════════════════
Step 5: Select Your Vote
═══════════════════════════════════════════════════════════

Query: Will Bitcoin reach $50,000 by end of month?

Available Outcomes:
  1) Yes
  2) No

Select your vote (enter number or outcome text):
Vote: 1

✓ Selected outcome: Yes

═══════════════════════════════════════════════════════════
Step 6: Set Confidence Level
═══════════════════════════════════════════════════════════

How confident are you in this vote? (0-100)
  Higher confidence may affect your reputation more
  Default: 90
Confidence: 85

✓ Confidence: 85%

═══════════════════════════════════════════════════════════
Step 7: Confirm Vote
═══════════════════════════════════════════════════════════

Vote Summary:
  • Query ID: 1
  • Description: Will Bitcoin reach $50,000 by end of month?
  • Your Vote: Yes
  • Confidence: 85%
  • Strategy: Majority

Important:
  • Your vote is final and cannot be changed
  • Incorrect votes may result in reputation loss
  • Correct votes earn rewards and increase reputation

Submit this vote? (y/n) y

═══════════════════════════════════════════════════════════
Step 8: Submitting Vote
═══════════════════════════════════════════════════════════

ℹ Submitting vote to registry...

Vote Result:
[Operation submitted successfully]

✓ Vote submitted successfully!
ℹ Waiting for vote to process...

═══════════════════════════════════════════════════════════
Step 9: Verifying Vote
═══════════════════════════════════════════════════════════

Query Status:
{
  "data": {
    "query": {
      "id": 1,
      "description": "Will Bitcoin reach $50,000 by end of month?",
      "voteCount": 3,
      "minVotes": 3,
      "status": "Active"
    }
  }
}

✓ Vote recorded! (3/3 votes)
ℹ Query has enough votes and may be resolved soon

╔════════════════════════════════════════════════════════════╗
║     Vote Submitted! 🗳️                                     ║
╚════════════════════════════════════════════════════════════╝
```

## Features

### 1. Active Query Discovery
- Automatically fetches and displays all active queries
- Shows query details: description, outcomes, strategy, vote count, time remaining
- Helps you choose which query to vote on

### 2. Outcome Selection
- Displays all possible outcomes for the selected query
- Accepts either outcome number (1, 2, 3...) or outcome text
- Validates your selection against available outcomes

### 3. Confidence Level
- Set your confidence level (0-100)
- Higher confidence may affect reputation impact
- Default: 90%

### 4. Vote Verification
- Confirms vote was submitted successfully
- Shows updated vote count
- Indicates if query is ready for resolution

### 5. Error Handling
- Checks if you're registered as a voter
- Validates query is active and not expired
- Prevents duplicate votes
- Provides helpful error messages and solutions

## Vote Strategies

The script supports all decision strategies:

### Majority
Simple majority wins. Each vote counts equally.

### Median
The median value is selected (for numeric outcomes).

### WeightedByStake
Votes are weighted by the voter's stake amount.

### WeightedByReputation
Votes are weighted by the voter's reputation score.

## After Voting

### Check Query Status
```bash
curl -X POST "http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ query(id: 1) { id description status result voteCount } }"}'
```

### Check Your Voter Info
```bash
curl -X POST "http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ myVoterInfo { stake reputation totalVotes correctVotes accuracyPercentage } }"}'
```

### Check Pending Rewards
```bash
curl -X POST "http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ myPendingRewards }"}'
```

### Claim Rewards
After a query is resolved and you voted correctly:
```bash
linera request-application "${REGISTRY_ID}" \
  --operation '{"ClaimRewards": {}}'
```

## Tips for Successful Voting

1. **Vote Accurately**: Your reputation depends on voting correctly
2. **Higher Reputation = Higher Weight**: Build reputation over time
3. **Check Time Remaining**: Vote before the deadline
4. **Set Appropriate Confidence**: Reflect your actual confidence level
5. **Monitor Query Status**: Check if your query has been resolved
6. **Claim Rewards Regularly**: Don't let rewards accumulate too long
7. **Vote on Multiple Queries**: Maximize your earning potential

## Troubleshooting

### "Not registered" Error
You need to register as a voter first:
```bash
./scripts/onboard-voter-account-based.sh
```

### "Already voted" Error
You can only vote once per query. Your vote is final.

### "Insufficient stake" Error
Increase your stake:
```bash
linera request-application "${REGISTRY_ID}" \
  --operation '{"UpdateStake": {"additional_stake": "500"}}'
```

### "Query not active" Error
The query may have been resolved or expired. Check active queries:
```bash
curl -X POST "http://localhost:8080/chains/${CHAIN_ID}/applications/${REGISTRY_ID}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ activeQueries { id description status } }"}'
```

### "Registry not accessible" Error
Make sure the Linera service is running:
```bash
linera service --port 8080
```

## Related Scripts

- `deploy-account-based-registry.sh` - Deploy the registry
- `onboard-voter-account-based.sh` - Register as a voter
- `create-query-account-based.sh` - Create new queries
- `test-multi-wallet-voters.sh` - Test multi-voter scenarios

## Architecture

The voting script interacts with the account-based oracle registry:

```
┌─────────────────────────────────────────────────────────┐
│           Oracle Registry Application                   │
│           (Single Chain, Single Application)            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Registered Voters (Account-Based):                    │
│  ├─ 0xabc... (Alice)   - Stake: 100, Reputation: 95   │
│  ├─ 0xdef... (Bob)     - Stake: 200, Reputation: 88   │
│  └─ 0x123... (Charlie) - Stake: 150, Reputation: 92   │
│                                                         │
│  Active Queries:                                       │
│  ├─ Query #1: "BTC Price"                             │
│  │   ├─ Vote from 0xabc... → Yes (90% confidence)    │
│  │   ├─ Vote from 0xdef... → Yes (85% confidence)    │
│  │   └─ Vote from 0x123... → No (75% confidence)     │
│  │   Status: Active (3/3 votes, ready to resolve)    │
│  │                                                     │
│  └─ Query #2: "ETH Price"                             │
│      ├─ Vote from 0xabc... → $2,800                   │
│      └─ Vote from 0xdef... → $2,850                   │
│      Status: Active (2/5 votes, waiting)              │
└─────────────────────────────────────────────────────────┘
```

## Benefits of Account-Based Voting

✅ **Simple**: No application deployment needed
✅ **Fast**: Vote in seconds, not minutes
✅ **Cheap**: Lower gas costs (single chain)
✅ **Reliable**: No cross-chain message issues
✅ **Scalable**: Can handle thousands of voters

## See Also

- [Account-Based Voting Architecture](../docs/ACCOUNT_BASED_VOTING.md)
- [Voter Onboarding Guide](../docs/VOTER_ONBOARDING_GUIDE.md)
- [Oracle Testing Guide](../docs/ORACLE_TESTING_GUIDE.md)
