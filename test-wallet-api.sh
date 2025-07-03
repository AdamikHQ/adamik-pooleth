#!/bin/bash

# Test script for Wallet API
# Replace YOUR_USER_ID with an actual Privy user ID

BASE_URL="http://localhost:3000"
USER_ID="did:privy:cmcnf68ol00j4i30mxrx7hgiv"  # Replace with actual user ID

echo "🧪 Testing Wallet API"
echo "===================="

# 1. List all wallets for user
echo ""
echo "1. 📋 Listing all wallets..."
curl -X POST "$BASE_URL/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "listWallets",
    "userId": "'$USER_ID'"
  }' | jq '.'

# 2. Get Ethereum wallet address
echo ""
echo "2. 🔗 Getting Ethereum wallet address..."
curl -X POST "$BASE_URL/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getAddress",
    "userId": "'$USER_ID'",
    "chainType": "ethereum"
  }' | jq '.'

# 3. Get Solana wallet address (if available)
echo ""
echo "3. 🔗 Getting Solana wallet address..."
curl -X POST "$BASE_URL/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getAddress",
    "userId": "'$USER_ID'",
    "chainType": "solana"
  }' | jq '.'

# 4. Get wallet optimized for Adamik (Ethereum)
echo ""
echo "4. 🛠️ Getting Adamik-optimized wallet data (Ethereum)..."
curl -X POST "$BASE_URL/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getWalletForAdamik",
    "userId": "'$USER_ID'",
    "chainType": "ethereum"
  }' | jq '.'

# 5. Get public key for address derivation
echo ""
echo "5. 🔑 Getting public key..."
curl -X POST "$BASE_URL/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getPubKey",
    "userId": "'$USER_ID'",
    "chainType": "ethereum"
  }' | jq '.'

echo ""
echo "✅ Testing complete!" 