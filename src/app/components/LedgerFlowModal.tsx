"use client";

import { useState, useEffect } from "react";
import { ledgerService } from "../services/ledger";

interface LedgerStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "error";
  icon: string;
}

interface LedgerFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (result: LedgerConnectionResult) => void;
  onError?: (error: string) => void;
  onRetry?: () => void;
}

interface LedgerConnectionResult {
  success: boolean;
  address?: string;
  publicKey?: string;
  derivationPath?: string;
  chainCode?: string;
  deviceId?: string;
  deviceName?: string;
  error?: string;
}

interface DeviceState {
  hasWebHID: boolean;
  hasConnectedDevices: boolean;
  connectedDevice?: any;
  isEthereumAppOpen: boolean;
  canGetAddress: boolean;
  error?: string;
}

const defaultSteps: LedgerStep[] = [
  {
    id: "discover",
    title: "Discovering Device",
    description: "Searching for connected Ledger devices...",
    status: "pending",
    icon: "🔍",
  },
  {
    id: "connect",
    title: "Connecting to Device",
    description: "Establishing secure connection with your Ledger",
    status: "pending",
    icon: "🔗",
  },
  {
    id: "open-app",
    title: "Opening Ethereum App",
    description: "Navigate to and open the Ethereum app on your device",
    status: "pending",
    icon: "📱",
  },
  {
    id: "get-address",
    title: "Retrieving Address",
    description: "Getting your secure Ethereum address",
    status: "pending",
    icon: "📍",
  },
];

