// Adamik Supervisor Agent
// -----------------------
// This file defines the supervisor agent for Adamik. It is responsible for implementing the actual logic for all tools.
// The supervisor agent is typically powered by a more capable model (e.g., gpt-4.1) and is called by the main agent for all tool executions.

import { chains } from "./chains";
import {
  GetAccountStatePathParams,
  GetAccountHistoryPathParams,
  GetAccountHistoryQueryParams,
  GetChainValidatorsPathParams,
  GetChainValidatorsQueryParams,
  GetTransactionDetailsPathParams,
  PubkeyToAddressPathParams,
  PubkeyToAddressRequestBody,
} from "./schemas";
import { makeProxyRequest } from "@/app/services/adamik";
import { makeWalletRequest } from "@/app/lib/api";

// Helper function to map chain IDs to their base chain types
// EVM-ONLY: All supported chains map to ethereum base type
// const getChainTypeFromChainId = (chainId: string): string => {
//   // Map all EVM-compatible chain IDs to ethereum base wallet type
//   const evmChains = [
//     // Ethereum mainnet and testnets
//     "ethereum",
//     "ethereum-goerli",
//     "ethereum-sepolia",
//     "holesky",

//     // Layer 2 and sidechains
//     "polygon",
//     "polygon-mumbai",
//     "polygon-amoy",
//     "arbitrum",
//     "arbitrum-goerli",
//     "arbitrum-sepolia",
//     "optimism",
//     "optimism-goerli",
//     "optimism-sepolia",
//     "base",
//     "base-goerli",
//     "base-sepolia",

//     // Other EVM networks
//     "avalanche",
//     "avalanche-fuji",
//     "bsc",
//     "bsc-testnet",
//     "zksync",
//     "zksync-sepolia",
//     "linea",
//     "linea-sepolia",
//     "gnosis",
//     "gnosis-chiado",
//     "moonbeam",
//     "moonriver",
//     "moonbase",
//     "fantom",
//     "mantle",
//     "rootstock",
//     "rootstock-testnet",
//     "chiliz",
//     "chiliz-testnet",
//     "cronos",
//     "world-chain",
//     "monad-testnet",
//     "berachain",
//     "berachain-bepolia",
//     "injective-evm-testnet",
//   ];

//   // All EVM chains use ethereum base type
//   if (evmChains.includes(chainId)) {
//     return "ethereum";
//   }

//   // Default to ethereum for unknown chains (assumed EVM-compatible)
//   return "ethereum";
// };

