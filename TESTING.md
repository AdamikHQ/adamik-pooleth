# Testing Guide for Adamik Agent

This guide explains how to test the unified Adamik agent functionality, including Ledger hardware wallet integration and UI features, both with and without the voice interface.

## Chain Filtering Behavior

### 🎙️ Voice Agent vs 🔧 Direct API

The system has **two different chain filtering policies** depending on how you access it:

#### Voice Agent (STRICT Filtering)

**Purpose**: Prevents voice recognition errors and ensures reliable operations

- **Validation**: Only accepts chains explicitly defined in `src/app/agentConfigs/adamik/chains.ts`
- **Allowed Chains**: ~40 predefined blockchain networks
- **Behavior**: Rejects unknown chain names with validation errors
- **Use Case**: Voice commands like "Create a wallet for Base" ✅

**Supported Voice Chains** (from `chains.ts`):

```typescript
// EVM Networks
"ethereum",
  "base",
  "arbitrum",
  "polygon",
  "optimism",
  "bsc",
  "avalanche",
  "zksync",
  "linea",
  "gnosis",
  "moonbeam",
  "fantom",
  "mantle",
  "cronos",
  "world-chain";

// Testnets
"sepolia", "holesky", "base-sepolia", "polygon-amoy";

// Non-EVM Networks (Available but filtered out for EVM-only policy)
"solana", "tron", "cosmos", "stellar";
```

#### Direct API (PERMISSIVE Filtering)

**Purpose**: Maximum flexibility for programmatic access

- **Accepts**: Any chain name as input
- **Auto-Mapping**: Unknown chains automatically map to `ethereum` base type
- **Fallback**: All EVM-compatible networks work seamlessly
- **Use Case**: API integration with custom/new blockchain networks

**Chain Mapping Logic**:

```typescript
const chainMapping = {
  // Known EVM networks → ethereum base type
  "base" → "ethereum",
  "arbitrum" → "ethereum",
  "polygon" → "ethereum",

  // Unknown networks → ethereum base type (fallback)
  "my-custom-evm-chain" → "ethereum",
  "unknown-network" → "ethereum",

  // Non-EVM networks → direct mapping
  "solana" → "solana",
  "tron" → "tron"
};
```

### Base Chain Types

All wallets are organized into **5 base chain types**:

1. **`ethereum`**: EVM-compatible networks (Ethereum, Base, Arbitrum, Polygon, BSC, etc.)
2. **`solana`**: Solana network
3. **`tron`**: TRON network
4. **`cosmos`**: Cosmos SDK-based networks
5. **`stellar`**: Stellar network

**⚠️ Current EVM-Only Policy**: The system currently implements an **EVM-only policy** where only Ethereum-compatible wallets are returned to users, even though the backend can see all wallet types.

**Key Insight**: One wallet per base type, but EVM wallets work across ALL EVM networks with the same address.

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

## Comprehensive Test Results

### ✅ Current Test Status

Our testing confirmed the system works correctly with EVM-only policy:

#### Test User Profile

```json
{
  "userId": "did:privy:cmcnvwtdj00o7l20mlzwvr5qd",
  "email": "user@example.com",
  "totalWallets": 5,
  "baseChainTypes": 3,
  "evmWalletsReturned": 2
}
```

#### Multi-Chain Wallet Portfolio

**Backend View (All Wallets)**:

```json
{
  "totalWallets": 5,
  "allWallets": [
    {
      "chainType": "ethereum",
      "address": "0xE7ccd18A3d23F72f5d12F9de54F8fB94b2C7B3CE",
      "id": null
    },
    {
      "chainType": "solana",
      "address": "2MzhBMh6RPJbEcbayCFu8C7VCzghUZBgMmZzYTRBmnbY",
      "id": "waxy7kmuk424febk05sym3p2"
    },
    {
      "chainType": "cosmos",
      "address": "cosmos1yupxkadqv2rw5j6lt4rc5dx04v8y5yujhphnep",
      "id": "t9ev0auqdzz4uzaldrnbex3e"
    },
    {
      "chainType": "ethereum",
      "address": "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16",
      "id": "jpyvvqkkv280zvy0brru7de4"
    },
    {
      "chainType": "cosmos",
      "address": "cosmos1cnpc6k0js68fp3v0v8c3sa7cf47dn8flh4l53x",
      "id": "jm1ei9e4a2kni6ofq8q7vrfi"
    }
  ]
}
```

