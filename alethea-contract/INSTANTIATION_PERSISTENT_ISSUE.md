# ⚠️ Persistent Instantiation Issue

**Status:** Contract deployment succeeds but `instantiate()` never called

---

## 🔍 Problem Summary

- ✅ `publish-and-create` succeeds (App ID created)
- ✅ Token contract instantiated (works via GraphQL)
- ❌ Registry contract **NOT instantiated** (error "Failed to load state: BcsError(Eof)")
- ⚠️ `linera process-inbox` shows "0 blocks" (no messages)

---

## 🔍 Root Cause Hypothesis

### **Hypothesis 1: Instantiation Message Not Created**

`publish-and-create` dengan `--json-argument` seharusnya:
1. Create application
2. Call `instantiate()` with argument
3. Save state

Tapi sepertinya step 2-3 tidak terjadi untuk Registry contract.

### **Hypothesis 2: Instantiation Fails Silently**

Instantiation message dibuat tapi:
- `instantiate()` fails dengan error yang tidak terlihat
- State tidak di-save karena error
- Error tidak muncul di logs

### **Hypothesis 3: Format Issue**

JSON argument format `"Hub"` mungkin tidak benar untuk Registry contract.
Mungkin perlu format berbeda atau ada masalah dengan deserialization.

---

## ✅ Solutions Tried

1. ✅ Added `linera sync` and `linera process-inbox` after deployment
2. ✅ Added wait time for state to save
3. ✅ Updated deployment script to auto-update .env.local
4. ✅ Created diagnostic scripts
5. ❌ Still not working - contract remains uninstantiated

---

## 🔧 Next Steps to Investigate

### **Step 1: Check Deployment Logs**

Look for instantiation-related messages in deployment output:
- "Initializing Oracle Registry"
- "Hub initialized successfully"
- Any errors during `publish-and-create`

### **Step 2: Verify JSON Argument Format**

Check if `"Hub"` is the correct format. Try:
- `{"Hub": null}` or `{"Hub": {}}`
- Check contract code for expected format

### **Step 3: Check Linera Version**

Different Linera versions might handle `publish-and-create` differently:
```bash
linera --version
```

### **Step 4: Try Alternative Deployment Method**

If `publish-and-create` doesn't work, try:
1. `publish-bytecode` first
2. `create-application` with `--json-argument` separately

### **Step 5: Check Contract Code**

Verify `instantiate()` implementation:
- Check for any panics or errors
- Verify `state.save()` is called
- Check if there are any conditions that prevent instantiation

---

## 📝 Workaround (If Needed)

If instantiation cannot be fixed automatically:

1. **Use Token Contract Pattern**
   - Token contract instantiates successfully
   - Check what's different between Token and Registry deployment
   - Apply same pattern to Registry

2. **Manual State Initialization**
   - If Linera supports it, manually initialize state
   - Or create a separate initialization operation

3. **Contact Linera Support**
   - This might be a Linera platform issue
   - Report the issue with deployment logs

---

**Last Updated:** 2026-02-01 02:15  
**Status:** Under Investigation
