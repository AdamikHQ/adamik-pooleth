import { AgentConfig } from "@/app/types";
import { chains } from "./chains";
import {
  BroadcastTransactionPathParams,
  BroadcastTransactionRequestBody,
  EncodeTransactionPathParams,
  EncodeTransactionRequestBody,
  GetAccountHistoryPathParams,
  GetAccountHistoryQueryParams,
  GetAccountStatePathParams,
  GetChainValidatorsPathParams,
  GetChainValidatorsQueryParams,
  GetTransactionDetailsPathParams,
  PubkeyToAddressPathParams,
  PubkeyToAddressRequestBody,
} from "@/app/agentConfigs/adamik/schemas";
import { makeProxyRequest, makeWalletRequest } from "@/app/lib/api";

const adamikAgentConfig = {
  name: 'Adamik Voice Agent',
  publicDescription: 'Voice agent for Adamik that delegates all tool calls to the supervisor agent.',
  instructions: `
You are Adamik, a real-time blockchain wallet voice assistant. Your role is to help the user manage their blockchain assets and answer questions, but you must always defer complex logic and all tool calls to your Supervisor Agent via the getNextResponseFromSupervisor tool.

## Task
Your job is to assist users with blockchain wallet actions such as checking balances, sending assets, receiving addresses, reviewing transaction histories, and verifying metadata. You must validate asset formatting (such as the correct number of decimals per token) before giving output. You provide confirmations, summaries, and security-conscious guidance at all times.

## Demeanor
Neutral and efficient. You don't attempt to express emotional support or enthusiasm. You operate with calm precision and clarity, designed for users who expect professional-grade tools.

## Tone
Formally spoken, clipped, and always to the point. No small talk. Use minimal but complete phrasing to reduce the chance of misunderstanding.

## Level of Enthusiasm
Low. You do not emote excitement or urgency. You treat every task with the same level of professional seriousness.

## Level of Formality
High. Use professional, precise language. Never speak casually or use slang.

## Level of Emotion
Matter-of-fact. Avoid emotional coloring or empathetic reactions.

## Filler Words
Occasionally. You may use simple pacing words like "okay," "just a moment," or "understood" to mark transitions, but never to fill silence unnecessarily.

## Pacing
Slow and deliberate. Prioritize clarity and allow time for users to follow your instructions or questions.

## Other details
- Always ask for confirmation if there is ambiguity in the user's request.
- Always check and use the correct number of decimals for any given asset before responding with a value.
- Avoid repeating yourself unless prompted or unless confirming critical actions like sending funds.
- Never read out loud full blockchain addresses. Instead say "starts with..." and read the first 4 characters and "and ends with..." and read the last 2 characters
- Do not read out loud full asset amounts if there are more than 4 digits after the decimal point unless the user specifically requested it.
- For any question that mentions the user's assets or the user's wallet, unless the user specified otherwise, use the tool "getAddress" or "getPubKey" to infer what wallet they are talking about

# Instructions
- Follow the Conversation States closely to ensure a structured and consistent interaction.
- If a user provides a name, address, token name, or anything that requires precise spelling, always repeat it back to the user to confirm you have the right understanding before proceeding.
- If the caller corrects any detail, acknowledge the correction in a straightforward manner and confirm the new spelling or value.
`;

const toolLogic = {
  getSupportedChains: async (
    _args: any,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    return {
      content: [{ type: "text", text: chains.join(",") }],
    };
  },

  listFeatures: async (
    { chainId }: { chainId: string },
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    if (!chains.includes(chainId)) {
      throw new Error(`Chain ${chainId} is not supported`);
    }
    const features = await makeProxyRequest(`/chains/${chainId}`);
    return {
      content: [{ type: "text", text: JSON.stringify(features) }],
    };
  },

  getTokenDetails: async (
    { chainId, tokenId }: { chainId: string; tokenId: string },
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const details = await makeProxyRequest(`/${chainId}/token/${tokenId}`);
    return {
      content: [{ type: "text", text: JSON.stringify(details) }],
    };
  },

  getPubKey: async (
    _args: any,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    const pubKey = await makeWalletRequest("getPubKey", {}, userContext);
    return {
      content: [{ type: "text", text: JSON.stringify(pubKey) }],
    };
  },

  getAddress: async (
    _args: any,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    const address = await makeWalletRequest("getAddress", {}, userContext);
    return {
      content: [{ type: "text", text: JSON.stringify(address) }],
    };
  },

  deriveAddress: async (
    { chainId, pubkey }: PubkeyToAddressPathParams & PubkeyToAddressRequestBody,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const details = await makeProxyRequest(
      `/${chainId}/address/encode`,
      "POST",
      JSON.stringify({ pubkey })
    );
    return {
      content: [{ type: "text", text: JSON.stringify(details) }],
    };
  },

  getAccountState: async (
    { chainId, accountId }: GetAccountStatePathParams,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const state = await makeProxyRequest(
      `/${chainId}/account/${accountId}/state`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(state) }],
    };
  },

  getAccountHistory: async (
    {
      chainId,
      accountId,
      nextPage,
    }: GetAccountHistoryPathParams & GetAccountHistoryQueryParams,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const history = await makeProxyRequest(
      `/${chainId}/account/${accountId}/history${
        nextPage ? `?nextPage=${nextPage}` : ""
      }`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(history) }],
    };
  },

  getChainValidators: async (
    {
      chainId,
      nextPage,
    }: GetChainValidatorsPathParams & GetChainValidatorsQueryParams,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const validators = await makeProxyRequest(
      `/${chainId}/validators${nextPage ? `?nextPage=${nextPage}` : ""}`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(validators) }],
    };
  },

  getTransactionDetails: async (
    { chainId, transactionId }: GetTransactionDetailsPathParams,
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const transaction = await makeProxyRequest(
      `/${chainId}/transaction/${transactionId}`
    );
    return {
      content: [{ type: "text", text: JSON.stringify(transaction) }],
    };
  },

  encodeTransaction: async (
    {
      chainId,
      body,
    }: EncodeTransactionPathParams & { body: EncodeTransactionRequestBody },
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const encodedResult = await makeProxyRequest(
      `/${chainId}/transaction/encode`,
      "POST",
      JSON.stringify({ transaction: { data: body } })
    );
    return {
      content: [{ type: "text", text: JSON.stringify(encodedResult) }],
    };
  },

  signTransaction: async (
    { walletConnectRawValue }: { walletConnectRawValue: string },
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    userContext?: { userId: string; walletAddress?: string }
  ) => {
    const signature = await makeWalletRequest(
      "signTransaction",
      { tx: JSON.parse(walletConnectRawValue) },
      userContext
    );
    return {
      content: [{ type: "text", text: JSON.stringify(signature) }],
    };
  },

  broadcastTransaction: async (
    {
      chainId,
      body,
    }: BroadcastTransactionPathParams & {
      body: BroadcastTransactionRequestBody;
    },
    _transcriptItems: any,
    _addTranscriptBreadcrumb: any,
    _userContext?: { userId: string; walletAddress?: string }
  ) => {
    const result = await makeProxyRequest(
      `/${chainId}/transaction/broadcast`,
      "POST",
      JSON.stringify(body)
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
};

const chatAgent: AgentConfig = {
  name: "Adamik",
  publicDescription: "Smart Blockchain Wallet",
  instructions: chatAgentInstructions,
  tools: [
    {
      type: "function",
      name: "getSupportedChains",
      description: "Get a list of supported chain IDs",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      type: "function",
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
      type: "function",
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
      type: "function",
      name: "getAddress",
      description: "Get the wallet address",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "getPubKey",
      description: "Get the wallet public key",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "deriveAddress",
      description:
        "Derive a blockchain address for a given chain from a public key",
      parameters: {
        type: "object",
        properties: {
          chainId: {
            type: "string",
            description: "The ID of the blockchain network",
          },
          pubkey: {
            type: "string",
            description: "The public key to derive the address from",
          },
        },
        additionalProperties: false,
        required: ["chainId", "pubkey"],
      },
    },
    {
      type: "function",
      name: "getAccountState",
      description:
        "Get the state of an account including balances and staking positions. Returns raw amounts in smallest units—must be converted using decimals from other endpoints.",
      parameters: {
        type: "object",
        properties: {
          chainId: {
            type: "string",
            description: "The ID of the blockchain network",
          },
          accountId: {
            type: "string",
            description: "The blockchain account address",
          },
        },
        additionalProperties: false,
        required: ["chainId", "accountId"],
      },
    },
    {
      type: "function",
      name: "getAccountHistory",
      description: "Get the transaction history for an account",
      parameters: {
        type: "object",
        properties: {
          chainId: {
            type: "string",
            description: "The ID of the blockchain network",
          },
          accountId: {
            type: "string",
            description: "The blockchain account address",
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
      type: "function",
      name: "getChainValidators",
      description:
        "Gets the list of known validators for a given chain. Useful for selecting validators for staking.",
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
      type: "function",
      name: "getTransactionDetails",
      description: "Gets information about a specific transaction given its ID",
      parameters: {
        type: "object",
        properties: {
          chainId: {
            type: "string",
            description: "The ID of the blockchain network",
          },
          transactionId: {
            type: "string",
            description: "The ID or hash of the transaction",
          },
        },
        additionalProperties: false,
        required: ["chainId", "transactionId"],
      },
    },
    {
      type: "function",
      name: "encodeTransaction",
      description: [
        "Turns a transaction intent in Adamik JSON format into an encoded transaction ready to be signed.",
        "Supports various transaction types including staking and asset conversion.\n",
        "The input format for the body should match the schema of 'TransactionBody' where:",
        `
interface BaseTransactionBody {
  mode: 'transfer' | 'transferToken' | 'convertAsset',
}

interface TransferTransactionBody extends BaseTransactionBody {
  mode: 'transfer';
  senderAddress: string;
  recipientAddress: string;
  amount?: string; // Required if 'useMaxAmount' is false or not defined
  useMaxAmount?: boolean;
}

interface TransferTokenTranscationBody extends BaseTransactionBody {
  mode: 'transferToken';
  tokenId: string;
  senderAddress: string;
  recipientAddress: string;
  amount?: string; // Required if 'useMaxAmount' is false or not defined
  useMaxAmount?: boolean;
}

interface ConvertAssetTransactionBody extends BaseTransactionBody {
  mode: 'convertAsset',
  from: {
    amount: string;
    trokenId: string;
    address: string;
  };
  to: {
    amount: string;
    chainId: string;
    tokenId: string;
    address: string;
  };
  includeFees: boolean;
  slippage: number; // Decimal between 0 and 1 representing the slippage allowed
}

export type TransactionBody = TransferTransactionBody | TransferTokenTranscationBody | ConvertAssetTransactionBody;        
`,
      ].join(" "),
      parameters: {
        type: "object",
        properties: {
          chainId: {
            type: "string",
            description: "The ID of the blockchain network",
          },
          body: {
            type: "object",
            description: "The full transaction intent payload in Adamik format",
          },
        },
        additionalProperties: false,
        required: ["chainId", "body"],
      },
    },
    {
      type: "function",
      name: "signTransaction",
      description: [
        "Sign a transaction payload of type WALLET_CONNECT. In order to use this tool, please extract the",
        "raw.value field from the encoded response that has type WALLET_CONNECT",
      ].join(" "),
      parameters: {
        type: "object",
        properties: {
          walletConnectRawValue: {
            type: "string",
            description:
              "The stringified JSON of the wallet connect encoded transaction",
          },
        },
        additionalProperties: false,
        required: ["chainId", "body"],
      },
    },
    {
      type: "function",
      name: "broadcastTransaction",
      description:
        "Broadcasts a signed transaction. Typically used in combination with an MCP server that handles signing.",
      parameters: {
        type: "object",
        properties: {
          chainId: {
            type: "string",
            description: "The ID of the blockchain network",
          },
          body: {
            type: "object",
            description:
              "The signed transaction data in broadcast-ready format",
          },
        },
        additionalProperties: false,
        required: ["chainId", "body"],
      },
    },
  ],
  toolLogic,
  downstreamAgents: [],
};

export default [adamikAgentConfig];
