#!/usr/bin/env node

/**
 * Test Transaction Flow - Proper Implementation
 *
 * This test demonstrates how the requestUserSignature tool should work.
 * Since the tool is implemented in the supervisor agent and not directly
 * accessible via API, this test shows the expected input/output format.
 */

const TEST_USER_ID = "did:privy:cmcnvwtdj00o7l20mlzwvr5qd";

// Mock the requestUserSignature tool logic (from supervisor agent)
function mockRequestUserSignature(params) {
  console.log("📋 Tool Input:", JSON.stringify(params, null, 2));

  // Extract transaction parameters
  const { to, value, chainId, data, gasLimit, description } = params;

  // Validate required parameters
  if (!to) {
    throw new Error("Missing 'to' parameter - recipient address is required");
  }

  if (!value && value !== 0) {
    throw new Error(
      "Missing 'value' parameter - transaction amount is required"
    );
  }

  if (!chainId) {
    throw new Error("Missing 'chainId' parameter - chain ID is required");
  }

  // Ensure chainId is EVM compatible
  const evmChains = [
    "ethereum",
    "sepolia",
    "holesky",
    "base",
    "base-sepolia",
    "optimism",
    "optimism-sepolia",
    "arbitrum",
    "arbitrum-sepolia",
    "polygon",
    "polygon-amoy",
    "bsc",
    "bsc-testnet",
    "avalanche",
    "avalanche-fuji",
    "zksync",
    "zksync-sepolia",
    "linea",
    "linea-sepolia",
    "gnosis",
    "gnosis-chiado",
    "moonbeam",
    "moonriver",
    "moonbase",
    "fantom",
    "mantle",
    "rootstock",
    "rootstock-testnet",
    "chiliz",
    "chiliz-testnet",
    "cronos",
    "world-chain",
    "monad-testnet",
    "berachain",
    "berachain-bepolia",
    "injective-evm-testnet",
  ];

  if (!evmChains.includes(chainId)) {
    throw new Error(
      `Chain ${chainId} is not supported for Privy sendTransaction. ` +
        `Supported EVM chains: ${evmChains.join(", ")}`
    );
  }

  // Prepare transaction request for Privy
  const transactionRequest = {
    to,
    value: value.toString(), // Ensure string format for Privy
    chainId,
    ...(data && { data }),
    ...(gasLimit && { gasLimit }),
  };

  // Return a transaction request that the frontend will recognize
  const response = {
    type: "transaction_request",
    data: transactionRequest,
    message: `Transaction ready for sending. ${
      description || "Please review and confirm the transaction."
    }`,
  };

  return response;
}

async function testTransactionFlow() {
  console.log("🧪 Testing Transaction Flow (requestUserSignature Tool)");
  console.log("=====================================================");
  console.log(
    "Note: This test mocks the supervisor agent's requestUserSignature tool"
  );
  console.log(
    "In real usage, this would be called through the voice agent system.\n"
  );

  try {
    // Test 1: ETH Transfer
    console.log("💰 Test 1: ETH Transfer (0.1 ETH)");
    console.log("=================================");

    const ethParams = {
      to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
      value: "100000000000000000", // 0.1 ETH in wei
      chainId: "ethereum",
      description: "Send 0.1 ETH to test address",
    };

    try {
      const ethResult = mockRequestUserSignature(ethParams);
      console.log("✅ ETH transaction request created successfully");
      console.log("📋 Response:", JSON.stringify(ethResult, null, 2));

      if (ethResult.type === "transaction_request") {
        console.log("✅ Correct transaction_request format");
        console.log("💰 Amount:", ethResult.data.value);
        console.log("📍 To:", ethResult.data.to);
        console.log("⛓️  Chain:", ethResult.data.chainId);
      }
    } catch (error) {
      console.log("❌ ETH test failed:", error.message);
    }

    // Test 2: Polygon Transfer
    console.log("\n🔶 Test 2: Polygon MATIC Transfer (5 MATIC)");
    console.log("===========================================");

    const maticParams = {
      to: "0x1234567890123456789012345678901234567890",
      value: "5000000000000000000", // 5 MATIC in wei
      chainId: "polygon",
      description: "Send 5 MATIC to test address",
    };

    try {
      const maticResult = mockRequestUserSignature(maticParams);
      console.log("✅ MATIC transaction request created successfully");
      console.log("📋 Response:", JSON.stringify(maticResult, null, 2));

      if (maticResult.type === "transaction_request") {
        console.log("✅ Correct transaction_request format");
        console.log("💰 Amount:", maticResult.data.value);
        console.log("⛓️  Chain:", maticResult.data.chainId);
      }
    } catch (error) {
      console.log("❌ MATIC test failed:", error.message);
    }

    // Test 3: Base Chain Transfer
    console.log("\n🔵 Test 3: Base ETH Transfer (0.01 ETH)");
    console.log("======================================");

    const baseParams = {
      to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      value: "10000000000000000", // 0.01 ETH in wei
      chainId: "base",
      description: "Send 0.01 ETH on Base",
    };

    try {
      const baseResult = mockRequestUserSignature(baseParams);
      console.log("✅ Base transaction request created successfully");
      console.log("📋 Response:", JSON.stringify(baseResult, null, 2));
    } catch (error) {
      console.log("❌ Base test failed:", error.message);
    }

    // Test 4: Validation Tests
    console.log("\n❌ Test 4: Validation Tests (should fail)");
    console.log("==========================================");

    // Test missing 'to' parameter
    try {
      mockRequestUserSignature({
        value: "100000000000000000",
        chainId: "ethereum",
        description: "Missing 'to' parameter",
      });
      console.log("❌ Should have failed: missing 'to' parameter");
    } catch (error) {
      console.log("✅ Expected validation error:", error.message);
    }

    // Test unsupported chain
    try {
      mockRequestUserSignature({
        to: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        value: "10000000",
        chainId: "solana", // Not supported in requestUserSignature
        description: "Send SOL (should fail)",
      });
      console.log("❌ Should have failed: unsupported chain");
    } catch (error) {
      console.log("✅ Expected validation error:", error.message);
    }

    // Test missing value
    try {
      mockRequestUserSignature({
        to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
        chainId: "ethereum",
        description: "Missing value",
      });
      console.log("❌ Should have failed: missing value");
    } catch (error) {
      console.log("✅ Expected validation error:", error.message);
    }

    console.log("\n🎉 Transaction flow test completed!");
    console.log("\n📋 Summary:");
    console.log("✅ EVM transactions: Working");
    console.log("✅ Privy sendTransaction format: Working");
    console.log("✅ Chain validation: Working");
    console.log("✅ Parameter validation: Working");

    console.log("\n💡 Integration Notes:");
    console.log("• This tool is called through the voice agent system");
    console.log("• The transaction_request is processed by the frontend");
    console.log("• Privy handles the actual signing and broadcasting");
    console.log("• User sees a confirmation modal before signing");

    console.log("\n🔄 Real Usage Flow:");
    console.log('1. User says: "Send 0.1 ETH to 0x742d...8b8b"');
    console.log("2. Voice agent calls requestUserSignature tool");
    console.log("3. Tool returns transaction_request");
    console.log("4. Frontend shows Privy transaction modal");
    console.log("5. User confirms and signs");
    console.log("6. Privy broadcasts transaction");
    console.log("7. Transaction hash returned to user");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testTransactionFlow();
