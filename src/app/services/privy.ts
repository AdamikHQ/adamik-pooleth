// Privy service for wallet management and signing
// Handles authentication, keypair generation, pubkey extraction, and raw signing

import { PrivyClient } from "@privy-io/server-auth";

export interface PrivyWallet {
  id: string;
  address: string;
  publicKey: string;
  chainType: string;
}

export interface RawSignResponse {
  signature: string;
  encoding: string;
}

class PrivyService {
  private client: PrivyClient;

  constructor() {
    this.client = new PrivyClient(
      process.env.PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    );
  }

  /**
   * Get user details from Privy
   */
  async getUser(userId: string) {
    console.log("🔍 Fetching user from Privy...");
    const user = await this.client.getUser(userId);
    console.log("✅ User fetched:", {
      id: user.id,
      linkedAccounts: user.linkedAccounts?.length,
    });
    return user;
  }

  /**
   * Get all embedded wallets for a user
   */
  async getUserWallets(userId: string): Promise<PrivyWallet[]> {
    const user = await this.getUser(userId);

    console.log("🔍 Looking for embedded wallets...");
    const wallets = user.linkedAccounts
      .filter(
        (account: any) =>
          account.type === "wallet" && account.walletClientType === "privy"
      )
      .map((wallet: any) => ({
        id: wallet.id || wallet.address, // Use proper wallet ID from creation, fallback to address for backwards compatibility
        address: wallet.address,
        publicKey: wallet.address, // Placeholder since Privy doesn't expose public keys
        chainType: wallet.chainType || "ethereum",
      }));

    console.log("🔍 Found embedded wallets:", {
      count: wallets.length,
      wallets: wallets.map((w) => ({
        chainType: w.chainType,
        address: w.address,
      })),
    });

    return wallets;
  }

  /**
   * Get a specific wallet by address or chain type
   */
  async getWallet(
    userId: string,
    options?: { walletAddress?: string; chainType?: string }
  ): Promise<PrivyWallet | null> {
    const wallets = await this.getUserWallets(userId);

    if (wallets.length === 0) {
      console.log("❌ No embedded wallets found for user");
      return null;
    }

    let targetWallet: PrivyWallet | null = null;

    if (options?.chainType) {
      targetWallet =
        wallets.find((w) => w.chainType === options.chainType) || null;
      console.log(
        `🔍 Looking for ${options.chainType} wallet:`,
        targetWallet ? "✅ Found" : "❌ Not found"
      );
    } else if (options?.walletAddress) {
      targetWallet =
        wallets.find(
          (w) =>
            w.address?.toLowerCase() === options.walletAddress?.toLowerCase()
        ) || null;
      console.log(
        `🔍 Looking for wallet ${options.walletAddress}:`,
        targetWallet ? "✅ Found" : "❌ Not found"
      );
    } else {
      // Default to first available wallet
      targetWallet = wallets[0];
      console.log("🔍 Using first available wallet:", targetWallet?.chainType);
    }

    return targetWallet;
  }

  /**
   * Create a new embedded wallet for a user on a specific chain
   */
  async createWallet(
    userId: string,
    chainType: string = "ethereum"
  ): Promise<PrivyWallet> {
    console.log(
      `🔍 Creating embedded wallet for user ${userId} on ${chainType}...`
    );

    try {
      // First get the user to understand their structure
      const user = await this.getUser(userId);
      console.log(
        "🔍 User object for wallet creation:",
        JSON.stringify(user, null, 2)
      );

      // Use Privy's server SDK for wallet creation
      console.log(
        `🔍 Attempting to create ${chainType} wallet using Privy SDK...`
      );

      const walletData = await this.client.walletApi.createWallet({
        owner: { userId: userId },
        chainType: chainType as
          | "ethereum"
          | "cosmos"
          | "stellar"
          | "tron"
          | "solana",
      });

      console.log("✅ Wallet created successfully:", walletData);

      return {
        id: walletData.id,
        address: walletData.address,
        publicKey: walletData.address, // Placeholder since Privy doesn't expose public keys
        chainType: walletData.chainType || chainType,
      };
    } catch (error) {
      console.error("❌ Error creating wallet:", error);
      console.log("🔍 Full error details:", JSON.stringify(error, null, 2));
      throw new Error(
        `Failed to create ${chainType} wallet: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get the public key for a wallet
   * NOTE: Privy does NOT expose public keys through their API.
   * This method returns null to indicate public keys are not available.
   */
  async getPublicKey(walletId: string): Promise<string | null> {
    console.log(`🔍 Attempting to get public key for wallet ${walletId}...`);
    console.log("❌ Privy does not expose public keys through their API");

    // Privy keeps private keys secure and doesn't expose public keys
    // For blockchain operations, use raw signing instead
    return null;
  }

  /**
   * Sign a raw hash using the wallet's private key
   * This is used for transaction signing across any blockchain
   */
  async rawSign(walletId: string, hash: string): Promise<RawSignResponse> {
    console.log(`🔍 Raw signing hash ${hash} with wallet ${walletId}...`);

    try {
      // Use Privy's raw_sign endpoint
      const response = await fetch(
        `https://api.privy.io/v1/wallets/${walletId}/raw_sign`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
            ).toString("base64")}`,
            "Content-Type": "application/json",
            "privy-app-id": process.env.PRIVY_APP_ID!,
          },
          body: JSON.stringify({
            params: {
              hash: hash,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      console.log("✅ Raw signature created");
      return result.data;
    } catch (error) {
      console.error("❌ Error creating raw signature:", error);
      throw new Error("Failed to create raw signature");
    }
  }

  /**
   * Check if user has any embedded wallets
   */
  async hasWallets(userId: string): Promise<boolean> {
    const wallets = await this.getUserWallets(userId);
    return wallets.length > 0;
  }

  /**
   * Get wallet info suitable for Adamik API calls
   * Returns the data needed for multi-chain address derivation
   * NOTE: publicKey will be null since Privy doesn't expose public keys
   */
  async getWalletForAdamik(
    userId: string,
    options?: { walletAddress?: string; chainType?: string }
  ): Promise<{
    publicKey: string | null;
    walletId: string;
    address: string;
  } | null> {
    const wallet = await this.getWallet(userId, options);

    if (!wallet) {
      return null;
    }

    try {
      const publicKey = await this.getPublicKey(wallet.id);

      return {
        publicKey,
        walletId: wallet.id,
        address: wallet.address,
      };
    } catch (error) {
      console.error("❌ Error preparing wallet data for Adamik:", error);
      return null;
    }
  }
}

// Export singleton instance
export const privyService = new PrivyService();

// Export types
export type { PrivyService };
