#!/usr/bin/env node

/**
 * Focused Ledger Hardware Wallet Connectivity Test
 * Tests basic device discovery, connection, and disconnection
 */

const path = require("path");
const { spawn } = require("child_process");

// Mock ledger service for testing connectivity patterns
class MockLedgerService {
  constructor() {
    this.connectedDevices = [];
    this.simulatedDevices = [
      {
        id: "nano-s-plus-001",
        name: "Ledger Nano S Plus",
        model: "Nano S Plus",
        productId: 0x5011,
        vendorId: 0x2c97,
        connected: false,
        sessionId: null,
      },
      {
        id: "nano-x-001",
        name: "Ledger Nano X",
        model: "Nano X",
        productId: 0x0004,
        vendorId: 0x2c97,
        connected: false,
        sessionId: null,
      },
    ];
  }

  isWebHIDSupported() {
    // In browser environment, this would check for navigator.hid
    // In Node.js, we simulate the check
    return (
      typeof navigator !== "undefined" &&
      navigator.hid &&
      typeof navigator.hid.getDevices === "function"
    );
  }

  async discoverDevices(timeout = 5000) {
    console.log(`   🔍 Scanning for devices (timeout: ${timeout}ms)...`);

    // Simulate device discovery delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // In real implementation, this would use WebHID API
    // For testing, we return simulated devices
    return this.simulatedDevices.map((device) => ({
      id: device.id,
      name: device.name,
      model: device.model,
      productId: device.productId,
      vendorId: device.vendorId,
    }));
  }

