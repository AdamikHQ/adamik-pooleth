/**
 * Privy Chain Configuration
 * Based on: https://docs.privy.io/basics/react/advanced/configuring-evm-networks
 *
 * This file configures all supported EVM chains for Privy using the viem/chains package.
 * All chains defined in agentConfigs/adamik/chains.ts are mapped here.
 */

import {
  // Ethereum mainnet and testnets
  mainnet as ethereum,
  sepolia,
  holesky,

  // Layer 2 solutions
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  zkSync,
  zkSyncSepoliaTestnet,
  polygon,
  polygonAmoy,
  linea,
  lineaTestnet,

  // Other EVM chains
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  gnosis,
  gnosisChiado,
  moonbeam,
  moonriver,
  moonbaseAlpha,
  fantom,
  mantle,
  rootstock,
  cronos,

  // Additional chains
  berachainTestnet,
  chiliz,
} from "viem/chains";

import { defineChain } from "viem";

// Define custom chains not available in viem/chains
export const worldChain = defineChain({
  id: 480,
  name: "World Chain",
  network: "world-chain",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://worldchain-mainnet.g.alchemy.com/public"],
    },
  },
  blockExplorers: {
    default: {
      name: "World Chain Explorer",
      url: "https://worldchain-mainnet.explorer.alchemy.com",
    },
  },
});

export const monadTestnet = defineChain({
  id: 41454,
  name: "Monad Testnet",
  network: "monad-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet-explorer.monad.xyz",
    },
  },
  testnet: true,
});

export const berachainBepolia = defineChain({
  id: 80084,
  name: "Berachain bePOLIA",
  network: "berachain-bepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Berachain",
    symbol: "BERA",
  },
  rpcUrls: {
    default: {
      http: ["https://bartio.rpc.berachain.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Berachain Explorer",
      url: "https://bartio.beratrail.io",
    },
  },
  testnet: true,
});

export const rootstockTestnet = defineChain({
  id: 31,
  name: "Rootstock Testnet",
  network: "rootstock-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Test Smart Bitcoin",
    symbol: "tRBTC",
  },
  rpcUrls: {
    default: {
      http: ["https://public-node.testnet.rsk.co"],
    },
  },
  blockExplorers: {
    default: {
      name: "Rootstock Explorer",
      url: "https://explorer.testnet.rsk.co",
    },
  },
  testnet: true,
});

export const chilizTestnet = defineChain({
  id: 88882,
  name: "Chiliz Testnet",
  network: "chiliz-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Chiliz",
    symbol: "CHZ",
  },
  rpcUrls: {
    default: {
      http: ["https://spicy-rpc.chiliz.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Chiliz Explorer",
      url: "https://testnet.chiliscan.com",
    },
  },
  testnet: true,
});

export const injectiveEvmTestnet = defineChain({
  id: 2525252,
  name: "Injective EVM Testnet",
  network: "injective-evm-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Injective",
    symbol: "INJ",
  },
  rpcUrls: {
    default: {
      http: ["https://evm-testnet.injective.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Injective Explorer",
      url: "https://evm-testnet.explorer.injective.network",
    },
  },
  testnet: true,
});

/**
 * All supported chains for Privy configuration
 * Maps to chains defined in agentConfigs/adamik/chains.ts
 */