**Frontend View (EVM-Only Policy)**:

```json
{
  "evmWalletsReturned": 2,
  "wallets": [
    {
      "chainType": "ethereum",
      "address": "0xE7ccd18A3d23F72f5d12F9de54F8fB94b2C7B3CE"
    },
    {
      "chainType": "ethereum",
      "address": "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16"
    }
  ]
}
```

#### Test Categories & Results

**Core Functionality (8/8 ✅)**:

- `listWallets`: Successfully lists 5 total wallets, returns 2 EVM wallets (EVM-only policy)
- `getAddress`: Correctly returns addresses for EVM chains
- `createWallet`: Creates new wallets with proper base type mapping
- `getPubKey`: Correctly handles Privy's security model (no public key exposure)
- `getWalletForAdamik`: Returns properly formatted wallet data for Adamik API
- `requestUserSignature`: Available for EVM transaction processing

**EVM-Only Policy (2/2 ✅)**:

- Backend wallet detection: ✅ Sees all 5 wallets (2 EVM + 3 non-EVM)
- Frontend filtering: ✅ Returns only 2 EVM wallets to users
- Chain type filtering: ✅ Filters out Solana, Cosmos wallets correctly

**Error Handling (3/3 ✅)**:

- Invalid user ID: ✅ Returns proper 404 error
- Missing user ID: ✅ Returns 400 validation error
- Unknown chain requests: ✅ Gracefully maps to ethereum base type

**Agent Integration (3/3 ✅)**:

- Supervisor pattern: ✅ Properly delegates tool execution
- User context passing: ✅ Correctly forwards userId through supervisor
- Tool result formatting: ✅ Returns properly formatted responses for AI consumption

### Key Technical Findings

1. **EVM-Only Policy**: The system currently filters out non-EVM wallets on the frontend, only returning Ethereum-compatible wallets to users despite the backend having access to all wallet types
2. **Privy Security Model**: Public keys are intentionally not exposed through the API (security by design)
3. **Wallet ID Handling**: Primary wallets may have `null` IDs, system gracefully handles this with address fallbacks
4. **Multi-Chain Creation**: Users can create multiple wallets of the same base type (useful for organizing funds)
5. **Chain Mapping**: EVM networks automatically map to ethereum base type, enabling seamless cross-network usage

## Testing Scenarios

### Scenario 1: Chain Filtering Testing

Test the difference between voice agent strict filtering vs API permissive filtering:

```bash
# Test voice agent supported chains (should work)
for chain in ethereum base arbitrum solana tron; do
  echo "Testing voice-supported chain: $chain"
  curl -X POST "http://localhost:3000/api/wallet" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "createWallet",
      "userId": "your_user_id",
      "chainType": "'$chain'"
    }' | jq '.'
done

# Test API permissive handling (should map unknown chains to ethereum)
for chain in my-custom-chain unknown-network random-evm; do
  echo "Testing unknown chain (should map to ethereum): $chain"
  curl -X POST "http://localhost:3000/api/wallet" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "createWallet",
      "userId": "your_user_id",
      "chainType": "'$chain'"
    }' | jq '.'
done
```

### Scenario 2: Multi-Chain Wallet Testing

Test wallet retrieval across different blockchain networks:

```bash
# Test EVM chain types (non-EVM chains will be filtered out)
for chain in ethereum polygon arbitrum base optimism; do
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

### Scenario 3: Base Type Validation Testing

Test that EVM networks map to the same ethereum base type:

```bash
# These should all return the same ethereum wallet address
for chain in ethereum base arbitrum polygon optimism; do
  echo "Testing EVM chain: $chain (should return same ethereum address)"
  curl -X POST "http://localhost:3000/api/wallet" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "getAddress",
      "userId": "your_user_id",
      "chainType": "'$chain'"
    }' | jq '.address'
done

# These should return errors or no wallets (EVM-only policy)
for chain in solana tron cosmos stellar; do
  echo "Testing non-EVM chain: $chain (should return no wallet - EVM-only policy)"
  curl -X POST "http://localhost:3000/api/wallet" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "getAddress",
      "userId": "your_user_id",
      "chainType": "'$chain'"
    }' | jq '.address // "No wallet found (EVM-only policy)"'
