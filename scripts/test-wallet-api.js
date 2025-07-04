// Test script for wallet API endpoints
// Run with: node scripts/test-wallet-api.js

const TEST_USER_ID = "did:privy:cmcnvwtdj00o7l20mlzwvr5qd";

async function testWalletAPI() {
  console.log("🧪 Testing Wallet API Endpoints");
  console.log("===============================");
  console.log(`🔍 Testing with user ID: ${TEST_USER_ID}`);

  const baseUrl = "http://localhost:3001";

  // Test 1: List wallets
  console.log("\n1. 📋 Listing all user wallets...");
  try {
    const response = await fetch(`${baseUrl}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "listWallets",
        userId: TEST_USER_ID,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Wallets found:", data.wallets?.length || 0);
      data.wallets?.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet.chainType}: ${wallet.address}`);
      });
    } else {
      console.log("❌ Error response:", response.status, await response.text());
    }
  } catch (error) {
    console.log("❌ Error listing wallets:", error.message);
  }

  // Test 2: Get Ethereum wallet
  console.log("\n2. 🔗 Getting Ethereum wallet...");
  try {
    const response = await fetch(`${baseUrl}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getWalletForAdamik",
        userId: TEST_USER_ID,
        chainType: "ethereum",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Ethereum wallet:", {
        walletId: data.walletId,
        address: data.address,
        publicKey: data.publicKey ? "Available" : "Not available",
      });
    } else {
      console.log("❌ Error response:", response.status, await response.text());
    }
  } catch (error) {
    console.log("❌ Error getting Ethereum wallet:", error.message);
  }

  // Test 3: Get Solana wallet
  console.log("\n3. 🔗 Getting Solana wallet...");
  try {
    const response = await fetch(`${baseUrl}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "getWalletForAdamik",
        userId: TEST_USER_ID,
        chainType: "solana",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Solana wallet:", {
        walletId: data.walletId,
        address: data.address,
        publicKey: data.publicKey ? "Available" : "Not available",
      });

      // Store for signature test
      global.solanaWallet = data;
    } else {
      console.log("❌ Error response:", response.status, await response.text());
    }
  } catch (error) {
    console.log("❌ Error getting Solana wallet:", error.message);
  }

  // Test 4: Test raw signing with Solana wallet
  console.log("\n4. ✍️ Testing raw signing with Solana wallet...");
  try {
    if (global.solanaWallet) {
      const testHash =
        "0x01000103143c895768c71278f14c9b7e81e5d8562acd9d9f8f791ce6a39ce03725d340a7";

      console.log(`🔍 Attempting to sign hash: ${testHash}`);
      console.log(
        `🔍 Using wallet: ${global.solanaWallet.walletId} (${global.solanaWallet.address})`
      );

      const response = await fetch(`${baseUrl}/api/wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rawSign",
          userId: TEST_USER_ID,
          chainType: "solana",
          hash: testHash,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Solana signature successful:", {
          signature: data.signature?.substring(0, 20) + "...",
          encoding: data.encoding,
          signatureLength: data.signature?.length,
          walletId: data.walletId,
          chainType: data.chainType,
        });
      } else {
        const errorText = await response.text();
        console.log("❌ Error response:", response.status, errorText);
      }
    } else {
      console.log("⚠️ No Solana wallet available for signing test");
    }
  } catch (error) {
    console.log("❌ Error testing Solana signing:", error.message);
  }

  // Test 5: Test raw signing with Ethereum wallet
  console.log("\n5. ✍️ Testing raw signing with Ethereum wallet...");
  try {
    const testHash =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    console.log(`🔍 Attempting to sign hash: ${testHash}`);

    const response = await fetch(`${baseUrl}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rawSign",
        userId: TEST_USER_ID,
        chainType: "ethereum",
        hash: testHash,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Ethereum signature successful:", {
        signature: data.signature?.substring(0, 20) + "...",
        encoding: data.encoding,
        signatureLength: data.signature?.length,
        walletId: data.walletId,
        chainType: data.chainType,
      });
    } else {
      const errorText = await response.text();
      console.log("❌ Error response:", response.status, errorText);
    }
  } catch (error) {
    console.log("❌ Error testing Ethereum signing:", error.message);
  }

  // Test 6: Test signing with invalid wallet ID
  console.log("\n6. ❌ Testing signing with invalid hash...");
  try {
    const invalidHash = "not-a-valid-hash";

    console.log(`🔍 Attempting to sign invalid hash: ${invalidHash}`);

    const response = await fetch(`${baseUrl}/api/wallet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rawSign",
        userId: TEST_USER_ID,
        chainType: "ethereum",
        hash: invalidHash,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("⚠️ Unexpected success with invalid hash:", data);
    } else {
      const errorText = await response.text();
      console.log(
        "✅ Expected error with invalid hash:",
        response.status,
        errorText
      );
    }
  } catch (error) {
    console.log("✅ Expected error with invalid hash:", error.message);
  }

  console.log("\n🏁 Testing complete!");
}

// Run tests
testWalletAPI().catch(console.error);
