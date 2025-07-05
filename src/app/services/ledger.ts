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

    console.log("🔧 Creating Ethereum signer for session:", sessionId);

    try {
      this.ethSigner = new SignerEthBuilder({
        dmk: this.dmk,
        sessionId,
        originToken: "live-agent-dev", // required by Ledger SDK
      }).build();

      this.currentSessionId = sessionId;
      console.log("✅ Ethereum signer initialized for session:", sessionId);
    } catch (error: any) {
      console.error("❌ Failed to initialize Ethereum signer:", error);
      throw new Error(
        `Failed to initialize Ethereum signer: ${error.message || error}`
      );
    }
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

    // Check if device is already connected
    const existingDevice = this.connectedDevices.get(deviceId);
    if (existingDevice && existingDevice.sessionId) {
      console.log(
        `✅ Device already connected, reusing session: ${existingDevice.sessionId}`
      );

      // Verify the session is still valid
      try {
        const connectedDevice = this.dmk.getConnectedDevice({
          sessionId: existingDevice.sessionId,
        });
        if (connectedDevice && connectedDevice.id === deviceId) {
          console.log(`✅ Reusing existing connection: ${existingDevice.name}`);
          return existingDevice;
        }
      } catch {
        console.log("🔄 Existing session invalid, will create new connection");
        this.connectedDevices.delete(deviceId);
      }
    }

    try {
      // Find the discovered device first
      console.log("📡 Getting available devices for connection...");

      const devices = await new Promise<DiscoveredDevice[]>(
        (resolve, reject) => {
          let subscription: any = null;
          let timeoutId: NodeJS.Timeout | null = null;
          let isResolved = false;

          const cleanup = () => {
            if (subscription) subscription.unsubscribe();
            if (timeoutId) clearTimeout(timeoutId);
            isResolved = true;
          };

          const observer = {
            next: (devices: DiscoveredDevice[]) => {
              if (!isResolved) {
                console.log(`📱 Found ${devices.length} available devices`);
                cleanup();
                resolve(devices);
              }
            },
            error: (error: any) => {
              if (!isResolved) {
                console.error("❌ Error getting devices:", error);
                cleanup();
                reject(error);
              }
            },
          };

          subscription = this.dmk!.listenToAvailableDevices({}).subscribe(
            observer
          );

          // Timeout for getting devices
          timeoutId = setTimeout(() => {
            if (!isResolved) {
              console.error("⏰ Timeout getting available devices");
              cleanup();
              reject(new Error("Timeout getting available devices"));
            }
          }, 10000);
        }
      );

      const discoveredDevice = devices.find((d) => d.id === deviceId);

      if (!discoveredDevice) {
        console.error(
          `❌ Device ${deviceId} not found in available devices:`,
          devices.map((d) => d.id)
        );
        throw new Error(`Device ${deviceId} not found in available devices`);
      }

      console.log(
        `📱 Found target device: ${discoveredDevice.deviceModel.name}`
      );

      // Connect using Device Management Kit
      console.log("🔗 Establishing connection...");
      const sessionId = await this.dmk.connect({ device: discoveredDevice });

      console.log(`✅ Session established: ${sessionId}`);

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
      console.log(
        `✅ Connected to device: ${device.name} (Session: ${sessionId})`
      );

      return device;
    } catch (error: any) {
      console.error("❌ Device connection failed:", error);

      // Handle "Device already opened" error by checking for existing connections
      if (error.message && error.message.includes("Device already opened")) {
        console.log(
          "🔍 Device already opened, checking for existing connections..."
        );

        // Try to find the existing connection in our local cache
        try {
          for (const [cachedDeviceId, cachedDevice] of this.connectedDevices) {
            if (cachedDeviceId === deviceId && cachedDevice.sessionId) {
              try {
                // Verify the session is still valid
                const connectedDevice = this.dmk.getConnectedDevice({
                  sessionId: cachedDevice.sessionId,
                });
                if (connectedDevice && connectedDevice.id === deviceId) {
                  console.log(
                    `✅ Found existing connection: ${cachedDevice.name}`
                  );
                  return cachedDevice;
                }
              } catch {
                console.log("🔄 Cached session invalid, removing from cache");
                this.connectedDevices.delete(cachedDeviceId);
              }
            }
          }
        } catch (findError) {
          console.error("❌ Failed to find existing connection:", findError);
        }
      }

      throw new Error(
        `Failed to connect to Ledger device: ${error.message || error}`
      );
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
      throw new Error(`Device not connected: ${deviceId}`);
    }

    console.log(`📱 Opening Ethereum app on device: ${device.name}`);
    console.log(`⏰ Timeout: ${timeoutMs}ms`);

    try {
      const deviceAction = new OpenAppDeviceAction({
        input: {
          appName: "Ethereum",
          unlockTimeout: timeoutMs,
          compatibleAppNames: [],
        },
      });

      console.log("🚀 Executing open app action...");

      await this.dmk.executeDeviceAction({
        sessionId: device.sessionId,
        deviceAction,
      });

      console.log("✅ Ethereum app opened successfully");

      // Initialize Ethereum signer after app is open
      console.log("🔧 Initializing Ethereum signer...");
      this.initializeEthereumSigner(device.sessionId);

      console.log("✅ Ethereum signer initialized");
    } catch (error: any) {
      console.error("❌ Failed to open Ethereum app:", error);
      throw new Error(
        `Failed to open Ethereum app on device: ${error.message || error}`
      );
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
      throw new Error(`Device not connected: ${deviceId}`);
    }

    console.log(`📍 Getting Ethereum address from device: ${device.name}`);
    console.log(`🛣️ Using derivation path: ${derivationPath}`);
    console.log(`🔍 Verification required: ${verify}`);

    // Ensure Ethereum signer is initialized for this session
    if (!this.ethSigner || this.currentSessionId !== device.sessionId) {
      console.log(
        "🔧 Initializing Ethereum signer for session:",
        device.sessionId
      );
      this.initializeEthereumSigner(device.sessionId);
    }

    if (!this.ethSigner) {
      throw new Error("Ethereum signer not initialized");
    }

    if (verify) {
      console.log(
        "⚠️ Address verification requested - please confirm on device"
      );
    }

    try {
      console.log("🚀 Calling ethSigner.getAddress()...");

      // Use the Ethereum signer to get the address
      const result = this.ethSigner.getAddress(derivationPath, {
        checkOnDevice: verify,
        returnChainCode: true,
        skipOpenApp: true, // App should already be open
      });

      console.log("📡 Observable created, waiting for results...");

      // Wait for the completed state by subscribing to the observable
      return new Promise((resolve, reject) => {
        let timeoutId: NodeJS.Timeout | null = null;
        let isResolved = false;

        const cleanup = () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          isResolved = true;
        };

        // Set timeout for address retrieval
        timeoutId = setTimeout(() => {
          if (!isResolved) {
            cleanup();
            console.error("⏰ Address retrieval timeout");
            reject(
              new Error(
                "Address retrieval timeout - please ensure device is responsive"
              )
            );
          }
        }, 60000); // 60 second timeout

        const subscription = result.observable.subscribe({
          next: (state) => {
            console.log("📊 Ledger getAddress state:", state.status, state);

            if (state.status === DeviceActionStatus.Completed && !isResolved) {
              cleanup();
              const output = state.output;
              console.log(
                "✅ Ledger getAddress completed with output:",
                output
              );

              subscription.unsubscribe();

              if (!output.address) {
                reject(new Error("No address returned from device"));
                return;
              }

              resolve({
                address: output.address,
                publicKey: output.publicKey || "",
                derivationPath,
                chainCode: output.chainCode || "",
              });
            } else if (
              state.status === DeviceActionStatus.Error &&
              !isResolved
            ) {
              cleanup();
              console.error("❌ Ledger getAddress error:", state.error);
              subscription.unsubscribe();
              reject(
                new Error(
                  `Device action failed: ${state.error || "Unknown error"}`
                )
              );
            }
            // For Pending states, we just log and continue waiting
          },
          error: (error) => {
            if (!isResolved) {
              cleanup();
              console.error("❌ Ledger getAddress observable error:", error);
              subscription.unsubscribe();
              reject(new Error(`Observable error: ${error.message || error}`));
            }
          },
          complete: () => {
            if (!isResolved) {
              cleanup();
              console.log(
                "🏁 Ledger getAddress observable completed without result"
              );
              subscription.unsubscribe();
              reject(
                new Error("Observable completed without returning address")
              );
            }
          },
        });
      });
    } catch (error: any) {
      console.error("❌ Failed to get Ethereum address:", error);
      throw new Error(
        `Failed to retrieve Ethereum address: ${error.message || error}`
      );
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
      if (this.dmk) {
        console.log(
          `🔌 Disconnecting device: ${device.name} (Session: ${device.sessionId})`
        );
        await this.dmk.disconnect({ sessionId: device.sessionId });
      }

      // Clean up local state
      this.connectedDevices.delete(deviceId);

      // Reset session if this was the current session
      if (this.currentSessionId === device.sessionId) {
        this.currentSessionId = null;
        this.ethSigner = null;
      }

      console.log(`✅ Disconnected from device: ${device.name}`);
    } catch (error) {
      console.error("❌ Failed to disconnect device:", error);
      // Clean up local state anyway
      this.connectedDevices.delete(deviceId);
      if (this.currentSessionId === device.sessionId) {
        this.currentSessionId = null;
        this.ethSigner = null;
      }
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

  /**
   * Get current service state for debugging
   */
  getServiceState(): any {
    return {
      isInitialized: this.isInitialized,
      hasDMK: !!this.dmk,
      hasEthSigner: !!this.ethSigner,
      currentSessionId: this.currentSessionId,
      connectedDevicesCount: this.connectedDevices.size,
      connectedDevices: Array.from(this.connectedDevices.values()).map((d) => ({
        id: d.id,
        name: d.name,
        hasSessionId: !!d.sessionId,
      })),
    };
  }
}

// Export singleton instance
export const ledgerService = new LedgerService();
export type { LedgerDevice, LedgerAddress };
