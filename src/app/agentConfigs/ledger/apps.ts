// Supported Ledger Apps Configuration
// Maps blockchain networks to their corresponding Ledger apps

export interface LedgerApp {
  name: string;
  displayName: string;
  minVersion: string;
  chainIds: string[];
  derivationPath: string;
  features: string[];
}

export const ledgerApps: Record<string, LedgerApp> = {
  ethereum: {
    name: "Ethereum",
    displayName: "Ethereum",
    minVersion: "1.10.0",
    chainIds: ["ethereum", "polygon", "arbitrum", "optimism", "base"],
    derivationPath: "44'/60'/0'/0/0",
    features: ["sign_transaction", "sign_message", "display_address"],
  },

  bitcoin: {
    name: "Bitcoin",
    displayName: "Bitcoin",
    minVersion: "2.1.0",
    chainIds: ["bitcoin", "bitcoin-testnet"],
    derivationPath: "44'/0'/0'/0/0",
    features: ["sign_transaction", "display_address", "segwit"],
  },

  solana: {
    name: "Solana",
    displayName: "Solana",
    minVersion: "1.4.0",
    chainIds: ["solana", "solana-devnet"],
    derivationPath: "44'/501'/0'/0'",
    features: ["sign_transaction", "sign_message", "display_address"],
  },

  cosmos: {
    name: "Cosmos",
    displayName: "Cosmos Hub",
    minVersion: "2.35.0",
    chainIds: ["cosmos", "osmosis", "juno"],
    derivationPath: "44'/118'/0'/0/0",
    features: ["sign_transaction", "display_address"],
  },
};

// Voice-friendly app names for better recognition
export const voiceAppAliases: Record<string, string> = {
  "ethereum app": "ethereum",
  "eth app": "ethereum",
  "bitcoin app": "bitcoin",
  "btc app": "bitcoin",
  "solana app": "solana",
  "sol app": "solana",
  "cosmos app": "cosmos",
  "atom app": "cosmos",
};

// Get supported chains for a specific Ledger app
export function getChainsForApp(appName: string): string[] {
  return ledgerApps[appName]?.chainIds || [];
}

// Get required app for a specific chain
export function getAppForChain(chainId: string): string | null {
  for (const [appName, app] of Object.entries(ledgerApps)) {
    if (app.chainIds.includes(chainId)) {
      return appName;
    }
  }
  return null;
}
