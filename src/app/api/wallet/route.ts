import { NextResponse } from "next/server";
import { privyService } from "@/app/services/privy";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, walletAddress, chainType, hash } = body;

    console.log("🔍 Wallet API Debug:", {
      action,
      userId,
      walletAddress,
      chainType,
    });

    if (!userId) {
      console.log("❌ No user ID provided");
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "listWallets":
        // Return all available embedded wallets for the user
        const wallets = await privyService.getUserWallets(userId);
        return NextResponse.json({
          wallets: wallets.map((wallet) => ({
            id: wallet.id,
            address: wallet.address,
            chainType: wallet.chainType,
            walletClientType: "privy",
          })),
        });

      case "getPubKey":
        // Get wallet and extract public key for Adamik address derivation
        const walletForPubKey = await privyService.getWallet(userId, {
          walletAddress,
          chainType,
        });

        if (!walletForPubKey) {
          return NextResponse.json(
            { error: "No matching wallet found" },
            { status: 404 }
          );
        }

        const publicKey = await privyService.getPublicKey(walletForPubKey.id);
        return NextResponse.json({
          publicKey,
          walletId: walletForPubKey.id,
          address: walletForPubKey.address,
          chainType: walletForPubKey.chainType,
          note:
            publicKey === null
              ? "Privy does not expose public keys"
              : undefined,
        });

      case "getAddress":
        // Get wallet address (legacy compatibility)
        const walletForAddress = await privyService.getWallet(userId, {
          walletAddress,
          chainType,
        });

        if (!walletForAddress) {
          return NextResponse.json(
            { error: "No matching wallet found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          address: walletForAddress.address,
          chainType: walletForAddress.chainType,
        });

      case "getWalletForAdamik":
        // Get wallet info optimized for Adamik API calls
        const adamikWallet = await privyService.getWalletForAdamik(userId, {
          walletAddress,
          chainType,
        });

        if (!adamikWallet) {
          return NextResponse.json(
            { error: "No wallet found or failed to extract public key" },
            { status: 404 }
          );
        }

        return NextResponse.json(adamikWallet);

      case "rawSign":
        // Sign a raw hash for any blockchain transaction
        if (!hash) {
          return NextResponse.json(
            { error: "Hash is required for raw signing" },
            { status: 400 }
          );
        }

        console.log(
          `[rawSign] Received parameters - userId: ${userId}, walletAddress: ${walletAddress}, chainType: "${chainType}", hash: ${hash?.substring(
            0,
            20
          )}...`
        );

        const walletForSigning = await privyService.getWallet(userId, {
          walletAddress,
          chainType,
        });

        if (!walletForSigning) {
          return NextResponse.json(
            { error: "No matching wallet found" },
            { status: 404 }
          );
        }

        try {
          const signature = await privyService.rawSign(
            walletForSigning.id,
            hash
          );
          return NextResponse.json({
            ...signature,
            walletId: walletForSigning.id,
            chainType: walletForSigning.chainType,
          });
        } catch (error) {
          console.error("Error creating raw signature:", error);
          return NextResponse.json(
            { error: "Failed to create signature" },
            { status: 500 }
          );
        }

      case "createWallet":
        // Create a new embedded wallet for the user on a specific chain
        const { chainType: newChainType = "ethereum" } = body;

        try {
          const { wallet, alreadyExisted } = await privyService.createWallet(
            userId,
            newChainType // Let Privy service handle normalization and validation
          );
          return NextResponse.json({
            success: true,
            wallet: {
              id: wallet.id,
              address: wallet.address,
              chainType: wallet.chainType,
              walletClientType: "privy",
            },
            alreadyExisted,
            requestedChain: newChainType,
            baseChainType: "ethereum", // Always ethereum under EVM-only policy
          });
        } catch (error) {
          console.error("Error creating wallet:", error);
          return NextResponse.json(
            {
              error: "Failed to create wallet",
              message: error instanceof Error ? error.message : String(error),
              chainType: newChainType,
              baseChainType: "ethereum",
            },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: `Unrecognized action ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error in wallet operation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
