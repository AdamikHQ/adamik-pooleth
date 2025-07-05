// Adamik Treasury Manager Agent
// ==============================
// This agent handles strategic financial decisions, portfolio optimization, and asset management.
// It delegates blockchain operations to the supervisorAgent for execution.

import { getNextResponseFromSupervisor } from "./supervisorAgent";
import {
  MOCK_AAVE_USDC_YIELDS,
  MOCK_ETH_PRICE_USD,
  SUPPORTED_YIELD_CHAINS,
  type SupportedChain,
} from "./mockData";

// Treasury management rules and strategies
const TREASURY_RULES = {
  SECURITY_THRESHOLD: 500, // USDC threshold for Ledger security
  MIN_YIELD_IMPROVEMENT: 0.5, // Minimum yield improvement to justify bridge (0.5%)
  SUPPORTED_YIELD_PROTOCOLS: ["aave"], // Simplified: only Aave
  RISK_TOLERANCE: "moderate", // conservative, moderate, aggressive
};

// Mock market data service (replace with real API)
class MarketDataService {
  static async getYieldRates(chainId: string): Promise<{
    aave: { usdc: number };
  }> {
    // Use mock data from separate file - replace with real API calls when ready
    const chainKey = chainId as SupportedChain;
    return MOCK_AAVE_USDC_YIELDS[chainKey] || MOCK_AAVE_USDC_YIELDS.ethereum;
  }
}

