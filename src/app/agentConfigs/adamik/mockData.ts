// Mock Data for Treasury Manager
// =============================
// This file contains mock yield rates and token prices for development and testing.
// Replace with real API calls when integrating with actual DeFi protocols.

// USDC yield rates on Aave across different EVM chains
export const MOCK_AAVE_USDC_YIELDS = {
  ethereum: {
    aave: { usdc: 2.5 }, // 2.5% APY on Ethereum
  },
  polygon: {
    aave: { usdc: 4.2 }, // 4.2% APY on Polygon (highest yield)
  },
  base: {
    aave: { usdc: 3.1 }, // 3.1% APY on Base
  },
  arbitrum: {
    aave: { usdc: 3.8 }, // 3.8% APY on Arbitrum
  },
} as const;

// Mock token prices (simplified for USDC focus)
export const MOCK_TOKEN_PRICES = {
  usdc: 1.0, // $1.00 (stable)
} as const;

// Mock ETH price for security analysis (separate from token prices)
export const MOCK_ETH_PRICE_USD = 2400;

// Supported chains for yield analysis
export const SUPPORTED_YIELD_CHAINS = [
  "ethereum",
  "polygon",
  "base",
  "arbitrum",
] as const;

// Types for better TypeScript support
export type SupportedChain = (typeof SUPPORTED_YIELD_CHAINS)[number];
export type YieldData = typeof MOCK_AAVE_USDC_YIELDS;
export type TokenPrices = typeof MOCK_TOKEN_PRICES;
