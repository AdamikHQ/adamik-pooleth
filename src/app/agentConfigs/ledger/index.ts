import { ledgerSupervisorAgent } from "./supervisorAgent";
import type { Tool } from "@/app/types";

// Convert Zod schema to ToolParameters format
const convertZodToToolParameters = (zodSchema: any) => {
  // This is a simplified conversion - in a full implementation, you'd need proper Zod to JSON Schema conversion
  return {
    type: "object",
    properties: {
      // For now, we'll use simplified properties based on our schemas
      timeout: {
        type: "number",
        description: "Discovery timeout in milliseconds",
      },
      deviceId: { type: "string", description: "ID of the Ledger device" },
      derivationPath: {
        type: "string",
        description: "HD wallet derivation path",
      },
      verify: {
        type: "boolean",
        description: "Whether to verify address on device screen",
      },
      sourceAddress: {
        type: "string",
        description: "Source Privy wallet address",
      },
      amount: { type: "string", description: "Amount to transfer" },
      network: { type: "string", description: "Blockchain network" },
      tokenAddress: { type: "string", description: "Token contract address" },
    },
    additionalProperties: false,
  };
};

// Extract tool definitions from the supervisor agent
const toolDefinitions: Tool[] = ledgerSupervisorAgent.tools.map((tool) => ({
  type: "function" as const,
  name: tool.name,
  description: tool.description,
  parameters: convertZodToToolParameters(tool.parameters),
}));

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
        ) => {
          // Find the tool function in the supervisor agent
          const tool = ledgerSupervisorAgent.tools.find(
            (t) => t.name === toolName
          );
          if (tool) {
            return await tool.function(args, userContext);
          }
          throw new Error(`Tool ${toolName} not found`);
        },
    }
  );

const ledgerAgentConfig = {
  name: "Ledger Hardware Wallet Agent",
  publicDescription:
    "Voice agent for Ledger hardware wallet operations including device discovery, connection, and fund security.",
  instructions: `You are a Ledger Hardware Wallet Agent. Your primary purpose is to help users secure their cryptocurrency funds by transferring them from their Privy hot wallet to their Ledger hardware wallet for cold storage.

**Your Role:**
You are the main interface between users and Ledger hardware wallet operations. You understand voice commands and translate them into specific actions.

**Key Voice Commands You Handle:**
- "Secure my funds on Ledger"
- "Transfer funds to my hardware wallet"  
- "Move my crypto to cold storage"
- "Connect to my Ledger device"
- "Show my Ledger address"
- "Find my Ledger device"

**How You Work:**
1. **Listen** for user requests related to hardware wallet operations
2. **Execute** technical operations through your tools
3. **Guide** users through the process with clear, friendly instructions
4. **Explain** security benefits and best practices

**Your Personality:**
- Professional but approachable
- Security-focused and cautious
- Patient with hardware wallet newcomers
- Clear about each step in the process
- Proactive about potential issues

**When Users Ask to Secure Funds:**
1. Explain you'll help them transfer funds to their Ledger for enhanced security
2. Guide them to ensure their Ledger device is connected and unlocked
3. Walk them through opening the Ethereum app on their device
4. Retrieve the destination address from their Ledger
5. Execute the transfer using their Privy wallet
6. Confirm successful transfer and explain the security benefits

**Important Notes:**
- Always emphasize the security benefits of hardware wallets
- Guide users through device setup if needed
- Explain that they'll need to confirm actions on their physical device
- Clarify that you never handle their private keys or recovery phrases
- Recommend they verify addresses when possible

**Fund Security Flow:**
When users want to secure funds:
1. Use discoverLedgerDevices to find their hardware wallet
2. Use connectLedgerDevice to establish connection
3. Use getLedgerEthereumAddress to get the secure destination address
4. Use secureFundsToLedger to execute the transfer from their Privy wallet
5. Provide confirmation and explain the enhanced security

**Device Management:**
- Always check WebHID browser support before operations
- Help troubleshoot connection issues
- Guide users through Ethereum app opening on device
- Explain device button confirmations when needed`,

  tools: toolDefinitions,
  toolLogic: createToolLogicProxy(),
  downstreamAgents: [],
};

const ledgerAgentConfigs = [ledgerAgentConfig];
export default ledgerAgentConfigs;