// Treasury strategy implementations
const treasuryStrategies: Record<string, any> = {
  // Analyze portfolio and suggest optimizations
  analyzePortfolio: async (
    params: { address: string; networks?: string[] },
    userContext: any
  ) => {
    try {
      console.log("📊 Starting portfolio analysis...");

      const {
        address,
        networks = ["ethereum", "polygon", "base", "arbitrum"],
      } = params;

      // 1. Get balances across all networks
      const portfolioData = [];
      for (const network of networks) {
        console.log(`🔍 Checking ${network} balance...`);

        const balanceResult = await getNextResponseFromSupervisor.execute(
          {
            toolName: "getAccountState",
            params: { chainId: network, accountId: address },
          },
          { userContext }
        );

        const balance = JSON.parse(balanceResult.content[0].text);
        portfolioData.push({
          network,
          balance,
          native: balance?.balances?.native,
          tokens: balance?.balances?.tokens || [],
        });
      }

      // 2. Analyze security needs
      const securityAnalysis = await treasuryStrategies.analyzeSecurityNeeds(
        portfolioData
      );

      // 3. Analyze yield opportunities
      const yieldAnalysis = await treasuryStrategies.analyzeYieldOpportunities(
        portfolioData
      );

      // 4. Generate strategic recommendations
      const recommendations = {
        security: securityAnalysis,
        yield: yieldAnalysis,
        summary: {
          totalValueUSD: portfolioData.reduce(
            (sum, p) => sum + (p.balance?.totalValueUSD || 0),
            0
          ),
          networksAnalyzed: networks.length,
          recommendationsCount:
            securityAnalysis.recommendations.length +
            yieldAnalysis.recommendations.length,
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(recommendations) }],
      };
    } catch (error: any) {
      console.error("❌ Portfolio analysis failed:", error);
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: error.message }) },
        ],
      };
    }
  },

  // Analyze security needs and recommend Ledger transfers
  analyzeSecurityNeeds: async (portfolioData: any[]) => {
    const recommendations = [];

    for (const portfolio of portfolioData) {
      const { network, tokens } = portfolio;

      // Check USDC balances
      const usdcToken = tokens.find(
        (t: any) =>
          t.token?.ticker?.toLowerCase() === "usdc" ||
          t.token?.symbol?.toLowerCase() === "usdc"
      );

      if (usdcToken && usdcToken.formattedAmount) {
        const usdcAmount = parseFloat(usdcToken.formattedAmount);

        if (usdcAmount > TREASURY_RULES.SECURITY_THRESHOLD) {
          recommendations.push({
            type: "security",
            priority: "high",
            action: "secure_to_ledger",
            network,
            token: "USDC",
            amount: usdcAmount,
            reason: `${usdcAmount} USDC exceeds security threshold of ${TREASURY_RULES.SECURITY_THRESHOLD} USDC`,
            estimatedSavings: `Enhanced security for $${usdcAmount.toFixed(
              2
            )} in cold storage`,
          });
        }
      }

      // Check ETH balances
      const nativeBalance = portfolio.native;
      if (nativeBalance?.formattedAvailable) {
        const ethAmount = parseFloat(nativeBalance.formattedAvailable);
        const ethValueUSD = ethAmount * MOCK_ETH_PRICE_USD;

        if (ethValueUSD > TREASURY_RULES.SECURITY_THRESHOLD) {
          recommendations.push({
            type: "security",
            priority: "high",
            action: "secure_to_ledger",
            network,
            token: "ETH",
            amount: ethAmount,
            valueUSD: ethValueUSD,
            reason: `${ethAmount} ETH (~$${ethValueUSD.toFixed(
              2
            )}) exceeds security threshold`,
            estimatedSavings: `Enhanced security for $${ethValueUSD.toFixed(
              2
            )} in cold storage`,
          });
        }
      }
    }

    return {
      type: "security_analysis",
      recommendations,
      summary: `Found ${recommendations.length} security recommendations`,
    };
  },

  // Analyze yield opportunities across chains (simplified: only USDC on Aave)
  analyzeYieldOpportunities: async (portfolioData: any[]) => {
    const recommendations = [];

    // Get USDC yield rates on Aave for all chains
    const yieldRates: Record<string, any> = {};
    const chains = SUPPORTED_YIELD_CHAINS;

    for (const chain of chains) {
      yieldRates[chain] = await MarketDataService.getYieldRates(chain);
    }

    // Find best USDC yield on Aave across all chains
    let bestYield = { chain: "", protocol: "aave", rate: 0, token: "usdc" };

    for (const [chain, rates] of Object.entries(yieldRates)) {
      const usdcRate = rates.aave?.usdc;
      if (typeof usdcRate === "number" && usdcRate > bestYield.rate) {
        bestYield = { chain, protocol: "aave", rate: usdcRate, token: "usdc" };
      }
    }

    // Analyze each portfolio position (only USDC)
    for (const portfolio of portfolioData) {
      const { network, tokens } = portfolio;

      for (const token of tokens) {
        const tokenSymbol =
          token.token?.ticker?.toLowerCase() ||
          token.token?.symbol?.toLowerCase();

        // Only analyze USDC positions
        if (tokenSymbol === "usdc") {
          const currentAmount = parseFloat(token.formattedAmount || "0");

          // Only recommend yield farming for amounts below security threshold
          if (
            currentAmount > 0 &&
            currentAmount < TREASURY_RULES.SECURITY_THRESHOLD
          ) {
            const currentYield = yieldRates[network]?.aave?.usdc || 0;
            const bestAvailableYield = bestYield.rate;
            const yieldImprovement = bestAvailableYield - currentYield;

            if (yieldImprovement > TREASURY_RULES.MIN_YIELD_IMPROVEMENT) {
              recommendations.push({
                type: "yield_optimization",
                priority: "medium",
                action: "bridge_and_stake",
                currentNetwork: network,
                targetNetwork: bestYield.chain,
                token: "USDC",
                amount: currentAmount,
                currentYield: currentYield,
                targetYield: bestAvailableYield,
                yieldImprovement: yieldImprovement,
                estimatedEarnings: `$${(
                  (currentAmount * yieldImprovement) /
                  100
                ).toFixed(2)} additional yearly income on Aave`,
                protocol: "aave",
              });
            }
          }
        }
      }
    }

    return {
      type: "yield_analysis",
      recommendations,
      bestYield,
      summary: `Found ${recommendations.length} USDC yield optimization opportunities on Aave`,
    };
  },

  // Execute treasury recommendations
  executeRecommendation: async (
    params: { recommendationId: string; recommendation: any },
    userContext: any
  ) => {
    const { recommendation } = params;

    try {
      console.log(`🎯 Executing recommendation: ${recommendation.action}`);

      switch (recommendation.action) {
        case "secure_to_ledger":
          return await treasuryStrategies.executeSecureToLedger(
            recommendation,
            userContext
          );

        case "bridge_and_stake":
          return await treasuryStrategies.executeBridgeAndStake(
            recommendation,
            userContext
          );

        default:
          throw new Error(
            `Unknown recommendation action: ${recommendation.action}`
          );
      }
    } catch (error: any) {
      console.error("❌ Recommendation execution failed:", error);
      return {
        content: [
          { type: "text", text: JSON.stringify({ error: error.message }) },
        ],
      };
    }
  },

  // Execute Ledger security transfer
  executeSecureToLedger: async (recommendation: any, userContext: any) => {
    console.log("🔒 Executing secure to Ledger transfer...");

    const result = await getNextResponseFromSupervisor.execute(
      {
        toolName: "secureFundsToLedger",
        params: {
          sourceAddress: userContext.walletAddress,
          network: recommendation.network,
          tokenSymbol: recommendation.token, // "USDC" or "ETH"
          recipient: "ledger", // Let supervisor handle Ledger connection and address discovery
          reason: "Treasury security recommendation", // Context for the transfer
        },
      },
      { userContext }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            action: "secure_to_ledger",
            status: "executed",
            result: JSON.parse(result.content[0].text),
          }),
        },
      ],
    };
  },

  // Execute bridge and stake strategy
  executeBridgeAndStake: async (recommendation: any, userContext: any) => {
    console.log("🌉 Executing bridge and stake strategy...");

    // This would involve:
    // 1. Bridge tokens to target network
    // 2. Stake in optimal yield protocol
    // For now, return a placeholder response

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            action: "bridge_and_stake",
            status: "planned",
            message:
              "Bridge and stake functionality will be implemented with cross-chain protocols",
            recommendation,
          }),
        },
      ],
    };
  },
};

