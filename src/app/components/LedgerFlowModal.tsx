"use client";

import { useState, useEffect, useRef } from "react";
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
}

interface LedgerConnectionResult {
  success: boolean;
  address?: string;
  publicKey?: string;
  derivationPath?: string;
  deviceId?: string;
  deviceName?: string;
  error?: string;
}

const INITIAL_STEPS: LedgerStep[] = [
  {
    id: "discover",
    title: "Finding Device",
    description: "Searching for your Ledger device...",
    status: "pending",
    icon: "🔍",
  },
  {
    id: "connect",
    title: "Connecting",
    description: "Establishing connection...",
    status: "pending",
    icon: "🔗",
  },
  {
    id: "open-app",
    title: "Open Ethereum App",
    description: "Open the Ethereum app on your device",
    status: "pending",
    icon: "📱",
  },
  {
    id: "get-address",
    title: "Get Address",
    description: "Confirm address on your device",
    status: "pending",
    icon: "📍",
  },
];

export function LedgerFlowModal({
  isOpen,
  onClose,
  onComplete,
  onError,
}: LedgerFlowModalProps) {
  const [steps, setSteps] = useState<LedgerStep[]>(INITIAL_STEPS);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [result, setResult] = useState<LedgerConnectionResult | null>(null);
  const [showRetryOptions, setShowRetryOptions] = useState(false);

  // Use ref to track if flow is active to prevent race conditions
  const flowActiveRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Complete reset function
  const resetModalState = () => {
    console.log("🔄 Resetting modal state completely");

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset all state
    setSteps(INITIAL_STEPS.map((step) => ({ ...step, status: "pending" })));
    setCurrentStep("");
    setIsProcessing(false);
    setErrorMessage("");
    setResult(null);
    setShowRetryOptions(false);
    flowActiveRef.current = false;

    // Clean up global handlers
    if ((window as any).__ledgerConnectionPromise) {
      delete (window as any).__ledgerConnectionPromise;
    }
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen && !flowActiveRef.current) {
      resetModalState();
      // Start flow after a short delay to ensure clean state
      setTimeout(() => {
        if (isOpen) {
          startFlow();
        }
      }, 100);
    } else if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetModalState();
    };
  }, []);

  const updateStep = (stepId: string, status: LedgerStep["status"]) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id === stepId) {
          return { ...step, status };
        }
        // If this step is failing, reset all subsequent steps to pending
        if (status === "error") {
          const stepIndex = INITIAL_STEPS.findIndex((s) => s.id === stepId);
          const currentStepIndex = INITIAL_STEPS.findIndex(
            (s) => s.id === step.id
          );
          if (currentStepIndex > stepIndex) {
            return { ...step, status: "pending" };
          }
        }
        return step;
      })
    );

    if (status === "in-progress") {
      setCurrentStep(stepId);
    } else if (status === "error") {
      setCurrentStep("");
      setIsProcessing(false);
      setShowRetryOptions(true);
      flowActiveRef.current = false; // Stop the flow
    }
  };

  const handleSuccess = (addressInfo: any, device: any) => {
    console.log("✅ Ledger connection successful!");
    console.log("📍 Address info:", addressInfo);
    console.log("📱 Device info:", device);

    updateStep("get-address", "completed");

    const connectionResult: LedgerConnectionResult = {
      success: true,
      address: addressInfo.address,
      publicKey: addressInfo.publicKey,
      derivationPath: addressInfo.derivationPath,
      deviceId: device.id,
      deviceName: device.name,
    };

    console.log("🎯 Connection result:", connectionResult);
    setResult(connectionResult);
    setIsProcessing(false);
    flowActiveRef.current = false;

    // Send to global promise handler
    if ((window as any).__ledgerConnectionPromise) {
      console.log("🔗 Resolving promise for agent...");

      // Clear timeout if it exists (from supervisor agent)
      if ((window as any).__ledgerConnectionPromise.timeoutId) {
        clearTimeout((window as any).__ledgerConnectionPromise.timeoutId);
        console.log("⏰ Cleared supervisor agent timeout");
      }

      (window as any).__ledgerConnectionPromise.resolve(connectionResult);
      delete (window as any).__ledgerConnectionPromise;
      console.log("✅ Promise resolved and cleaned up");
    } else {
      console.warn("⚠️ No promise found - agent might not receive result!");
    }

    // Also resolve hook promise if it exists
    if ((window as any).__ledgerHookPromise) {
      console.log("🔗 Resolving hook promise...");
      (window as any).__ledgerHookPromise.resolve(connectionResult);
      delete (window as any).__ledgerHookPromise;
      console.log("✅ Hook promise resolved and cleaned up");
    }

    // Send to callback
    onComplete?.(connectionResult);

    // Auto-close after 2 seconds
    timeoutRef.current = setTimeout(() => {
      if (isOpen) {
        onClose();
      }
    }, 2000);
  };

  const handleError = (error: string, stepId?: string) => {
    console.error("❌ Ledger flow error:", error);
    console.error("🔍 Failed step:", stepId);

    if (stepId) {
      updateStep(stepId, "error");
    }

    setErrorMessage(error);
    setIsProcessing(false);
    setShowRetryOptions(true);
    flowActiveRef.current = false;

    // Send to global promise handler
    if ((window as any).__ledgerConnectionPromise) {
      console.log("🔗 Rejecting promise for agent...");

      // Clear timeout if it exists (from supervisor agent)
      if ((window as any).__ledgerConnectionPromise.timeoutId) {
        clearTimeout((window as any).__ledgerConnectionPromise.timeoutId);
        console.log("⏰ Cleared supervisor agent timeout");
      }

      (window as any).__ledgerConnectionPromise.reject(new Error(error));
      delete (window as any).__ledgerConnectionPromise;
      console.log("❌ Promise rejected and cleaned up");
    } else {
      console.warn("⚠️ No promise found - agent might not receive error!");
    }

    // Also reject hook promise if it exists
    if ((window as any).__ledgerHookPromise) {
      console.log("🔗 Rejecting hook promise...");
      (window as any).__ledgerHookPromise.reject(new Error(error));
      delete (window as any).__ledgerHookPromise;
      console.log("❌ Hook promise rejected and cleaned up");
    }

    // Send to callback
    onError?.(error);
  };

  const startFlow = async () => {
    if (flowActiveRef.current || isProcessing) {
      console.log("⚠️ Flow already active, skipping");
      return;
    }

    console.log("🚀 Starting Ledger connection flow");

    flowActiveRef.current = true;
    setIsProcessing(true);
    setErrorMessage("");
    setShowRetryOptions(false);

    try {
      // Step 1: Discover devices
      updateStep("discover", "in-progress");
      console.log("🔍 Discovering devices...");

      const devices = await ledgerService.discoverDevices(15000);

      if (devices.length === 0) {
        throw new Error(
          "No Ledger devices found. Please connect your device and unlock it."
        );
      }

      updateStep("discover", "completed");
      console.log(`✅ Found ${devices.length} device(s)`);

      // Step 2: Connect
      updateStep("connect", "in-progress");
      console.log("🔗 Connecting to device...");

      const device = await ledgerService.connectDevice(devices[0].id);
      updateStep("connect", "completed");
      console.log("✅ Connected to device");

      // Step 3: Open Ethereum app
      updateStep("open-app", "in-progress");
      console.log("📱 Opening Ethereum app...");

      await ledgerService.openEthereumApp(device.id!, 30000);
      updateStep("open-app", "completed");
      console.log("✅ Ethereum app opened");

      // Step 4: Get address
      updateStep("get-address", "in-progress");
      console.log("📍 Getting Ethereum address...");

      // Debug: Print service state
      console.log("🔍 Ledger service state:", ledgerService.getServiceState());

      const addressInfo = await ledgerService.getEthereumAddress(
        device.id!,
        "44'/60'/0'/0/0",
        true // Verify on device
      );

      handleSuccess(addressInfo, device);
    } catch (error: any) {
      console.error("❌ Flow failed:", error);

      // Determine which step failed
      const failedStep = currentStep || "discover";
      handleError(error.message, failedStep);
    }
  };

  const handleRetry = () => {
    console.log("🔄 Retrying flow...");
    resetModalState();

    // Start flow after a brief delay
    setTimeout(() => {
      if (isOpen) {
        startFlow();
      }
    }, 500);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  // Don't render if not open
  if (!isOpen) return null;

  const hasError = steps.some((step) => step.status === "error");
  const isCompleted = result?.success === true;
  const completedSteps = steps.filter(
    (step) => step.status === "completed"
  ).length;
  const progressPercent = (completedSteps / steps.length) * 100;

  const getStepIcon = (step: LedgerStep) => {
    if (step.status === "completed") return "✅";
    if (step.status === "error") return "❌";
    if (step.status === "in-progress") return "⏳";
    return "⚪";
  };

  const getStepColor = (step: LedgerStep) => {
    switch (step.status) {
      case "completed":
        return "text-green-700 bg-green-50 border-green-200";
      case "error":
        return "text-red-700 bg-red-50 border-red-200";
      case "in-progress":
        return "text-blue-700 bg-blue-50 border-blue-200";
      default:
        return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  const getStepInstructions = (step: LedgerStep) => {
    if (step.status !== "in-progress") return null;

    switch (step.id) {
      case "discover":
        return (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            Make sure your Ledger is connected via USB and unlocked
          </div>
        );
      case "open-app":
        return (
          <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
            <strong>On your Ledger:</strong> Find "Ethereum" app and press both
            buttons to open it
          </div>
        );
      case "get-address":
        return (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <strong>On your Ledger:</strong> Review the address and press the
            right button to confirm
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                <img src="/ledger.svg" alt="Ledger" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Connect Ledger
                </h2>
                <p className="text-sm text-gray-500">
                  Secure hardware wallet connection
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              title="Close"
            >
              <svg
                className="w-5 h-5"
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
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>
              Step {Math.max(1, completedSteps + (isProcessing ? 1 : 0))} of{" "}
              {steps.length}
            </span>
            <span className="font-medium">
              {isCompleted ? "Complete" : hasError ? "Error" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="px-4 pb-4 space-y-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border transition-all ${getStepColor(
                step
              )}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 text-lg">
                  {step.status === "in-progress" ? (
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  ) : (
                    <span>{getStepIcon(step)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium">{step.title}</h3>
                  <p className="text-sm opacity-75 mt-1">{step.description}</p>
                  {getStepInstructions(step)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          {/* Success State */}
          {isCompleted && result && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Successfully connected!
                </p>
                <p className="text-xs text-green-700 mt-1 font-mono">
                  {result.address?.slice(0, 6)}...{result.address?.slice(-4)}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Error State */}
          {hasError && showRetryOptions && (
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ❌ Connection failed
                </p>
                <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && !hasError && !isCompleted && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  🔐 Follow the prompts on your Ledger device
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified hook
export function useLedgerFlow() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<LedgerConnectionResult | null>(null);

  const startFlow = (): Promise<LedgerConnectionResult> => {
    console.log("🎬 Starting Ledger flow via hook");

    // Check if supervisor agent already created a promise
    if ((window as any).__ledgerConnectionPromise) {
      console.log("🔗 Found existing supervisor agent promise, using it");
      // Just open the modal, the existing promise will be resolved by the modal
      setIsModalOpen(true);
      setResult(null);
      console.log("📂 Modal opened for supervisor agent flow");

      // Return a promise that will be resolved when the modal completes
      // This is for the hook caller, but the real result goes to supervisor agent
      return new Promise((resolve, reject) => {
        // Store hook resolvers separately so we can notify both
        (window as any).__ledgerHookPromise = { resolve, reject };
      });
    } else {
      console.log("🔗 Creating new promise for hook-based flow");

      return new Promise((resolve, reject) => {
        // Store promise resolvers globally for the modal to access
        // Compatible with supervisor agent's promise structure
        (window as any).__ledgerConnectionPromise = {
          resolve,
          reject,
          id: "hook-" + Math.random().toString(36).substr(2, 9),
        };
        console.log("🔗 Promise handlers stored globally");

        // Open modal
        setIsModalOpen(true);
        setResult(null);
        console.log("📂 Modal opened, waiting for user interaction");
      });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Clean up any pending promises
    if ((window as any).__ledgerConnectionPromise) {
      // Clear timeout if it exists (from supervisor agent)
      if ((window as any).__ledgerConnectionPromise.timeoutId) {
        clearTimeout((window as any).__ledgerConnectionPromise.timeoutId);
        console.log("⏰ Cleared supervisor agent timeout on close");
      }

      (window as any).__ledgerConnectionPromise.reject(
        new Error("Modal closed")
      );
      delete (window as any).__ledgerConnectionPromise;
    }

    // Also clean up hook promise if it exists
    if ((window as any).__ledgerHookPromise) {
      (window as any).__ledgerHookPromise.reject(new Error("Modal closed"));
      delete (window as any).__ledgerHookPromise;
    }
  };

  const handleComplete = (result: LedgerConnectionResult) => {
    setResult(result);
  };

  const handleError = (error: string) => {
    console.error("Hook received error:", error);
  };

  return {
    isModalOpen,
    result,
    startFlow,
    closeModal,
    handleComplete,
    handleError,
  };
}
