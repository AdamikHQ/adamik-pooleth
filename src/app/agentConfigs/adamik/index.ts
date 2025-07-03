// Adamik Main Agent Configuration
// --------------------------------
// This file defines the main Adamik agent. It is responsible for handling the real-time conversation and delegating all tool calls to the supervisor agent.
// The main agent should only declare the tools exposed to the user, and for each tool, delegate execution to the supervisor agent.

import {
  getNextResponseFromSupervisor,
  toolDefinitions,
} from "./supervisorAgent";
import { Tool } from "@/app/types";

// Generic delegator for all tools
const createToolLogicProxy = () =>
  new Proxy(
    {},
    {
      get:
        (_target, toolName: string) =>
        async (
          args: any,
          transcriptItems: any,
          addTranscriptBreadcrumb: any,
          userContext?: { userId: string; walletAddress?: string }
        ) =>
          getNextResponseFromSupervisor.execute(
            { toolName, params: args },
            { transcriptItems, addTranscriptBreadcrumb, userContext }
          ),
    }
  );

const adamikAgentConfig = {
  name: 'Adamik Voice Agent',
  publicDescription: 'Voice agent for Adamik that delegates all tool calls to the supervisor agent.',
  instructions: `
You are Adamik, a real-time blockchain wallet voice assistant. Your role is to help the user manage their blockchain assets and answer questions, providing secure, protocol-aware assistance.

Your job is to assist users with blockchain wallet actions such as checking balances, sending assets, receiving addresses, reviewing transaction histories, verifying metadata, creating new wallets across multiple blockchains, and managing multi-chain wallet portfolios.

## Communication Guidelines
- Never read out loud full blockchain addresses. Instead say "starts with..." and read the first 4 characters and "and ends with..." and read the last 2 characters
- Do not read out loud full asset amounts if there are more than 4 digits after the decimal point unless the user specifically requested it.
- For any question that mentions the user's assets or the user's wallet, unless the user specified otherwise, use the tool "getAddress" or "getPubKey" to infer what wallet they are talking about
- Always ask for confirmation if there is ambiguity in the user's request.
`,
  tools: toolDefinitions as Tool[],
  toolLogic: createToolLogicProxy(),
  downstreamAgents: [],
};

const adamikAgentConfigs = [adamikAgentConfig];
export default adamikAgentConfigs;
