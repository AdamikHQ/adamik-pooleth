import { ledgerService } from "../../services/ledger";
import { privyService } from "../../services/privy";
import {
  discoverLedgerDevicesSchema,
  connectLedgerDeviceSchema,
  getLedgerEthereumAddressSchema,
  secureFundsToLedgerSchema,
  disconnectLedgerDeviceSchema,
  listConnectedLedgerDevicesSchema,
  type DiscoverLedgerDevicesInput,
  type ConnectLedgerDeviceInput,
  type GetLedgerEthereumAddressInput,
  type SecureFundsToLedgerInput,
  type DisconnectLedgerDeviceInput,
  type ListConnectedLedgerDevicesInput,
} from "./schemas";

export const ledgerSupervisorAgent = {
  name: "ledger_supervisor",
  instructions: `You are a Ledger Hardware Wallet Supervisor Agent. Your role is to help users securely manage their cryptocurrency funds by transferring them from their Privy hot wallet to their Ledger hardware wallet for cold storage.

**Core Capabilities:**
1. **Device Discovery**: Find and list available Ledger devices (Nano S Plus, Nano X, etc.)
2. **Device Connection**: Connect to specific Ledger devices via WebHID/WebBLE
3. **Address Retrieval**: Get Ethereum addresses from connected Ledger devices
4. **Fund Security**: Transfer funds from Privy hot wallet to Ledger cold storage

**Primary Use Case - Fund Security:**
When a user wants to "secure funds on Ledger" or "transfer to hardware wallet":
1. Discover available Ledger devices
2. Help user select and connect to their device
3. Retrieve the destination Ethereum address from the Ledger
4. Calculate transfer amount (default: all available funds minus gas)
5. Use Privy to sign and execute the transfer to the Ledger address

**Best Practices:**
- Always verify WebHID support before attempting device operations
- Guide users through device connection and app opening steps
- Explain the security benefits of hardware wallet storage
- Provide clear instructions for device interaction (button presses, confirmations)
- Use standard derivation paths unless user specifies otherwise
- Leave sufficient gas fees when transferring "all" funds

**Error Handling:**
- Gracefully handle device connection failures
- Provide helpful troubleshooting for common issues
- Explain when user interaction on device is required
- Offer alternative approaches if device operations fail

**Security Notes:**
- Always verify addresses when possible
- Explain that hardware wallets provide enhanced security
- Remind users to keep their recovery phrases safe
- Never store or transmit private keys or recovery phrases`,

  tools: [
    {
      name: "discoverLedgerDevices",
      description:
        "Discover available Ledger hardware wallet devices connected via USB or Bluetooth",
      parameters: discoverLedgerDevicesSchema,
      function: async (input: DiscoverLedgerDevicesInput) => {
        try {
          console.log("🔍 Starting Ledger device discovery...");

          // Check WebHID support
          if (!ledgerService.isWebHIDSupported()) {
            throw new Error(
              "WebHID not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser."
            );
          }

          const devices = await ledgerService.discoverDevices(input.timeout);

          return {
            success: true,
            devices,
            message: `Found ${devices.length} Ledger device(s). Use connectLedgerDevice to connect to a specific device.`,
          };
        } catch (error: any) {
          console.error("❌ Device discovery failed:", error);
          return {
            success: false,
            error: error.message,
            message:
              "Device discovery failed. Please ensure your Ledger device is connected and unlocked.",
          };
        }
      },
    },

    {
      name: "connectLedgerDevice",
      description: "Connect to a specific Ledger device using its device ID",
      parameters: connectLedgerDeviceSchema,
      function: async (input: ConnectLedgerDeviceInput) => {
        try {
          console.log(`🔗 Connecting to Ledger device: ${input.deviceId}`);

          const device = await ledgerService.connectDevice(input.deviceId);

          return {
            success: true,
            device,
            message: `Successfully connected to ${device.name}. Device is ready for operations.`,
          };
        } catch (error: any) {
          console.error("❌ Device connection failed:", error);
          return {
            success: false,
            error: error.message,
            message:
              "Device connection failed. Please ensure the device is unlocked and the Ethereum app is open.",
          };
        }
      },
    },

    {
      name: "getLedgerEthereumAddress",
      description:
        "Retrieve an Ethereum address from a connected Ledger device",
      parameters: getLedgerEthereumAddressSchema,
      function: async (input: GetLedgerEthereumAddressInput) => {
        try {
          console.log(
            `📍 Getting Ethereum address from device: ${input.deviceId}`
          );

          const addressInfo = await ledgerService.getEthereumAddress(
            input.deviceId,
            input.derivationPath,
            input.verify
          );

          return {
            success: true,
            addressInfo,
            message: input.verify
              ? `Address retrieved and verified on device: ${addressInfo.address}`
              : `Address retrieved: ${addressInfo.address}`,
          };
        } catch (error: any) {
          console.error("❌ Address retrieval failed:", error);
          return {
            success: false,
            error: error.message,
            message:
              "Address retrieval failed. Please ensure the device is connected and the Ethereum app is open.",
          };
        }
      },
    },

    {
      name: "secureFundsToLedger",
      description:
        "Transfer funds from Privy hot wallet to Ledger hardware wallet for secure cold storage",
      parameters: secureFundsToLedgerSchema,
      function: async (
        input: SecureFundsToLedgerInput,
        userContext?: { userId: string }
      ) => {
        try {
          console.log("🔒 Starting fund security operation...");

          if (!userContext?.userId) {
            throw new Error("User context required for fund transfer");
          }

          // Step 1: Get connected Ledger devices
          const connectedDevices = ledgerService.getConnectedDevices();
          if (connectedDevices.length === 0) {
            throw new Error(
              "No Ledger devices connected. Please connect a device first."
            );
          }

          // Use the first connected device
          const device = connectedDevices[0];

          // Step 2: Get destination address from Ledger
          console.log("📍 Getting destination address from Ledger...");
          const addressInfo = await ledgerService.getEthereumAddress(
            device.id!,
            input.derivationPath,
            false // Don't require verification for this step
          );

          const destinationAddress = addressInfo.address;

          // Step 3: Prepare transaction data
          let transferAmount = input.amount;

          if (!transferAmount) {
            // Get wallet balance to calculate max transfer amount
            console.log("💰 Calculating maximum transfer amount...");

            // This would use the Adamik service to get balance
            // For now, we'll use a placeholder
            transferAmount = "0.01"; // Placeholder - in real implementation, calculate available balance minus gas
          }

          // Step 4: Execute transfer using existing Privy transaction system
          console.log("✍️ Executing transfer via Privy...");

          // Use the existing transaction system that works with Privy
          const transactionRequest = {
            to: destinationAddress,
            value: transferAmount,
            network: input.network,
            tokenAddress: input.tokenAddress,
            description: `Securing funds to Ledger hardware wallet: ${destinationAddress}`,
          };

          // For now, return the transaction request that can be executed by the existing system
          return {
            success: true,
            operation: "fund_security",
            sourceAddress: input.sourceAddress,
            destinationAddress,
            amount: transferAmount,
            network: input.network,
            tokenAddress: input.tokenAddress,
            ledgerDevice: device.name,
            transactionRequest,
            message: `Funds security operation prepared. Transferring ${transferAmount} ${
              input.tokenAddress ? "tokens" : "ETH"
            } from Privy wallet to Ledger hardware wallet ${destinationAddress}`,
          };
        } catch (error: any) {
          console.error("❌ Fund security operation failed:", error);
          return {
            success: false,
            error: error.message,
            message:
              "Fund security operation failed. Please ensure your Ledger device is connected and try again.",
          };
        }
      },
    },

    {
      name: "disconnectLedgerDevice",
      description: "Disconnect from a specific Ledger device",
      parameters: disconnectLedgerDeviceSchema,
      function: async (input: DisconnectLedgerDeviceInput) => {
        try {
          await ledgerService.disconnectDevice(input.deviceId);

          return {
            success: true,
            message: `Successfully disconnected from device: ${input.deviceId}`,
          };
        } catch (error: any) {
          console.error("❌ Device disconnection failed:", error);
          return {
            success: false,
            error: error.message,
            message: "Device disconnection failed.",
          };
        }
      },
    },

    {
      name: "listConnectedLedgerDevices",
      description: "List all currently connected Ledger devices",
      parameters: listConnectedLedgerDevicesSchema,
      function: async (input: ListConnectedLedgerDevicesInput) => {
        try {
          const devices = ledgerService.getConnectedDevices();

          return {
            success: true,
            devices,
            count: devices.length,
            message:
              devices.length > 0
                ? `${devices.length} device(s) currently connected`
                : "No devices currently connected",
          };
        } catch (error: any) {
          console.error("❌ Failed to list connected devices:", error);
          return {
            success: false,
            error: error.message,
            message: "Failed to list connected devices.",
          };
        }
      },
    },
  ],
};