export const allSupportedChains = [
  // Ethereum mainnet and testnets
  ethereum, // "ethereum"
  sepolia, // "sepolia"
  holesky, // "holesky"

  // Layer 2 solutions
  base, // "base"
  baseSepolia, // "base-sepolia"
  optimism, // "optimism"
  optimismSepolia, // "optimism-sepolia"
  arbitrum, // "arbitrum"
  arbitrumSepolia, // "arbitrum-sepolia"
  zkSync, // "zksync"
  zkSyncSepoliaTestnet, // "zksync-sepolia"
  polygon, // "polygon"
  polygonAmoy, // "polygon-amoy"
  linea, // "linea"
  lineaTestnet, // "linea-sepolia"

  // Other EVM chains
  bsc, // "bsc"
  bscTestnet, // "bsc-testnet"
  avalanche, // "avalanche"
  avalancheFuji, // "avalanche-fuji"
  gnosis, // "gnosis"
  gnosisChiado, // "gnosis-chiado"
  moonbeam, // "moonbeam"
  moonriver, // "moonriver"
  moonbaseAlpha, // "moonbase"
  fantom, // "fantom"
  mantle, // "mantle"
  rootstock, // "rootstock"
  rootstockTestnet, // "rootstock-testnet"
  chiliz, // "chiliz"
  chilizTestnet, // "chiliz-testnet"
  cronos, // "cronos"
  worldChain, // "world-chain"

  // Testnets
  monadTestnet, // "monad-testnet"
  berachainTestnet, // "berachain"
  berachainBepolia, // "berachain-bepolia"
  injectiveEvmTestnet, // "injective-evm-testnet"
];

/**
 * Default chain for new wallets and primary operations
 * Using Ethereum mainnet as the default
 */
export const defaultChain = ethereum;

/**
 * Chain ID to string mapping for voice agent compatibility
 * Maps numeric chain IDs back to string identifiers used by the agent
 */
export const chainIdToString: Record<number, string> = {
  // Ethereum mainnet and testnets
  1: "ethereum",
  11155111: "sepolia",
  17000: "holesky",

  // Layer 2 solutions
  8453: "base",
  84532: "base-sepolia",
  10: "optimism",
  11155420: "optimism-sepolia",
  42161: "arbitrum",
  421614: "arbitrum-sepolia",
  324: "zksync",
  300: "zksync-sepolia",
  137: "polygon",
  80002: "polygon-amoy",
  59144: "linea",
  59140: "linea-sepolia",

  // Other EVM chains
  56: "bsc",
  97: "bsc-testnet",
  43114: "avalanche",
  43113: "avalanche-fuji",
  100: "gnosis",
  10200: "gnosis-chiado",
  1284: "moonbeam",
  1285: "moonriver",
  1287: "moonbase",
  250: "fantom",
  5000: "mantle",
  30: "rootstock",
  31: "rootstock-testnet",
  88888: "chiliz",
  88882: "chiliz-testnet",
  25: "cronos",
  480: "world-chain",

  // Testnets
  41454: "monad-testnet",
  80085: "berachain",
  80084: "berachain-bepolia",
  2525252: "injective-evm-testnet",
};

/**
 * String to chain ID mapping for transaction processing
 * Maps agent string identifiers to numeric chain IDs for Privy
 */
export const stringToChainId: Record<string, number> = {
  // Ethereum mainnet and testnets
  ethereum: 1,
  sepolia: 11155111,
  holesky: 17000,

  // Layer 2 solutions
  base: 8453,
  "base-sepolia": 84532,
  optimism: 10,
  "optimism-sepolia": 11155420,
  arbitrum: 42161,
  "arbitrum-sepolia": 421614,
  zksync: 324,
  "zksync-sepolia": 300,
  polygon: 137,
  "polygon-amoy": 80002,
  linea: 59144,
  "linea-sepolia": 59140,

  // Other EVM chains
  bsc: 56,
  "bsc-testnet": 97,
  avalanche: 43114,
  "avalanche-fuji": 43113,
  gnosis: 100,
  "gnosis-chiado": 10200,
  moonbeam: 1284,
  moonriver: 1285,
  moonbase: 1287,
  fantom: 250,
  mantle: 5000,
  rootstock: 30,
  "rootstock-testnet": 31,
  chiliz: 88888,
  "chiliz-testnet": 88882,
  cronos: 25,
  "world-chain": 480,

  // Testnets
  "monad-testnet": 41454,
  berachain: 80085,
  "berachain-bepolia": 80084,
  "injective-evm-testnet": 2525252,
};
