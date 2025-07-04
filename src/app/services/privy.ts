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
      .map((wallet: any) => {
        console.log(
          `🔍 Wallet data structure:`,
          JSON.stringify(wallet, null, 2)
        );
        return {
          id: wallet.id || wallet.address, // Use proper wallet ID from creation, fallback to address for backwards compatibility
          address: wallet.address,
          publicKey: wallet.address, // Placeholder since Privy doesn't expose public keys
          chainType: wallet.chainType || "ethereum",
        };
      });

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
      // Find wallets of the specified chain type
      const chainWallets = wallets.filter(
        (w) => w.chainType === options.chainType
      );

      // Prefer wallets with proper IDs (not addresses)
      targetWallet =
        chainWallets.find(
          (w) => w.id && !w.id.startsWith("0x") && !w.id.includes("1")
        ) ||
        chainWallets[0] ||
        null;

      console.log(
        `🔍 Looking for ${options.chainType} wallet:`,
        targetWallet ? "✅ Found" : "❌ Not found"
      );

      if (targetWallet && chainWallets.length > 1) {
        console.log(
          `🔍 Found ${chainWallets.length} ${options.chainType} wallets, selected:`,
          {
            id: targetWallet.id,
            address: targetWallet.address,
            hasProperID:
              !targetWallet.id.startsWith("0x") &&
              !targetWallet.id.includes("1"),
          }
        );
      }
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
   * Enforces one wallet per chain per user: returns existing wallet if present.
   * Returns { wallet, alreadyExisted } to indicate if a new wallet was created.
   */
  async createWallet(
    userId: string,
    chainType: string = "ethereum"
  ): Promise<{ wallet: PrivyWallet; alreadyExisted: boolean }> {
    // 1. Check for existing wallet
    const existingWallet = await this.getWallet(userId, { chainType });
    if (existingWallet) {
      console.log(
        `✅ Wallet already exists for user ${userId} on ${chainType}`
      );
      return { wallet: existingWallet, alreadyExisted: true };
    }

    // 2. If not, create a new wallet
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
        chainType: chainType as "ethereum" | "cosmos" | "tron" | "solana",
      });

      console.log("✅ Wallet created successfully:", walletData);

      return {
        wallet: {
          id: walletData.id,
          address: walletData.address,
          publicKey: walletData.address, // Placeholder since Privy doesn't expose public keys
          chainType: walletData.chainType || chainType,
        },
        alreadyExisted: false,
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
   * Based on: https://docs.privy.io/wallets/using-wallets/other-chains/raw-sign#rest-api
   */
  async rawSign(walletId: string, hash: string): Promise<RawSignResponse> {
    console.log(`🔍 Raw signing hash ${hash} with wallet ${walletId}...`);
    console.log(`🔍 Full wallet ID for debugging: "${walletId}"`);
    console.log(`🔍 Wallet ID length: ${walletId.length}`);

    try {
      // Use the exact format from Privy documentation
      const authHeader = `Basic ${Buffer.from(
        `${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
      ).toString("base64")}`;

      console.log(`🔍 Auth header: ${authHeader.substring(0, 20)}...`);
      console.log(
        `🔍 Request URL: https://api.privy.io/v1/wallets/${walletId}/raw_sign`
      );
      console.log(
        `🔍 Request body:`,
        JSON.stringify({
          params: { hash: hash },
        })
      );

      const headers: Record<string, string> = {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "privy-app-id": process.env.PRIVY_APP_ID!,
      };

      // Add authorization signature if available
      if (process.env.PRIVY_AUTHORIZATION_KEY) {
        headers["privy-authorization-signature"] =
          process.env.PRIVY_AUTHORIZATION_KEY;
        console.log(
          `🔍 Using authorization key: ${process.env.PRIVY_AUTHORIZATION_KEY.substring(
            0,
            20
          )}...`
        );
      } else {
        console.log(
          `⚠️ No PRIVY_AUTHORIZATION_KEY found - this might be required for server-side signing`
        );
      }

      const response = await fetch(
        `https://api.privy.io/v1/wallets/${walletId}/raw_sign`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            params: {
              hash: hash,
            },
          }),
        }
      );

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status} error details:`);
        try {
          const errorText = await response.text();
          console.log(`❌ Error response body: ${errorText}`);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          console.log(`❌ Could not read error response body`);
        }
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
