# Migration Guide: Old Registry to Account-Based Registry

This guide explains how to migrate data from the old application-based oracle registry to the new account-based registry (oracle-registry-v2).

## Overview

The migration process consists of three main phases:

1. **Export**: Extract all data from the old registry
2. **Validation**: Verify the exported data is complete and correct
3. **Import**: Load the data into the new registry

## Prerequisites

- Access to the old registry (chain ID and application ID)
- Linera CLI installed and configured
- `jq` installed for JSON processing (optional but recommended)
- Rust toolchain for running validation tests

## Phase 1: Export Old Registry Data

### Step 1: Configure Registry Access

Set the environment variables for your old registry:

```bash
export REGISTRY_CHAIN_ID="your_registry_chain_id"
export REGISTRY_APP_ID="your_registry_app_id"
```

Or add them to your `.env.fresh` file:

```bash
ORACLE_REGISTRY_CHAIN_ID=your_registry_chain_id
ORACLE_REGISTRY_APP_ID=your_registry_app_id
```

### Step 2: Run Export Script

Execute the export script:

```bash
./scripts/export-old-registry-data.sh
```

This will create a `migration-data/` directory with:
- `registry_export_TIMESTAMP.json` - Complete export of all data
- `voter_mapping_TIMESTAMP.json` - Mapping of old app IDs to account addresses
- `export_summary_TIMESTAMP.txt` - Human-readable summary

### Step 3: Review Export

Check the summary file:

```bash
cat migration-data/export_summary_*.txt
```

Review the export data:

```bash
cat migration-data/registry_export_*.json | jq .
```

## Phase 2: Validate Export Data

### Automated Validation

Run the validation tests:

```bash
cd oracle-registry-v2
cargo test --lib migration::tests
```

### Manual Validation

You can also validate the export programmatically:

```rust
use oracle_registry_v2::migration::RegistryExport;

// Load export
let json = std::fs::read_to_string("migration-data/registry_export_*.json")?;
let export = RegistryExport::from_json(&json)?;

// Validate
let validation = export.validate();

if validation.is_valid {
    println!("✓ Export is valid");
} else {
    println!("✗ Validation errors:");
    for error in validation.errors {
        println!("  - {}", error);
    }
}

// Print summary
let summary = export.summary();
println!("Total voters: {}", summary.total_voters);
println!("Active voters: {}", summary.active_voters);
println!("Active markets: {}", summary.total_active_markets);
```

### Validation Checks

The validation process checks:

- ✓ Voter count matches metadata
- ✓ Market count matches metadata
- ✓ No duplicate voter addresses
- ✓ Stake consistency (locked ≤ total)
- ✓ Reputation vote counts are consistent
- ✓ Market votes reference valid voters
- ✓ All active markets have valid status
- ✓ Total stake calculations are correct

## Phase 3: Import to New Registry

### Step 1: Deploy New Registry

First, deploy the new account-based registry:

```bash
./scripts/deploy-account-based-registry.sh
```

Save the new registry chain ID and application ID.

### Step 2: Run Import Script

Execute the import script (to be created):

```bash
./scripts/import-to-new-registry.sh migration-data/registry_export_*.json
```

This will:
1. Import all voter data
2. Recreate active markets
3. Transfer pending rewards
4. Set protocol parameters
5. Verify all data was imported correctly

### Step 3: Verify Migration

After import, verify the data:

```bash
# Check voter count
linera service --with-wallet default &
curl -X POST http://localhost:8080/chains/$NEW_REGISTRY_CHAIN/applications/$NEW_REGISTRY_APP \
  -H "Content-Type: application/json" \
  -d '{"query": "{ voters { address stake } }"}'

# Check active markets
curl -X POST http://localhost:8080/chains/$NEW_REGISTRY_CHAIN/applications/$NEW_REGISTRY_APP \
  -H "Content-Type: application/json" \
  -d '{"query": "{ activeQueries { id description } }"}'
```

## Data Mapping

### Voter Data Mapping

