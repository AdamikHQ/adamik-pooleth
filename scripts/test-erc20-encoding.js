#!/usr/bin/env node

/**
 * Test ERC-20 Encoding Logic
 *
 * This test verifies that our direct ERC-20 transfer encoding
 * generates the correct function call data.
 */

function encodeERC20Transfer(to, amount) {
  console.log(`🔧 Encoding ERC-20 transfer:`);
  console.log(`   To: ${to}`);
  console.log(`   Amount: ${amount}`);

  // Remove 0x prefix from recipient address if present
  const cleanRecipient = to.startsWith("0x") ? to.slice(2) : to;

  // Ensure recipient address is 40 characters (20 bytes)
  if (cleanRecipient.length !== 40) {
    throw new Error("Invalid recipient address format");
  }

  // Convert amount to BigInt and then to hex (32 bytes, big-endian)
  const amountBigInt = BigInt(amount);
  const amountHex = amountBigInt.toString(16).padStart(64, "0");

  // Construct the function call data
  const functionSelector = "a9059cbb"; // transfer(address,uint256)
  const recipientPadded = cleanRecipient.padStart(64, "0"); // 32 bytes
  const amountPadded = amountHex; // 32 bytes

  const transferData = `0x${functionSelector}${recipientPadded}${amountPadded}`;

  console.log(`✅ Encoded successfully:`);
  console.log(`   Function: transfer(address,uint256)`);
  console.log(`   Selector: 0x${functionSelector}`);
  console.log(`   Recipient (padded): ${recipientPadded}`);
  console.log(`   Amount (padded): ${amountPadded}`);
  console.log(`   Full data: ${transferData}`);
  console.log(`   Length: ${transferData.length} characters`);

  return transferData;
}

function testERC20Encoding() {
  console.log("🧪 Testing ERC-20 Transfer Encoding");
  console.log("===================================\n");

  const testCases = [
    {
      name: "100 USDC (6 decimals)",
      to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
      amount: "100000000", // 100 USDC
      expectedAmount:
        "0000000000000000000000000000000000000000000000000000000005f5e100",
    },
    {
      name: "0.01 USDC (6 decimals)",
      to: "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16",
      amount: "10000", // 0.01 USDC
      expectedAmount:
        "0000000000000000000000000000000000000000000000000000000000002710",
    },
    {
      name: "25 DAI (18 decimals)",
      to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      amount: "25000000000000000000", // 25 DAI
      expectedAmount:
        "00000000000000000000000000000000000000000000000015af1d78b58c4000",
    },
  ];

  for (const test of testCases) {
    console.log(`\n📋 Test Case: ${test.name}`);
    console.log("=".repeat(test.name.length + 12));

    try {
      const result = encodeERC20Transfer(test.to, test.amount);

      // Verify the structure
      const expectedStart = "0xa9059cbb"; // Function selector
      if (result.startsWith(expectedStart)) {
        console.log("✅ Function selector correct");
      } else {
        console.log("❌ Function selector incorrect");
      }

      if (result.length === 138) {
        // 0x + 4 bytes selector + 32 bytes address + 32 bytes amount
        console.log("✅ Data length correct (138 characters)");
      } else {
        console.log(
          `❌ Data length incorrect: ${result.length} (expected 138)`
        );
      }

      // Extract and verify amount encoding
      const encodedAmount = result.slice(74); // Skip 0x + selector + address
      if (encodedAmount === test.expectedAmount) {
        console.log("✅ Amount encoding correct");
      } else {
        console.log("❌ Amount encoding incorrect");
        console.log(`   Expected: ${test.expectedAmount}`);
        console.log(`   Got:      ${encodedAmount}`);
      }
    } catch (error) {
      console.log(`❌ Encoding failed: ${error.message}`);
    }
  }

  console.log("\n🎯 Real-world Example:");
  console.log("======================");
  console.log("The failing case from the voice agent:");

  const failedCase = {
    tokenAddress: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", // USDC on Optimism
    to: "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16",
    amount: "10000", // 0.01 USDC
  };

  console.log(`Token: ${failedCase.tokenAddress}`);
  console.log(`To: ${failedCase.to}`);
  console.log(`Amount: ${failedCase.amount} (0.01 USDC)`);

  try {
    const realData = encodeERC20Transfer(failedCase.to, failedCase.amount);
    console.log("\n✅ This should work with Privy now!");
    console.log(
      `Transaction will be sent TO: ${failedCase.tokenAddress} (token contract)`
    );
    console.log(`With VALUE: 0 (no ETH)`);
    console.log(`With DATA: ${realData}`);
  } catch (error) {
    console.log(`❌ Would still fail: ${error.message}`);
  }

  console.log("\n💡 Summary:");
  console.log("============");
  console.log("✅ Direct ERC-20 encoding eliminates Adamik API dependency");
  console.log("✅ Uses standard transfer(address,uint256) function");
  console.log("✅ Privy will handle this data directly in sendTransaction");
  console.log("✅ Much simpler and more reliable than complex API chains");
}

if (require.main === module) {
  testERC20Encoding();
}

module.exports = { encodeERC20Transfer, testERC20Encoding };
