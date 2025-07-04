// Test script for Privy service
// Run with: node scripts/test-privy-service.js

const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

// Test user ID - replace with actual Privy user ID
const TEST_USER_ID = process.env.TEST_USER_ID || "YOUR_USER_ID_HERE";

async function testPrivyService() {
  console.log("🧪 Testing Privy Service for EVM Transactions");
  console.log("===========================================");

  try {
    // Import the service (dynamic import for ES modules)
    const { privyService } = await import("../src/app/services/privy.ts");

    console.log("✅ Privy service imported successfully");
    console.log(`🔍 Testing with user ID: ${TEST_USER_ID}`);

    // Test 1: Get user details
    console.log("\n1. 👤 Getting user details...");
    try {
      const user = await privyService.getUser(TEST_USER_ID);
      console.log("✅ User found:", {
        id: user.id,
        linkedAccountsCount: user.linkedAccounts?.length || 0,
      });
    } catch (error) {
      console.log("❌ Error getting user:", error.message);
    }

    // Test 2: List all wallets and check EVM chains
    console.log("\n2. 📋 Listing wallets for EVM chains...");
    try {
      const wallets = await privyService.getUserWallets(TEST_USER_ID);
      console.log("✅ Total wallets found:", wallets.length);

      const evmChains = ["ethereum", "polygon", "base", "arbitrum"];
      const foundEVMWallets = wallets.filter((w) =>
        evmChains.includes(w.chainType)
      );

      console.log("🔗 EVM wallets available:");
      foundEVMWallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet.chainType}: ${wallet.address}`);
      });

      if (foundEVMWallets.length === 0) {
        console.log("⚠️  No EVM wallets found - create one first");
      }
    } catch (error) {
      console.log("❌ Error listing wallets:", error.message);
    }

    // Test 3: Test wallet data for Adamik (balance reading)
    console.log("\n3. 🛠️ Testing wallet data for balance reading...");
    try {
      const adamikWallet = await privyService.getWalletForAdamik(TEST_USER_ID, {
        chainType: "ethereum",
      });
      if (adamikWallet) {
        console.log("✅ Wallet data ready for Adamik balance queries:", {
          address: adamikWallet.address,
          hasPublicKey: !!adamikWallet.publicKey,
        });
      } else {
        console.log("❌ No Ethereum wallet - create one first");
      }
    } catch (error) {
      console.log("❌ Error getting wallet data:", error.message);
    }

    console.log("\n📝 Summary:");
    console.log("• Using Privy sendTransaction for EVM transactions");
    console.log("• Only EVM chains supported for transactions");
    console.log("• Adamik used for balance reading and multi-chain support");
    console.log("• No manual encoding or signing required");
  } catch (error) {
    console.error("❌ Failed to import or test service:", error.message);
  }

  console.log("\n🏁 Testing complete!");
}

// Handle environment check
if (TEST_USER_ID === "YOUR_USER_ID_HERE") {
  console.log(
    "⚠️  Please set TEST_USER_ID environment variable or update the script"
  );
  console.log(
    "   You can get a user ID from your Privy dashboard or authentication logs"
  );
  process.exit(1);
}

// Run tests
testPrivyService().catch(console.error);
