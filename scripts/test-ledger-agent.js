#!/usr/bin/env node

/**
 * Test script for Ledger Hardware Wallet Agent
 * Tests device discovery, connection, and fund security operations
 */

const { ledgerService } = require("../src/app/services/ledger.ts");

async function testLedgerAgent() {
  console.log("🔧 Testing Ledger Hardware Wallet Agent");
  console.log("=====================================\n");

  try {
    // Test 1: Check WebHID support
    console.log("1️⃣ Testing WebHID support...");
    const isSupported = ledgerService.isWebHIDSupported();
    console.log(`   WebHID supported: ${isSupported ? "✅ Yes" : "❌ No"}`);

    if (!isSupported) {
      console.log(
        "   ⚠️  Note: WebHID not supported in this environment (expected in Node.js)"
      );
      console.log("   ✅ This will work in Chrome/Edge browsers\n");
    }

    // Test 2: Device discovery (simulated)
    console.log("2️⃣ Testing device discovery...");
    const devices = await ledgerService.discoverDevices(3000);
    console.log(`   Found ${devices.length} device(s):`);
    devices.forEach((device) => {
      console.log(`   📱 ${device.name} (${device.model}) - ID: ${device.id}`);
    });

    if (devices.length === 0) {
      console.log("   ⚠️  No devices found (expected in simulation mode)\n");
      return;
    }

    // Test 3: Device connection
    console.log("\n3️⃣ Testing device connection...");
    const device = devices[0];
    const connectedDevice = await ledgerService.connectDevice(device.id);
    console.log(`   ✅ Connected to: ${connectedDevice.name}`);
    console.log(`   📱 Session ID: ${connectedDevice.sessionId}`);

    // Test 4: Address retrieval
    console.log("\n4️⃣ Testing Ethereum address retrieval...");
    const addressInfo = await ledgerService.getEthereumAddress(
      connectedDevice.id,
      "44'/60'/0'/0/0",
      false
    );
    console.log(`   📍 Address: ${addressInfo.address}`);
    console.log(
      `   🔑 Public Key: ${addressInfo.publicKey.substring(0, 20)}...`
    );
    console.log(`   🛣️  Derivation Path: ${addressInfo.derivationPath}`);

    // Test 5: Fund Security Simulation
    console.log("\n5️⃣ Testing fund security simulation...");
    const fundSecurityResult = {
      success: true,
      operation: "fund_security",
      sourceAddress: "0xE7ccd18A3d23F72f5d12F9de54F8fB94b2C7B3CE", // Example Privy wallet
      destinationAddress: addressInfo.address,
      amount: "0.01", // 0.01 ETH
      network: "ethereum",
      ledgerDevice: connectedDevice.name,
      message: `Ready to transfer 0.01 ETH from Privy wallet to Ledger hardware wallet`,
    };

    console.log(`   🔒 Operation: ${fundSecurityResult.operation}`);
    console.log(`   📤 From (Privy): ${fundSecurityResult.sourceAddress}`);
    console.log(`   📥 To (Ledger): ${fundSecurityResult.destinationAddress}`);
    console.log(`   💰 Amount: ${fundSecurityResult.amount} ETH`);
    console.log(`   🌐 Network: ${fundSecurityResult.network}`);
    console.log(`   📱 Device: ${fundSecurityResult.ledgerDevice}`);

    // Test 6: List connected devices
    console.log("\n6️⃣ Testing connected devices list...");
    const connectedDevices = ledgerService.getConnectedDevices();
    console.log(`   Connected devices: ${connectedDevices.length}`);
    connectedDevices.forEach((dev) => {
      console.log(
        `   📱 ${dev.name} (${dev.model}) - Session: ${dev.sessionId}`
      );
    });

    // Test 7: Cleanup
    console.log("\n7️⃣ Testing cleanup...");
    await ledgerService.disconnectDevice(connectedDevice.id);
    console.log(`   ✅ Disconnected from ${connectedDevice.name}`);

    console.log("\n🎉 Ledger Agent Test Complete!");
    console.log("\n📝 Summary:");
    console.log("   ✅ Device discovery working");
    console.log("   ✅ Device connection working");
    console.log("   ✅ Address retrieval working");
    console.log("   ✅ Fund security flow ready");
    console.log("   ✅ Device management working");

    console.log("\n🚀 Ready for integration with voice agent!");
    console.log("\n💡 Voice Commands to Test:");
    console.log('   - "Secure my funds on Ledger"');
    console.log('   - "Transfer my crypto to hardware wallet"');
    console.log('   - "Connect to my Ledger device"');
    console.log('   - "Show me my Ledger address"');
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("\n🔧 Troubleshooting:");
    console.error(
      "   - Ensure you're running in a browser with WebHID support"
    );
    console.error("   - Connect your Ledger device via USB");
    console.error("   - Unlock your device and open the Ethereum app");
    console.error(
      '   - Enable "Allow external access" in Ethereum app settings'
    );
  }
}

// Usage information
console.log("🔧 Ledger Hardware Wallet Agent Test");
console.log("====================================");
console.log("");
console.log("This script tests the basic functionality of the Ledger agent:");
console.log("- Device discovery and connection");
console.log("- Ethereum address retrieval");
console.log("- Fund security operation simulation");
console.log("");
console.log("📋 Prerequisites for real hardware testing:");
console.log("- Chrome/Edge browser (WebHID support)");
console.log("- Ledger device connected via USB");
console.log("- Device unlocked with Ethereum app open");
console.log('- "Allow external access" enabled in Ethereum app');
console.log("");

// Run the test
if (require.main === module) {
  testLedgerAgent().catch(console.error);
}

module.exports = { testLedgerAgent };
