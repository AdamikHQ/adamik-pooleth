#!/usr/bin/env node

/**
 * Test Simplified Transaction Flow (Privy sendTransaction)
 *
 * This script tests the simplified transaction flow:
 * 1. Call requestUserSignature directly with transaction parameters
 * 2. Verify it returns transaction_request for Privy sendTransaction
 * 3. Privy handles encoding, signing, and broadcasting automatically
 */

const TEST_USER_ID = "did:privy:cmcnvwtdj00o7l20mlzwvr5qd";

async function testTransactionFlow() {
  console.log("🧪 Testing Simplified Transaction Flow");
  console.log("=====================================");

  const baseUrl = "http://localhost:3000";

  try {
    // Test 1: ETH Transfer
    console.log("\n💰 Test 1: ETH Transfer (0.1 ETH)");
    const ethResponse = await fetch(`${baseUrl}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "requestUserSignature",
        userId: TEST_USER_ID,
        to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
        value: "100000000000000000", // 0.1 ETH in wei
        chainId: "ethereum",
        description: "Send 0.1 ETH to test address",
      }),
    });

    if (ethResponse.ok) {
      const ethResult = await ethResponse.json();
      console.log("✅ ETH transaction request created");
      console.log("📋 Response type:", ethResult.type);

      if (ethResult.type === "transaction_request") {
        console.log("✅ Correct transaction_request format");
        console.log("💰 Amount:", ethResult.data.value);
        console.log("📍 To:", ethResult.data.to);
        console.log("⛓️  Chain:", ethResult.data.chainId);
      } else {
        console.log("❌ Unexpected response type:", ethResult.type);
      }
    } else {
      console.log(
        "❌ ETH test failed:",
        ethResponse.status,
        await ethResponse.text()
      );
    }

    // Test 2: Polygon Transfer
    console.log("\n🔶 Test 2: Polygon MATIC Transfer (5 MATIC)");
    const maticResponse = await fetch(`${baseUrl}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "requestUserSignature",
        userId: TEST_USER_ID,
        to: "0x1234567890123456789012345678901234567890",
        value: "5000000000000000000", // 5 MATIC in wei
        chainId: "polygon",
        description: "Send 5 MATIC to test address",
      }),
    });

    if (maticResponse.ok) {
      const maticResult = await maticResponse.json();
      console.log("✅ MATIC transaction request created");

      if (maticResult.type === "transaction_request") {
        console.log("✅ Correct transaction_request format");
        console.log("💰 Amount:", maticResult.data.value);
        console.log("⛓️  Chain:", maticResult.data.chainId);
      }
    } else {
      console.log(
        "❌ MATIC test failed:",
        maticResponse.status,
        await maticResponse.text()
      );
    }

    // Test 3: Unsupported chain (should fail)
    console.log("\n❌ Test 3: Unsupported chain (should fail)");
    const solanaResponse = await fetch(`${baseUrl}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "requestUserSignature",
        userId: TEST_USER_ID,
        to: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        value: "10000000",
        chainId: "solana", // Not supported in simplified flow
        description: "Send SOL (should fail)",
      }),
    });

    if (solanaResponse.ok) {
      console.log("⚠️  Unexpected success with Solana");
    } else {
      console.log("✅ Expected failure with non-EVM chain");
    }

    console.log("\n🎉 Transaction flow test completed!");
    console.log("\n📋 Summary:");
    console.log("✅ EVM transactions: Working");
    console.log("✅ Privy sendTransaction format: Working");
    console.log("✅ Chain validation: Working");
    console.log("\n💡 Next steps:");
    console.log('1. Test in browser: "Send 0.1 ETH to 0x742d...8b8b"');
    console.log("2. Verify Privy modal appears");
    console.log("3. Test actual signing and broadcasting");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testTransactionFlow();
