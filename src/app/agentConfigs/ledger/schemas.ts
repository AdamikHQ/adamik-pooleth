import { z } from "zod";

// Discover Ledger devices tool schema
export const discoverLedgerDevicesSchema = z.object({
  timeout: z
    .number()
    .optional()
    .default(10000)
    .describe("Discovery timeout in milliseconds"),
});

// Connect to Ledger device tool schema
export const connectLedgerDeviceSchema = z.object({
  deviceId: z.string().describe("ID of the Ledger device to connect to"),
});

// Get Ethereum address from Ledger tool schema
export const getLedgerEthereumAddressSchema = z.object({
  deviceId: z.string().describe("ID of the connected Ledger device"),
  derivationPath: z
    .string()
    .optional()
    .default("44'/60'/0'/0/0")
    .describe("HD wallet derivation path"),
  verify: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to verify address on device screen"),
});

// Secure funds to Ledger tool schema
export const secureFundsToLedgerSchema = z.object({
  sourceAddress: z.string().describe("Source Privy wallet address"),
  amount: z
    .string()
    .optional()
    .describe(
      "Amount to transfer (if not specified, transfer all available funds)"
    ),
  network: z
    .string()
    .describe(
      "Blockchain network (ethereum, polygon, arbitrum, base, optimism)"
    ),
  tokenAddress: z
    .string()
    .optional()
    .describe("Token contract address (omit for native ETH/MATIC/etc)"),
  derivationPath: z
    .string()
    .optional()
    .default("44'/60'/0'/0/0")
    .describe("Ledger derivation path"),
});

// Disconnect Ledger device tool schema
export const disconnectLedgerDeviceSchema = z.object({
  deviceId: z.string().describe("ID of the Ledger device to disconnect"),
});

// List connected Ledger devices tool schema
export const listConnectedLedgerDevicesSchema = z.object({});

export type DiscoverLedgerDevicesInput = z.infer<
  typeof discoverLedgerDevicesSchema
>;
export type ConnectLedgerDeviceInput = z.infer<
  typeof connectLedgerDeviceSchema
>;
export type GetLedgerEthereumAddressInput = z.infer<
  typeof getLedgerEthereumAddressSchema
>;
export type SecureFundsToLedgerInput = z.infer<
  typeof secureFundsToLedgerSchema
>;
export type DisconnectLedgerDeviceInput = z.infer<
  typeof disconnectLedgerDeviceSchema
>;
export type ListConnectedLedgerDevicesInput = z.infer<
  typeof listConnectedLedgerDevicesSchema
>;
