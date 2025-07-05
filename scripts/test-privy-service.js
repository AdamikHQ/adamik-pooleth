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

    // Test 7: Test raw signing with Ethereum wallet
    console.log("\n7. ✍️ Testing raw signing with Ethereum wallet...");
    try {
      const ethWallet = await privyService.getWallet(TEST_USER_ID, {
        chainType: "ethereum",
      });

      if (ethWallet) {
        // Test hash (example transaction hash)
        const testHash =
          "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        console.log(`🔍 Attempting to sign hash: ${testHash}`);
        console.log(`🔍 Using wallet: ${ethWallet.id} (${ethWallet.address})`);

        const signature = await privyService.rawSign(ethWallet.id, testHash);
        console.log("✅ Ethereum signature successful:", {
          signature: signature.signature.substring(0, 20) + "...",
          encoding: signature.encoding,
          signatureLength: signature.signature.length,
        });
      } else {
        console.log("⚠️ No Ethereum wallet found for signing test");
      }
    } catch (error) {
      console.log("❌ Error testing Ethereum signing:", error.message);
      if (error.message.includes("HTTP error")) {
        console.log("🔍 This might be an API authentication or endpoint issue");
      }
    }

    // Test 8: Test raw signing with Solana wallet
    console.log("\n8. ✍️ Testing raw signing with Solana wallet...");
    try {
      const solWallet = await privyService.getWallet(TEST_USER_ID, {
        chainType: "solana",
      });

      if (solWallet) {
        // Test hash (example Solana transaction hash)
        const testHash =
          "0x01000103143c895768c71278f14c9b7e81e5d8562acd9d9f8f791ce6a39ce03725d340a7";
        console.log(`🔍 Attempting to sign hash: ${testHash}`);
        console.log(`🔍 Using wallet: ${solWallet.id} (${solWallet.address})`);

        const signature = await privyService.rawSign(solWallet.id, testHash);
        console.log("✅ Solana signature successful:", {
          signature: signature.signature.substring(0, 20) + "...",
          encoding: signature.encoding,
          signatureLength: signature.signature.length,
        });
      } else {
        console.log("⚠️ No Solana wallet found for signing test");
      }
    } catch (error) {
      console.log("❌ Error testing Solana signing:", error.message);
      if (error.message.includes("HTTP error")) {
        console.log("🔍 This might be an API authentication or endpoint issue");
      }
    }

    // Test 9: Test signing with invalid wallet ID
    console.log("\n9. ❌ Testing signing with invalid wallet ID...");
    try {
      const invalidWalletId = "invalid-wallet-id-12345";
      const testHash =
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

      console.log(
        `🔍 Attempting to sign with invalid wallet: ${invalidWalletId}`
      );
      const signature = await privyService.rawSign(invalidWalletId, testHash);
      console.log("⚠️ Unexpected success with invalid wallet ID:", signature);
    } catch (error) {
      console.log("✅ Expected error with invalid wallet ID:", error.message);
    }

    // Test 10: Test signing with malformed hash
    console.log("\n10. ❌ Testing signing with malformed hash...");
    try {
      const wallets = await privyService.getUserWallets(TEST_USER_ID);
      if (wallets.length > 0) {
        const firstWallet = wallets[0];
        const malformedHash = "not-a-valid-hash";

        console.log(`🔍 Attempting to sign malformed hash: ${malformedHash}`);
        console.log(`🔍 Using wallet: ${firstWallet.id}`);

        const signature = await privyService.rawSign(
          firstWallet.id,
          malformedHash
        );
        console.log("⚠️ Unexpected success with malformed hash:", signature);
      } else {
        console.log("⚠️ No wallets available for malformed hash test");
      }
    } catch (error) {
      console.log("✅ Expected error with malformed hash:", error.message);
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
