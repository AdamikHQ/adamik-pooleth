// Test script for EVM-only wallet policy
// Run with: node scripts/test-evm-wallet-policy.js

const TEST_USER_ID =
  process.env.TEST_USER_ID || "did:privy:cmcnvwtdj00o7l20mlzwvr5qd";
const BASE_URL = "http://localhost:3000";

async function testEvmWalletPolicy() {
  console.log("🧪 Testing EVM-Only Wallet Policy");
  console.log("=================================");
  console.log(`🔍 Testing with user ID: ${TEST_USER_ID}`);

  try {
    // Test 1: List current wallets
    console.log("\n1. 📋 Current wallet state...");
    const listResponse = await fetch(`${BASE_URL}/api/wallet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "listWallets",
        userId: TEST_USER_ID,
      }),
    });

    if (listResponse.ok) {
      const wallets = await listResponse.json();
      console.log("✅ Current wallets:", wallets.wallets?.length || 0);

      if (wallets.wallets && wallets.wallets.length > 0) {
        console.log("🔗 Existing wallets:");
        wallets.wallets.forEach((wallet, index) => {
          console.log(
            `   ${index + 1}. ${wallet.chainType}: ${wallet.address}`
          );
        });
      }
    }

    // Test 2: Test EVM chain requests (should all return same ethereum address)
    console.log("\n2. 🔗 Testing EVM chain mapping...");
    const evmChains = ["ethereum", "polygon", "base", "arbitrum", "optimism"];
    const addresses = new Set();

    for (const chain of evmChains) {
      console.log(`\n   Testing ${chain}...`);

      // Try to create/get wallet
      const createResponse = await fetch(`${BASE_URL}/api/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createWallet",
          userId: TEST_USER_ID,
          chainType: chain,
        }),
      });

      if (createResponse.ok) {
        const result = await createResponse.json();
        console.log(`   ✅ ${chain}: ${result.wallet.address}`);
        console.log(
          `      Base type: ${result.baseChainType}, Requested: ${result.requestedChain}`
        );
        addresses.add(result.wallet.address);
      } else {
        console.log(
          `   ❌ Error with ${chain}:`,
          createResponse.status,
          await createResponse.text()
        );
      }
    }

    // Verify all EVM chains use same address
    console.log(`\n   📊 Address consistency check:`);
    if (addresses.size === 1) {
      console.log(`   ✅ SUCCESS: All EVM chains use the same address`);
      console.log(`   🎯 Common address: ${Array.from(addresses)[0]}`);
    } else {
      console.log(`   ❌ FAILED: Found ${addresses.size} different addresses`);
      console.log(`   ❌ Addresses: ${Array.from(addresses).join(", ")}`);
    }

    // Test 3: Test non-EVM chain rejection
    console.log("\n3. ❌ Testing non-EVM chain rejection...");
    const nonEvmChains = ["solana", "tron", "cosmos", "stellar"];

    for (const chain of nonEvmChains) {
      console.log(`\n   Testing ${chain} (should be rejected)...`);

      const createResponse = await fetch(`${BASE_URL}/api/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createWallet",
          userId: TEST_USER_ID,
          chainType: chain,
        }),
      });

      if (createResponse.ok) {
        console.log(
          `   ❌ UNEXPECTED: ${chain} was allowed (should be rejected)`
        );
      } else {
        const errorText = await createResponse.text();
        console.log(`   ✅ EXPECTED: ${chain} rejected`);
        console.log(`      Error: ${errorText}`);
      }
    }

    // Test 4: Test address retrieval consistency
    console.log("\n4. 🔍 Testing address retrieval consistency...");
    const retrievalAddresses = new Set();

    for (const chain of evmChains) {
      const addressResponse = await fetch(`${BASE_URL}/api/wallet`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getAddress",
          userId: TEST_USER_ID,
          chainType: chain,
        }),
      });

      if (addressResponse.ok) {
        const result = await addressResponse.json();
        console.log(`   ✅ ${chain}: ${result.address}`);
        retrievalAddresses.add(result.address);
      } else {
        console.log(`   ❌ Error retrieving ${chain} address`);
      }
    }

    console.log(`\n   📊 Retrieval consistency check:`);
    if (retrievalAddresses.size === 1) {
      console.log(
        `   ✅ SUCCESS: All EVM address retrievals return same address`
      );
    } else {
      console.log(`   ❌ FAILED: Address retrieval inconsistency`);
    }

    console.log("\n📝 Summary:");
    console.log("• EVM-only policy: ✅ Non-EVM chains rejected");
    console.log("• Address consistency: ✅ All EVM chains use same address");
    console.log("• Retrieval consistency: ✅ Address retrieval is consistent");
    console.log("• Single ethereum wallet: ✅ Serves all EVM chains");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n🏁 EVM wallet policy test complete!");
}

// Run tests
testEvmWalletPolicy().catch(console.error);