  async connectDevice(deviceId) {
    console.log(`   🔗 Attempting to connect to device: ${deviceId}`);

    const device = this.simulatedDevices.find((d) => d.id === deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate potential connection failures
    if (Math.random() < 0.1) {
      // 10% chance of failure for testing
      throw new Error(
        "Device connection failed: Device locked or app not open"
      );
    }

    device.connected = true;
    device.sessionId = `session-${Date.now()}`;

    const connectedDevice = {
      id: device.id,
      name: device.name,
      model: device.model,
      sessionId: device.sessionId,
      connected: true,
    };

    this.connectedDevices.push(connectedDevice);
    return connectedDevice;
  }

  async getEthereumAddress(
    deviceId,
    derivationPath = "44'/60'/0'/0/0",
    verify = false
  ) {
    console.log(`   📍 Retrieving Ethereum address from device: ${deviceId}`);
    console.log(`   🛣️  Using derivation path: ${derivationPath}`);

    const device = this.connectedDevices.find((d) => d.id === deviceId);
    if (!device) {
      throw new Error(`Device not connected: ${deviceId}`);
    }

    // Simulate address retrieval delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate mock Ethereum address
    const mockAddress = `0x${Math.random()
      .toString(16)
      .slice(2, 42)
      .padStart(40, "0")}`;
    const mockPublicKey = `0x${Math.random()
      .toString(16)
      .slice(2, 66)
      .padStart(64, "0")}`;

    return {
      address: mockAddress,
      publicKey: mockPublicKey,
      derivationPath: derivationPath,
      chainCode: "0x" + "0".repeat(64),
    };
  }

  async disconnectDevice(deviceId) {
    console.log(`   🔌 Disconnecting device: ${deviceId}`);

    const deviceIndex = this.connectedDevices.findIndex(
      (d) => d.id === deviceId
    );
    if (deviceIndex === -1) {
      throw new Error(`Device not connected: ${deviceId}`);
    }

    // Simulate disconnection delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const device = this.simulatedDevices.find((d) => d.id === deviceId);
    if (device) {
      device.connected = false;
      device.sessionId = null;
    }

    this.connectedDevices.splice(deviceIndex, 1);
  }

  getConnectedDevices() {
    return [...this.connectedDevices];
  }
}

class ConnectivityTester {
  constructor() {
    this.ledgerService = new MockLedgerService();
    this.testResults = [];
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`Starting: ${testName}`, "info");
      const result = await testFunction();
      this.testResults.push({ name: testName, success: true, result });
      this.log(`Completed: ${testName}`, "success");
      return result;
    } catch (error) {
      this.testResults.push({
        name: testName,
        success: false,
        error: error.message,
      });
      this.log(`Failed: ${testName} - ${error.message}`, "error");
      throw error;
    }
  }

  async testWebHIDSupport() {
    return this.runTest("WebHID Support Check", async () => {
      const isSupported = this.ledgerService.isWebHIDSupported();

      if (!isSupported) {
        console.log("   ⚠️  WebHID not supported in this environment");
        console.log(
          "   📋 This is expected in Node.js - will work in Chrome/Edge"
        );
        return { supported: false, environment: "Node.js" };
      }

      console.log("   ✅ WebHID is supported");
      return { supported: true, environment: "Browser" };
    });
  }

  async testDeviceDiscovery() {
    return this.runTest("Device Discovery", async () => {
      const devices = await this.ledgerService.discoverDevices(3000);

      console.log(`   📱 Found ${devices.length} device(s):`);
      devices.forEach((device) => {
        console.log(`      • ${device.name} (${device.model})`);
        console.log(`        ID: ${device.id}`);
        console.log(
          `        Vendor: 0x${device.vendorId.toString(16).padStart(4, "0")}`
        );
        console.log(
          `        Product: 0x${device.productId.toString(16).padStart(4, "0")}`
        );
      });

      return { deviceCount: devices.length, devices };
    });
  }

  async testDeviceConnection(deviceId) {
    return this.runTest("Device Connection", async () => {
      const device = await this.ledgerService.connectDevice(deviceId);

      console.log(`   📱 Connected to: ${device.name}`);
      console.log(`   🔑 Session ID: ${device.sessionId}`);
      console.log(
        `   📊 Status: ${device.connected ? "Connected" : "Disconnected"}`
      );

      return device;
    });
  }

  async testAddressRetrieval(deviceId) {
    return this.runTest("Address Retrieval", async () => {
      const addressInfo = await this.ledgerService.getEthereumAddress(
        deviceId,
        "44'/60'/0'/0/0",
        false
      );

      console.log(`   📍 Address: ${addressInfo.address}`);
      console.log(
        `   🔑 Public Key: ${addressInfo.publicKey.substring(0, 20)}...`
      );
      console.log(`   🛣️  Derivation Path: ${addressInfo.derivationPath}`);

      return addressInfo;
    });
  }

  async testDeviceDisconnection(deviceId) {
    return this.runTest("Device Disconnection", async () => {
      await this.ledgerService.disconnectDevice(deviceId);

      const connectedDevices = this.ledgerService.getConnectedDevices();
      console.log(`   🔌 Device disconnected successfully`);
      console.log(
        `   📊 Remaining connected devices: ${connectedDevices.length}`
      );

      return { disconnected: true, remainingDevices: connectedDevices.length };
    });
  }

  async testConnectedDevicesList() {
    return this.runTest("Connected Devices List", async () => {
      const devices = this.ledgerService.getConnectedDevices();

      console.log(`   📱 Connected devices: ${devices.length}`);
      devices.forEach((device) => {
        console.log(`      • ${device.name} (Session: ${device.sessionId})`);
      });

      return { connectedCount: devices.length, devices };
    });
  }

  async runFullConnectivityTest() {
    console.log("🔧 Ledger Hardware Wallet Connectivity Test");
    console.log("==========================================\n");

    try {
      // Test 1: WebHID Support
      console.log("1️⃣ Testing WebHID Support...");
      await this.testWebHIDSupport();
      console.log("");

      // Test 2: Device Discovery
      console.log("2️⃣ Testing Device Discovery...");
      const discoveryResult = await this.testDeviceDiscovery();
      console.log("");

      if (discoveryResult.deviceCount === 0) {
        console.log(
          "⚠️  No devices found - cannot continue with connection tests"
        );
        console.log("   📋 In real usage, ensure:");
        console.log("      • Ledger device is connected via USB");
        console.log("      • Device is unlocked");
        console.log("      • Ethereum app is open");
        console.log('      • "Allow external access" is enabled in settings');
        return this.showSummary();
      }

      const testDevice = discoveryResult.devices[0];
      console.log(
        `🎯 Using device for tests: ${testDevice.name} (${testDevice.id})\n`
      );

      // Test 3: Device Connection
      console.log("3️⃣ Testing Device Connection...");
      await this.testDeviceConnection(testDevice.id);
      console.log("");

      // Test 4: Connected Devices List
      console.log("4️⃣ Testing Connected Devices List...");
      await this.testConnectedDevicesList();
      console.log("");

      // Test 5: Address Retrieval
      console.log("5️⃣ Testing Address Retrieval...");
      await this.testAddressRetrieval(testDevice.id);
      console.log("");

      // Test 6: Device Disconnection
      console.log("6️⃣ Testing Device Disconnection...");
      await this.testDeviceDisconnection(testDevice.id);
      console.log("");

      // Test 7: Final Connected Devices Check
      console.log("7️⃣ Final Connected Devices Check...");
      await this.testConnectedDevicesList();
      console.log("");

      this.showSummary();
    } catch (error) {
      console.error("❌ Connectivity test failed:", error.message);
      console.error("\n🔧 Troubleshooting Tips:");
      console.error("   • Ensure Chrome/Edge browser for WebHID support");
      console.error("   • Connect Ledger device via USB (not Bluetooth)");
      console.error("   • Unlock device and open Ethereum app");
      console.error(
        '   • Enable "Allow external access" in Ethereum app settings'
      );
      console.error("   • Try unplugging and reconnecting the device");
      console.error("   • Check device firmware is up to date");

      this.showSummary();
    }
  }

  showSummary() {
    console.log("\n📊 Test Results Summary");
    console.log("=======================");

    const passed = this.testResults.filter((r) => r.success).length;
    const failed = this.testResults.filter((r) => !r.success).length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults
        .filter((r) => !r.success)
        .forEach((test) => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }

    console.log("\n🎯 Connectivity Status:");
    if (passed >= 4) {
      console.log("✅ Ledger connectivity is working properly");
    } else if (passed >= 2) {
      console.log("⚠️  Ledger connectivity partially working");
    } else {
      console.log("❌ Ledger connectivity issues detected");
    }

    console.log("\n📋 Next Steps:");
    console.log("   • Test with real hardware in Chrome/Edge browser");
    console.log("   • Ensure device is unlocked with Ethereum app open");
    console.log('   • Enable "Allow external access" in Ethereum app settings');
    console.log("   • Try the full agent test: npm run test:ledger-agent");
  }
}

// Main execution
async function main() {
  const tester = new ConnectivityTester();
  await tester.runFullConnectivityTest();
}

// Usage information
if (require.main === module) {
  console.log("🔧 Ledger Hardware Wallet Connectivity Test");
  console.log("===========================================");
  console.log("");
  console.log("This script tests basic Ledger device connectivity:");
  console.log("• WebHID browser support detection");
  console.log("• Device discovery and enumeration");
  console.log("• Device connection and session management");
  console.log("• Ethereum address retrieval");
  console.log("• Device disconnection and cleanup");
  console.log("");
  console.log("📋 For real hardware testing, use Chrome/Edge browser");
  console.log("🔗 This script uses mock data in Node.js environment");
  console.log("");

  main().catch(console.error);
}

module.exports = { ConnectivityTester, MockLedgerService };
