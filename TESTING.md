# Testing Guide for Adamik Agent

This guide explains how to test the Adamik agent functionality without using the voice interface.

## Prerequisites

1. **Get a User ID**: You need a valid Privy user ID. Get this by:

   - Logging into your app and checking the browser console
   - Looking at your Privy dashboard logs
   - Using the authentication endpoints

2. **Environment Setup**: Ensure your `.env.local` has:
   ```bash
   PRIVY_APP_ID=your_privy_app_id
   PRIVY_APP_SECRET=your_privy_app_secret
   ```

## Testing Methods

### Method 1: Direct API Testing (Recommended)

Use curl or Postman to test the `/api/wallet` endpoint directly:

```bash
# Make the test script executable
chmod +x test-wallet-api.sh

# Edit the script to add your user ID
nano test-wallet-api.sh
# Replace YOUR_USER_ID with actual Privy user ID

# Run the tests
./test-wallet-api.sh
```

**Available API Actions:**

- `listWallets` - Get all user wallets
- `getAddress` - Get wallet address for specific chain
- `getPubKey` - Get public key for address derivation
- `getWalletForAdamik` - Get wallet data optimized for Adamik
- `rawSign` - Sign transaction hashes

**Example Commands:**

```bash
# List all wallets
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "listWallets",
    "userId": "your_user_id"
  }'

# Get Ethereum wallet address
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getAddress",
    "userId": "your_user_id",
    "chainType": "ethereum"
  }'

# Get Solana wallet address
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getAddress",
    "userId": "your_user_id",
    "chainType": "solana"
  }'
```

### Method 2: Test API Endpoint

Use the dedicated test endpoint for comprehensive testing:

```bash
# GET request for comprehensive tests
curl "http://localhost:3000/api/test-wallet?userId=your_user_id" | jq '.'

# POST request for chain-specific tests
curl -X POST "http://localhost:3000/api/test-wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your_user_id",
    "chainTypes": ["ethereum", "solana", "polygon"]
  }' | jq '.'
```

### Method 3: Node.js Test Script

Run the Node.js script for direct service testing:

```bash
# Set your user ID
export TEST_USER_ID="your_user_id"

# Run the test script
node scripts/test-privy-service.js
```

## Testing Scenarios

### Scenario 1: Multi-Chain Wallet Testing

Test wallet retrieval across different blockchain networks:

```bash
# Test each chain type
for chain in ethereum solana polygon arbitrum; do
  echo "Testing $chain..."
  curl -X POST "http://localhost:3000/api/wallet" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "getAddress",
      "userId": "your_user_id",
      "chainType": "'$chain'"
    }' | jq ".address // \"No wallet found\""
done
```

### Scenario 2: Adamik Integration Testing

Test the Adamik-specific functionality:

```bash
# Get wallet data for Adamik API
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getWalletForAdamik",
    "userId": "your_user_id",
    "chainType": "ethereum"
  }' | jq '.'

# Get public key for address derivation
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getPubKey",
    "userId": "your_user_id",
    "chainType": "ethereum"
  }' | jq '.'
```

### Scenario 3: Error Handling Testing

Test error conditions:

```bash
# Test with invalid user ID
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "listWallets",
    "userId": "invalid_user_id"
  }'

# Test with missing user ID
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "listWallets"
  }'

# Test with unsupported chain
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getAddress",
    "userId": "your_user_id",
    "chainType": "unsupported_chain"
  }'
```

## Expected Responses

### Successful Wallet Listing

```json
{
  "wallets": [
    {
      "id": "wallet_id_123",
      "address": "0x1234...5678",
      "chainType": "ethereum",
      "walletClientType": "privy"
    }
  ]
}
```

### Successful Address Retrieval

```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "chainType": "ethereum"
}
```

### Error Response

```json
{
  "error": "No matching wallet found"
}
```

## Troubleshooting

### Common Issues

1. **"User ID is required"**: Make sure you're passing the `userId` parameter
2. **"No matching wallet found"**: User may not have a wallet for that chain type
3. **"Failed to extract public key"**: Placeholder implementation - expected for now
4. **Network errors**: Ensure your development server is running on port 3000

### Debugging Tips

1. **Check server logs**: Watch the console output for detailed error messages
2. **Verify user ID**: Make sure you're using a valid Privy user ID
3. **Test incrementally**: Start with `listWallets` to see what's available
4. **Check environment**: Ensure Privy credentials are properly configured

## Integration with Agent Tools

These same endpoints are used by the Adamik agent tools:

- `getPubKey` tool → `/api/wallet` with action `getPubKey`
- `getAddress` tool → `/api/wallet` with action `getAddress`
- `signTransaction` tool → `/api/wallet` with action `rawSign`

By testing these endpoints directly, you're validating the same code paths the voice agent uses.
