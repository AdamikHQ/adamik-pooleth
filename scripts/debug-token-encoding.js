#!/usr/bin/env node

/**
 * Debug Token Encoding
 *
 * This script tests the encodeTransaction step in isolation to understand
 * why the sendTokenTransfer tool is failing with "missing data field".
 */

const BASE_URL = "http://localhost:3000";
const TEST_USER_ID = "did:privy:cmcnvwtdj00o7l20mlzwvr5qd"; // Replace with your test user ID

async function debugTokenEncoding() {
  console.log("🔍 Debugging Token Encoding Issue");
  console.log("==================================");
  console.log(
    "Testing the encodeTransaction step that's failing in sendTokenTransfer.\n"
  );

  // Test the exact same parameters that failed
  const failedParams = {
    tokenAddress: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", // USDC on Optimism
    to: "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16",
    amount: "10000", // 0.01 USDC (6 decimals)
    chainId: "optimism",
    description: "Send 0.01 USDC to 0xFa2A...d1c16",
  };

  console.log("🧪 Testing encodeTransaction directly:");
  console.log("=====================================");
  console.log("Parameters:", JSON.stringify(failedParams, null, 2));

  try {
    // Step 1: Test encodeTransaction directly
    const encodeResponse = await fetch(`${BASE_URL}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "encodeTransaction",
        userId: TEST_USER_ID,
        chainId: failedParams.chainId,
        body: {
          mode: "transferToken",
          tokenId: failedParams.tokenAddress,
          recipientAddress: failedParams.to,
          amount: failedParams.amount,
        },
      }),
    });

    console.log("\n📋 Encode Response Status:", encodeResponse.status);

    if (encodeResponse.ok) {
      const encodeData = await encodeResponse.json();
      console.log("\n✅ Encode Response Data:");
      console.log(JSON.stringify(encodeData, null, 2));

      // Try to parse the result like sendTokenTransfer does
      const encodedTxText = encodeData.content?.[0]?.text;
      console.log("\n🔍 Extracted Text:");
      console.log(encodedTxText);

      if (encodedTxText) {
        try {
          const encodedTx = JSON.parse(encodedTxText);
          console.log("\n📊 Parsed Encoded Transaction:");
          console.log(JSON.stringify(encodedTx, null, 2));

          // Check for the data field
          const txData = encodedTx.transaction?.data;
          console.log("\n🔍 Transaction Data Field:");
          console.log("Path: encodedTx.transaction?.data");
          console.log("Value:", txData);

          if (txData) {
            console.log("✅ Transaction data found!");
            console.log("Data length:", txData.length);
            console.log("Data preview:", txData.substring(0, 50) + "...");
          } else {
            console.log("❌ Transaction data field missing!");
            console.log("Available fields in encodedTx:");
            console.log(Object.keys(encodedTx));

            if (encodedTx.transaction) {
              console.log("Available fields in encodedTx.transaction:");
              console.log(Object.keys(encodedTx.transaction));
            }
          }
        } catch (parseError) {
          console.log(
            "❌ Failed to parse encoded transaction:",
            parseError.message
          );
        }
      } else {
        console.log("❌ No text content in encode response");
      }
    } else {
      console.log("❌ Encode request failed");
      const errorData = await encodeResponse.json();
      console.log("Error:", JSON.stringify(errorData, null, 2));
    }
  } catch (error) {
    console.log("❌ Network error:", error.message);
  }

  // Step 2: Test a simpler token transfer
  console.log("\n\n🧪 Testing Simpler Token Transfer:");
  console.log("==================================");

  const simpleParams = {
    chainId: "ethereum",
    body: {
      mode: "transferToken",
      tokenId: "0xA0b86a33E6e87C6e81962e0c50c5B4e4b4c6c4f8", // USDC on Ethereum
      recipientAddress: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
      amount: "1000000", // 1 USDC
    },
  };

  console.log("Parameters:", JSON.stringify(simpleParams, null, 2));

  try {
    const simpleResponse = await fetch(`${BASE_URL}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "encodeTransaction",
        userId: TEST_USER_ID,
        ...simpleParams,
      }),
    });

    if (simpleResponse.ok) {
      const simpleData = await simpleResponse.json();
      console.log("\n✅ Simple Response:");
      console.log(JSON.stringify(simpleData, null, 2));
    } else {
      console.log("❌ Simple request failed");
    }
  } catch (error) {
    console.log("❌ Simple test error:", error.message);
  }

  // Step 3: Test different response structure possibilities
  console.log("\n\n🔍 Analyzing Response Structure:");
  console.log("=================================");
  console.log("The sendTokenTransfer tool expects:");
  console.log("  encodedTx.transaction?.data");
  console.log("");
  console.log("But the actual structure might be:");
  console.log("  encodedTx.data");
  console.log("  encodedTx.transaction");
  console.log("  encodedTx.result?.data");
  console.log("  etc.");
  console.log("");
  console.log(
    "💡 If the structure is different, we need to update sendTokenTransfer"
  );
  console.log("   to extract the data from the correct location.");
}

if (require.main === module) {
  debugTokenEncoding().catch(console.error);
}

module.exports = { debugTokenEncoding };