// Tool logic implementations for all supported tools
const toolLogic: Record<string, any> = {
  // Returns a list of supported chain IDs
  getSupportedChains: async () => {
    const text = chains.join(",");
    return { content: [{ type: "text", text }] };
  },
  // Returns chain features and native currency info
  listFeatures: async ({ chainId }: { chainId: string }) => {
    if (!chains.includes(chainId)) {
      throw new Error(`Chain ${chainId} is not supported`);
    }
    const features = await makeProxyRequest(`/chains/${chainId}`);
    const text = JSON.stringify(features);
    return { content: [{ type: "text", text }] };
  },
  // Fetches token details for a given chain and token
  getTokenDetails: async ({
    chainId,
    tokenId,
  }: {
    chainId: string;
    tokenId: string;
  }) => {
    const details = await makeProxyRequest(`/${chainId}/token/${tokenId}`);
    const text = JSON.stringify(details);
    return { content: [{ type: "text", text }] };
  },
  // Gets the public key for a wallet
  getPubKey: async (
    params: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    const pubKey = await makeWalletRequest("getPubKey", params, userContext);
    const text = JSON.stringify(pubKey);
    return { content: [{ type: "text", text }] };
  },
  // Gets the wallet address
  getAddress: async (
    params: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    const address = await makeWalletRequest("getAddress", params, userContext);
    const text = JSON.stringify(address);
    return { content: [{ type: "text", text }] };
  },
  // Lists all wallets for the user (EVM-only)
  listWallets: async (
    params: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    const wallets = await makeWalletRequest("listWallets", params, userContext);
    const text = JSON.stringify(wallets);
    return { content: [{ type: "text", text }] };
  },
  // Creates a new EVM wallet
  createWallet: async (
    { chainType }: { chainType: string },
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    if (!chains.includes(chainType)) {
      throw new Error(
        `Chain ${chainType} is not supported. Supported chains: ${chains.join(
          ", "
        )}`
      );
    }

    // EVM-ONLY: All supported chains use ethereum base type
    const baseChainType = "ethereum";

    // Call makeWalletRequest for createWallet, expecting { wallet, alreadyExisted }
    const result = await makeWalletRequest(
      "createWallet",
      { chainType: baseChainType },
      userContext
    );

    // Include the requested chain in the response for context
    if (result && typeof result === "object" && "wallet" in result) {
      result.requestedChain = chainType;
      result.baseChainType = baseChainType;
    }

    const text = JSON.stringify(result);
    return { content: [{ type: "text", text }] };
  },
  // Derives a blockchain-specific address from a public key
  deriveAddress: async ({
    chainId,
    pubkey,
  }: PubkeyToAddressPathParams & PubkeyToAddressRequestBody) => {
    const details = await makeProxyRequest(
      `/${chainId}/address/encode`,
      "POST",
      JSON.stringify({ pubkey })
    );
    const text = JSON.stringify(details);
    return { content: [{ type: "text", text }] };
  },
  // Gets account state (balances, staking, etc.)
  getAccountState: async ({
    chainId,
    accountId,
  }: GetAccountStatePathParams) => {
    // 1. Fetch the account state
    const state = await makeProxyRequest(
      `/${chainId}/account/${accountId}/state`
    );

    // 2. Verify/format native balance decimals
    if (state?.balances?.native && state.balances.native.available != null) {
      // Fetch chain features to get native decimals
      const features = await makeProxyRequest(`/chains/${chainId}`);
      const decimals = features?.chain?.decimals;

      if (typeof decimals === "number") {
        const rawValue = Number(state.balances.native.available);
        const divisor = Math.pow(10, decimals);
        const formattedValue = rawValue / divisor;

        state.balances.native.formattedAvailable = formattedValue.toString();
        state.balances.native.decimals = decimals;
      }
    }

    // 3. Verify/format token balances decimals
    if (state?.balances?.tokens && Array.isArray(state.balances.tokens)) {
      for (const token of state.balances.tokens) {
        // Check for correct token structure: token.token.id and token.amount
        if (token.token?.id && token.amount != null) {
          // First, try to use decimals already provided in the response
          let decimals = token.token.decimals;

          // If decimals is a string, convert to number
          if (typeof decimals === "string") {
            decimals = parseInt(decimals, 10);
          }

          // If no decimals in response or invalid, fetch token details
          if (typeof decimals !== "number" || isNaN(decimals)) {
            try {
              const tokenDetails = await makeProxyRequest(
                `/${chainId}/token/${token.token.id}`
              );
              decimals = tokenDetails?.decimals;
            } catch (error) {
              console.warn(
                `Failed to fetch token details for ${token.token.id}:`,
                error
              );
              // Skip formatting for this token if we can't get decimals
              continue;
            }
          }

          if (typeof decimals === "number" && !isNaN(decimals)) {
            const rawValue = Number(token.amount);
            const divisor = Math.pow(10, decimals);
            const formattedValue = rawValue / divisor;

            token.formattedAmount = formattedValue.toString();
            token.decimals = decimals;

            console.log(
              `✅ Formatted token balance: ${
                token.token.ticker || token.token.name
              } - ${rawValue} (raw) → ${formattedValue} (formatted) with ${decimals} decimals`
            );
          }
        }
      }
    }

    const text = JSON.stringify(state);
    return { content: [{ type: "text", text }] };
  },
  // Gets account transaction history
  getAccountHistory: async ({
    chainId,
    accountId,
    nextPage,
  }: GetAccountHistoryPathParams & GetAccountHistoryQueryParams) => {
    const history = await makeProxyRequest(
      `/${chainId}/account/${accountId}/history${
        nextPage ? `?nextPage=${nextPage}` : ""
      }`
    );
    const text = JSON.stringify(history);
    return { content: [{ type: "text", text }] };
  },
  // Gets validators for staking
  getChainValidators: async ({
    chainId,
    nextPage,
  }: GetChainValidatorsPathParams & GetChainValidatorsQueryParams) => {
    const validators = await makeProxyRequest(
      `/${chainId}/validators${nextPage ? `?nextPage=${nextPage}` : ""}`
    );
    const text = JSON.stringify(validators);
    return { content: [{ type: "text", text }] };
  },
  // Gets details for a specific transaction
  getTransactionDetails: async ({
    chainId,
    transactionId,
  }: GetTransactionDetailsPathParams) => {
    const transaction = await makeProxyRequest(
      `/${chainId}/transaction/${transactionId}`
    );
    const text = JSON.stringify(transaction);
    return { content: [{ type: "text", text }] };
  },

  // Sends EVM transactions using Privy's built-in sendTransaction
  requestUserSignature: async (
    params: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    // Extract transaction parameters from the request
    const { to, value, chainId, data, gasLimit, description } = params;

    // Validate required parameters
    if (!to) {
      throw new Error("Missing 'to' parameter - recipient address is required");
    }

    if (!value && value !== 0) {
      throw new Error(
        "Missing 'value' parameter - transaction amount is required"
      );
    }

    if (!chainId) {
      throw new Error("Missing 'chainId' parameter - chain ID is required");
    }

    // Ensure chainId is EVM compatible (since we're using Privy sendTransaction)
    const evmChains = [
      "ethereum",
      "sepolia",
      "holesky",
      "base",
      "base-sepolia",
      "optimism",
      "optimism-sepolia",
      "arbitrum",
      "arbitrum-sepolia",
      "polygon",
      "polygon-amoy",
      "bsc",
      "bsc-testnet",
      "avalanche",
      "avalanche-fuji",
      "zksync",
      "zksync-sepolia",
      "linea",
      "linea-sepolia",
      "gnosis",
      "gnosis-chiado",
      "moonbeam",
      "moonriver",
      "moonbase",
      "fantom",
      "mantle",
      "rootstock",
      "rootstock-testnet",
      "chiliz",
      "chiliz-testnet",
      "cronos",
      "world-chain",
      "monad-testnet",
      "berachain",
      "berachain-bepolia",
      "injective-evm-testnet",
    ];

    if (!evmChains.includes(chainId)) {
      throw new Error(
        `Chain ${chainId} is not supported for Privy sendTransaction. ` +
          `Supported EVM chains: ${evmChains.join(", ")}`
      );
    }

    // Prepare transaction request for Privy
    const transactionRequest = {
      to,
      value: value.toString(), // Ensure string format for Privy
      chainId,
      ...(data && { data }),
      ...(gasLimit && { gasLimit }),
    };

    // Return a transaction request that the frontend will recognize
    const response = {
      type: "transaction_request",
      data: transactionRequest,
      message: `Transaction ready for sending. ${
        description || "Please review and confirm the transaction."
      }`,
    };

    const text = JSON.stringify(response);
    return { content: [{ type: "text", text }] };
  },

  // NEW: Sends ERC-20 token transfers using Privy's built-in sendTransaction
  // This tool generates ERC-20 transfer data directly and uses Privy's native transaction support
  sendTokenTransfer: async (
    params: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    // Extract token transfer parameters
    const { tokenAddress, to, amount, chainId, description } = params;

    // Validate required parameters
    if (!tokenAddress) {
      throw new Error(
        "Missing 'tokenAddress' parameter - token contract address is required"
      );
    }

    if (!to) {
      throw new Error("Missing 'to' parameter - recipient address is required");
    }

    if (!amount) {
      throw new Error("Missing 'amount' parameter - token amount is required");
    }

    if (!chainId) {
      throw new Error("Missing 'chainId' parameter - chain ID is required");
    }

    // Ensure chainId is EVM compatible
    const evmChains = [
      "ethereum",
      "sepolia",
      "holesky",
      "base",
      "base-sepolia",
      "optimism",
      "optimism-sepolia",
      "arbitrum",
      "arbitrum-sepolia",
      "polygon",
      "polygon-amoy",
      "bsc",
      "bsc-testnet",
      "avalanche",
      "avalanche-fuji",
      "zksync",
      "zksync-sepolia",
      "linea",
      "linea-sepolia",
      "gnosis",
      "gnosis-chiado",
      "moonbeam",
      "moonriver",
      "moonbase",
      "fantom",
      "mantle",
      "rootstock",
      "rootstock-testnet",
      "chiliz",
      "chiliz-testnet",
      "cronos",
      "world-chain",
      "monad-testnet",
      "berachain",
      "berachain-bepolia",
      "injective-evm-testnet",
    ];

    if (!evmChains.includes(chainId)) {
      throw new Error(
        `Chain ${chainId} is not supported for token transfers. ` +
          `Supported EVM chains: ${evmChains.join(", ")}`
      );
    }

    try {
      console.log("🪙 Encoding ERC-20 transfer data directly...");

      // Generate ERC-20 transfer function call data
      // Function signature: transfer(address,uint256)
      // Function selector: 0xa9059cbb (first 4 bytes of keccak256("transfer(address,uint256)"))

      // Remove 0x prefix from recipient address if present
      const cleanRecipient = to.startsWith("0x") ? to.slice(2) : to;

      // Ensure recipient address is 40 characters (20 bytes)
      if (cleanRecipient.length !== 40) {
        throw new Error("Invalid recipient address format");
      }

      // Convert amount to BigInt and then to hex (32 bytes, big-endian)
      const amountBigInt = BigInt(amount);
      const amountHex = amountBigInt.toString(16).padStart(64, "0");

      // Construct the function call data
      const functionSelector = "a9059cbb"; // transfer(address,uint256)
      const recipientPadded = cleanRecipient.padStart(64, "0"); // 32 bytes
      const amountPadded = amountHex; // 32 bytes

      const transferData = `0x${functionSelector}${recipientPadded}${amountPadded}`;

      console.log("✅ ERC-20 transfer data encoded successfully");
      console.log(`📋 Function: transfer(${to}, ${amount})`);
      console.log(`📋 Data length: ${transferData.length} characters`);

      // Use Privy's requestUserSignature with the encoded token data
      console.log("🔄 Preparing token transfer for user signature...");

      const signatureResult = await toolLogic.requestUserSignature(
        {
          to: tokenAddress, // Send to the token contract
          value: "0", // No ETH value for token transfers
          chainId,
          data: transferData, // Include the encoded ERC-20 transfer data
          description: description || `Send ${amount} tokens to ${to}`,
        },
        userContext
      );

      console.log("✅ Token transfer ready for user signature");

      // Return the transaction request
      return signatureResult;
    } catch (error) {
      console.error("❌ Token transfer failed:", error);
      throw new Error(
        `Token transfer failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },

  // Hardware Wallet (Ledger) Integration Tools
  // ==========================================

  // Initiate Ledger connection flow through modal
  connectToLedgerHardwareWallet: async () => {
    try {
      console.log("🔐 Initiating Ledger hardware wallet connection...");

      // Check if trigger function exists
      if (typeof (window as any).__triggerLedgerModal !== "function") {
        console.error(
          "❌ __triggerLedgerModal function not found on window object"
        );
        throw new Error(
          "Ledger modal trigger function not available. Please refresh the page."
        );
      }

      console.log("✅ Found __triggerLedgerModal function, proceeding...");

      // Trigger the modal flow and wait for result
      const result = await new Promise<any>((resolve, reject) => {
        // Store the promise resolvers globally so the modal can access them
        const promiseId = Math.random().toString(36).substr(2, 9);
        console.log(
          `🆔 Creating __ledgerConnectionPromise with ID: ${promiseId}`
        );

        (window as any).__ledgerConnectionPromise = {
          resolve,
          reject,
          id: promiseId,
        };

        console.log("📞 Calling __triggerLedgerModal()...");
        // Trigger the modal to open
        (window as any).__triggerLedgerModal?.();

        // Set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.warn(
            `⏰ Ledger connection timed out after 60 seconds for promise ${promiseId}`
          );
          // Clean up the global promise before rejecting
          if ((window as any).__ledgerConnectionPromise?.id === promiseId) {
            delete (window as any).__ledgerConnectionPromise;
            console.log(`🧹 Cleaned up timed out promise ${promiseId}`);
          }
          reject(new Error("Ledger connection timed out after 60 seconds"));
        }, 60000);

        // Store timeout ID for potential cleanup
        (window as any).__ledgerConnectionPromise.timeoutId = timeoutId;
      });

      console.log("🎉 Received result from Ledger modal:", result);

      const response = {
        success: true,
        address: result.address,
        publicKey: result.publicKey,
        derivationPath: result.derivationPath,
        deviceId: result.deviceId,
        deviceName: result.deviceName,
        message: `Successfully connected to Ledger hardware wallet. Address: ${result.address}`,
      };

      const text = JSON.stringify(response);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      console.error("❌ Ledger connection failed:", error);
      const result = {
        success: false,
        error: error.message,
        message:
          "Failed to connect to Ledger hardware wallet. Please ensure your device is connected, unlocked, and the Ethereum app is open.",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Secure funds to Ledger hardware wallet (simplified version using existing transfer tools)
  secureFundsToLedger: async (
    {
      sourceAddress,
      amount,
      network = "ethereum",
      tokenAddress,
    }: {
      sourceAddress: string;
      amount?: string;
      network?: string;
      tokenAddress?: string;
    },
    userContext?: { userId: string }
  ) => {
    try {
      console.log("🔒 Starting fund security operation...");

      if (!userContext?.userId) {
        throw new Error("User context required for fund transfer");
      }

      // Step 1: Connect to Ledger and get destination address
      const connectionResult = await toolLogic.connectToLedgerHardwareWallet();
      const connectionData = JSON.parse(connectionResult.content[0].text);

      if (!connectionData.success) {
        throw new Error(`Failed to connect to Ledger: ${connectionData.error}`);
      }

      const destinationAddress = connectionData.address;

      // Step 2: Calculate transfer amount if not provided
      let transferAmount = amount;
      if (!transferAmount) {
        // Get balance to calculate max transfer
        console.log("💰 Checking account balance...");
        try {
          const balanceResult = await toolLogic.getAccountState(
            {
              chainId: network,
              accountId: sourceAddress,
            },
            userContext
          );

          // Parse the balance result to get available amount
          const balanceData = JSON.parse(balanceResult.content[0].text);
          if (tokenAddress) {
            // Find token balance
            const token = balanceData?.balances?.tokens?.find(
              (t: any) => t.token?.id === tokenAddress
            );
            transferAmount = token?.amount || "0";
          } else {
            // Use native balance, leaving some for gas
            const available = balanceData?.balances?.native?.available;
            if (available) {
              // Leave ~0.001 ETH for gas fees (1000000000000000 wei)
              const availableBigInt = BigInt(available);
              const gasReserve = BigInt("1000000000000000");
              const transferBigInt =
                availableBigInt > gasReserve
                  ? availableBigInt - gasReserve
                  : BigInt("0");
              transferAmount = transferBigInt.toString();
            } else {
              transferAmount = "0";
            }
          }
        } catch {
          console.warn("Could not fetch balance, using minimal amount");
          transferAmount = tokenAddress ? "1000000" : "1000000000000000"; // 1 token unit or 0.001 ETH
        }
      }

      // Step 3: Execute transfer using existing tools
      console.log("✍️ Executing transfer to Ledger address...");

      let transferResult;
      if (tokenAddress) {
        // Token transfer
        transferResult = await toolLogic.sendTokenTransfer(
          {
            tokenAddress,
            to: destinationAddress,
            amount: transferAmount,
            chainId: network,
            description: `Secure ${transferAmount} tokens to Ledger hardware wallet`,
          },
          userContext
        );
      } else {
        // Native token transfer
        transferResult = await toolLogic.requestUserSignature(
          {
            to: destinationAddress,
            value: transferAmount,
            chainId: network,
            description: `Secure ${transferAmount} wei to Ledger hardware wallet`,
          },
          userContext
        );
      }

      // Return combined result
      const result = {
        success: true,
        operation: "fund_security",
        sourceAddress,
        destinationAddress,
        amount: transferAmount,
        network,
        tokenAddress,
        ledgerDevice: connectionData.deviceName,
        transferResult: JSON.parse(transferResult.content[0].text),
        message: `Funds security operation prepared. Ready to transfer ${
          tokenAddress ? "tokens" : "native currency"
        } from Privy wallet to Ledger hardware wallet ${destinationAddress}`,
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      console.error("❌ Fund security operation failed:", error);
      const result = {
        success: false,
        error: error.message,
        message:
          "Fund security operation failed. Please ensure your Ledger device is connected and try again.",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },
};

// Tool definitions for OpenAI function calling (names, descriptions, schemas)
export const toolDefinitions = [
  {
    type: "function" as const,
    name: "getSupportedChains",
    description: "Get a list of supported EVM-compatible chain IDs",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "listFeatures",
    description:
      "Get chain details including supported features (read, write, token, validators) and native currency information (ticker, decimals, chain name)",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the blockchain network",
        },
      },
      additionalProperties: false,
      required: ["chainId"],
    },
  },
  {
    type: "function" as const,
    name: "getTokenDetails",
    description:
      "Fetches information about a non-native token (ERC-20, etc.) including its decimal precision for human-readable balance formatting.",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the EVM blockchain network",
        },
        tokenId: {
          type: "string",
          description: "The ID of the token (e.g., contract address)",
        },
      },
      additionalProperties: false,
      required: ["chainId", "tokenId"],
    },
  },
  {
    type: "function" as const,
    name: "getAddress",
    description: "Get the EVM wallet address",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "listWallets",
    description:
      "List all embedded EVM wallets for the user. Returns only EVM-compatible wallets.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "createWallet",
    description:
      "Create a new embedded EVM wallet. All EVM chains (Ethereum, Polygon, Base, Arbitrum, etc.) use the same wallet address.",
    parameters: {
      type: "object",
      properties: {
        chainType: {
          type: "string",
          description:
            "The EVM blockchain network to create a wallet for (e.g., 'ethereum', 'polygon', 'base', 'arbitrum'). All EVM chains use the same wallet address.",
          enum: chains,
        },
      },
      additionalProperties: false,
      required: ["chainType"],
    },
  },
  {
    type: "function" as const,
    name: "getAccountState",
    description:
      "Get account state including balances for native tokens, custom tokens, and staking positions",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the blockchain network",
        },
        accountId: {
          type: "string",
          description: "The account/wallet address to check",
        },
      },
      additionalProperties: false,
      required: ["chainId", "accountId"],
    },
  },
  {
    type: "function" as const,
    name: "getAccountHistory",
    description: "Get transaction history for an account",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the blockchain network",
        },
        accountId: {
          type: "string",
          description: "The account/wallet address to check",
        },
        nextPage: {
          type: "string",
          description: "Pagination token for next page of results",
        },
      },
      additionalProperties: false,
      required: ["chainId", "accountId"],
    },
  },
  {
    type: "function" as const,
    name: "getChainValidators",
    description: "Get list of validators for staking operations",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the blockchain network",
        },
        nextPage: {
          type: "string",
          description: "Pagination token for next page of results",
        },
      },
      additionalProperties: false,
      required: ["chainId"],
    },
  },
  {
    type: "function" as const,
    name: "getTransactionDetails",
    description: "Get details for a specific transaction",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the blockchain network",
        },
        transactionId: {
          type: "string",
          description: "The transaction hash/ID to look up",
        },
      },
      additionalProperties: false,
      required: ["chainId", "transactionId"],
    },
  },

  {
    type: "function" as const,
    name: "requestUserSignature",
    description:
      "Sends a transaction using Privy's sendTransaction for EVM chains. This handles encoding, signing, and broadcasting in a single step.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "The recipient address for the transaction",
        },
        value: {
          type: "string",
          description:
            "The amount to send in wei (smallest unit) as a string. For ETH: 1 ETH = 1000000000000000000 wei",
        },
        chainId: {
          type: "string",
          description:
            "The EVM chain ID (e.g., 'ethereum', 'polygon', 'base', 'arbitrum')",
        },
        data: {
          type: "string",
          description:
            "Optional transaction data for smart contract interactions (hex string)",
        },
        gasLimit: {
          type: "string",
          description: "Optional gas limit for the transaction",
        },
        description: {
          type: "string",
          description:
            "A human-readable description of what this transaction will do (e.g., 'Send 0.1 ETH to Alice'). This will be shown to the user when they are asked to confirm.",
        },
      },
      required: ["to", "value", "chainId", "description"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "sendTokenTransfer",
    description:
      "Sends a token transfer transaction using Privy's built-in sendTransaction. This handles encoding the token data and presenting the user with a signature request.",
    parameters: {
      type: "object",
      properties: {
        tokenAddress: {
          type: "string",
          description: "The contract address of the token to transfer",
        },
        to: {
          type: "string",
          description: "The recipient address for the token transfer",
        },
        amount: {
          type: "string",
          description:
            "The amount of tokens to transfer in smallest units (e.g., '1000000000000000000' for 1 token).",
        },
        chainId: {
          type: "string",
          description:
            "The EVM chain ID (e.g., 'ethereum', 'polygon', 'base', 'arbitrum')",
        },
        description: {
          type: "string",
          description:
            "A human-readable description of what this token transfer will do (e.g., 'Send 100 tokens to Alice'). This will be shown to the user when they are asked to confirm.",
        },
      },
      required: ["tokenAddress", "to", "amount", "chainId", "description"],
      additionalProperties: false,
    },
  },

  // Hardware Wallet (Ledger) Tool Definitions
  // ==========================================
  {
    type: "function" as const,
    name: "connectToLedgerHardwareWallet",
    description:
      "Initiate the Ledger hardware wallet connection flow. This opens a modal that guides the user through the process of connecting their Ledger device.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "secureFundsToLedger",
    description:
      "Transfer funds from Privy hot wallet to Ledger hardware wallet for secure cold storage",
    parameters: {
      type: "object",
      properties: {
        sourceAddress: {
          type: "string",
          description: "Source Privy wallet address",
        },
        amount: {
          type: "string",
          description:
            "Amount to transfer in smallest units (optional - will calculate max available if not provided)",
        },
        network: {
          type: "string",
          description: "Blockchain network (default: 'ethereum')",
        },
        tokenAddress: {
          type: "string",
          description:
            "Token contract address for ERC-20 transfers (optional - leave empty for native currency)",
        },
      },
      required: ["sourceAddress"],
      additionalProperties: false,
    },
  },
];

// Supervisor agent entry point: executes tool logic for the main agent
export const getNextResponseFromSupervisor = {
  type: "function" as const,
  name: "getNextResponseFromSupervisor",
  description:
    "Executes the requested tool logic on behalf of the main agent. Returns the tool result as a message.",
  parameters: {
    type: "object",
    properties: {
      toolName: {
        type: "string",
        description: "The name of the tool to invoke.",
      },
      params: {
        type: "object",
        description: "Parameters to pass to the tool.",
      },
    },
    required: ["toolName", "params"] as string[],
    additionalProperties: false,
  },
  async execute(input: { toolName: string; params: any }, _details: any) {
    const { toolName, params } = input;
    const userContext = _details?.userContext;

    if (!toolName || !(toolName in toolLogic)) {
      return {
        content: [{ type: "text", text: "Unknown tool or missing toolName." }],
      };
    }
    try {
      const result = await toolLogic[toolName](params, userContext);
      return result;
    } catch (e) {
      const errorMessage = `Error: ${
        e instanceof Error ? e.message : String(e)
      }`;
      return {
        content: [
          {
            type: "text",
            text: errorMessage,
          },
        ],
      };
    }
  },
};

// Export the supervisor agent config (optional, for multi-agent scenarios)
export const supervisorAgentConfig = {
  name: "Adamik Supervisor",
  publicDescription:
    "Supervisor agent for Adamik voice agent, handles all tool logic and decision making for EVM-compatible blockchains.",
  model: "gpt-4.1",
  instructions: "See supervisorAgentInstructions in this file.",
  tools: [getNextResponseFromSupervisor],
};
