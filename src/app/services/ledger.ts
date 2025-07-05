import {
  DeviceManagementKit,
  DeviceManagementKitBuilder,
  type DeviceSessionId,
  type DeviceModelId,
  type DiscoveredDevice,
  OpenAppDeviceAction,
  type ConnectionType,
  ConsoleLogger,
  DeviceActionStatus,
} from "@ledgerhq/device-management-kit";
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid";
import { webBleTransportFactory } from "@ledgerhq/device-transport-kit-web-ble";
import {
  type SignerEth,
  SignerEthBuilder,
} from "@ledgerhq/device-signer-kit-ethereum";

interface LedgerDevice {
  id: string;
  name: string;
  model: string;
  sessionId?: string;
  modelId?: DeviceModelId;
  connectionType?: ConnectionType;
}

interface LedgerAddress {
  address: string;
  publicKey: string;
  derivationPath: string;
  chainCode?: string;
}

class LedgerService {
  private dmk: DeviceManagementKit | null = null;
  private ethSigner: SignerEth | null = null;
  private isInitialized = false;
  private connectedDevices: Map<string, LedgerDevice> = new Map();
  private currentSessionId: DeviceSessionId | null = null;

  constructor() {
    this.initializeSDK();
  }

  private async initializeSDK(): Promise<void> {
    try {
      console.log("🔧 Initializing Ledger Device Management Kit...");

      // Create Device Management Kit instance
      this.dmk = new DeviceManagementKitBuilder()
        .addTransport(webHidTransportFactory)
        .addTransport(webBleTransportFactory)
        .addLogger(new ConsoleLogger())
        .build();

      this.isInitialized = true;
      console.log("✅ Ledger SDK initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Ledger SDK:", error);
      throw new Error("Failed to initialize Ledger SDK");
    }
  }

  private initializeEthereumSigner(sessionId: DeviceSessionId): void {
    if (!this.dmk) {
      throw new Error("Device Management Kit not initialized");
    }

    this.ethSigner = new SignerEthBuilder({
      dmk: this.dmk,
      sessionId,
      originToken: "live-agent-dev", // required by Ledger SDK
    }).build();

    this.currentSessionId = sessionId;
    console.log("✅ Ethereum signer initialized for session:", sessionId);
  }

  /**
   * Discover available Ledger devices using DMK only
   */
  async discoverDevices(timeoutMs: number = 10000): Promise<LedgerDevice[]> {
    if (!this.isInitialized || !this.dmk) {
      throw new Error("Ledger SDK not initialized");
    }
    console.log("🔍 Discovering Ledger devices...");

    this.dmk.startDiscovering({});

    return new Promise((resolve, reject) => {
      let resolved = false;
      let subscription: any = null;

      const finish = (devices: LedgerDevice[] | null, error?: any) => {
        if (!resolved) {
          resolved = true;
          if (subscription) subscription.unsubscribe();
          if (devices) {
            resolve(devices);
          } else {
            reject(error || new Error("Device discovery failed"));
          }
        }
      };

      const observer = {
        next: (discoveredDevices: DiscoveredDevice[]) => {
          console.log(
            "[DMK] listenToAvailableDevices next:",
            discoveredDevices
          );
          const mapped: LedgerDevice[] = discoveredDevices.map((device) => ({
            id: device.id,
            name: device.deviceModel.name,
            model: device.deviceModel.model,
            modelId: device.deviceModel.model,
            connectionType: device.transport as ConnectionType,
          }));
          if (mapped.length > 0) {
            finish(mapped);
          }
        },
        error: (error: any) => {
          console.error("[DMK] listenToAvailableDevices error:", error);
          finish(null, error);
        },
      };

      subscription = this.dmk!.listenToAvailableDevices({}).subscribe(observer);

      setTimeout(() => {
        console.warn("[DMK] Device discovery timeout");
        finish([]);
      }, timeoutMs);
    });
  }

  /**
   * Connect to a specific Ledger device
   */
  async connectDevice(deviceId: string): Promise<LedgerDevice> {
    if (!this.isInitialized || !this.dmk) {
      throw new Error("Ledger SDK not initialized");
    }

    console.log(`🔗 Connecting to device: ${deviceId}`);

    try {
      // Find the discovered device first
      let discoveredDevice: DiscoveredDevice | null = null;

      const devices = await new Promise<DiscoveredDevice[]>(
        (resolve, reject) => {
          let subscription: any = null;
          const observer = {
            next: (devices: DiscoveredDevice[]) => {
              if (subscription) subscription.unsubscribe();
              resolve(devices);
            },
            error: (error: any) => {
              if (subscription) subscription.unsubscribe();
              reject(error);
            },
          };
          subscription = this.dmk!.listenToAvailableDevices({}).subscribe(
            observer
          );
        }
      );

      discoveredDevice = devices.find((d) => d.id === deviceId) || null;

      if (!discoveredDevice) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Connect using Device Management Kit
      const sessionId = await this.dmk.connect({ device: discoveredDevice });
      const connectedDevice = this.dmk.getConnectedDevice({ sessionId });

      const device: LedgerDevice = {
        id: connectedDevice.id,
        name: connectedDevice.name,
        model: connectedDevice.modelId,
        sessionId: sessionId,
        modelId: connectedDevice.modelId,
        connectionType: "USB",
      };

      this.connectedDevices.set(deviceId, device);
      console.log(`✅ Connected to device: ${device.name}`);

      return device;
    } catch (error) {
      console.error("❌ Device connection failed:", error);
      throw new Error("Failed to connect to Ledger device");
    }
  }

