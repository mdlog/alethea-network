# Wallet JSON Format Guide

## 📋 Overview

HTTP Linera client sekarang support loading wallet dari JSON file dengan automatic chain ID extraction.

## 🔍 Supported Wallet Formats

### Format 1: Linera Wallet Export (Recommended)

```json
{
  "default_chain": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4",
  "chains": [
    {
      "chain_id": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4",
      "key_pair": {
        "public": "...",
        "secret": "..."
      },
      "block_hash": null,
      "timestamp": 1234567890,
      "next_block_height": 0
    }
  ]
}
```

**Chain ID extracted from**: `default_chain` field

### Format 2: Chains Array (String)

```json
{
  "chains": [
    "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4",
    "1f5495c0da27480524df518561ef33a4d05a91b7562e0975a0f4ca080890618f"
  ]
}
```

**Chain ID extracted from**: First chain in `chains` array

### Format 3: Chains Array (Objects)

```json
{
  "chains": [
    {
      "chain_id": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4"
    }
  ]
}
```

**Chain ID extracted from**: `chain_id` of first chain

### Format 4: Simple Format

```json
{
  "chainId": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4"
}
```

**Chain ID extracted from**: `chainId` field

## 🔧 How It Works

### Chain ID Extraction Priority

1. **default_chain** (highest priority)
2. **chains[0]** (if string)
3. **chains[0].chain_id** (if object)
4. **chainId** (simple format)
5. **Environment variable** (fallback)

### Implementation

```typescript
// lib/services/linera-client-http.ts
async loadWalletFromJson(walletJson: string) {
  const walletData = JSON.parse(walletJson);
  
  let chainId = CHAIN_ID; // Default from env
  
  // Try different formats
  if (walletData.default_chain) {
    chainId = walletData.default_chain;
  } else if (walletData.chains && walletData.chains.length > 0) {
    const firstChain = walletData.chains[0];
    if (typeof firstChain === 'string') {
      chainId = firstChain;
    } else if (firstChain.chain_id) {
      chainId = firstChain.chain_id;
    }
  } else if (walletData.chainId) {
    chainId = walletData.chainId;
  }
  
  // Use extracted chain ID
  this.state.chainId = chainId;
}
```

## 📝 Export Wallet from Linera CLI

### Method 1: Full Wallet Export

```bash
# Export complete wallet
linera wallet show --with-private-keys > wallet.json
```

**Output format**:
```json
{
  "default_chain": "95f032d7...",
  "chains": [...]
}
```

### Method 2: Chain List Only

```bash
# Get chain list
linera wallet show | grep "Chain ID" | awk '{print $3}' > chains.txt
```

Then create JSON:
```json
{
  "chains": ["95f032d7...", "1f5495c0..."]
}
```

### Method 3: Simple Format

Create manually:
```json
{
  "chainId": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4"
}
```

## 🚀 Usage in Dashboard

### 1. Prepare Wallet JSON

Choose one of the formats above and save to file.

### 2. Load in Dashboard

```
1. Open: http://localhost:4000/linera-demo
2. Click "Initialize Linera"
3. Click "Load Wallet from JSON"
4. Paste wallet JSON
5. Click "Load Wallet"
```

### 3. Verify Chain ID

After loading, check displayed chain ID matches your wallet.

## 🔍 Troubleshooting

### Issue: Wrong Chain ID Displayed

**Problem**: Chain ID shows environment default instead of wallet chain

**Solution**: Check wallet JSON format
```bash
# Verify JSON structure
cat wallet.json | jq .

# Check for default_chain field
cat wallet.json | jq .default_chain

# Check for chains array
cat wallet.json | jq .chains[0]
```

### Issue: "Failed to load wallet"

**Problem**: Invalid JSON format

**Solution**: Validate JSON
```bash
# Validate JSON syntax
cat wallet.json | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"
```

### Issue: Chain ID not found in wallet

**Problem**: Wallet JSON doesn't contain chain ID

**Solution**: Add chain ID manually
```json
{
  "chainId": "your_chain_id_here",
  "originalWallet": { ... }
}
```

## 📊 Examples

### Example 1: Load Default Chain

```json
{
  "default_chain": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4"
}
```

**Result**: Uses chain `95f032d7...`

### Example 2: Load Specific Chain

```json
{
  "chains": [
    "1f5495c0da27480524df518561ef33a4d05a91b7562e0975a0f4ca080890618f"
  ]
}
```

**Result**: Uses chain `1f5495c0...`

### Example 3: Multiple Chains

```json
{
  "default_chain": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4",
  "chains": [
    "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4",
    "1f5495c0da27480524df518561ef33a4d05a91b7562e0975a0f4ca080890618f"
  ]
}
```

**Result**: Uses default chain `95f032d7...`

## 🎯 Best Practices

### 1. Use Full Wallet Export

```bash
linera wallet show --with-private-keys > wallet.json
```

**Pros**:
- Complete wallet data
- Automatic chain ID extraction
- All chains included

### 2. Verify Before Loading

```bash
# Check chain ID
cat wallet.json | jq .default_chain

# Verify format
cat wallet.json | jq .
```

### 3. Keep Wallet Secure

⚠️ **Security Warning**:
- Wallet JSON contains private keys
- Don't share wallet files
- Don't commit to git
- Use secure storage

### 4. Test with Simple Format First

For testing, use simple format:
```json
{
  "chainId": "95f032d7f5160450d8aef843ad32b868b02e32c35026019064a26e2d05586aa4"
}
```

## 📝 Summary

**Supported Formats**: 4 different wallet JSON formats

**Chain ID Extraction**: Automatic from multiple fields

**Fallback**: Environment variable if not found in wallet

**Usage**: Load via dashboard UI

**Security**: Keep wallet files secure

---

**Updated**: November 16, 2025
**Version**: 2.1.0
**Status**: ✅ Multi-chain support enabled
