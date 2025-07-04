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
  EncodeTransactionRequestBodySchema,
  BroadcastTransactionRequestBodySchema,
} from "./schemas";
import { makeProxyRequest } from "@/app/services/adamik";
import { makeWalletRequest } from "@/app/lib/api";

// Helper function to map chain IDs to their base chain types
const getChainTypeFromChainId = (chainId: string): string => {
  // Map specific chain IDs to their base wallet types supported by Privy
  const chainMapping: Record<string, string> = {
    // Solana chains
    solana: "solana",
    "solana-devnet": "solana",
    "solana-testnet": "solana",

    // Ethereum and EVM chains
    ethereum: "ethereum",
    "ethereum-goerli": "ethereum",
    "ethereum-sepolia": "ethereum",
    polygon: "ethereum",
    "polygon-mumbai": "ethereum",
    arbitrum: "ethereum",
    "arbitrum-goerli": "ethereum",
    optimism: "ethereum",
    "optimism-goerli": "ethereum",
    base: "ethereum",
    "base-goerli": "ethereum",
    avalanche: "ethereum",
    "avalanche-fuji": "ethereum",
    bsc: "ethereum",
    "bsc-testnet": "ethereum",

    // Tron chains
    tron: "tron",
    "tron-shasta": "tron",

    // Cosmos chains
    cosmos: "cosmos",
    "cosmos-testnet": "cosmos",

    // Stellar chains
    stellar: "stellar",
    "stellar-testnet": "stellar",
  };

  return chainMapping[chainId] || "ethereum"; // Default to ethereum for unknown chains
};