  /**
   * Open Ethereum app on connected device
   */
  async openEthereumApp(
    deviceId: string,
    timeoutMs: number = 30000
  ): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device || !device.sessionId || !this.dmk) {
      throw new Error("Device not connected");
    }

    console.log(`📱 Opening Ethereum app on device: ${device.name}`);

    try {
      const deviceAction = new OpenAppDeviceAction({
        input: {
          appName: "Ethereum",
          unlockTimeout: timeoutMs,
          compatibleAppNames: [],
        },
      });

      await this.dmk.executeDeviceAction({
        sessionId: device.sessionId,
        deviceAction,
      });

      // Initialize Ethereum signer after app is open
      this.initializeEthereumSigner(device.sessionId);

      console.log("✅ Ethereum app opened successfully");
    } catch (error) {
      console.error("❌ Failed to open Ethereum app:", error);
      throw new Error("Failed to open Ethereum app on device");
    }
  }

  /**
   * Get Ethereum address from connected Ledger device
   */
  async getEthereumAddress(
    deviceId: string,
    derivationPath: string = "44'/60'/0'/0/0",
    verify: boolean = false
  ): Promise<LedgerAddress> {
    const device = this.connectedDevices.get(deviceId);
    if (!device || !device.sessionId) {
      throw new Error("Device not connected");
    }

    // Ensure Ethereum signer is initialized for this session
    if (!this.ethSigner || this.currentSessionId !== device.sessionId) {
      this.initializeEthereumSigner(device.sessionId);
    }

    if (!this.ethSigner) {
      throw new Error("Ethereum signer not initialized");
    }

    console.log(`📍 Getting Ethereum address from device: ${device.name}`);
    console.log(`🛣️ Using derivation path: ${derivationPath}`);

    if (verify) {
      console.log(
        "⚠️ Address verification requested - please confirm on device"
      );
    }

    try {
      // Use the Ethereum signer to get the address
      const result = this.ethSigner.getAddress(derivationPath, {
        checkOnDevice: verify,
        returnChainCode: true,
        skipOpenApp: true, // App should already be open
      });

      // Wait for the completed state by subscribing to the observable
      return new Promise((resolve, reject) => {
        const subscription = result.observable.subscribe({
          next: (state) => {
            console.log("Ledger getAddress state:", state);

            if (state.status === DeviceActionStatus.Completed) {
              const output = state.output;
              console.log("Ledger getAddress completed with output:", output);

              subscription.unsubscribe();
              resolve({
                address: output.address || "",
                publicKey: output.publicKey || "",
                derivationPath,
                chainCode: output.chainCode || "",
              });
            } else if (state.status === DeviceActionStatus.Error) {
              console.error("Ledger getAddress error:", state.error);
              subscription.unsubscribe();
              reject(new Error(`Device action failed: ${state.error}`));
            }
            // For Pending states, we just log and continue waiting
          },
          error: (error) => {
            console.error("Ledger getAddress observable error:", error);
            subscription.unsubscribe();
            reject(error);
          },
          complete: () => {
            console.log("Ledger getAddress observable completed");
            subscription.unsubscribe();
          },
        });
      });
    } catch (error) {
      console.error("❌ Failed to get Ethereum address:", error);
      throw new Error("Failed to retrieve Ethereum address from Ledger device");
    }
  }

  /**
   * Disconnect from a device
   */
  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.connectedDevices.get(deviceId);
    if (!device || !device.sessionId) {
      console.log("⚠️ Device not connected or already disconnected");
      return;
    }

    try {
      this.connectedDevices.delete(deviceId);
      console.log(`✅ Disconnected from device: ${device.name}`);
    } catch (error) {
      console.error("❌ Failed to disconnect device:", error);
    }
  }

  /**
   * Get list of connected devices
   */
  getConnectedDevices(): LedgerDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  /**
   * Reset all device connections and state
   */
  resetDeviceState(): void {
    console.log("🔄 Resetting device state...");
    this.connectedDevices.clear();
    this.currentSessionId = null;
    this.ethSigner = null;
    console.log("✅ Device state reset complete");
  }

  /**
   * Cleanup - disconnect all devices
   */
  async cleanup(): Promise<void> {
    console.log("🧹 Cleaning up Ledger service...");

    const disconnectPromises = Array.from(this.connectedDevices.keys()).map(
      (deviceId) => this.disconnectDevice(deviceId)
    );

    await Promise.all(disconnectPromises);

    console.log("✅ Ledger service cleanup complete");
  }

  /**
   * Check if the browser supports Ledger hardware wallets
   */
  isWebHIDSupported(): boolean {
    return typeof navigator !== "undefined" && "hid" in navigator;
  }
}

// Export singleton instance
export const ledgerService = new LedgerService();
export type { LedgerDevice, LedgerAddress };
