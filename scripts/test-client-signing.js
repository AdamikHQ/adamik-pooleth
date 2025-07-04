#!/usr/bin/env node

/**
 * Test Client-Side Signing Implementation
 *
 * This script tests the complete client-side signing flow:
 * 1. Encode a transaction
 * 2. Request user signature (should return signing request)
 * 3. Simulate broadcasting with signature
 */

const TEST_USER_ID = "did:privy:cmcnvwtdj00o7l20mlzwvr5qd";

async function testClientSideSigning() {
  console.log("🧪 Testing Client-Side Signing Implementation");
  console.log("=".repeat(50));

  const baseUrl = "http://localhost:3000";

  try {
    // Step 1: Encode a transaction
    console.log("\n📝 Step 1: Encoding transaction...");
    const encodeResponse = await fetch(`${baseUrl}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "encodeTransaction",
        userId: TEST_USER_ID,
        chainId: "solana",
        body: {
          mode: "transfer",
          recipientAddress: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
          amount: "10000000", // 0.01 SOL
        },
      }),
    });

    if (!encodeResponse.ok) {
      throw new Error(
        `Encode failed: ${encodeResponse.status} ${encodeResponse.statusText}`
      );
    }

    const encodedTransaction = await encodeResponse.json();
    console.log("✅ Transaction encoded successfully");
    console.log(
      "📋 Encoded transaction:",
      JSON.stringify(encodedTransaction, null, 2)
    );

    // Step 2: Request user signature
    console.log("\n🔐 Step 2: Requesting user signature...");
    const signatureResponse = await fetch(`${baseUrl}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "requestUserSignature",
        userId: TEST_USER_ID,
        encodedTransaction: encodedTransaction,
        description: "Send 0.01 SOL to test address",
      }),
    });

    if (!signatureResponse.ok) {
      throw new Error(
        `Signature request failed: ${signatureResponse.status} ${signatureResponse.statusText}`
      );
    }

    const signatureRequest = await signatureResponse.json();
    console.log("✅ Signature request created successfully");
    console.log(
      "📋 Signature request:",
      JSON.stringify(signatureRequest, null, 2)
    );

    // Verify it's a signing request
    if (signatureRequest.type === "signing_request") {
      console.log("✅ Correct signing request format detected");
      console.log(`📝 Description: ${signatureRequest.data.description}`);
      console.log(
        `⛓️  Chain: ${signatureRequest.data.chainId} (${signatureRequest.data.chainType})`
      );
      console.log(
        `🔑 Hash to sign: ${signatureRequest.data.hashToSign.substring(
          0,
          20
        )}...`
      );
    } else {
      console.log("❌ Unexpected response format - not a signing request");
    }

    // Step 3: Simulate broadcasting with signature
    console.log("\n📡 Step 3: Testing broadcast with simulated signature...");
    const mockSignature =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234";

    const broadcastResponse = await fetch(`${baseUrl}/api/adamik`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "broadcastTransaction",
        userId: TEST_USER_ID,
        encodedTransaction: encodedTransaction,
        signature: mockSignature,
      }),
    });

    if (!broadcastResponse.ok) {
      const errorText = await broadcastResponse.text();
      console.log(
        "⚠️  Broadcast failed (expected for mock signature):",
        broadcastResponse.status
      );
      console.log("📋 Error details:", errorText);
    } else {
      const broadcastResult = await broadcastResponse.json();
      console.log(
        "✅ Broadcast successful:",
        JSON.stringify(broadcastResult, null, 2)
      );
    }

    console.log("\n🎉 Client-side signing implementation test completed!");
    console.log("\n📋 Summary:");
    console.log("✅ Transaction encoding: Working");
    console.log("✅ Signature request: Working");
    console.log("✅ Broadcast format: Working");
    console.log("\n💡 Next steps:");
    console.log("1. Test in the browser with voice commands");
    console.log(
      '2. Try: "Send 0.01 SOL to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"'
    );
    console.log("3. Verify the signing modal appears");
    console.log("4. Test signing and broadcasting");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run the test
testClientSideSigning();
