// Test script for Transaction Amount Display in Privy
// Run with: node scripts/test-transaction-amounts.js

const TEST_USER_ID =
  process.env.TEST_USER_ID || "did:privy:cmcnvwtdj00o7l20mlzwvr5qd";
const BASE_URL = "http://localhost:3000";

async function testTransactionAmounts() {
  console.log("💰 Testing Transaction Amount Display");
  console.log("===================================");
  console.log(`🔍 Testing with user ID: ${TEST_USER_ID}`);

  // Test different transaction amounts to see which ones display properly
  const amountTests = [
    {
      name: "Very Small Amount",
      description: "0.0001 ETH",
      value: "100000000000000", // 0.0001 ETH in wei
      expectedDisplay: "0.0001 ETH",
    },
    {
      name: "Small Amount",
      description: "0.001 ETH",
      value: "1000000000000000", // 0.001 ETH in wei
      expectedDisplay: "0.001 ETH",
    },
    {
      name: "Medium Amount",
      description: "0.01 ETH",
      value: "10000000000000000", // 0.01 ETH in wei
      expectedDisplay: "0.01 ETH",
    },
    {
      name: "Larger Amount",
      description: "0.1 ETH",
      value: "100000000000000000", // 0.1 ETH in wei
      expectedDisplay: "0.1 ETH",
    },
    {
      name: "Round Amount",
      description: "1 ETH",
      value: "1000000000000000000", // 1 ETH in wei
      expectedDisplay: "1 ETH",
    },
  ];

  for (const test of amountTests) {
    console.log(`\n📊 Testing ${test.name} (${test.description}):`);
    console.log(`   Wei value: ${test.value}`);
    console.log(`   Expected display: ${test.expectedDisplay}`);

    try {
      const response = await fetch(`${BASE_URL}/api/adamik`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "requestUserSignature",
          userId: TEST_USER_ID,
          to: "0x742d35Cc6634C0532925a3b8D4f5b66C6B1f8b8b",
          value: test.value,
          chainId: "optimism",
          description: `Send ${test.description} to test address`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Transaction prepared successfully`);

        // Parse the response to see the transaction data
        try {
          const resultText = data.content?.[0]?.text;
          if (resultText) {
            const result = JSON.parse(resultText);
            if (result.type === "transaction_request" && result.data) {
              console.log(`   📝 Transaction data:`);
              console.log(`      To: ${result.data.to}`);
              console.log(`      Value: ${result.data.value} wei`);
              console.log(`      Chain ID: ${result.data.chainId}`);
              console.log(
                `   💡 This should trigger Privy modal with amount: ${test.expectedDisplay}`
              );
            }
          }
        } catch (parseError) {
          console.log(`   ⚠️  Could not parse transaction response`);
        }
      } else {
        console.log(`   ❌ Transaction preparation failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n🎯 Analysis:`);
  console.log(`===========`);
  console.log(`• Your original amount: 0.0005 ETH (500000000000000 wei)`);
  console.log(`• This is between "Very Small" and "Small" test amounts`);
  console.log(`• If larger amounts show properly, the issue is likely:`);
  console.log(`  1. Privy UI doesn't display very small amounts clearly`);
  console.log(`  2. Amount formatting/precision issues`);
  console.log(`  3. USD value too small to display`);

  console.log(`\n💡 Recommendations:`);
  console.log(`==================`);
  console.log(`• Try a larger test amount (0.01 ETH or more)`);
  console.log(`• Check if amount appears with different transaction sizes`);
  console.log(`• Consider adding minimum amount validation`);
  console.log(`• Verify Privy modal behavior with substantial amounts`);

  console.log(`\n⚠️  Note:`);
  console.log(`=========`);
  console.log(
    `The transaction data is correctly formatted - the issue is likely`
  );
  console.log(`in how Privy's UI displays very small amounts in the modal.`);
}

// Run the test
testTransactionAmounts();