| Old Registry | New Registry | Notes |
|--------------|--------------|-------|
| `app_id` | N/A | No longer needed |
| `chain_id` | N/A | All voters on registry chain |
| `owner` | `address` | Direct mapping |
| `stake` | `stake` | Direct mapping |
| `locked_stake` | `locked_stake` | Direct mapping |
| `registered_at` | `registered_at` | Direct mapping |
| `is_active` | `is_active` | Direct mapping |
| `reputation.score` | `reputation` | Converted to 0-100 scale |
| `reputation.total_votes` | `total_votes` | Direct mapping |
| `reputation.correct_votes` | `correct_votes` | Direct mapping |

### Market/Query Data Mapping

| Old Registry | New Registry | Notes |
|--------------|--------------|-------|
| `id` | `id` | Direct mapping |
| `question` | `description` | Direct mapping |
| `outcomes` | `outcomes` | Direct mapping |
| `created_at` | `created_at` | Direct mapping |
| `deadline` | `deadline` | Direct mapping |
| `fee_paid` | `reward_amount` | Converted to reward pool |
| `status` | `status` | Mapped to new enum |

## Troubleshooting

### Export Issues

**Problem**: Export script fails with "Registry not configured"

**Solution**: Set `REGISTRY_CHAIN_ID` and `REGISTRY_APP_ID` environment variables

**Problem**: Export contains no data

**Solution**: Ensure the old registry is running and accessible. Check that the GraphQL queries are correct for your registry version.

### Validation Issues

**Problem**: Validation fails with "Voter count mismatch"

**Solution**: Re-run the export script. The registry state may have changed during export.

**Problem**: Validation warns about "Inactive voter with stake"

**Solution**: This is a warning, not an error. These voters will be imported but remain inactive.

### Import Issues

**Problem**: Import fails with "Insufficient stake"

**Solution**: Ensure the new registry has the same or lower minimum stake requirement.

**Problem**: Some voters not imported

**Solution**: Check the import logs for specific errors. Voters with invalid data will be skipped.

## Rollback Plan

If migration fails or issues are discovered:

1. **Keep old registry running** - Don't shut down the old registry until migration is verified
2. **Backup export data** - Keep all export files safe
3. **Document issues** - Record any problems encountered
4. **Re-attempt import** - Fix issues and re-run import script
5. **Gradual cutover** - Consider running both registries in parallel initially

## Post-Migration Tasks

After successful migration:

1. ✓ Verify all voters can access their accounts
2. ✓ Verify all active markets are functioning
3. ✓ Test voting on migrated markets
4. ✓ Test reward claiming
5. ✓ Update documentation with new registry IDs
6. ✓ Update dashboard to use new registry
7. ✓ Notify users of migration
8. ✓ Monitor for issues
9. ✓ Archive old registry data

## Migration Checklist

- [ ] Export old registry data
- [ ] Validate export data
- [ ] Review export summary
- [ ] Deploy new registry
- [ ] Import voter data
- [ ] Import market data
- [ ] Verify voter counts
- [ ] Verify market counts
- [ ] Test voting functionality
- [ ] Test reward claiming
- [ ] Update configuration files
- [ ] Update dashboard
- [ ] Notify users
- [ ] Monitor for 24 hours
- [ ] Archive old registry

## Support

For migration support:
- Check the export summary for detailed statistics
- Review validation errors carefully
- Test import on a test network first
- Keep backups of all export data

## Example Migration Session

```bash
# 1. Export data
export REGISTRY_CHAIN_ID="e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65"
export REGISTRY_APP_ID="e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65000000000000000000000000"

./scripts/export-old-registry-data.sh

# 2. Validate
cd oracle-registry-v2
cargo test --lib migration::tests

# 3. Review
cat ../migration-data/export_summary_*.txt

# 4. Deploy new registry
cd ..
./scripts/deploy-account-based-registry.sh

# 5. Import (when script is ready)
# ./scripts/import-to-new-registry.sh migration-data/registry_export_*.json

# 6. Verify
# Check voter count, market count, etc.
```

## Notes

- The export process is read-only and safe to run multiple times
- Validation should always pass before attempting import
- Import is idempotent - can be run multiple times safely
- Keep old registry running until migration is fully verified
- Consider a gradual migration for large registries