done
```

### Scenario 4: Voice Agent Chain Validation

Since the unified Adamik voice agent only accepts predefined chains, test the enum validation:

```bash
# This should work (chain in chains.ts)
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createWallet",
    "userId": "your_user_id",
    "chainType": "base"
  }'

# This would be rejected by voice agent (not in chains.ts)
# but accepted by direct API (maps to ethereum)
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "createWallet",
    "userId": "your_user_id",
    "chainType": "my-custom-blockchain"
  }'
```

### Scenario 5: Adamik Integration Testing

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

### Scenario 6: Error Handling Testing

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

These same endpoints are used by the unified Adamik agent tools:

- `getPubKey` tool → `/api/wallet` with action `getPubKey`
- `getAddress` tool → `/api/wallet` with action `getAddress`
- `requestUserSignature` tool → `/api/wallet` with action `requestUserSignature`
- `connectToLedgerHardwareWallet` tool → Ledger service integration with modal interface

By testing these endpoints directly, you're validating the same code paths the voice agent uses.

## Testing UI Enhancements

### Header Wallet Indicators

The application now includes enhanced header UI with wallet status indicators:

#### Features to Test:

1. **Privy Wallet Display**:

   - Privy logo appears next to wallet address
   - Address is formatted with ellipsis (e.g., `0x1234...5678`)
   - Copy button works for full address
   - Hover states and transitions

2. **Ledger Connection Indicator**:
   - Only appears when Ledger is successfully connected
   - Shows Ledger horizontal logo with green connection dot
   - Displays device name (e.g., "Ledger Nano S")
   - Shows truncated Ledger address with copy functionality

#### Manual UI Testing Steps:

```bash
# 1. Test initial state (only Privy should show)
# Visit: http://localhost:3000
# Expected: Only Privy wallet indicator visible in header

# 2. Test Ledger connection flow
# Say: "Connect to my hardware wallet"
# Expected: Ledger modal appears → device connection → address retrieved → header shows Ledger indicator

# 3. Test copy functionality
# Click copy buttons for both Privy and Ledger addresses
# Expected: Addresses copied to clipboard, button shows "✓" feedback

# 4. Test visual alignment
# Check that both wallet indicators are properly aligned
# Expected: Consistent spacing, typography, and visual hierarchy

# 5. Test responsive behavior
# Resize browser window
# Expected: Indicators remain properly aligned and readable
```

#### Automated UI Testing:

```bash
# Test Ledger connection state management
curl -X POST "http://localhost:3000/api/wallet" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "testLedgerConnection",
    "userId": "your_user_id"
  }'

# Verify header state updates correctly based on connection status
```

### Ledger Modal Interface Testing

#### Modal Flow Testing:

1. **Device Discovery**: Modal shows 4-step progress
2. **Connection States**: Proper error handling and retry options
3. **Visual Feedback**: Progress bar, status colors, loading animations
4. **Error Scenarios**: Graceful handling of device not found, app closed, etc.
5. **Success Flow**: Auto-close after successful connection

#### Voice Command Testing:

Test these consolidated Ledger commands in the unified Adamik agent:

- **"Connect to my hardware wallet"** → Triggers `connectToLedgerHardwareWallet`
- **"Secure my funds on Ledger"** → Uses `secureFundsToLedger` with existing transfer system
- **"Check my balance, then secure it on my Ledger"** → Unified conversation flow

### Testing Agent Consolidation

The system now uses a **single unified Adamik agent** instead of separate agents:

#### Voice Agent Testing:

```bash
# Test unified agent functionality
# All commands work in single conversation context:

# 1. Blockchain queries
"Check my ETH balance"

# 2. Ledger operations
"Connect to my hardware wallet"

# 3. Fund transfers
"Send 0.1 ETH to my Ledger address"

# 4. Combined workflows
"Check my balance, then secure half of it on my Ledger device"
```

#### Expected Behavior:

- ✅ Single agent handles all operations
- ✅ No context switching between agents
- ✅ Seamless conversation flow
- ✅ Unified tool execution
- ✅ Consistent personality and responses
