/**
 * Test Adamik API Direct Call
 *
 * This script tests the Adamik API directly to debug the authentication issue.
 */

const https = require("https");
require("dotenv").config();

const ADAMIK_API_KEY = process.env.ADAMIK_API_KEY;
const ADAMIK_API_BASE_URL =
  process.env.ADAMIK_API_BASE_URL || "https://api.adamik.io/api";

console.log("🔍 Testing Adamik API...");
console.log(`📡 Base URL: ${ADAMIK_API_BASE_URL}`);
console.log(
  `🔑 API Key: ${
    ADAMIK_API_KEY ? `${ADAMIK_API_KEY.substring(0, 8)}...` : "NOT SET"
  }`
);

// Test wallet address from the logs
const testWalletAddress = "0xFa2A1a3611A35A18a8a892424b13515274Ed1c16";
const testChainId = "ethereum";

async function testAdamikAPI() {
  console.log("\n🚀 Starting Adamik API test...\n");

  // Test 1: Direct API call
  console.log("📡 Test 1: Direct API call");
  await testDirectCall();

  // Test 2: Through our API proxy
  console.log("\n📡 Test 2: Through our API proxy");
  await testProxyCall();
}

function testDirectCall() {
  return new Promise((resolve) => {
    const url = `${ADAMIK_API_BASE_URL}/${testChainId}/account/${testWalletAddress}/state`;
    console.log(`🌐 URL: ${url}`);

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: "GET",
      headers: {
        Authorization: ADAMIK_API_KEY,
        Accept: "application/json",
        "User-Agent": "Adamik-Test-Script/1.0",
      },
    };

    console.log(
      "📤 Request headers:",
      JSON.stringify(options.headers, null, 2)
    );

    const req = https.request(options, (res) => {
      console.log(`📥 Status: ${res.statusCode}`);
      console.log("📥 Response headers:", JSON.stringify(res.headers, null, 2));

      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        console.log("📥 Response body:");
        console.log(body.substring(0, 500)); // First 500 chars

        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            console.log("✅ Direct API call successful");
            console.log(
              "📊 Data preview:",
              JSON.stringify(data, null, 2).substring(0, 300)
            );
          } catch (e) {
            console.log("❌ JSON parse error:", e.message);
          }
        } else {
          console.log("❌ Direct API call failed");
        }
        resolve();
      });
    });

    req.on("error", (error) => {
      console.log("❌ Request error:", error.message);
      resolve();
    });

    req.end();
  });
}

async function testProxyCall() {
  try {
    const http = require("http");

    const requestData = JSON.stringify({
      action: "getAccountState",
      chainId: testChainId,
      accountId: testWalletAddress,
    });

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/adamik",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestData),
      },
    };

    console.log("🌐 Proxy URL: http://localhost:3000/api/adamik");
    console.log("📤 Request data:", requestData);

    const req = http.request(options, (res) => {
      console.log(`📥 Status: ${res.statusCode}`);

      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        console.log("📥 Response body:");
        console.log(body.substring(0, 500)); // First 500 chars

        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            console.log("✅ Proxy API call successful");
            console.log(
              "📊 Data preview:",
              JSON.stringify(data, null, 2).substring(0, 300)
            );
          } catch (e) {
            console.log("❌ JSON parse error:", e.message);
          }
        } else {
          console.log("❌ Proxy API call failed");
        }
      });
    });

    req.on("error", (error) => {
      console.log("❌ Request error:", error.message);
    });

    req.write(requestData);
    req.end();
  } catch (error) {
    console.log("❌ Proxy test error:", error.message);
  }
}

// Run the test
if (require.main === module) {
  if (!ADAMIK_API_KEY) {
    console.error("❌ ADAMIK_API_KEY environment variable is not set");
    console.log(
      "Please check your .env file and ensure ADAMIK_API_KEY is configured"
    );
    process.exit(1);
  }

  testAdamikAPI()
    .then(() => {
      console.log("\n🏁 API test completed");
    })
    .catch((error) => {
      console.error("❌ Test failed:", error.message);
      process.exit(1);
    });
}
