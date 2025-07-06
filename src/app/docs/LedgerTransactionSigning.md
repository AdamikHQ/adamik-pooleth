# Ledger Transaction Signing

This document explains how to use the new Ledger transaction signing functionality that was added to the application.

## Overview

The transaction signing feature allows users to sign Ethereum transactions (and any EVM-compatible chain transactions) using their Ledger hardware wallet. This provides secure, hardware-based transaction signing with a user-friendly interface.

## Components

### 1. `LedgerSignTransactionModal`

A React modal component that handles the complete transaction signing flow:

- Device discovery and connection
- Ethereum app opening
- Transaction review and signing
- Error handling and retry functionality

### 2. `useLedgerSignTransaction` Hook

A React hook that provides a simple interface for transaction signing:

```typescript
const { signTransaction, isModalOpen, result, closeModal } =
  useLedgerSignTransaction();
```

## Usage Examples

### Basic Usage (Direct Modal)

```typescript
import {
  LedgerSignTransactionModal,
  type EthereumTransaction,
} from "./components/LedgerSignTransactionModal";

const transaction: EthereumTransaction = {
  to: "0x742C15d71eE3Ca0065B1dd95d31F4b43b4e7A8f8",
  value: "1000000000000000000", // 1 ETH in wei
  data: "0x",
  gasLimit: "21000",
  gasPrice: "20000000000", // 20 gwei
  nonce: "1",
  chainId: 1, // Ethereum mainnet
};

<LedgerSignTransactionModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  transaction={transaction}
  derivationPath="44'/60'/0'/0/0"
  onComplete={(result) => {
    console.log("Transaction signed:", result.signedTransaction);
    // Handle successful signing
  }}
  onError={(error) => {
    console.error("Signing failed:", error);
    // Handle error
  }}
/>;
```

### Using the Hook (Recommended)

```typescript
import { useLedgerSignTransaction } from "./components/LedgerSignTransactionModal";

function MyComponent() {
  const { signTransaction } = useLedgerSignTransaction();

  const handleSignTransaction = async () => {
    try {
      const result = await signTransaction({
        to: "0x742C15d71eE3Ca0065B1dd95d31F4b43b4e7A8f8",
        value: "1000000000000000000",
        gasLimit: "21000",
        gasPrice: "20000000000",
        nonce: "1",
        chainId: 137, // Polygon
      });

      console.log("Signed transaction:", result.signedTransaction);
      // Send transaction to blockchain
      await sendTransaction(result.signedTransaction.rawTransaction);
    } catch (error) {
      console.error("Signing failed:", error);
    }
  };

  return <button onClick={handleSignTransaction}>Sign Transaction</button>;
}
```

## Transaction Parameters

The `EthereumTransaction` interface supports all standard Ethereum transaction fields:

```typescript
interface EthereumTransaction {
  to: string; // Recipient address
  value: string; // Value in wei
  data?: string; // Contract call data (optional)
  gasLimit: string; // Gas limit
  gasPrice?: string; // Gas price (legacy)
  maxFeePerGas?: string; // Max fee per gas (EIP-1559)
  maxPriorityFeePerGas?: string; // Max priority fee (EIP-1559)
  nonce: string; // Transaction nonce
  chainId: number; // Network chain ID
}
```

## Supported Networks

The signing functionality works with any EVM-compatible network:

- **Ethereum** (chainId: 1)
- **Polygon** (chainId: 137)
- **BSC** (chainId: 56)
- **Arbitrum** (chainId: 42161)
- **Optimism** (chainId: 10)
- **Base** (chainId: 8453)
- **Avalanche** (chainId: 43114)
- **Fantom** (chainId: 250)
- And any other EVM chain

## Return Value

The signing result includes:

```typescript
interface LedgerSignTransactionResult {
  success: boolean;
  signedTransaction?: SignedTransaction;
  deviceId?: string;
  deviceName?: string;
  error?: string;
}

interface SignedTransaction {
  rawTransaction: string; // Signed transaction ready to broadcast
  signature: {
    r: string;
    s: string;
    v: string;
  };
  hash: string; // Transaction hash
}
```

## Error Handling

The modal provides comprehensive error handling:

- **Device not found**: Prompts user to connect and unlock Ledger
- **App not open**: Guides user to open Ethereum app
- **User rejection**: Handles transaction rejection on device
- **Connection issues**: Provides retry functionality
- **Timeout errors**: Handles device communication timeouts

## Best Practices

1. **Always validate transaction parameters** before signing
2. **Show transaction details** to users for review
3. **Handle errors gracefully** with user-friendly messages
4. **Use appropriate gas settings** for the target network
5. **Verify chain ID** matches the intended network
6. **Store derivation paths securely** if using custom paths

## Integration with Backend Services

After getting the signed transaction, you can broadcast it to the blockchain:

```typescript
const result = await signTransaction(transaction);

// Send to your backend or directly to RPC
const response = await fetch("/api/broadcast-transaction", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    signedTransaction: result.signedTransaction.rawTransaction,
    chainId: transaction.chainId,
  }),
});
```

## Security Considerations

- ✅ **Hardware security**: Private keys never leave the Ledger device
- ✅ **User confirmation**: All transactions require physical confirmation
- ✅ **Transaction review**: Users see all transaction details on device
- ✅ **Network validation**: Chain ID is verified during signing
- ✅ **Secure transport**: All communication uses secure protocols

## Troubleshooting

### Common Issues

1. **"Device not found"**

   - Ensure Ledger is connected via USB
   - Make sure device is unlocked
   - Try a different USB port/cable

2. **"Ethereum app not open"**

   - Navigate to Ethereum app on Ledger
   - Press both buttons to open the app

3. **"Transaction rejected"**

   - User pressed left button (reject) on device
   - Review transaction details and try again

4. **"Timeout error"**
   - Device communication timeout
   - Ensure device is responsive
   - Try again with longer timeout

### Debug Mode

Enable debug logging by opening browser console to see detailed flow information:

```javascript
// All signing operations log detailed information
console.log("🚀 Starting transaction signing flow");
console.log("📄 Transaction:", transaction);
console.log("✅ Transaction signed successfully");
```
