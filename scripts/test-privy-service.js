// Test script for Privy service
// Run with: node scripts/test-privy-service.js

const path = require("path");
const { execSync } = require("child_process");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

// Test user ID - replace with actual Privy user ID
const TEST_USER_ID = process.env.TEST_USER_ID || "YOUR_USER_ID_HERE";

async function testPrivyService() {
  console.log("🧪 Testing Privy Service Directly");
  console.log("=================================");

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

    // Test 2: List all wallets
    console.log("\n2. 📋 Listing all user wallets...");
    try {
      const wallets = await privyService.getUserWallets(TEST_USER_ID);
      console.log("✅ Wallets found:", wallets.length);
      wallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet.chainType}: ${wallet.address}`);
      });
    } catch (error) {
      console.log("❌ Error listing wallets:", error.message);
    }

    // Test 3: Get Ethereum wallet
    console.log("\n3. 🔗 Getting Ethereum wallet...");
    try {
      const ethWallet = await privyService.getWallet(TEST_USER_ID, {
        chainType: "ethereum",
      });
      if (ethWallet) {
        console.log("✅ Ethereum wallet:", {
          id: ethWallet.id,
          address: ethWallet.address,
          chainType: ethWallet.chainType,
        });
      } else {
        console.log("❌ No Ethereum wallet found");
      }
    } catch (error) {
      console.log("❌ Error getting Ethereum wallet:", error.message);
    }

    // Test 4: Get Solana wallet
    console.log("\n4. 🔗 Getting Solana wallet...");
    try {
      const solWallet = await privyService.getWallet(TEST_USER_ID, {
        chainType: "solana",
      });
      if (solWallet) {
        console.log("✅ Solana wallet:", {
          id: solWallet.id,
          address: solWallet.address,
          chainType: solWallet.chainType,
        });
      } else {
        console.log("❌ No Solana wallet found");
      }
    } catch (error) {
      console.log("❌ Error getting Solana wallet:", error.message);
    }

    // Test 5: Get wallet for Adamik
    console.log("\n5. 🛠️ Getting wallet for Adamik...");
    try {
      const adamikWallet = await privyService.getWalletForAdamik(TEST_USER_ID, {
        chainType: "ethereum",
      });
      if (adamikWallet) {
        console.log("✅ Adamik wallet data:", {
          walletId: adamikWallet.walletId,
          address: adamikWallet.address,
          publicKey: adamikWallet.publicKey.substring(0, 20) + "...",
        });
      } else {
        console.log("❌ No wallet data for Adamik");
      }
    } catch (error) {
      console.log("❌ Error getting Adamik wallet:", error.message);
    }

    // Test 6: Check if user has wallets
    console.log("\n6. ✅ Checking if user has wallets...");
    try {
      const hasWallets = await privyService.hasWallets(TEST_USER_ID);
      console.log(`✅ User has wallets: ${hasWallets}`);
    } catch (error) {
      console.log("❌ Error checking wallets:", error.message);
    }
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
