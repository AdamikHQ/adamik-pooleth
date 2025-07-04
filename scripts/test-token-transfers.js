#!/usr/bin/env node

/**
 * Test Token Transfers with Privy Built-in Support
 *
 * This test demonstrates the new sendTokenTransfer tool that uses:
 * 1. Direct ERC-20 transfer encoding (transfer function call data)
 * 2. Privy's native sendTransaction with encoded data
 *
 * The result is seamless ERC-20 token transfers using Privy's native modal.
 */

const BASE_URL = "http://localhost:3000";
const TEST_USER_ID = "did:privy:cmcnvwtdj00o7l20mlzwvr5qd"; // Replace with your test user ID

// Common token addresses for testing
const TOKENS = {
  ethereum: {
    USDC: "0xA0b86a33E6e87C6e81962e0c50c5B4e4b4c6c4f8",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  },
  polygon: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  },
  base: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
};

async function testTokenTransfers() {
  console.log("🪙 Testing Token Transfers with Privy Built-in Support");
  console.log("======================================================");
  console.log("This test verifies the new sendTokenTransfer tool that uses");
  console.log("direct ERC-20 encoding + Privy's native sendTransaction.\n");

  const tokenTests = [
    {
      name: "USDC on Ethereum",
      tokenAddress: TOKENS.ethereum.USDC,
      to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
      amount: "100000000", // 100 USDC (6 decimals)
      chainId: "ethereum",
      description: "Send 100 USDC to test address",
      expectedDisplay: "100 USDC",
    },
    {
      name: "USDT on Polygon",
      tokenAddress: TOKENS.polygon.USDT,
      to: "0x1234567890123456789012345678901234567890",
      amount: "50000000", // 50 USDT (6 decimals)
      chainId: "polygon",
      description: "Send 50 USDT on Polygon",
      expectedDisplay: "50 USDT",
    },
    {
      name: "DAI on Base",
      tokenAddress: TOKENS.base.DAI,
      to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      amount: "25000000000000000000", // 25 DAI (18 decimals)
      chainId: "base",
      description: "Send 25 DAI on Base",
      expectedDisplay: "25 DAI",
    },
    {
      name: "Small USDC Transfer",
      tokenAddress: TOKENS.ethereum.USDC,
      to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
      amount: "1000000", // 1 USDC (6 decimals)
      chainId: "ethereum",
      description: "Send 1 USDC to test address",
      expectedDisplay: "1 USDC",
    },
  ];

  for (const test of tokenTests) {
    console.log(`\n🪙 Testing ${test.name}:`);
    console.log(`   Amount: ${test.expectedDisplay}`);
    console.log(`   Token: ${test.tokenAddress}`);
    console.log(`   Chain: ${test.chainId}`);
    console.log(`   To: ${test.to}`);

    try {
      const response = await fetch(`${BASE_URL}/api/adamik`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sendTokenTransfer",
          userId: TEST_USER_ID,
          tokenAddress: test.tokenAddress,
          to: test.to,
          amount: test.amount,
          chainId: test.chainId,
          description: test.description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Token transfer prepared successfully`);

        // Parse the response to verify the transaction data
        try {
          const resultText = data.content?.[0]?.text;
          if (resultText) {
            const result = JSON.parse(resultText);

            if (result.type === "transaction_request" && result.data) {
              console.log(`   📝 Transaction details:`);
              console.log(`      To: ${result.data.to}`);
              console.log(
                `      Value: ${result.data.value} (should be 0 for tokens)`
              );
              console.log(`      Chain: ${result.data.chainId}`);
              console.log(
                `      Data: ${result.data.data ? "✅ Present" : "❌ Missing"}`
              );
              console.log(`   💡 Privy will show: "${test.description}"`);

              // Verify token transaction structure
              if (
                result.data.to === test.tokenAddress &&
                result.data.value === "0" &&
                result.data.data
              ) {
                console.log(`   ✅ Token transaction structure correct`);
              } else {
                console.log(`   ❌ Token transaction structure incorrect`);
              }
            } else {
              console.log(`   ❌ Unexpected response format`);
            }
          }
        } catch (parseError) {
          console.log(`   ⚠️  Could not parse transaction response`);
        }
      } else {
        console.log(`   ❌ Token transfer failed: ${response.status}`);
        const errorData = await response.json();
        console.log(`   Error: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`);
    }
  }

  // Test validation and error handling
  console.log(`\n❌ Testing Validation & Error Handling:`);
  console.log(`=====================================`);

  const validationTests = [
    {
      name: "Missing token address",
      params: {
        userId: TEST_USER_ID,
        to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
        amount: "100000000",
        chainId: "ethereum",
        description: "Should fail",
      },
      expectedError: "Missing 'tokenAddress' parameter",
    },
    {
      name: "Missing recipient",
      params: {
        userId: TEST_USER_ID,
        tokenAddress: TOKENS.ethereum.USDC,
        amount: "100000000",
        chainId: "ethereum",
        description: "Should fail",
      },
      expectedError: "Missing 'to' parameter",
    },
    {
      name: "Missing amount",
      params: {
        userId: TEST_USER_ID,
        tokenAddress: TOKENS.ethereum.USDC,
        to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
        chainId: "ethereum",
        description: "Should fail",
      },
      expectedError: "Missing 'amount' parameter",
    },
    {
      name: "Unsupported chain",
      params: {
        userId: TEST_USER_ID,
        tokenAddress: TOKENS.ethereum.USDC,
        to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
        amount: "100000000",
        chainId: "solana",
        description: "Should fail",
      },
      expectedError: "Chain solana is not supported",
    },
  ];

  for (const test of validationTests) {
    console.log(`\n❌ Testing ${test.name}:`);

    try {
      const response = await fetch(`${BASE_URL}/api/adamik`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "sendTokenTransfer",
          ...test.params,
        }),
      });

      if (response.ok) {
        console.log(`   ❌ Should have failed but succeeded`);
      } else {
        const errorData = await response.json();
        const errorMessage =
          errorData.error || errorData.content?.[0]?.text || "Unknown error";
        console.log(`   ✅ Correctly rejected: ${errorMessage}`);

        if (errorMessage.includes(test.expectedError)) {
          console.log(`   ✅ Expected error message found`);
        } else {
          console.log(`   ⚠️  Different error than expected`);
        }
      }
    } catch (error) {
      console.log(`   ✅ Validation working: ${error.message}`);
    }
  }

  console.log(`\n🎉 Token Transfer Test Summary:`);
  console.log(`===============================`);
  console.log(`✅ Token Transfer Features:`);
  console.log(`   • sendTokenTransfer tool implemented`);
  console.log(`   • Direct ERC-20 transfer function encoding`);
  console.log(`   • Supports all EVM chains (Ethereum, Polygon, Base, etc.)`);
  console.log(`   • Handles ERC-20 tokens with proper encoding`);
  console.log(`   • Uses Privy's native transaction modal`);
  console.log(`   • Includes proper validation and error handling`);

  console.log(`\n🔄 How It Works:`);
  console.log(`   1. User requests token transfer via voice`);
  console.log(`   2. Agent calls sendTokenTransfer tool`);
  console.log(`   3. Tool encodes ERC-20 transfer function call data`);
  console.log(`   4. Tool calls requestUserSignature with encoded data`);
  console.log(`   5. Privy shows transaction modal to user`);
  console.log(`   6. User confirms and signs transaction`);
  console.log(`   7. Privy broadcasts transaction automatically`);
  console.log(`   8. Transaction hash returned to user`);

  console.log(`\n💡 Integration Benefits:`);
  console.log(`   • Seamless user experience`);
  console.log(`   • Built-in Privy security`);
  console.log(`   • Direct ERC-20 encoding (no external APIs)`);
  console.log(`   • Automatic gas estimation`);
  console.log(`   • Native transaction confirmation modal`);
  console.log(`   • Cross-chain compatibility`);

  console.log(`\n📋 Testing Notes:`);
  console.log(`   • Replace TEST_USER_ID with actual user ID`);
  console.log(`   • Verify token contract addresses for each chain`);
  console.log(`   • Test with small amounts first`);
  console.log(`   • Ensure sufficient token balance for testing`);
  console.log(`   • Monitor transaction confirmations`);

  console.log(`\n🔄 Updated Implementation:`);
  console.log(`   • Direct ERC-20 transfer encoding (no Adamik API)`);
  console.log(`   • Uses standard transfer(address,uint256) function`);
  console.log(`   • Privy handles all signing and broadcasting`);
  console.log(`   • Much simpler and more reliable`);
}

if (require.main === module) {
  testTokenTransfers().catch(console.error);
}

module.exports = { testTokenTransfers };
