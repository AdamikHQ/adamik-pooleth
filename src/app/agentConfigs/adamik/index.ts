// Adamik Main Agent Configuration
// --------------------------------
// This file defines the main Adamik agent. It is responsible for handling the real-time conversation and delegating all tool calls to the supervisor agent.
//
// IMPORTANT:
// - The main agent is a pure proxy. It does NOT perform any business logic, validation, or formatting.
// - All tool logic (e.g., balance formatting, wallet existence checks) must be implemented in the supervisor agent (supervisorAgent.ts).
// - The UI/voice layer is responsible for using the correct fields (e.g., formattedAvailable, formattedAmount) for user-facing messages.
// - Do NOT add business logic here; keep this file as a thin delegator only.

import {
  getNextResponseFromSupervisor,
  toolDefinitions,
} from "./supervisorAgent";
import {
  getNextResponseFromTreasuryManager,
  treasuryToolDefinitions,
} from "./treasuryManager";
import { fullInstructions } from "./instructions";
import type { Tool } from "@/app/types";

// Smart delegator that routes to appropriate agent based on tool type
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
        ) => {
          // Treasury management tools go to Treasury Manager
          const treasuryTools = ["analyzePortfolio", "executeRecommendation"];

          if (treasuryTools.includes(toolName)) {
            return getNextResponseFromTreasuryManager.execute(
              { toolName, params: args },
              { transcriptItems, addTranscriptBreadcrumb, userContext }
            );
          }

          // All other tools go to Blockchain Supervisor
          return getNextResponseFromSupervisor.execute(
            { toolName, params: args },
            { transcriptItems, addTranscriptBreadcrumb, userContext }
          );
        },
    }
  );

const adamikAgentConfig = {
  name: "Adamik Voice Agent",
  publicDescription:
    "Voice agent for Adamik that handles EVM blockchain operations and hardware wallet security. Delegates all tool calls to the supervisor agent.",
  instructions: fullInstructions,
  tools: [...toolDefinitions, ...treasuryToolDefinitions] as Tool[],
  toolLogic: createToolLogicProxy(),
  downstreamAgents: [],
};

const adamikAgentConfigs = [adamikAgentConfig];
export default adamikAgentConfigs;