// Helper function to validate transaction body and provide helpful error messages
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const validateTransactionBody = (body: any, chainId: string): string[] => {
  const errors: string[] = [];

  // Check for required mode field
  if (!body.mode) {
    errors.push(
      "MISSING REQUIRED FIELD 'mode': Must be one of: 'transfer', 'transferToken', 'stake', 'unstake', 'claimRewards', 'withdraw', 'registerStake', 'convertAsset', 'deployAccount'"
    );
  } else {
    const validModes = [
      "transfer",
      "transferToken",
      "stake",
      "unstake",
      "claimRewards",
      "withdraw",
      "registerStake",
      "convertAsset",
      "deployAccount",
    ];
    if (!validModes.includes(body.mode)) {
      errors.push(
        `INVALID MODE '${body.mode}': Must be one of: ${validModes.join(", ")}`
      );
    }
  }

  // Mode-specific validation
  if (body.mode === "transfer" || body.mode === "transferToken") {
    if (!body.recipientAddress) {
      errors.push(
        `MISSING REQUIRED FIELD 'recipientAddress': ${body.mode} transactions require a recipient address`
      );
    }

    if (!body.amount && !body.useMaxAmount) {
      errors.push(
        `MISSING AMOUNT: ${body.mode} transactions require either 'amount' (as string in smallest units) or 'useMaxAmount: true'`
      );
    }

    if (body.amount && typeof body.amount !== "string") {
      errors.push(
        `INVALID AMOUNT TYPE: 'amount' must be a string (e.g., "10000000"), not ${typeof body.amount}`
      );
    }

    if (body.mode === "transferToken" && !body.tokenId) {
      errors.push(
        "MISSING REQUIRED FIELD 'tokenId': transferToken transactions require a token contract address"
      );
    }
  }

  if (body.mode === "stake" || body.mode === "unstake") {
    if (!body.targetValidatorAddress && !body.validatorAddress) {
      errors.push(
        `MISSING VALIDATOR: ${body.mode} transactions require 'targetValidatorAddress' (stake) or 'validatorAddress' (unstake)`
      );
    }

    if (!body.amount && !body.useMaxAmount) {
      errors.push(
        `MISSING AMOUNT: ${body.mode} transactions require either 'amount' (as string) or 'useMaxAmount: true'`
      );
    }
  }

  return errors;
};

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
  // Lists all wallets for the user
  listWallets: async (
    params: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    const wallets = await makeWalletRequest("listWallets", params, userContext);
    const text = JSON.stringify(wallets);
    return { content: [{ type: "text", text }] };
  },
  // Creates a new wallet for a given chain
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
    // Map to base chain type
    const getBaseChainType = (chain: string): string => {
      if (chain === "solana") return "solana";
      if (chain === "tron") return "tron";
      if (chain === "cosmos") return "cosmos";
      return "ethereum";
    };
    const baseChainType = getBaseChainType(chainType);
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
    console.log(
      `[getAccountState] Starting request for chainId: ${chainId}, accountId: ${accountId}`
    );

    // 1. Fetch the account state
    const state = await makeProxyRequest(
      `/${chainId}/account/${accountId}/state`
    );

    console.log(
      `[getAccountState] Raw state response:`,
      JSON.stringify(state, null, 2)
    );

    // 2. Verify/format native balance decimals
    if (state?.balances?.native && state.balances.native.available != null) {
      console.log(
        `[getAccountState] Processing native balance - raw available: ${state.balances.native.available}`
      );

      // Fetch chain features to get native decimals
      const features = await makeProxyRequest(`/chains/${chainId}`);
      console.log(
        `[getAccountState] Chain features for ${chainId}:`,
        JSON.stringify(features, null, 2)
      );

      const decimals = features?.chain?.decimals;
      console.log(`[getAccountState] Native currency decimals: ${decimals}`);

      if (typeof decimals === "number") {
        const rawValue = Number(state.balances.native.available);
        const divisor = Math.pow(10, decimals);
        const formattedValue = rawValue / divisor;

        console.log(
          `[getAccountState] Decimal calculation - raw: ${rawValue}, divisor: ${divisor}, formatted: ${formattedValue}`
        );

        state.balances.native.formattedAvailable = formattedValue.toString();
        state.balances.native.decimals = decimals;

        console.log(
          `[getAccountState] Native balance formatted - formattedAvailable: ${state.balances.native.formattedAvailable}`
        );
      } else {
        console.log(
          `[getAccountState] WARNING: Invalid decimals for native currency: ${decimals}`
        );
      }
    } else {
      console.log(
        `[getAccountState] No native balance found or available is null`
      );
    }

    // 3. Verify/format token balances decimals
    if (state?.balances?.tokens && Array.isArray(state.balances.tokens)) {
      console.log(
        `[getAccountState] Processing ${state.balances.tokens.length} token balances`
      );

      for (const token of state.balances.tokens) {
        if (token.tokenId && token.amount != null) {
          console.log(
            `[getAccountState] Processing token ${token.tokenId} - raw amount: ${token.amount}`
          );

          // Fetch token details (including decimals)
          const tokenDetails = await makeProxyRequest(
            `/${chainId}/token/${token.tokenId}`
          );
          console.log(
            `[getAccountState] Token details for ${token.tokenId}:`,
            JSON.stringify(tokenDetails, null, 2)
          );

          if (tokenDetails?.decimals != null) {
            const rawValue = Number(token.amount);
            const divisor = Math.pow(10, tokenDetails.decimals);
            const formattedValue = rawValue / divisor;

            console.log(
              `[getAccountState] Token decimal calculation - raw: ${rawValue}, divisor: ${divisor}, formatted: ${formattedValue}`
            );

            token.formattedAmount = formattedValue.toString();
            token.decimals = tokenDetails.decimals;

            console.log(
              `[getAccountState] Token balance formatted - formattedAmount: ${token.formattedAmount}`
            );
          } else {
            console.log(
              `[getAccountState] WARNING: Invalid decimals for token ${token.tokenId}: ${tokenDetails?.decimals}`
            );
          }
        }
      }
    } else {
      console.log(`[getAccountState] No token balances found`);
    }

    // 4. Return the verified/formatted state
    console.log(
      `[getAccountState] Final formatted state:`,
      JSON.stringify(state, null, 2)
    );

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
  // Add more tool implementations as needed
  encodeTransaction: async (
    { chainId, body }: { chainId: string; body: any },
    _userContext?: any
  ) => {
    // Make maximally flexible: wrap as needed and map common field names
    let candidate = body;

    // Map common field names to schema-expected names
    if (candidate.type && !candidate.mode) {
      candidate.mode = candidate.type;
      delete candidate.type;
    }
    if (candidate.recipient && !candidate.recipientAddress) {
      candidate.recipientAddress = candidate.recipient;
      delete candidate.recipient;
    }
    if (candidate.sender && !candidate.senderAddress) {
      candidate.senderAddress = candidate.sender;
      delete candidate.sender;
    }
    if (candidate.from && !candidate.senderAddress) {
      candidate.senderAddress = candidate.from;
      delete candidate.from;
    }
    if (candidate.to && !candidate.recipientAddress) {
      candidate.recipientAddress = candidate.to;
      delete candidate.to;
    }

    // Ensure amount is always a string (schema requirement)
    if (
      candidate.amount !== undefined &&
      typeof candidate.amount === "number"
    ) {
      candidate.amount = candidate.amount.toString();
      console.log(
        `[encodeTransaction] Converted amount from number to string: ${candidate.amount}`
      );
    }

    // Validate the transaction body early and provide helpful error messages
    const validationErrors = validateTransactionBody(candidate, chainId);
    if (validationErrors.length > 0) {
      const errorMessage = `Transaction validation failed:\n\n${validationErrors.join(
        "\n"
      )}\n\nPlease fix these issues and try again.`;
      console.log(`[encodeTransaction] Validation failed:`, validationErrors);
      throw new Error(errorMessage);
    }

    // If senderAddress is missing for transfer transactions, get it from user's wallet
    if (
      (candidate.mode === "transfer" || candidate.mode === "transferToken") &&
      !candidate.senderAddress &&
      _userContext
    ) {
      try {
        // Get the chain-specific wallet address for this transaction
        const chainType = getChainTypeFromChainId(chainId);
        const addressResult = await makeWalletRequest(
          "getAddress",
          { chainType }, // Pass the chain type to get the right wallet
          _userContext
        );
        if (addressResult && addressResult.address) {
          candidate.senderAddress = addressResult.address;
          console.log(
            `[encodeTransaction] Auto-populated senderAddress for ${chainId}: ${addressResult.address}`
          );
        }
      } catch (error) {
        console.warn(
          "Could not get user's wallet address for senderAddress:",
          error
        );
      }
    }

    if (!candidate.transaction) {
      candidate = { transaction: body };
    }
    if (!candidate.transaction.data) {
      candidate = { transaction: { data: body } };
    }
    let parsedBody;
    try {
      parsedBody = EncodeTransactionRequestBodySchema.parse(candidate);
    } catch (err) {
      throw new Error(
        "Invalid encodeTransaction body. Must match EncodeTransactionRequestBodySchema. " +
          (err instanceof Error ? err.message : String(err))
      );
    }
    const result = await makeProxyRequest(
      `/${chainId}/transaction/encode`,
      "POST",
      JSON.stringify({ transaction: parsedBody.transaction })
    );
    const text = JSON.stringify(result);
    return { content: [{ type: "text", text }] };
  },
  // Requests user to sign a transaction on the client-side
  requestUserSignature: async (
    params: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    console.log(
      `[requestUserSignature] Preparing transaction for user signing`
    );
    console.log(
      `[requestUserSignature] Raw params:`,
      JSON.stringify(params, null, 2)
    );

    // Check if this is the common mistake where only description is provided
    if (
      params.description &&
      !params.encodedTransaction &&
      Object.keys(params).length === 1
    ) {
      throw new Error(
        `MISSING ENCODED TRANSACTION: You called requestUserSignature with only a description. You must pass the COMPLETE result from encodeTransaction as the 'encodedTransaction' parameter.

CORRECT USAGE:
1. First call encodeTransaction to get the encoded transaction
2. Then call requestUserSignature with BOTH parameters:
   - encodedTransaction: <the complete result from encodeTransaction>
   - description: "${params.description}"

EXAMPLE:
After encodeTransaction returns a result, call:
requestUserSignature({
  encodedTransaction: <the complete encodeTransaction result>,
  description: "${params.description}"
})`
      );
    }

    // Handle different parameter formats from the AI
    let txData;
    const description = params.description || "Sign this transaction";

    // More flexible parameter handling
    if (params.encodedTransaction) {
      // Format 1: { encodedTransaction: { chainId, transaction, status }, description }
      txData = params.encodedTransaction;
    } else if (params.chainId && params.transaction) {
      // Format 2: { chainId, transaction, status } (unwrapped)
      txData = params;
    } else if (params.chainId && params.data) {
      // Format 3: { chainId, data, ... } (alternative format)
      txData = params;
    } else if (typeof params === "object" && Object.keys(params).length > 0) {
      // Format 4: Try to use the params directly if it looks like transaction data
      console.log(
        `[requestUserSignature] Attempting to use params as transaction data`
      );
      txData = params;
    } else if (typeof params === "string") {
      // Format 5: JSON string
      try {
        txData = JSON.parse(params);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        throw new Error("Invalid JSON string for encoded transaction");
      }
    } else {
      throw new Error(
        `Invalid parameter format. You must provide both 'encodedTransaction' and 'description' parameters.

RECEIVED: ${JSON.stringify(params)}

REQUIRED FORMAT:
{
  encodedTransaction: <complete result from encodeTransaction>,
  description: "Human readable description"
}

EXAMPLE:
{
  encodedTransaction: {
    chainId: "solana",
    transaction: { data: {...}, encoded: [...] },
    status: { errors: [], warnings: [] }
  },
  description: "Send 0.01 SOL to address"
}`
      );
    }

    console.log(
      `[requestUserSignature] Processed txData:`,
      JSON.stringify(txData, null, 2)
    );

    // Validate the transaction data structure
    if (!txData) {
      throw new Error("No transaction data provided");
    }

    // Handle different transaction data structures
    let tx;
    let chainId;

    if (txData.transaction) {
      // Standard format: { chainId, transaction: { data, encoded }, status }
      tx = txData.transaction;
      chainId = txData.chainId;
    } else if (txData.data || txData.encoded) {
      // Direct format: { chainId, data, encoded }
      tx = txData;
      chainId = txData.chainId;
    } else {
      throw new Error(
        `Invalid transaction format. Expected transaction object with 'data' and 'encoded' fields. 

RECEIVED KEYS: ${JSON.stringify(Object.keys(txData))}

EXPECTED STRUCTURE:
{
  chainId: "solana",
  transaction: {
    data: { mode: "transfer", ... },
    encoded: [{ raw: { value: "..." } }]
  },
  status: { errors: [], warnings: [] }
}`
      );
    }

    if (!chainId) {
      throw new Error("Missing chainId in transaction data");
    }

    // Find the hash to sign from the encoded items
    if (!tx.encoded || !Array.isArray(tx.encoded)) {
      throw new Error(
        `No encoded items found in transaction. Available fields: ${Object.keys(
          tx
        )}`
      );
    }

    let hashToSign: string | null = null;

    // Look for the hash in different possible locations
    for (const item of tx.encoded) {
      if (item.payload) {
        // Direct payload field
        hashToSign = item.payload;
        break;
      } else if (item.raw && item.raw.value) {
        // Adamik format: raw.value contains the serialized transaction
        hashToSign = item.raw.value;
        break;
      } else if (item.value) {
        // Alternative format
        hashToSign = item.value;
        break;
      }
    }

    if (!hashToSign) {
      console.error(
        `[requestUserSignature] No hash found. Available structure:`,
        JSON.stringify(tx.encoded, null, 2)
      );
      throw new Error(
        "No hash found to sign in encoded transaction. Check the encoded items structure."
      );
    }

    // Get the user's wallet for this chain
    const chainType = getChainTypeFromChainId(chainId);

    console.log(
      `[requestUserSignature] Chain ID: ${chainId}, Chain Type: ${chainType}`
    );

    // Prepare transaction for client-side signing
    const signingRequest = {
      chainId,
      chainType,
      description,
      encodedTransaction: txData,
      hashToSign,
      status: "pending_signature",
    };

    console.log(
      `[requestUserSignature] Transaction prepared for client-side signing`
    );

    // Return a special response that the frontend will recognize as a signing request
    const response = {
      type: "signing_request",
      data: signingRequest,
      message: `Transaction ready for signing. ${description}`,
    };

    const text = JSON.stringify(response);
    return { content: [{ type: "text", text }] };
  },
  // Broadcasts a signed transaction to the blockchain
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  broadcastTransaction: async (params: any, userContext?: any) => {
    console.log(
      `[broadcastTransaction] Broadcasting transaction`,
      JSON.stringify(params, null, 2)
    );

    // Handle different parameter formats
    let broadcastChainId: string;
    let signedTransaction: any;

    if (params.chainId && params.signedTransaction) {
      // Format 1: { chainId, signedTransaction }
      broadcastChainId = params.chainId;
      signedTransaction = params.signedTransaction;
    } else if (params.encodedTransaction && params.signature) {
      // Format 2: { encodedTransaction, signature } (from client-side signing)
      const encodedTx = params.encodedTransaction;
      broadcastChainId = encodedTx.chainId;
      signedTransaction = {
        ...encodedTx,
        transaction: {
          ...encodedTx.transaction,
          signature: params.signature,
        },
      };
    } else {
      throw new Error(
        "Invalid parameters. Expected either { chainId, signedTransaction } or { encodedTransaction, signature }"
      );
    }

    console.log(
      `[broadcastTransaction] Broadcasting to ${broadcastChainId} with signature`
    );

    if (!signedTransaction || !signedTransaction.transaction) {
      throw new Error("Invalid signed transaction format");
    }

    const tx = signedTransaction.transaction;
    if (!tx.signature) {
      throw new Error("Transaction is not signed");
    }

    // Prepare the broadcast request body
    const broadcastBody = {
      transaction: {
        data: tx.data,
        encoded: tx.encoded,
        signature: tx.signature,
      },
    };

    let parsedBody;
    try {
      parsedBody = BroadcastTransactionRequestBodySchema.parse(broadcastBody);
    } catch (err) {
      throw new Error(
        "Invalid broadcast transaction body. " +
          (err instanceof Error ? err.message : String(err))
      );
    }

    const result = await makeProxyRequest(
      `/${broadcastChainId}/transaction/broadcast`,
      "POST",
      JSON.stringify(parsedBody)
    );

    console.log(`[broadcastTransaction] Transaction broadcast result:`, result);

    const text = JSON.stringify(result);
    return { content: [{ type: "text", text }] };
  },
};

