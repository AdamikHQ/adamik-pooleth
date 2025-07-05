import { tool } from '@openai/agents/realtime';
import { chains } from './chains';
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
  PubkeyToAddressRequestBody
} from './schemas';
import { makeProxyRequest, makeWalletRequest } from '@/app/lib/api';

const supervisorAgentInstructions = `\
# Personality and Tone\n## Identity\nYou are a precise, real-time supervisor agent for a blockchain wallet assistant. You operate like a secure, protocol-aware transaction agent—your personality is disciplined, logical, and methodical. You are focused on accuracy, clarity, and trust, avoiding any unnecessary elaboration.\n- Never read out loud full blockchain addresses. Instead say "starts with..." and read the first 4 characters and "and ends with..." and read the last 2 characters\n- Do not read out loud full asset amounts if there are more than 4 digits after the decimal point unless the user specifically requested it.\n- For any question that mentions the user's assets or the user's wallet, unless the user specified otherwise, use the tool "getAddress" or "getPubKey" to infer what wallet they are talking about\n`;

const toolLogic: Record<string, (params: any) => Promise<{ content: { type: "text"; text: string }[] }>> = {
  getSupportedChains: async () => {
    const text = chains.join(",");
    return { content: [{ type: "text", text }] };
  },
  listFeatures: async ({ chainId }: { chainId: string }) => {
    if (!chains.includes(chainId)) {
      throw new Error(`Chain ${chainId} is not supported`);
    }
    const features = await makeProxyRequest(`/chains/${chainId}`);
    const text = JSON.stringify(features);
    return { content: [{ type: "text", text }] };
  },
  getTokenDetails: async ({ chainId, tokenId }: { chainId: string, tokenId: string }) => {
    const details = await makeProxyRequest(`/${chainId}/token/${tokenId}`);
    const text = JSON.stringify(details);
    return { content: [{ type: "text", text }] };
  },
  getPubKey: async () => {
    const pubKey = await makeWalletRequest("getPubKey");
    const text = JSON.stringify(pubKey);
    return { content: [{ type: "text", text }] };
  },
  getAddress: async () => {
    const address = await makeWalletRequest("getAddress");
    const text = JSON.stringify(address);
    return { content: [{ type: "text", text }] };
  },
  deriveAddress: async ({ chainId, pubkey }: PubkeyToAddressPathParams & PubkeyToAddressRequestBody) => {
    const details = await makeProxyRequest(`/${chainId}/address/encode`, "POST", JSON.stringify({ pubkey }));
    const text = JSON.stringify(details);
    return { content: [{ type: "text", text }] };
  },
  getAccountState: async ({ chainId, accountId }: GetAccountStatePathParams) => {
    const state = await makeProxyRequest(`/${chainId}/account/${accountId}/state`);
    const text = JSON.stringify(state);
    return { content: [{ type: "text", text }] };
  },
  getAccountHistory: async ({ chainId, accountId, nextPage }: GetAccountHistoryPathParams & GetAccountHistoryQueryParams) => {
    const history = await makeProxyRequest(`/${chainId}/account/${accountId}/history${nextPage ? `?nextPage=${nextPage}` : ""}`);
    const text = JSON.stringify(history);
    return { content: [{ type: "text", text }] };
  },
  getChainValidators: async ({ chainId, nextPage }: GetChainValidatorsPathParams & GetChainValidatorsQueryParams) => {
    const validators = await makeProxyRequest(`/${chainId}/validators${nextPage ? `?nextPage=${nextPage}` : ""}`);
    const text = JSON.stringify(validators);
    return { content: [{ type: "text", text }] };
  },
  getTransactionDetails: async ({ chainId, transactionId }: GetTransactionDetailsPathParams) => {
    const transaction = await makeProxyRequest(`/${chainId}/transaction/${transactionId}`);
    const text = JSON.stringify(transaction);
    return { content: [{ type: "text", text }] };
  },
  encodeTransaction: async ({ chainId, body }: EncodeTransactionPathParams & { body: EncodeTransactionRequestBody; }) => {
    const encodedResult = await makeProxyRequest(`/${chainId}/transaction/encode`, "POST", JSON.stringify({ transaction: { data: body } }));
    const text = JSON.stringify(encodedResult);
    return { content: [{ type: "text", text }] };
  },
  signTransaction: async ({ walletConnectRawValue }: { walletConnectRawValue: string }) => {
    const signature = await makeWalletRequest("signTransaction", { tx: JSON.parse(walletConnectRawValue) });
    const text = JSON.stringify(signature);
    return { content: [{ type: "text", text }] };
  },
  broadcastTransaction: async ({ chainId, body }: BroadcastTransactionPathParams & { body: BroadcastTransactionRequestBody; }) => {
    const result = await makeProxyRequest(`/${chainId}/transaction/broadcast`, "POST", { transaction: { data: body } });
    const text = JSON.stringify(result);
    return { content: [{ type: "text", text }] };
  },
};

export const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description: 'Determines the next response whenever the agent faces a non-trivial decision, produced by a highly intelligent supervisor agent. Returns a message describing what to do next.',
  parameters: {
    type: 'object',
    properties: {
      toolName: { type: 'string', description: 'The name of the tool to invoke.' },
      params: { type: 'object', description: 'Parameters to pass to the tool.' }
    },
    required: ['toolName', 'params'] as string[],
    additionalProperties: false,
  },
  async execute(input, _details) {
    console.log(_details);
    const { toolName, params } = input as { toolName: string; params: any };
    if (!toolName || !(toolName in toolLogic)) {
      return { content: [{ type: 'text', text: 'Unknown tool or missing toolName.' }] };
    }
    try {
      return await toolLogic[toolName](params);
    } catch (e) {
      return { content: [{ type: 'text', text: `Error: ${e instanceof Error ? e.message : String(e)}` }] };
    }
  },
});

export const supervisorAgentConfig = {
  name: 'Adamik Supervisor',
  publicDescription: 'Supervisor agent for Adamik voice agent, handles all tool logic and decision making.',
  model: 'gpt-4.1',
  instructions: supervisorAgentInstructions,
  tools: [getNextResponseFromSupervisor as unknown as import('@/app/types').Tool],
};