export function LedgerFlowModal({
  isOpen,
  onClose,
  onComplete,
  onError,
  onRetry,
}: LedgerFlowModalProps) {
  const [steps, setSteps] = useState<LedgerStep[]>(defaultSteps);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<LedgerConnectionResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    step: string;
    message: string;
    suggestions: string[];
  } | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && !isProcessing) {
      // Reset modal state
      setSteps(defaultSteps.map((step) => ({ ...step, status: "pending" })));
      setCurrentStep("");
      setResult(null);
      setErrorDetails(null);
      setDeviceState(null);

      // Start the flow automatically when modal opens
      startLedgerFlow();
    }
  }, [isOpen]);

  const updateStepStatus = (stepId: string, status: LedgerStep["status"]) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
    if (status === "in-progress") {
      setCurrentStep(stepId);
    }
  };

  // Comprehensive device state detection
  const detectDeviceState = async (): Promise<DeviceState> => {
    console.log("🔍 Detecting current device state...");

    const state: DeviceState = {
      hasWebHID: false,
      hasConnectedDevices: false,
      isEthereumAppOpen: false,
      canGetAddress: false,
    };

    try {
      // Check WebHID support
      state.hasWebHID = ledgerService.isWebHIDSupported();
      if (!state.hasWebHID) {
        state.error = "WebHID not supported in this browser";
        return state;
      }

      // Simple device availability check (no connection attempts)
      console.log("🔍 Checking for device availability...");

      // First check for any cached connections
      const connectedDevices = ledgerService.getConnectedDevices();
      if (connectedDevices.length > 0) {
        console.log(
          "✅ Found cached connected device:",
          connectedDevices[0].name
        );

        // For now, assume cached connections might be stale
        // Let the normal flow handle verification
        state.hasConnectedDevices = false; // Force fresh connection flow
        state.isEthereumAppOpen = false;
        state.canGetAddress = false;
      } else {
        // Do a quick discovery to see if any devices are available
        try {
          const discoveredDevices = await ledgerService.discoverDevices(3000); // Quick 3-second check
          if (discoveredDevices.length > 0) {
            console.log(
              `📱 Found ${discoveredDevices.length} available device(s) for connection`
            );
          } else {
            console.log("📡 No devices found in discovery");
          }
        } catch (discoveryError: any) {
          console.log(
            "📡 Device discovery check failed:",
            discoveryError.message
          );
        }

        // Always start with fresh flow
        state.hasConnectedDevices = false;
        state.isEthereumAppOpen = false;
        state.canGetAddress = false;
      }

      return state;
    } catch (error: any) {
      console.error("❌ Device state detection failed:", error);
      state.error = error.message;
      return state;
    }
  };

  const completeSuccessfully = (addressInfo: any, device: any) => {
    updateStepStatus("get-address", "completed");

    const connectionResult: LedgerConnectionResult = {
      success: true,
      address: addressInfo.address,
      publicKey: addressInfo.publicKey,
      derivationPath: addressInfo.derivationPath,
      chainCode: addressInfo.chainCode,
      deviceId: device.id,
      deviceName: device.name,
    };

    console.log(
      "🎉 Ledger connection successful! Address:",
      addressInfo.address
    );
    console.log("📤 Sending result to voice agent:", connectionResult);
    setResult(connectionResult);

    // Send result to the hook's promise (from useLedgerFlow)
    if ((window as any).__ledgerFlowHandlers?.onComplete) {
      (window as any).__ledgerFlowHandlers.onComplete(connectionResult);
      console.log("✅ Result successfully sent to voice agent via hook");
    } else {
      console.warn(
        "⚠️ No ledger flow handlers found - result may not reach voice agent"
      );
    }

    // Also send to the callback prop (if provided)
    onComplete?.(connectionResult);

    // Auto-close after 2 seconds
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const getErrorDetails = (error: any, step: string) => {
    const errorMessage = error?.message || error?.toString() || "Unknown error";

    switch (step) {
      case "discover":
        return {
          step: "Device Discovery",
          message: "No Ledger devices found",
          suggestions: [
            "Connect your Ledger via USB cable",
            "Unlock your device with PIN",
            "Try a different USB port or cable",
            "Restart your browser if using USB-C",
          ],
        };

      case "connect":
        return {
          step: "Device Connection",
          message: "Cannot establish connection",
          suggestions: [
            "Make sure device is unlocked",
            "Close other apps using the Ledger",
            "Reconnect the USB cable",
            "Try restarting Ledger Live if open",
          ],
        };

      case "open-app":
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("0x6e00")
        ) {
          return {
            step: "App Opening",
            message: "Ethereum app not found or timeout",
            suggestions: [
              "Install Ethereum app via Ledger Live",
              "Navigate to Ethereum app on device",
              "Press both buttons to open the app",
              "Make sure device firmware is updated",
            ],
          };
        }
        return {
          step: "App Opening",
          message: "Failed to open Ethereum app",
          suggestions: [
            "Manually open Ethereum app on device",
            "Make sure app is installed via Ledger Live",
            "Check device is not in screensaver mode",
            "Try disconnecting and reconnecting",
          ],
        };

      case "get-address":
        if (
          errorMessage.includes("denied") ||
          errorMessage.includes("rejected")
        ) {
          return {
            step: "Address Verification",
            message: "Address verification was rejected",
            suggestions: [
              "Press the right button to approve on device",
              "Make sure you're confirming the address",
              "Don't press the left button (reject)",
              "Wait for address to fully display before confirming",
            ],
          };
        }
        if (errorMessage.includes("timeout")) {
          return {
            step: "Address Verification",
            message: "Verification timed out",
            suggestions: [
              "Ethereum app might not be open - check device screen",
              "Navigate to Ethereum app and press both buttons",
              "Make sure device isn't in screensaver mode",
              "If app is open, approve the address verification",
            ],
          };
        }
        return {
          step: "Address Verification",
          message: "Cannot retrieve address",
          suggestions: [
            "Make sure Ethereum app is open and active",
            "Check device screen for prompts",
            "Approve address verification when prompted",
            "Restart if device seems frozen",
          ],
        };

      default:
        return {
          step: "Connection",
          message: errorMessage,
          suggestions: [
            "Check USB connection",
            "Make sure device is unlocked",
            "Try restarting the process",
            "Use Chrome or Edge browser",
          ],
        };
    }
  };

  const retryStep = async (stepId: string) => {
    console.log(`🔄 Retrying step: ${stepId}`);
    setErrorDetails(null);

    try {
      if (stepId === "discover") {
        // Check if devices are already connected first
        const connectedDevices = ledgerService.getConnectedDevices();
        if (connectedDevices.length > 0) {
          console.log("✅ Device already connected, skipping discovery");
          updateStepStatus("discover", "completed");
          updateStepStatus("connect", "completed");
          // Continue with app opening
          await retryStep("open-app");
          return;
        }

        updateStepStatus("discover", "in-progress");

        // Reactive discovery with multiple attempts
        let devices: any[] = [];
        let discoveryAttempts = 0;
        const maxDiscoveryAttempts = 3;

        while (
          devices.length === 0 &&
          discoveryAttempts < maxDiscoveryAttempts
        ) {
          discoveryAttempts++;
          console.log(
            `🔍 Retry discovery attempt ${discoveryAttempts}/${maxDiscoveryAttempts}`
          );

          try {
            devices = await ledgerService.discoverDevices(10000);
            if (devices.length > 0) {
              console.log(
                `✅ Found ${devices.length} device(s) on retry attempt ${discoveryAttempts}`
              );
              break;
            }
          } catch (discoveryError) {
            console.log(
              `📡 Retry discovery attempt ${discoveryAttempts} failed:`,
              discoveryError
            );
          }

          // If not the last attempt, wait a bit before retrying
          if (discoveryAttempts < maxDiscoveryAttempts) {
            console.log("⏳ Waiting 2 seconds before next retry attempt...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        if (devices.length === 0) {
          throw new Error("No devices found after multiple retry attempts");
        }
        updateStepStatus("discover", "completed");
        // Continue with connect step
        await retryStep("connect");
      } else if (stepId === "connect") {
        // Check if devices are already connected first
        const connectedDevices = ledgerService.getConnectedDevices();
        if (connectedDevices.length > 0) {
          console.log("✅ Device already connected, skipping connection");
          updateStepStatus("connect", "completed");
          // Continue with app opening
          await retryStep("open-app");
          return;
        }

        // Get devices first
        const devices = await ledgerService.discoverDevices(10000);
        if (devices.length === 0) {
          throw new Error("No devices found for connection");
        }

        updateStepStatus("connect", "in-progress");
        await ledgerService.connectDevice(devices[0].id);
        updateStepStatus("connect", "completed");
        // Continue with app opening
        await retryStep("open-app");
      } else if (stepId === "open-app") {
        const connectedDevices = ledgerService.getConnectedDevices();
        if (connectedDevices.length === 0) {
          throw new Error("No connected devices");
        }

        updateStepStatus("open-app", "in-progress");
        await ledgerService.openEthereumApp(connectedDevices[0].id!, 45000); // Longer timeout
        updateStepStatus("open-app", "completed");
        // Continue with address retrieval
        await retryStep("get-address");
      } else if (stepId === "get-address") {
        const connectedDevices = ledgerService.getConnectedDevices();
        if (connectedDevices.length === 0) {
          throw new Error("No connected devices");
        }

        updateStepStatus("get-address", "in-progress");
        const addressInfo = await ledgerService.getEthereumAddress(
          connectedDevices[0].id!,
          "44'/60'/0'/0/0",
          true // Verify on device
        );

        completeSuccessfully(addressInfo, connectedDevices[0]);
      }
    } catch (error: any) {
      console.error(`❌ Step ${stepId} failed:`, error);
      updateStepStatus(stepId, "error");
      setErrorDetails(getErrorDetails(error, stepId));

      // Send error to the hook's promise (from useLedgerFlow)
      if ((window as any).__ledgerFlowHandlers?.onError) {
        (window as any).__ledgerFlowHandlers.onError(error.message);
      }

      // Also send to the callback prop (if provided)
      onError?.(error.message);
    }
  };

  const startLedgerFlow = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // STEP 0: Simple device state check
      console.log("🔍 === CHECKING DEVICE AVAILABILITY ===");
      const detectedState = await detectDeviceState();
      setDeviceState(detectedState);

      if (detectedState.error) {
        throw new Error(detectedState.error);
      }

      // Always run the standard flow for reliability
      console.log("🚀 === STARTING STANDARD CONNECTION FLOW ===");

      // Step 1: Discover devices
      updateStepStatus("discover", "in-progress");

      let devices: any[] = [];
      let discoveryAttempts = 0;
      const maxDiscoveryAttempts = 4; // Try for about 60 seconds total

      while (devices.length === 0 && discoveryAttempts < maxDiscoveryAttempts) {
        discoveryAttempts++;
        console.log(
          `🔍 Discovery attempt ${discoveryAttempts}/${maxDiscoveryAttempts}`
        );

        try {
          devices = await ledgerService.discoverDevices(15000);
          if (devices.length > 0) {
            console.log(
              `✅ Found ${devices.length} device(s) on attempt ${discoveryAttempts}`
            );
            break;
          }
        } catch (discoveryError) {
          console.log(
            `📡 Discovery attempt ${discoveryAttempts} failed:`,
            discoveryError
          );
        }

        // If not the last attempt, wait a bit before retrying
        if (discoveryAttempts < maxDiscoveryAttempts) {
          console.log("⏳ Waiting 3 seconds before next discovery attempt...");
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      if (devices.length === 0) {
        throw new Error(
          "No Ledger devices found after multiple attempts. Please ensure your device is connected and unlocked."
        );
      }

      updateStepStatus("discover", "completed");

      // Step 2: Connect to device
      updateStepStatus("connect", "in-progress");

      const device = await ledgerService.connectDevice(devices[0].id);
      updateStepStatus("connect", "completed");

      // Step 3: Open Ethereum app
      updateStepStatus("open-app", "in-progress");

      try {
        await ledgerService.openEthereumApp(device.id!, 45000);
      } catch (appError: any) {
        updateStepStatus("open-app", "error");
        setErrorDetails(getErrorDetails(appError, "open-app"));

        // Send error to the hook's promise (from useLedgerFlow)
        if ((window as any).__ledgerFlowHandlers?.onError) {
          (window as any).__ledgerFlowHandlers.onError(appError.message);
        }

        // Also send to the callback prop (if provided)
        onError?.(appError.message);
        return;
      }

      updateStepStatus("open-app", "completed");

      // Step 4: Get address
      updateStepStatus("get-address", "in-progress");

      try {
        const addressInfo = await ledgerService.getEthereumAddress(
          device.id!,
          "44'/60'/0'/0/0",
          true // Verify on device
        );

        completeSuccessfully(addressInfo, device);
        return;
      } catch (addressError: any) {
        updateStepStatus("get-address", "error");
        setErrorDetails(getErrorDetails(addressError, "get-address"));

        // Send error to the hook's promise (from useLedgerFlow)
        if ((window as any).__ledgerFlowHandlers?.onError) {
          (window as any).__ledgerFlowHandlers.onError(addressError.message);
        }

        // Also send to the callback prop (if provided)
        onError?.(addressError.message);
        return;
      }
    } catch (error: any) {
      console.error("❌ Ledger flow failed:", error);

      // Mark current step as error
      if (currentStep) {
        updateStepStatus(currentStep, "error");
        setErrorDetails(getErrorDetails(error, currentStep));
      }

      const errorResult: LedgerConnectionResult = {
        success: false,
        error: error.message,
      };

      setResult(errorResult);

      // Send error to the hook's promise (from useLedgerFlow)
      if ((window as any).__ledgerFlowHandlers?.onError) {
        (window as any).__ledgerFlowHandlers.onError(error.message);
      }

      // Also send to the callback prop (if provided)
      onError?.(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFullRetry = () => {
    setSteps(defaultSteps.map((step) => ({ ...step, status: "pending" })));
    setCurrentStep("");
    setResult(null);
    setErrorDetails(null);
    setDeviceState(null);
    startLedgerFlow();
    onRetry?.();
  };

  const getStatusIcon = (status: LedgerStep["status"]) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in-progress":
        return "⏳";
      case "error":
        return "❌";
      default:
        return "⚪";
    }
  };

  const getStatusColor = (status: LedgerStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-700 bg-green-50 border-green-200";
      case "in-progress":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  const hasError = steps.some((step) => step.status === "error");
  const isCompleted = steps.every((step) => step.status === "completed");
  const currentStepIndex = steps.findIndex(
    (step) => step.status === "in-progress"
  );
  const errorStep = steps.find((step) => step.status === "error");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center p-1.5 border border-gray-200">
                <img
                  src="/ledger.svg"
                  alt="Ledger"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Ledger Connection
                </h2>
                <p className="text-xs text-gray-500">
                  {deviceState
                    ? "Connecting to hardware wallet"
                    : "Checking device availability..."}
                </p>
              </div>
            </div>
            {/* Always show close button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Close modal"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${
                  (steps.filter((s) => s.status === "completed").length /
                    steps.length) *
                  100
                }%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span>
              Step{" "}
              {currentStepIndex >= 0
                ? currentStepIndex + 1
                : steps.filter((s) => s.status === "completed").length}{" "}
              of {steps.length}
            </span>
            <span className="font-medium">
              {isCompleted ? "Complete" : hasError ? "Error" : "In Progress"}
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 pb-3 space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border transition-all duration-200 ${getStatusColor(
                step.status
              )}`}
            >
              <div className="flex items-center space-x-2.5">
                <div className="flex-shrink-0">
                  {step.status === "in-progress" ? (
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  ) : (
                    <span className="text-sm">
                      {getStatusIcon(step.status)} {step.icon}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium">{step.title}</h3>
                  <p className="text-xs opacity-75 mt-0.5">
                    {step.description}
                  </p>

                  {/* Enhanced guidance for discovery step */}
                  {step.status === "in-progress" && step.id === "discover" && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium">
                        🔍 Actively searching for devices...
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Connect your Ledger via USB and unlock with PIN
                      </p>
                    </div>
                  )}

                  {/* Enhanced guidance for open-app step */}
                  {step.status === "in-progress" && step.id === "open-app" && (
                    <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                      <p className="text-xs text-amber-700 font-medium">
                        📱 ACTION REQUIRED:
                      </p>
                      <ol className="text-xs text-amber-700 mt-1 ml-2 space-y-0.5">
                        <li>1. Look at your Ledger device screen</li>
                        <li>2. Navigate to &quot;Ethereum&quot; app</li>
                        <li>3. Press both buttons to open it</li>
                      </ol>
                    </div>
                  )}

                  {/* Enhanced guidance for address verification */}
                  {step.status === "in-progress" &&
                    step.id === "get-address" && (
                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium">
                          🔍 Verify address on device:
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Press RIGHT button to approve when address appears
                        </p>
                      </div>
                    )}

                  {/* Error-specific retry button */}
                  {step.status === "error" && (
                    <div className="mt-2">
                      <button
                        onClick={() => retryStep(step.id)}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded border border-red-300 transition-colors"
                      >
                        🔄 Retry this step
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          {errorDetails && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-800 font-medium">
                  ❌ {errorDetails.step}: {errorDetails.message}
                </p>
                <div className="mt-2">
                  <p className="text-xs text-red-700 font-medium mb-1">
                    Try this:
                  </p>
                  <ul className="text-xs text-red-700 space-y-0.5 ml-2">
                    {errorDetails.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex space-x-2">
                {errorStep && (
                  <button
                    onClick={() => retryStep(errorStep.id)}
                    className="flex-1 py-2 px-3 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔄 Retry Step
                  </button>
                )}
                <button
                  onClick={handleFullRetry}
                  className="flex-1 py-2 px-3 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  ↻ Start Over
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-800 font-medium">
                  ✅ Successfully connected to your Ledger!
                </p>
                <p className="text-xs text-green-700 mt-1 font-mono truncate">
                  {result?.address}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Address sent to voice agent for session use
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 px-3 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {!hasError && !isCompleted && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                🔐 Keep your Ledger connected and follow device prompts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook for managing Ledger flow state
export function useLedgerFlow() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<LedgerConnectionResult | null>(null);
  const [isWaitingForResult, setIsWaitingForResult] = useState(false);

  const startFlow = (): Promise<LedgerConnectionResult> => {
    console.log("🎬 useLedgerFlow.startFlow() called");
    return new Promise((resolve, reject) => {
      console.log("🎭 Setting up modal promise handlers");
      setIsModalOpen(true);
      setResult(null);
      setIsWaitingForResult(true);

      // Set up temporary event handlers
      const handleComplete = (result: LedgerConnectionResult) => {
        console.log("🎯 useLedgerFlow.handleComplete called with:", result);
        setResult(result);
        setIsWaitingForResult(false);
        console.log("✅ Resolving startFlow promise with result:", result);
        resolve(result);
      };

      const handleError = (error: string) => {
        console.log("❌ useLedgerFlow.handleError called with:", error);
        const errorResult: LedgerConnectionResult = {
          success: false,
          error,
        };
        setResult(errorResult);
        setIsWaitingForResult(false);
        console.log("❌ Rejecting startFlow promise with error:", error);
        reject(new Error(error));
      };

      // Store handlers for cleanup
      (window as any).__ledgerFlowHandlers = {
        onComplete: handleComplete,
        onError: handleError,
      };
      console.log("🔗 Stored __ledgerFlowHandlers on window object");
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsWaitingForResult(false);
    // Clean up handlers
    delete (window as any).__ledgerFlowHandlers;
  };

  const handleComplete = (result: LedgerConnectionResult) => {
    setResult(result);
    if ((window as any).__ledgerFlowHandlers?.onComplete) {
      (window as any).__ledgerFlowHandlers.onComplete(result);
    }
  };

  const handleError = (error: string) => {
    if ((window as any).__ledgerFlowHandlers?.onError) {
      (window as any).__ledgerFlowHandlers.onError(error);
    }
  };

  return {
    isModalOpen,
    result,
    isWaitingForResult,
    startFlow,
    closeModal,
    handleComplete,
    handleError,
  };
}
