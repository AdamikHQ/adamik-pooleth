"use client";

import { useState } from "react";
import { ledgerService } from "../services/ledger";
import type { LedgerDevice, LedgerAddress } from "../services/ledger";

export default function TestLedgerPage() {
  const [log, setLog] = useState<string[]>([]);
  const [devices, setDevices] = useState<LedgerDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<LedgerDevice | null>(
    null
  );
  const [address, setAddress] = useState<LedgerAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    setLog((prev) => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  const clearLog = () => setLog([]);

  const testWebHIDSupport = () => {
    addLog("Testing WebHID support...");
    const isSupported = ledgerService.isWebHIDSupported();
    if (isSupported) {
      addLog("WebHID is supported!", "success");
    } else {
      addLog("WebHID is not supported in this browser", "error");
    }
  };

  // Add this function to request device permission
  const requestLedgerDevicePermission = async () => {
    addLog("Requesting Ledger device permission...");
    if (typeof navigator !== "undefined" && (navigator as any).hid) {
      try {
        await (navigator as any).hid.requestDevice({
          filters: [{ vendorId: 0x2c97 }],
        });
        addLog("Ledger device permission granted!", "success");
      } catch (err: any) {
        addLog(
          "Ledger device permission denied or cancelled: " + err.message,
          "error"
        );
      }
    } else {
      addLog("WebHID not supported in this browser", "error");
    }
  };

  const testDiscoverDevices = async () => {
    setIsLoading(true);
    try {
      addLog("Starting device discovery...");
      const foundDevices = await ledgerService.discoverDevices(10000);
      setDevices(foundDevices);
      addLog(`Found ${foundDevices.length} device(s)`, "success");
      foundDevices.forEach((device) => {
        addLog(`Device: ${device.name} (${device.model}) - ID: ${device.id}`);
      });
    } catch (error: any) {
      addLog(`Device discovery failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testConnectDevice = async (deviceId: string) => {
    setIsLoading(true);
    try {
      addLog(`Connecting to device: ${deviceId}...`);
      const device = await ledgerService.connectDevice(deviceId);
      setConnectedDevice(device);
      addLog(`Connected to: ${device.name}`, "success");
      addLog(`Session ID: ${device.sessionId}`);
    } catch (error: any) {
      addLog(`Device connection failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testOpenEthereumApp = async () => {
    if (!connectedDevice) {
      addLog("No device connected", "error");
      return;
    }

    setIsLoading(true);
    try {
      addLog("Opening Ethereum app...");
      await ledgerService.openEthereumApp(connectedDevice.id);
      addLog("Ethereum app opened successfully!", "success");
    } catch (error: any) {
      addLog(`Failed to open Ethereum app: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testGetAddress = async (verify: boolean = false) => {
    if (!connectedDevice) {
      addLog("No device connected", "error");
      return;
    }

    setIsLoading(true);
    try {
      addLog(`Getting Ethereum address (verify: ${verify})...`);
      if (verify) {
        addLog("Please confirm the address on your device", "info");
      }

      const addressInfo = await ledgerService.getEthereumAddress(
        connectedDevice.id,
        "44'/60'/0'/0/0",
        verify
      );

      setAddress(addressInfo);
      addLog(`Address retrieved: ${addressInfo.address}`, "success");
      addLog(`Public Key: ${addressInfo.publicKey.substring(0, 20)}...`);
      addLog(`Derivation Path: ${addressInfo.derivationPath}`);
    } catch (error: any) {
      addLog(`Address retrieval failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testDisconnectDevice = async () => {
    if (!connectedDevice) {
      addLog("No device connected", "error");
      return;
    }

    setIsLoading(true);
    try {
      addLog(`Disconnecting from device: ${connectedDevice.id}...`);
      await ledgerService.disconnectDevice(connectedDevice.id);
      setConnectedDevice(null);
      setAddress(null);
      addLog("Device disconnected successfully", "success");
    } catch (error: any) {
      addLog(`Device disconnection failed: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🔧 Ledger Service Test
          </h1>
          <p className="text-gray-600">
            Test the Device Management Kit integration
          </p>
        </div>

        <div className="mb-8 p-6 bg-amber-50 border-l-4 border-amber-400 rounded-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-amber-400 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-amber-800 mb-2">
                📋 Prerequisites
              </h3>
              <ul className="space-y-1 text-amber-700">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                  Chrome/Edge browser (WebHID support)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                  Ledger device connected via USB
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                  Device unlocked (PIN entered)
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
                  Ready to open Ethereum app when prompted
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Test Buttons */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              🎮 Test Actions
            </h2>
            <div className="space-y-4">
              <button
                onClick={testWebHIDSupport}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-md font-medium"
                disabled={isLoading}
              >
                🌐 1. Test WebHID Support
              </button>
              <button
                onClick={requestLedgerDevicePermission}
                className="w-full py-3 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-md font-medium"
                disabled={isLoading}
              >
                🔑 2. Pair Ledger Device
              </button>
              <button
                onClick={testDiscoverDevices}
                className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-md font-medium"
                disabled={isLoading}
              >
                🔍 3. Discover Devices
              </button>
            </div>
          </div>

          {devices.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Found Devices:</h3>
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => testConnectDevice(device.id)}
                  className="w-full py-2 px-4 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400 text-sm"
                  disabled={isLoading}
                >
                  3. Connect to {device.name}
                </button>
              ))}
            </div>
          )}

          {connectedDevice && (
            <>
              <button
                onClick={testOpenEthereumApp}
                className="w-full py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400"
                disabled={isLoading}
              >
                4. Open Ethereum App
              </button>

              <button
                onClick={() => testGetAddress(false)}
                className="w-full py-2 px-4 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-400"
                disabled={isLoading}
              >
                5. Get Address (No Verify)
              </button>

              <button
                onClick={() => testGetAddress(true)}
                className="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
                disabled={isLoading}
              >
                5. Get Address (Verify on Device)
              </button>

              <button
                onClick={testDisconnectDevice}
                className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400"
                disabled={isLoading}
              >
                6. Disconnect Device
              </button>
            </>
          )}

          <button
            onClick={clearLog}
            className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Log
          </button>
        </div>

        {/* Status Display */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Status</h2>

          {connectedDevice && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <h3 className="font-medium">Connected Device:</h3>
              <p className="text-sm">
                {connectedDevice.name} ({connectedDevice.model})
              </p>
              <p className="text-sm">Session: {connectedDevice.sessionId}</p>
            </div>
          )}

          {address && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-medium">Retrieved Address:</h3>
              <p className="text-xs break-all">{address.address}</p>
              <p className="text-xs">Path: {address.derivationPath}</p>
            </div>
          )}

          {isLoading && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm">⏳ Processing...</p>
            </div>
          )}
        </div>
      </div>

      {/* Log Output */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">📋 Test Log</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
          {log.length === 0 ? (
            <p className="text-gray-500">
              Click "Test WebHID Support" to start testing...
            </p>
          ) : (
            log.map((entry, index) => (
              <div key={index} className="mb-1">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
