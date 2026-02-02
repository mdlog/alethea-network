# 🔍 Instantiation Issue Analysis

**Problem:** Contract deployed via `publish-and-create` but `instantiate()` never called

---

## 🔍 Root Cause Analysis

### **Expected Behavior:**
`linera publish-and-create` dengan `--json-argument` seharusnya:
1. Publish module (contract + service WASM)
2. Create application
3. **Call `instantiate()` with the provided argument**
4. Save state

### **Actual Behavior:**
- Contract created successfully (App ID exists)
- Token contract instantiated (accessible via GraphQL)
- Registry contract **NOT instantiated** (error "Failed to load state: BcsError(Eof)")
- `linera process-inbox` shows "0 blocks" (no messages to process)

### **Possible Causes:**

1. **Instantiation message not created**
   - `publish-and-create` mungkin tidak membuat instantiation message
   - Atau instantiation message dibuat tapi tidak dikirim ke inbox

2. **Instantiation message already processed but failed**
   - Message diproses tapi `instantiate()` gagal
   - State tidak tersimpan karena error

3. **Format issue with JSON argument**
   - Format `"Hub"` mungkin tidak benar
   - Perlu format yang berbeda

4. **Timing issue**
   - Instantiation terjadi tapi state belum di-save
   - Perlu waktu lebih lama

---

## ✅ Solutions

### **Solution 1: Wait and Retry**

Sometimes instantiation takes time:

```bash
# Wait longer
sleep 10

# Test again
./test-new-deployment.sh
```

### **Solution 2: Check if Instantiation Message Exists**

```bash
# Stop service
pkill -f "linera service"

# Sync and check inbox
linera sync
linera process-inbox

# Check output for instantiation messages
# If "0 blocks" persists, no messages exist
```

### **Solution 3: Manual Instantiation (If Supported)**

If Linera supports manual instantiation after creation:

```bash
# Check if there's a way to manually trigger instantiation
linera --help | grep -i "instantiate\|initialize"
```

### **Solution 4: Redeploy with Different Approach**

Try using `create-application` separately:

```bash
# 1. Publish module first
linera publish-bytecode \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_contract.wasm \
  target/wasm32-unknown-unknown/release/oracle_registry_v2_service.wasm

# 2. Create application with instantiation argument
linera create-application <MODULE_ID> \
  --json-argument "Hub"
```

### **Solution 5: Check Contract Code**

Verify that `instantiate()` is properly implemented:

- Check `contract.rs` - `instantiate()` function
- Check that it saves state: `self.state.save().await.expect(...)`
- Check that it's called during application creation

---

## 🔧 Immediate Action

Since Token contract is instantiated but Registry is not, the issue might be:

1. **Registry contract code issue** - `instantiate()` might be failing silently
2. **JSON argument format** - `"Hub"` might need different format
3. **Timing** - Registry instantiation might take longer

**Try this:**

```bash
# Wait a bit longer
sleep 10

# Test again
cd alethea-contract/scripts
./test-new-deployment.sh

# If still not instantiated, check deployment logs
# Look for any errors during publish-and-create
```

---

## 📝 Next Steps

1. **Verify instantiation message creation**
   - Check if `publish-and-create` creates instantiation message
   - Check Linera documentation for expected behavior

2. **Check contract code**
   - Verify `instantiate()` implementation
   - Check for any errors that might prevent state saving

3. **Try alternative deployment method**
   - Use `publish-bytecode` + `create-application` separately
   - Or check if there's a way to manually trigger instantiation

---

**Last Updated:** 2026-02-01 02:15
