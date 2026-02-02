# Oracle CLI - Alethea Oracle Registry

Command-line tool for interacting with the Alethea Oracle Registry on Linera blockchain.

## Installation

```bash
cd oracle-cli
cargo build --release
```

The binary will be available at `target/release/oracle-cli`.

## Quick Start

### 1. Initialize Configuration

```bash
oracle-cli init \
  --chain-id "your_chain_id" \
  --app-id "your_app_id" \
  --service-url "http://localhost:8080"
```

This saves your configuration to `~/.oracle-cli/config.json`.

### 2. Register as Voter

```bash
oracle-cli register \
  --stake 1000 \
  --name "Alice"
```

### 3. Create a Query

```bash
oracle-cli create-query \
  --description "Will it rain tomorrow?" \
  --outcomes "Yes,No" \
  --strategy Majority \
  --min-votes 3 \
  --reward 1000
```

### 4. Submit a Vote

```bash
oracle-cli vote \
  --query-id 1 \
  --value "Yes" \
  --confidence 90
```

### 5. Resolve Query

```bash
oracle-cli resolve --query-id 1
```

## Commands

### Voter Management

#### Register as Voter
```bash
oracle-cli register --stake <AMOUNT> [--name <NAME>] [--metadata-url <URL>]
```

#### Update Stake
```bash
oracle-cli update-stake --amount <AMOUNT>
```

#### Withdraw Stake
```bash
oracle-cli withdraw-stake --amount <AMOUNT>
```

#### Claim Rewards
```bash
oracle-cli claim-rewards
```

### Query Management

#### Create Query
```bash
oracle-cli create-query \
  --description <DESCRIPTION> \
  --outcomes <OUTCOME1,OUTCOME2,...> \
  --strategy <STRATEGY> \
  [--min-votes <NUMBER>] \
  --reward <AMOUNT>
```

**Strategies:**
- `Majority` - Simple majority vote
- `Median` - Median of numeric values
- `WeightedByStake` - Weighted by voter stake
- `WeightedByReputation` - Weighted by voter reputation

#### Submit Vote
```bash
oracle-cli vote \
  --query-id <ID> \
  --value <VALUE> \
  [--confidence <0-100>]
```

#### Resolve Query
```bash
oracle-cli resolve --query-id <ID>
```

### Queries

#### List All Voters
```bash
oracle-cli list-voters [--limit <NUMBER>] [--active-only]
```

#### List All Queries
```bash
oracle-cli list-queries [--active-only]
```

#### Get Voter Info
```bash
oracle-cli get-voter --address <ADDRESS>
```

#### Get Query Info
```bash
oracle-cli get-query --query-id <ID>
```

#### Get Protocol Statistics
```bash
oracle-cli stats
```

## Configuration

### Environment Variables

You can set these environment variables instead of using CLI flags:

```bash
export CHAIN_ID="your_chain_id"
export APP_ID="your_app_id"
export SERVICE_URL="http://localhost:8080"
```

### Config File

Configuration is stored in `~/.oracle-cli/config.json`:

```json
{
  "chain_id": "95f032d7...",
  "app_id": "47c507d7...",
  "service_url": "http://localhost:8080"
}
```

## Examples

### Complete Oracle Flow

```bash
# 1. Initialize
oracle-cli init \
  --chain-id "95f032d7..." \
  --app-id "47c507d7..." \
  --service-url "http://localhost:8080"

# 2. Register voters
oracle-cli register --stake 1000 --name "Alice"
oracle-cli register --stake 1500 --name "Bob"
oracle-cli register --stake 2000 --name "Charlie"

# 3. Create query
oracle-cli create-query \
  --description "Will Bitcoin reach $100k in 2025?" \
  --outcomes "Yes,No" \
  --strategy WeightedByStake \
  --min-votes 3 \
  --reward 10000

# 4. Submit votes
oracle-cli vote --query-id 1 --value "Yes" --confidence 90
oracle-cli vote --query-id 1 --value "Yes" --confidence 85
oracle-cli vote --query-id 1 --value "No" --confidence 80

# 5. Resolve query
oracle-cli resolve --query-id 1

# 6. Check results
oracle-cli get-query --query-id 1

# 7. Claim rewards
oracle-cli claim-rewards
```

### Query Protocol State

```bash
# Get all voters
oracle-cli list-voters

# Get active voters only
oracle-cli list-voters --active-only

# Get specific voter
oracle-cli get-voter --address "0x..."

# Get all queries
oracle-cli list-queries

# Get active queries only
oracle-cli list-queries --active-only

# Get specific query
oracle-cli get-query --query-id 1

# Get protocol statistics
oracle-cli stats
```

## Operation Files

The CLI creates operation files in `/tmp/` for each command:

- `/tmp/oracle_register.json` - Register voter operation
- `/tmp/oracle_create_query.json` - Create query operation
- `/tmp/oracle_vote_{id}.json` - Submit vote operation
- `/tmp/oracle_resolve_{id}.json` - Resolve query operation
- `/tmp/oracle_update_stake.json` - Update stake operation
- `/tmp/oracle_withdraw_stake.json` - Withdraw stake operation
- `/tmp/oracle_claim_rewards.json` - Claim rewards operation

These files can be used with Linera CLI for actual execution.

## Execution

### Current Limitation

GraphQL mutations currently return instructions only and don't execute operations.

### Execution Options

1. **Linera Project Test**
   ```bash
   cd oracle-registry-v2
   linera project test
   ```

2. **Linera SDK Integration** (Future)
   - Backend service with SDK
   - Direct operation execution

3. **Linera Wallet** (Future)
   - Official wallet integration
   - Direct execution from browser

## Troubleshooting

### "Chain ID not provided"

Either:
- Run `oracle-cli init` first
- Or provide `--chain-id` and `--app-id` flags
- Or set environment variables

### "Failed to connect to service"

Check that:
- Linera service is running
- Service URL is correct
- Chain and app IDs are valid

### "GraphQL errors"

The GraphQL endpoint might be:
- Not responding
- Returning errors
- Not configured correctly

Check the service logs for details.

## Development

### Build

```bash
cargo build
```

### Run

```bash
cargo run -- <COMMAND>
```

### Test

```bash
cargo test
```

## License

MIT OR Apache-2.0

## Links

- [Alethea Network](https://github.com/mdlog/alethea-network)
- [Linera Protocol](https://linera.io)
- [Documentation](../INTEGRATION_TEST_GUIDE.md)