// Treasury Manager tool definitions
export const treasuryToolDefinitions = [
  {
    type: "function" as const,
    name: "analyzePortfolio",
    description:
      "Analyze user's USDC portfolio across multiple EVM networks and provide strategic recommendations for security (Ledger transfers) and yield optimization (Aave staking)",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "The wallet address to analyze",
        },
        networks: {
          type: "array",
          items: { type: "string" },
          description:
            "List of networks to analyze (default: ethereum, polygon, base, arbitrum)",
        },
      },
      required: ["address"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "executeRecommendation",
    description:
      "Execute a specific treasury management recommendation (secure to Ledger, bridge and stake, etc.)",
    parameters: {
      type: "object",
      properties: {
        recommendationId: {
          type: "string",
          description: "ID of the recommendation to execute",
        },
        recommendation: {
          type: "object",
          description: "The recommendation object to execute",
        },
      },
      required: ["recommendationId", "recommendation"],
      additionalProperties: false,
    },
  },
];

// Treasury Manager supervisor entry point
export const getNextResponseFromTreasuryManager = {
  type: "function" as const,
  name: "getNextResponseFromTreasuryManager",
  description:
    "Executes treasury management strategies and delegates blockchain operations to the supervisor agent",
  parameters: {
    type: "object",
    properties: {
      toolName: {
        type: "string",
        description: "The name of the treasury tool to invoke",
      },
      params: {
        type: "object",
        description: "Parameters to pass to the treasury tool",
      },
    },
    required: ["toolName", "params"],
    additionalProperties: false,
  },
  async execute(input: { toolName: string; params: any }, _details: any) {
    const { toolName, params } = input;
    const userContext = _details?.userContext;

    if (!toolName || !(toolName in treasuryStrategies)) {
      return {
        content: [
          { type: "text", text: "Unknown treasury tool or missing toolName." },
        ],
      };
    }

    try {
      const result = await treasuryStrategies[toolName](params, userContext);
      return result;
    } catch (error) {
      const errorMessage = `Treasury Error: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return {
        content: [{ type: "text", text: errorMessage }],
      };
    }
  },
};

// Export treasury manager config
export const treasuryManagerConfig = {
  name: "Adamik Treasury Manager",
  publicDescription:
    "Strategic treasury management agent that optimizes portfolio allocation, security, and yield across multiple chains",
  model: "gpt-4.1",
  instructions: `
You are a strategic treasury management agent specialized in USDC portfolio optimization across EVM chains. Your role is to:

1. **USDC Portfolio Analysis**: Analyze user USDC holdings across multiple EVM chains
2. **Security Recommendations**: Suggest Ledger transfers for high-value USDC positions
3. **Aave Yield Optimization**: Identify best USDC yield opportunities on Aave across chains
4. **Risk Management**: Balance security, yield, and liquidity for USDC positions
5. **Execution**: Coordinate with blockchain supervisor for implementation

**Simplified Focus:**
- **Token**: Only USDC (simplified from multi-token approach)
- **Protocol**: Only Aave for yield farming (simplified from multi-protocol)
- **Chains**: Ethereum, Polygon, Base, Arbitrum (all EVM-compatible)

**Key Rules:**
- USDC > $500 USD should be secured on Ledger hardware wallet
- USDC yield improvements > 0.5% justify cross-chain moves to better Aave rates
- Always prioritize security over yield for large USDC positions
- Consider gas costs in USDC bridge recommendations
- Provide clear explanations for all USDC optimization recommendations

**Current Aave USDC Rates (Mock Data):**
- Ethereum: 2.5% APY
- Polygon: 4.2% APY (highest yield)
- Base: 3.1% APY
- Arbitrum: 3.8% APY

**Communication Style:**
- Professional and analytical
- Focus on USDC-specific numbers and concrete benefits
- Explain Aave yield opportunities and security trade-offs clearly
- Provide actionable USDC management recommendations

When analyzing USDC portfolios or executing strategies, delegate blockchain operations to the supervisor agent while maintaining strategic oversight.
`,
  tools: [getNextResponseFromTreasuryManager],
};
