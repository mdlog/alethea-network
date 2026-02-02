#!/usr/bin/env python3
"""
Mint ALETHEA tokens using Linera GraphQL API
"""

import json
import requests
import sys

# Configuration
LINERA_SERVICE = "http://localhost:8082"
CHAIN_ID = "3482d6e583c1ea93461a9df51dda460cb1d855fb30d8c9c5719145b07692147b"
APP_ID = "fee1da3380b869246b647b9deedaed0403043c4474b1b347cf2f8297da674126"
FAUCET_OWNER = "a14d36f87a4d786817dfbbc64f5740e8fc8b6186d0f131ea62a442127e7364ae"

def mint_tokens(to_address: str, amount: str):
    """
    Mint ALETHEA tokens to a specific address
    
    Note: Since the ALETHEA contract doesn't expose transfer via GraphQL,
    we need to use the Linera operation execution mechanism.
    """
    
    url = f"{LINERA_SERVICE}/chains/{CHAIN_ID}/applications/{APP_ID}"
    
    # Try to query balance first to verify connection
    balance_query = {
        "query": f'{{ balance(owner: "{to_address}") }}'
    }
    
    print(f"🔍 Checking current balance for {to_address}...")
    response = requests.post(url, json=balance_query)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Current balance: {result}")
    else:
        print(f"⚠️  Could not check balance: {response.status_code}")
        print(f"Response: {response.text}")
    
    # Check token info
    info_query = {
        "query": "{ tokenInfo { name symbol decimals totalSupply } }"
    }
    
    print(f"\n🪙 Checking token info...")
    response = requests.post(url, json=info_query)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Token info: {json.dumps(result, indent=2)}")
    else:
        print(f"⚠️  Could not get token info: {response.status_code}")
    
    print(f"\n⚠️  Note: Direct minting via GraphQL is not supported.")
    print(f"The ALETHEA contract requires operation execution through Linera blocks.")
    print(f"\nTo mint tokens, you need to:")
    print(f"1. Use the Linera CLI to create a block with Mint operation")
    print(f"2. Or use the dashboard UI which handles operation execution")
    print(f"3. Or implement a proper RPC client that can sign and submit blocks")

if __name__ == "__main__":
    to_address = sys.argv[1] if len(sys.argv) > 1 else "f1008485b277add6c3b54207014df45fd8fb48e8146689ba554128a32a6f1ce8"
    amount = sys.argv[2] if len(sys.argv) > 2 else "1000."
    
    print(f"🚀 ALETHEA Token Mint Script")
    print(f"=" * 50)
    print(f"To Address: {to_address}")
    print(f"Amount: {amount}")
    print(f"Chain ID: {CHAIN_ID}")
    print(f"App ID: {APP_ID}")
    print(f"=" * 50)
    print()
    
    mint_tokens(to_address, amount)
