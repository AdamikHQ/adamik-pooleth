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

// Ledger Hardware Wallet Integration
import { ledgerService } from "../../services/ledger";

// CCTP Cross-Chain Transfer Integration
import { cctpService } from "../../App";

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
    const {
      to,
      value,
      chainId,
      data,
      gasLimit,
      description,
      recipient,
      tokenDetails,
    } = params;

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

    try {
      console.log("📝 Initiating transaction signature request...");

      // Check if trigger function exists
      if (typeof (window as any).__triggerTransactionModal !== "function") {
        console.error(
          "❌ __triggerTransactionModal function not found on window object"
        );
        throw new Error(
          "Transaction modal trigger function not available. Please refresh the page."
        );
      }

      console.log("✅ Found __triggerTransactionModal function, proceeding...");

      // Prepare transaction data for the modal
      const transactionData = {
        to,
        value: value.toString(), // Ensure string format for Privy
        chainId,
        ...(data && { data }),
        ...(gasLimit && { gasLimit }),
        ...(description && { description }),
        ...(recipient && { recipient }), // Add recipient for token transfers
        ...(tokenDetails && { tokenDetails }),
      };

      // Trigger the modal flow and wait for result
      const result = await new Promise<any>((resolve, reject) => {
        // Store the promise resolvers globally so the modal can access them
        const promiseId = Math.random().toString(36).substr(2, 9);
        console.log(
          `🆔 SUPERVISOR: Creating __transactionReviewPromise with ID: ${promiseId}`
        );

        const promiseData = {
          resolve: (result: any) => {
            console.log(
              `✅ SUPERVISOR: Transaction promise ${promiseId} resolved with:`,
              result
            );
            resolve(result);
          },
          reject: (error: any) => {
            console.log(
              `❌ SUPERVISOR: Transaction promise ${promiseId} rejected with:`,
              error
            );
            reject(error);
          },
          id: promiseId,
          timeoutId: null as any,
        };

        (window as any).__transactionReviewPromise = promiseData;
        console.log(
          "📋 SUPERVISOR: Transaction promise stored globally:",
          promiseData
        );

        console.log("📞 SUPERVISOR: Calling __triggerTransactionModal()...");
        // Trigger the modal to open
        (window as any).__triggerTransactionModal?.(transactionData);

        // Set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.warn(
            `⏰ SUPERVISOR: Transaction signature timed out after 120 seconds for promise ${promiseId}`
          );
          console.log(
            "🔍 SUPERVISOR: Current promise at timeout:",
            (window as any).__transactionReviewPromise
          );

          // Clean up the global promise before rejecting
          if ((window as any).__transactionReviewPromise?.id === promiseId) {
            delete (window as any).__transactionReviewPromise;
            console.log(
              `🧹 SUPERVISOR: Cleaned up timed out transaction promise ${promiseId}`
            );
          } else {
            console.warn(
              `⚠️ SUPERVISOR: Transaction promise ${promiseId} not found or already replaced at timeout`
            );
          }

          reject(
            new Error("Transaction signature timed out after 120 seconds")
          );
        }, 120000);

        // Store timeout ID for potential cleanup
        promiseData.timeoutId = timeoutId;
        console.log(
          `⏰ SUPERVISOR: Timeout ${timeoutId} set for transaction promise ${promiseId}`
        );
      });

      console.log("🎉 Received result from transaction modal:", result);

      const response = {
        success: true,
        transactionHash: result.transactionHash,
        details: result.details,
        message: `Transaction completed successfully. Hash: ${result.transactionHash}`,
      };

      const text = JSON.stringify(response);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      console.error("❌ Transaction signature request failed:", error);
      const result = {
        success: false,
        error: error.message,
        message: "Transaction signature request failed. Please try again.",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // NEW: Sends ERC-20 token transfers using Privy's built-in sendTransaction
  // This tool generates ERC-20 transfer data directly and uses Privy's native transaction support
  sendTokenTransfer: async (
    params: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    // Extract token transfer parameters
    const { tokenSymbol, to, amount, chainId, description, sourceAddress } =
      params;

    // Validate required parameters
    if (!tokenSymbol) {
      throw new Error(
        "Missing 'tokenSymbol' parameter - token symbol (e.g., 'USDC') is required"
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

    if (!sourceAddress) {
      throw new Error(
        "Missing 'sourceAddress' parameter - source wallet address is required"
      );
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
      console.log(
        `🔍 First fetching account state to find ${tokenSymbol} token details...`
      );

      // Step 1: Get user's account state to find the actual token they own
      const accountStateResult = await toolLogic.getAccountState(
        {
          chainId,
          accountId: sourceAddress,
        },
        userContext
      );

      const accountData = JSON.parse(accountStateResult.content[0].text);

      // Step 2: Find the token by symbol in user's holdings
      const tokenDetails = accountData?.balances?.tokens?.find((token: any) => {
        const ticker = token.token?.ticker?.toLowerCase();
        const name = token.token?.name?.toLowerCase();
        const searchSymbol = tokenSymbol.toLowerCase();

        return ticker === searchSymbol || name === searchSymbol;
      });

      if (!tokenDetails) {
        // List available tokens for better error message
        const availableTokens =
          accountData?.balances?.tokens
            ?.map(
              (token: any) =>
                token.token?.ticker || token.token?.name || "Unknown"
            )
            .filter(Boolean) || [];

        throw new Error(
          `Token ${tokenSymbol} not found in user's wallet on ${chainId}. ` +
            `Available tokens: ${
              availableTokens.length > 0 ? availableTokens.join(", ") : "none"
            }`
        );
      }

      // Step 3: Extract token contract address and decimals from user's actual holdings
      const tokenAddress = tokenDetails.token?.id;
      const decimals =
        tokenDetails.decimals || tokenDetails.token?.decimals || 18;
      const tokenTicker =
        tokenDetails.token?.ticker || tokenDetails.token?.name || tokenSymbol;

      if (!tokenAddress) {
        throw new Error(`Token contract address not found for ${tokenSymbol}`);
      }

      console.log(
        `✅ Found ${tokenTicker} token: ${tokenAddress} (${decimals} decimals)`
      );

      // Step 4: Check if user has sufficient balance before proceeding
      const userBalance = tokenDetails.amount || "0"; // Raw balance in token units
      const formattedBalance =
        tokenDetails.formattedAmount ||
        (Number(userBalance) / Math.pow(10, decimals)).toFixed(6);

      console.log(
        `💰 User's ${tokenTicker} balance: ${formattedBalance} (${userBalance} raw units)`
      );

      // Convert requested amount to token units for comparison
      const requestedAmount = parseFloat(amount);
      const availableAmount = parseFloat(formattedBalance);

      if (requestedAmount > availableAmount) {
        throw new Error(
          `Insufficient ${tokenTicker} balance. ` +
            `Requested: ${requestedAmount} ${tokenTicker}, ` +
            `Available: ${availableAmount} ${tokenTicker}. ` +
            `Please check your balance and try again with a smaller amount.`
        );
      }

      // Step 5: Convert human-readable amount to token units using correct decimals
      const amountInTokenUnits = (
        parseFloat(amount) * Math.pow(10, decimals)
      ).toString();

      console.log(
        `💰 Converting ${amount} ${tokenTicker} to ${amountInTokenUnits} token units`
      );

      // Step 6: Generate ERC-20 transfer function call data
      console.log("🪙 Encoding ERC-20 transfer data...");

      // Function signature: transfer(address,uint256)
      // Function selector: 0xa9059cbb (first 4 bytes of keccak256("transfer(address,uint256)"))

      // Remove 0x prefix from recipient address if present
      const cleanRecipient = to.startsWith("0x") ? to.slice(2) : to;

      // Ensure recipient address is 40 characters (20 bytes)
      if (cleanRecipient.length !== 40) {
        throw new Error("Invalid recipient address format");
      }

      // Convert amount to BigInt and then to hex (32 bytes, big-endian)
      const amountBigInt = BigInt(amountInTokenUnits);
      const amountHex = amountBigInt.toString(16).padStart(64, "0");

      // Construct the function call data
      const functionSelector = "a9059cbb"; // transfer(address,uint256)
      const recipientPadded = cleanRecipient.padStart(64, "0"); // 32 bytes
      const amountPadded = amountHex; // 32 bytes

      const transferData = `0x${functionSelector}${recipientPadded}${amountPadded}`;

      console.log("✅ ERC-20 transfer data encoded successfully");
      console.log(`📋 Function: transfer(${to}, ${amountInTokenUnits})`);
      console.log(`📋 Data length: ${transferData.length} characters`);

      // Step 7: Use Privy's requestUserSignature with the encoded token data
      console.log("🔄 Preparing token transfer for user signature...");

      const signatureResult = await toolLogic.requestUserSignature(
        {
          to: tokenAddress, // Send to the token contract
          value: "0", // No ETH value for token transfers
          chainId,
          data: transferData, // Include the encoded ERC-20 transfer data
          description: description || `Send ${amount} ${tokenTicker}`,
          recipient: to, // Add actual recipient address for token transfers
          tokenDetails: {
            symbol: tokenTicker,
            decimals: decimals,
            formattedAmount: amount,
            contractAddress: tokenAddress,
          },
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
          `🆔 SUPERVISOR: Creating __ledgerConnectionPromise with ID: ${promiseId}`
        );

        const promiseData = {
          resolve: (result: any) => {
            console.log(
              `✅ SUPERVISOR: Promise ${promiseId} resolved with:`,
              result
            );
            resolve(result);
          },
          reject: (error: any) => {
            console.log(
              `❌ SUPERVISOR: Promise ${promiseId} rejected with:`,
              error
            );
            reject(error);
          },
          id: promiseId,
          timeoutId: null as any,
        };

        (window as any).__ledgerConnectionPromise = promiseData;
        console.log("📋 SUPERVISOR: Promise stored globally:", promiseData);

        console.log("📞 SUPERVISOR: Calling __triggerLedgerModal()...");
        // Trigger the modal to open
        (window as any).__triggerLedgerModal?.();

        // Set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
          console.warn(
            `⏰ SUPERVISOR: Ledger connection timed out after 60 seconds for promise ${promiseId}`
          );
          console.log(
            "🔍 SUPERVISOR: Current promise at timeout:",
            (window as any).__ledgerConnectionPromise
          );

          // Clean up the global promise before rejecting
          if ((window as any).__ledgerConnectionPromise?.id === promiseId) {
            delete (window as any).__ledgerConnectionPromise;
            console.log(
              `🧹 SUPERVISOR: Cleaned up timed out promise ${promiseId}`
            );
          } else {
            console.warn(
              `⚠️ SUPERVISOR: Promise ${promiseId} not found or already replaced at timeout`
            );
          }

          reject(new Error("Ledger connection timed out after 60 seconds"));
        }, 60000);

        // Store timeout ID for potential cleanup
        promiseData.timeoutId = timeoutId;
        console.log(
          `⏰ SUPERVISOR: Timeout ${timeoutId} set for promise ${promiseId}`
        );
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

  // Generic asset transfer function (DRY principle)
  transferAssets: async (
    {
      to,
      amount,
      network = "ethereum",
      tokenSymbol,
      sourceAddress,
      description,
    }: {
      to: string;
      amount: string;
      network?: string;
      tokenSymbol?: string;
      sourceAddress: string;
      description?: string;
    },
    userContext?: { userId: string }
  ) => {
    try {
      console.log("💸 Executing asset transfer...");

      if (!userContext?.userId) {
        throw new Error("User context required for asset transfer");
      }

      if (!sourceAddress) {
        throw new Error("Source address is required for asset transfer");
      }

      let transferResult;
      if (tokenSymbol) {
        // Token transfer - use improved sendTokenTransfer
        transferResult = await toolLogic.sendTokenTransfer(
          {
            tokenSymbol,
            to,
            amount,
            chainId: network,
            sourceAddress,
            description:
              description || `Transfer ${amount} ${tokenSymbol} to ${to}`,
          },
          userContext
        );
      } else {
        // Native token transfer
        transferResult = await toolLogic.requestUserSignature(
          {
            to,
            value: amount,
            chainId: network,
            description: description || `Transfer ${amount} wei to ${to}`,
          },
          userContext
        );
      }

      // Parse and return result
      const transferData = JSON.parse(transferResult.content[0].text);
      const result = {
        success: true,
        operation: "asset_transfer",
        to,
        amount,
        network,
        tokenSymbol,
        sourceAddress,
        transferResult: transferData,
        message: `Asset transfer prepared. Ready to transfer ${
          tokenSymbol ? `${amount} ${tokenSymbol}` : "native currency"
        } to ${to}`,
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      console.error("❌ Asset transfer failed:", error);
      const result = {
        success: false,
        error: error.message,
        message:
          "Asset transfer failed. Please check parameters and try again.",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Secure funds to Ledger hardware wallet (now uses generic transferAssets)
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

      // Step 3: Get token details from account state for accurate descriptions
      let friendlyDescription: string;
      let tokenDetails: any = null;

      if (tokenAddress) {
        console.log("🔍 Fetching token details from account state...");
        try {
          const accountStateResult = await toolLogic.getAccountState(
            {
              chainId: network,
              accountId: sourceAddress,
            },
            userContext
          );

          const accountData = JSON.parse(accountStateResult.content[0].text);
          tokenDetails = accountData?.balances?.tokens?.find(
            (token: any) =>
              token.token?.id?.toLowerCase() === tokenAddress.toLowerCase()
          );

          if (tokenDetails) {
            const tokenSymbol =
              tokenDetails.token?.ticker ||
              tokenDetails.token?.name ||
              "tokens";
            const decimals =
              tokenDetails.decimals || tokenDetails.token?.decimals || 18;
            const formattedAmount =
              tokenDetails.formattedAmount ||
              (Number(transferAmount) / Math.pow(10, decimals)).toFixed(6);

            friendlyDescription = `Secure ${formattedAmount} ${tokenSymbol} to Ledger hardware wallet`;
            console.log(
              `📋 Token details: ${tokenSymbol} (${decimals} decimals) - ${formattedAmount} formatted`
            );
          } else {
            console.warn("⚠️ Token not found in account state, using fallback");
            friendlyDescription = `Secure tokens to Ledger hardware wallet`;
          }
        } catch (error) {
          console.warn("⚠️ Could not fetch token details:", error);
          friendlyDescription = `Secure tokens to Ledger hardware wallet`;
        }
      } else {
        // For native currency, convert wei to ETH (18 decimals)
        const ethAmount = Number(transferAmount) / Math.pow(10, 18);
        friendlyDescription = `Secure ${ethAmount.toFixed(
          6
        )} ETH to Ledger hardware wallet`;
      }

      // Step 4: Execute transfer directly to Ledger address
      console.log("✍️ Executing transfer to Ledger address...");

      let transferResult;
      if (tokenAddress) {
        // Token transfer - call sendTokenTransfer directly
        const tokenSymbol = tokenDetails
          ? tokenDetails.token?.ticker || tokenDetails.token?.name
          : "Unknown"; // fallback if token not found in account state

        // Always use the requested transfer amount, not the user's full balance
        const formattedAmount = (
          Number(transferAmount) / Math.pow(10, tokenDetails?.decimals || 18)
        ).toFixed(6);

        transferResult = await toolLogic.sendTokenTransfer(
          {
            tokenSymbol,
            to: destinationAddress,
            amount: formattedAmount,
            chainId: network,
            sourceAddress,
            description: friendlyDescription,
          },
          userContext
        );
      } else {
        // Native currency transfer - call requestUserSignature directly
        transferResult = await toolLogic.requestUserSignature(
          {
            to: destinationAddress,
            value: transferAmount,
            chainId: network,
            description: friendlyDescription,
          },
          userContext
        );
      }

      // Parse transfer result and enhance with Ledger-specific info
      const transferData = JSON.parse(transferResult.content[0].text);

      // Create enhanced message with token details if available
      let enhancedMessage: string;
      if (tokenAddress && tokenDetails) {
        const tokenSymbol =
          tokenDetails.token?.ticker || tokenDetails.token?.name || "tokens";
        // Always use the requested transfer amount, not the user's full balance
        const formattedAmount = (
          Number(transferAmount) / Math.pow(10, tokenDetails.decimals || 18)
        ).toFixed(6);
        enhancedMessage = `Funds security operation prepared. Ready to transfer ${formattedAmount} ${tokenSymbol} from Privy wallet to Ledger hardware wallet ${destinationAddress}`;
      } else if (tokenAddress) {
        enhancedMessage = `Funds security operation prepared. Ready to transfer tokens from Privy wallet to Ledger hardware wallet ${destinationAddress}`;
      } else {
        const ethAmount = Number(transferAmount) / Math.pow(10, 18);
        enhancedMessage = `Funds security operation prepared. Ready to transfer ${ethAmount.toFixed(
          6
        )} ETH from Privy wallet to Ledger hardware wallet ${destinationAddress}`;
      }

      const result = {
        success: transferData.success,
        operation: "fund_security",
        sourceAddress,
        destinationAddress,
        amount: transferAmount,
        network,
        tokenAddress,
        tokenDetails: tokenDetails
          ? {
              symbol: tokenDetails.token?.ticker || tokenDetails.token?.name,
              decimals: tokenDetails.decimals || tokenDetails.token?.decimals,
              formattedAmount: (
                Number(transferAmount) /
                Math.pow(10, tokenDetails.decimals || 18)
              ).toFixed(6),
              contractAddress: tokenDetails.token?.id,
            }
          : null,
        ledgerDevice: connectionData.deviceName,
        transferResult: transferData,
        message: enhancedMessage,
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

  // Disconnect from Ledger device
  disconnectLedgerDevice: async ({ deviceId }: { deviceId: string }) => {
    try {
      await ledgerService.disconnectDevice(deviceId);

      const result = {
        success: true,
        message: `Successfully disconnected from device: ${deviceId}`,
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      console.error("❌ Device disconnection failed:", error);
      const result = {
        success: false,
        error: error.message,
        message: "Device disconnection failed.",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // List connected Ledger devices
  listConnectedLedgerDevices: async () => {
    try {
      const devices = ledgerService.getConnectedDevices();

      const result = {
        success: true,
        devices,
        count: devices.length,
        message:
          devices.length > 0
            ? `${devices.length} device(s) currently connected`
            : "No devices currently connected",
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      console.error("❌ Failed to list connected devices:", error);
      const result = {
        success: false,
        error: error.message,
        message: "Failed to list connected devices.",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Open Ethereum app on connected Ledger device
  openLedgerEthereumApp: async ({ deviceId }: { deviceId: string }) => {
    try {
      console.log(`📱 Opening Ethereum app on device: ${deviceId}`);

      await ledgerService.openEthereumApp(deviceId);

      const result = {
        success: true,
        message: `Ethereum app opened successfully on device: ${deviceId}`,
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      console.error("❌ Failed to open Ethereum app:", error);
      const result = {
        success: false,
        error: error.message,
        message:
          "Failed to open Ethereum app. Please ensure the device is connected and unlocked.",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // CCTP Cross-Chain Transfer Tools
  // ===============================

  // Get supported chains for CCTP bridging
  getSupportedBridgeChains: async () => {
    try {
      const supportedChains = cctpService.getSupportedChains();

      const result = {
        success: true,
        supportedChains,
        message: `CCTP bridging is supported on ${
          supportedChains.length
        } chains: ${supportedChains.join(", ")}`,
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to get supported bridge chains",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Estimate bridge transfer fee
  estimateBridgeFee: async ({
    sourceChain,
    destinationChain,
    amount,
  }: {
    sourceChain: string;
    destinationChain: string;
    amount: string;
  }) => {
    try {
      const feeInfo = await cctpService.estimateFastTransferFee(
        sourceChain as any,
        destinationChain as any,
        amount
      );

      const result = {
        success: true,
        feeInfo,
        message: feeInfo
          ? `Bridge fee: ${feeInfo.estimatedFee} USDC (${feeInfo.feeRate} basis points)`
          : "Unable to estimate fee for this transfer",
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to estimate bridge fee",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  /*
  // Check USDC allowance for bridging
  checkBridgeAllowance: async ({
    chain,
    ownerAddress,
  }: {
    chain: string;
    ownerAddress: string;
  }) => {
    try {
      const allowance = await cctpService.getUSDCAllowance(
        chain as any,
        ownerAddress
      );

      const result = {
        success: true,
        allowance,
        chain,
        ownerAddress,
        message: `Current USDC allowance: ${allowance} USDC`,
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to check bridge allowance",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },
  */

  // Approve USDC for bridging
  approveBridgeTokens: async ({
    chain,
    amount,
  }: {
    chain: string;
    amount: string;
  }) => {
    try {
      // Validate supported chain using CCTPService
      const supportedChains = cctpService.getSupportedChains();
      if (!supportedChains.includes(chain as any)) {
        throw new Error(`Chain ${chain} is not supported for CCTP bridging`);
      }

      // Use CCTPService's executeBridgeApproval method
      const cctpResult = await cctpService.executeBridgeApproval(
        chain as any,
        amount
      );

      if (cctpResult.success) {
        const result = {
          success: true,
          transactionHash: cctpResult.transactionHash,
          message: `USDC approval successful for ${amount} USDC on ${cctpService.getChainDisplayName(
            chain as any
          )}`,
          chain,
          chainDisplayName: cctpService.getChainDisplayName(chain as any),
          amount,
        };

        const text = JSON.stringify(result);
        return { content: [{ type: "text", text }] };
      } else {
        throw new Error(cctpResult.error || "CCTP approval failed");
      }
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to approve bridge tokens",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Initiate bridge transfer
  initiateBridgeTransfer: async ({
    sourceChain,
    destinationChain,
    amount,
    recipient,
    usdcBalance,
  }: {
    sourceChain: string;
    destinationChain: string;
    amount: string;
    recipient: string;
    usdcBalance: string;
  }) => {
    try {
      // Validate supported chains using CCTPService
      const supportedChains = cctpService.getSupportedChains();
      if (!supportedChains.includes(sourceChain as any)) {
        throw new Error(
          `Source chain ${sourceChain} is not supported for CCTP bridging`
        );
      }
      if (!supportedChains.includes(destinationChain as any)) {
        throw new Error(
          `Destination chain ${destinationChain} is not supported for CCTP bridging`
        );
      }

      // Use CCTPService's executeBridgeTransfer method
      const cctpResult = await cctpService.executeBridgeTransfer({
        sourceChain: sourceChain as any,
        destinationChain: destinationChain as any,
        amount,
        recipient,
        usdcBalance,
      });

      if (cctpResult.success) {
        const result = {
          success: true,
          transactionHash: cctpResult.transactionHash,
          messageHash: cctpResult.messageHash,
          message: `Bridge transfer successful for ${amount} USDC from ${cctpService.getChainDisplayName(
            sourceChain as any
          )} to ${cctpService.getChainDisplayName(destinationChain as any)}`,
          sourceChain,
          sourceChainDisplayName: cctpService.getChainDisplayName(
            sourceChain as any
          ),
          destinationChain,
          destinationChainDisplayName: cctpService.getChainDisplayName(
            destinationChain as any
          ),
          amount,
          recipient,
          sourceDomain: cctpResult.sourceDomain,
        };

        const text = JSON.stringify(result);
        return { content: [{ type: "text", text }] };
      } else {
        throw new Error(cctpResult.error || "CCTP bridge transfer failed");
      }
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to initiate bridge transfer",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Check bridge transfer status
  checkBridgeStatus: async ({
    transactionHash,
    sourceDomain,
  }: {
    transactionHash: string;
    sourceDomain: number;
  }) => {
    try {
      // Use CCTPService to get attestation status
      const attestationResult = await cctpService.getAttestation(
        transactionHash,
        sourceDomain
      );

      // Find the chain name from the domain (for better user experience)
      const supportedChains = cctpService.getSupportedChains();
      let sourceChainName = "";
      for (const chain of supportedChains) {
        const config = (cctpService as any).mainnetConfigs[chain];
        if (config && config.domain === sourceDomain) {
          sourceChainName = cctpService.getChainDisplayName(chain);
          break;
        }
      }

      const result = {
        success: attestationResult.success,
        attestation: attestationResult.attestation,
        message: attestationResult.message,
        error: attestationResult.error,
        status: attestationResult.success ? "ready_to_mint" : "pending",
        statusMessage: attestationResult.success
          ? "Transfer is ready to be completed on destination chain"
          : attestationResult.error || "Transfer is still pending",
        transactionHash,
        sourceDomain,
        sourceChainName,
        nextStep: attestationResult.success
          ? "Use completeBridgeTransfer to mint tokens on destination chain"
          : "Wait for attestation to be available",
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to check bridge status",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Complete bridge transfer (mint on destination)
  completeBridgeTransfer: async ({
    destinationChain,
    messageBytes,
    attestation,
  }: {
    destinationChain: string;
    messageBytes: string;
    attestation: string;
  }) => {
    try {
      // Validate supported chain using CCTPService
      const supportedChains = cctpService.getSupportedChains();
      if (!supportedChains.includes(destinationChain as any)) {
        throw new Error(
          `Destination chain ${destinationChain} is not supported for CCTP bridging`
        );
      }

      // Use CCTPService's executeBridgeMinting method
      const cctpResult = await cctpService.executeBridgeMinting(
        destinationChain as any,
        messageBytes,
        attestation
      );

      if (cctpResult.success) {
        const result = {
          success: true,
          transactionHash: cctpResult.transactionHash,
          message: `Bridge transfer completion successful on ${cctpService.getChainDisplayName(
            destinationChain as any
          )}`,
          destinationChain,
          destinationChainDisplayName: cctpService.getChainDisplayName(
            destinationChain as any
          ),
          messageBytes,
          attestation,
        };

        const text = JSON.stringify(result);
        return { content: [{ type: "text", text }] };
      } else {
        throw new Error(cctpResult.error || "CCTP bridge minting failed");
      }
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to complete bridge transfer",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Get bridge state from storage
  /*
  getBridgeState: async () => {
    try {
      const state = cctpService.loadBridgeState();

      const result = {
        success: true,
        state,
        message:
          Object.keys(state).length > 0
            ? "Bridge state loaded successfully"
            : "No saved bridge state found",
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to get bridge state",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },

  // Clear bridge state
  clearBridgeState: async () => {
    try {
      cctpService.clearBridgeState();

      const result = {
        success: true,
        message: "Bridge state cleared successfully",
      };

      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    } catch (error: any) {
      const result = {
        success: false,
        error: error.message,
        message: "Failed to clear bridge state",
      };
      const text = JSON.stringify(result);
      return { content: [{ type: "text", text }] };
    }
  },
  */
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
      "Sends a token transfer transaction using Privy's built-in sendTransaction. IMPORTANT: This function automatically fetches the user's account state first to find the token by symbol and get the correct contract address and decimals. No need to guess token addresses.",
    parameters: {
      type: "object",
      properties: {
        tokenSymbol: {
          type: "string",
          description:
            "The symbol of the token to transfer (e.g., 'USDC', 'DAI', 'WETH'). The function will look this up in the user's actual holdings.",
        },
        to: {
          type: "string",
          description: "The recipient address for the token transfer",
        },
        amount: {
          type: "string",
          description:
            "The amount of tokens to transfer in human-readable format (e.g., '0.001' for 0.001 USDC). The function will convert this to the correct token units automatically.",
        },
        chainId: {
          type: "string",
          description:
            "The EVM chain ID (e.g., 'ethereum', 'polygon', 'base', 'arbitrum')",
        },
        sourceAddress: {
          type: "string",
          description:
            "The source wallet address to transfer from (typically the user's Privy wallet address)",
        },
        description: {
          type: "string",
          description:
            "A human-readable description of what this token transfer will do (e.g., 'Send 0.001 USDC to Alice'). This will be shown to the user when they are asked to confirm.",
        },
      },
      required: ["tokenSymbol", "to", "amount", "chainId", "sourceAddress"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "transferAssets",
    description:
      "Generic asset transfer function that handles both native currency and token transfers. IMPORTANT: For token transfers, this automatically fetches the user's account state to find tokens by symbol. Use this for any transfer operation.",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "The recipient address for the transfer",
        },
        amount: {
          type: "string",
          description:
            "The amount to transfer in human-readable format (e.g., '0.001' for 0.001 tokens or '0.001' ETH). For native transfers, this should be in wei.",
        },
        network: {
          type: "string",
          description:
            "The EVM chain ID (default: 'ethereum'). Supported: 'ethereum', 'polygon', 'base', 'arbitrum', etc.",
        },
        tokenSymbol: {
          type: "string",
          description:
            "The symbol of the token to transfer (e.g., 'USDC', 'DAI'). Leave empty for native currency transfer. The function will find this token in the user's holdings automatically.",
        },
        sourceAddress: {
          type: "string",
          description:
            "The source wallet address to transfer from (required for token transfers to fetch account state)",
        },
        description: {
          type: "string",
          description:
            "A human-readable description of the transfer (optional - will be auto-generated if not provided)",
        },
      },
      required: ["to", "amount", "sourceAddress"],
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
  {
    type: "function" as const,
    name: "disconnectLedgerDevice",
    description: "Disconnect from a specific Ledger device",
    parameters: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "ID of the Ledger device to disconnect",
        },
      },
      required: ["deviceId"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "listConnectedLedgerDevices",
    description: "List all currently connected Ledger devices",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "openLedgerEthereumApp",
    description: "Open the Ethereum app on a connected Ledger device",
    parameters: {
      type: "object",
      properties: {
        deviceId: {
          type: "string",
          description: "ID of the connected Ledger device",
        },
      },
      required: ["deviceId"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "getSupportedBridgeChains",
    description: "Get a list of supported chains for CCTP bridging",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "estimateBridgeFee",
    description: "Estimate the fee for a bridge transfer",
    parameters: {
      type: "object",
      properties: {
        sourceChain: {
          type: "string",
          description: "The source chain ID",
        },
        destinationChain: {
          type: "string",
          description: "The destination chain ID",
        },
        amount: {
          type: "string",
          description: "The amount to transfer, in USDC",
        },
      },
      required: ["sourceChain", "destinationChain", "amount"],
      additionalProperties: false,
    },
  },
  /*
  {
    type: "function" as const,
    name: "checkBridgeAllowance",
    description: "Check the USDC allowance for bridging",
    parameters: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          description: "The chain ID",
        },
        ownerAddress: {
          type: "string",
          description: "The owner address",
        },
      },
      required: ["chain", "ownerAddress"],
      additionalProperties: false,
    },
  },
  */
  {
    type: "function" as const,
    name: "approveBridgeTokens",
    description: "Approve USDC for bridging",
    parameters: {
      type: "object",
      properties: {
        chain: {
          type: "string",
          description: "The chain ID",
        },
        amount: {
          type: "string",
          description: "The amount to approve, in USDC",
        },
      },
      required: ["chain", "amount"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "initiateBridgeTransfer",
    description: "Initiate a bridge transfer",
    parameters: {
      type: "object",
      properties: {
        sourceChain: {
          type: "string",
          description: "The source chain ID",
        },
        destinationChain: {
          type: "string",
          description: "The destination chain ID",
        },
        amount: {
          type: "string",
          description: "The amount to transfer, in USDC",
        },
        recipient: {
          type: "string",
          description: "The recipient address",
        },
        usdcBalance: {
          type: "string",
          description: "The USDC balance of the sender account",
        },
      },
      required: [
        "sourceChain",
        "destinationChain",
        "amount",
        "recipient",
        "usdcBalance",
      ],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "checkBridgeStatus",
    description: "Check the status of a bridge transfer",
    parameters: {
      type: "object",
      properties: {
        transactionHash: {
          type: "string",
          description: "The transaction hash",
        },
        sourceDomain: {
          type: "number",
          description: "The source domain ID",
        },
      },
      required: ["transactionHash", "sourceDomain"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "completeBridgeTransfer",
    description: "Complete a bridge transfer",
    parameters: {
      type: "object",
      properties: {
        destinationChain: {
          type: "string",
          description: "The destination chain ID",
        },
        messageBytes: {
          type: "string",
          description: "The message bytes",
        },
        attestation: {
          type: "string",
          description: "The attestation",
        },
      },
      required: ["destinationChain", "messageBytes", "attestation"],
      additionalProperties: false,
    },
  },
  /*
  {
    type: "function" as const,
    name: "getBridgeState",
    description: "Get the bridge state",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "clearBridgeState",
    description: "Clear the bridge state",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  */
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