// Tool definitions for OpenAI function calling (names, descriptions, schemas)
export const toolDefinitions = [
  {
    type: "function" as const,
    name: "getSupportedChains",
    description: "Get a list of supported chain IDs",
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
      "Fetches information about a non-native token (ERC-20, TRC-20, SPL, etc.) including its decimal precision for human-readable balance formatting.",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the blockchain network",
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
    description: "Get the wallet address",
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
      "List all embedded wallets for the user across different blockchains",
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
      "Create a new embedded wallet for a specific blockchain network. Supports creating wallets for different chain types like ethereum, solana, tron, and cosmos.",
    parameters: {
      type: "object",
      properties: {
        chainType: {
          type: "string",
          description:
            "The blockchain type to create a wallet for (e.g., 'ethereum', 'solana', 'tron', 'cosmos'). Must be one of the supported chains.",
          enum: chains,
        },
      },
      additionalProperties: false,
      required: ["chainType"],
    },
  },
  // {
  //   type: "function" as const,
  //   name: "getPubKey",
  //   description: "Get the wallet public key",
  //   parameters: {
  //     type: "object",
  //     properties: {},
  //     additionalProperties: false,
  //   },
  // },
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
    name: "encodeTransaction",
    description: `
Encodes a transaction for blockchain submission. Returns an encoded transaction ready for signing.

REQUIRED FIELDS:
- mode: MANDATORY discriminator field. Must be one of: "transfer", "transferToken", "stake", "unstake", "claimRewards", "withdraw", "registerStake", "convertAsset", "deployAccount"
- senderAddress: Sender's wallet address (auto-populated if missing for transfer/transferToken)
- amount: Amount in smallest units as STRING (e.g., "10000000" for 0.01 SOL) OR useMaxAmount: true

EXAMPLES:

SOL Transfer:
{
  "chainId": "solana",
  "body": {
    "mode": "transfer",
    "recipientAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "amount": "10000000"
  }
}

Token Transfer:
{
  "chainId": "ethereum", 
  "body": {
    "mode": "transferToken",
    "tokenId": "0xA0b86a33E6e87C6e81962e0c50c5B4e4b4c6c4f8",
    "recipientAddress": "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
    "amount": "1000000000000000000"
  }
}

Staking:
{
  "chainId": "cosmos",
  "body": {
    "mode": "stake", 
    "targetValidatorAddress": "cosmosvaloper1...",
    "amount": "1000000"
  }
}

CRITICAL: Always include the "mode" field - it's required for schema validation!`,
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description: "The ID of the blockchain network",
        },
        body: EncodeTransactionRequestBodySchema,
      },
      required: ["chainId", "body"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "requestUserSignature",
    description:
      "Requests the user to sign an encoded transaction using their wallet. Takes the COMPLETE output from encodeTransaction and prepares it for client-side signing. The user will be prompted to review and sign the transaction in their wallet interface.",
    parameters: {
      type: "object",
      properties: {
        encodedTransaction: {
          type: "object",
          description:
            "The COMPLETE encoded transaction object returned from encodeTransaction - pass the entire JSON result including chainId, transaction.data, transaction.encoded, and status fields",
        },
        description: {
          type: "string",
          description:
            "A human-readable description of what this transaction will do (e.g., 'Send 0.1 SOL to Alice', 'Stake 5 SOL with validator XYZ'). This will be shown to the user when they are asked to sign.",
        },
      },
      required: ["encodedTransaction", "description"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "broadcastTransaction",
    description:
      "Broadcasts a signed transaction to the blockchain network. Can accept either the traditional format with chainId and signedTransaction, or the client-side format with encodedTransaction and signature.",
    parameters: {
      type: "object",
      properties: {
        chainId: {
          type: "string",
          description:
            "The ID of the blockchain network (optional if encodedTransaction contains chainId)",
        },
        signedTransaction: {
          type: "object",
          description:
            "The signed transaction object (for server-side signed transactions)",
        },
        encodedTransaction: {
          type: "object",
          description:
            "The encoded transaction object (for client-side signed transactions)",
        },
        signature: {
          type: "string",
          description:
            "The signature from client-side signing (for client-side signed transactions)",
        },
      },
      additionalProperties: false,
    },
  },
  // {
  //   type: "function" as const,
  //   name: "deriveAddress",
  //   description: "Derive blockchain-specific address from public key",
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       chainId: {
  //         type: "string",
  //         description: "The ID of the blockchain network",
  //       },
  //       pubkey: {
  //         type: "string",
  //         description: "The public key to derive address from",
  //       },
  //     },
  //     additionalProperties: false,
  //     required: ["chainId", "pubkey"],
  //   },
  // },
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

    console.log(
      `[Supervisor] Executing tool: ${toolName} with params:`,
      JSON.stringify(params, null, 2)
    );
    console.log(
      `[Supervisor] User context:`,
      JSON.stringify(userContext, null, 2)
    );

    if (!toolName || !(toolName in toolLogic)) {
      console.log(
        `[Supervisor] ERROR: Unknown tool or missing toolName: ${toolName}`
      );
      return {
        content: [{ type: "text", text: "Unknown tool or missing toolName." }],
      };
    }
    try {
      const result = await toolLogic[toolName](params, userContext);
      console.log(
        `[Supervisor] Tool ${toolName} result:`,
        JSON.stringify(result, null, 2)
      );
      return result;
    } catch (e) {
      const errorMessage = `Error: ${
        e instanceof Error ? e.message : String(e)
      }`;
      console.log(`[Supervisor] ERROR in tool ${toolName}:`, errorMessage);
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
    "Supervisor agent for Adamik voice agent, handles all tool logic and decision making.",
  model: "gpt-4.1",
  instructions: "See supervisorAgentInstructions in this file.",
  tools: [getNextResponseFromSupervisor],
};
