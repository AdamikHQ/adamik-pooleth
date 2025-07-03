import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";

const privyClient = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, walletAddress } = body;

    console.log("🔍 Wallet API Debug:", { action, userId, walletAddress });
    console.log("🔍 Privy Config:", {
      appId: process.env.PRIVY_APP_ID ? "✅ Set" : "❌ Missing",
      appSecret: process.env.PRIVY_APP_SECRET ? "✅ Set" : "❌ Missing",
    });

    if (!userId) {
      console.log("❌ No user ID provided");
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get user from Privy
    console.log("🔍 Fetching user from Privy...");
    const user = await privyClient.getUser(userId);
    console.log("✅ User fetched:", {
      id: user.id,
      linkedAccounts: user.linkedAccounts?.length,
    });

    // Find the embedded wallet for this user
    console.log("🔍 Looking for wallet in linked accounts...");
    const wallet = user.linkedAccounts.find(
      (account: any) =>
        account.type === "wallet" &&
        account.walletClientType === "privy" &&
        account.chainType === "ethereum" &&
        (!walletAddress ||
          account.address?.toLowerCase() === walletAddress.toLowerCase())
    ) as any; // Type assertion for Privy wallet

    console.log(
      "🔍 Wallet search result:",
      wallet ? "✅ Found" : "❌ Not found"
    );
    if (wallet) {
      console.log("🔍 Wallet details:", {
        type: wallet.type,
        walletClientType: wallet.walletClientType,
        chainType: wallet.chainType,
        address: wallet.address,
      });
    } else {
      console.log(
        "🔍 Available accounts:",
        user.linkedAccounts.map((acc: any) => ({
          type: acc.type,
          walletClientType: acc.walletClientType,
          chainType: acc.chainType,
        }))
      );
    }

    if (!wallet) {
      console.log("❌ No matching wallet found");
      return NextResponse.json(
        { error: "Wallet not found for user" },
        { status: 404 }
      );
    }

    switch (action) {
      case "getPubKey":
        // For embedded wallets, we return the address as a simplified public key
        // In production, you might want to derive the actual public key
        return NextResponse.json({
          publicKey: wallet.address,
          address: wallet.address,
        });

      case "getAddress":
        return NextResponse.json({ address: wallet.address });

      case "signTransaction":
        try {
          // For now, return a placeholder - we'll implement proper signing later
          // This requires setting up the Privy wallet API with proper authentication
          return NextResponse.json(
            {
              error: "Transaction signing not yet implemented with Privy",
              message:
                "Please implement using Privy's walletApi.ethereum.signTransaction method",
            },
            { status: 501 }
          );
        } catch (error: any) {
          console.error("Error signing transaction:", error);
          return NextResponse.json(
            { error: "Failed to sign transaction" },
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
