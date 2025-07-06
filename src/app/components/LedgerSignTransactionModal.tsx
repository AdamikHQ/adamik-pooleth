"use client";

import { useState, useEffect, useRef } from "react";
import {
  ledgerService,
  type EthereumTransaction,
  type SignedTransaction,
} from "../services/ledger";

interface LedgerStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed" | "error";
  icon: string;
}

interface LedgerSignTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: EthereumTransaction;
  derivationPath?: string;
  onComplete?: (result: LedgerSignTransactionResult) => void;
  onError?: (error: string) => void;
}

interface LedgerSignTransactionResult {
  success: boolean;
  signedTransaction?: SignedTransaction;
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
    id: "review-transaction",
    title: "Review Transaction",
    description: "Review transaction details on your device",
    status: "pending",
    icon: "📋",
  },
  {
    id: "sign-transaction",
    title: "Sign Transaction",
    description: "Confirm and sign the transaction",
    status: "pending",
    icon: "✍️",
  },
];

export function LedgerSignTransactionModal({
  isOpen,
  onClose,
  transaction,
  derivationPath = "44'/60'/0'/0/0",
  onComplete,
  onError,
}: LedgerSignTransactionModalProps) {
  const [steps, setSteps] = useState<LedgerStep[]>(INITIAL_STEPS);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [result, setResult] = useState<LedgerSignTransactionResult | null>(
    null
  );
  const [showRetryOptions, setShowRetryOptions] = useState(false);

  // Use ref to track if flow is active to prevent race conditions
  const flowActiveRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Complete reset function
  const resetModalState = () => {
    console.log("🔄 Resetting transaction signing modal state");

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

    // Clean up transaction signing promises
    if ((window as any).__ledgerSignPromise) {
      delete (window as any).__ledgerSignPromise;
    }
  };

  // Reset when modal opens
  useEffect(() => {
    if (isOpen && !flowActiveRef.current) {
      console.log(
        "📂 SIGN MODAL: Modal opening, starting transaction signing flow..."
      );
      resetModalState();
      // Start flow after a short delay to ensure clean state
      setTimeout(() => {
        if (isOpen) {
          startSigningFlow();
        }
      }, 100);
    } else if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ((window as any).__ledgerSignPromise) {
        console.log("🧹 UNMOUNT: Cleaning up signing promise");
        try {
          (window as any).__ledgerSignPromise.reject(
            new Error("Modal unmounted")
          );
        } catch (e) {
          console.warn("Failed to reject signing promise on unmount:", e);
        }
        delete (window as any).__ledgerSignPromise;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
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

  const handleSuccess = (signedTransaction: SignedTransaction, device: any) => {
    console.log("✅ Transaction signed successfully!");
    console.log("📝 Signed transaction:", signedTransaction);
    console.log("📱 Device info:", device);

    updateStep("sign-transaction", "completed");

    const signingResult: LedgerSignTransactionResult = {
      success: true,
      signedTransaction,
      deviceId: device.id,
      deviceName: device.name,
    };

    console.log("🎯 Signing result:", signingResult);
    setResult(signingResult);
    setIsProcessing(false);
    flowActiveRef.current = false;

    // Send to global promise handler
    if ((window as any).__ledgerSignPromise) {
      console.log("🔗 Resolving signing promise...");
      try {
        (window as any).__ledgerSignPromise.resolve(signingResult);
        console.log("✅ Signing promise resolved successfully");
      } catch (error) {
        console.error("❌ Error resolving signing promise:", error);
      }
      delete (window as any).__ledgerSignPromise;
      console.log("🧹 Signing promise cleaned up");
    }

    // Send to callback
    onComplete?.(signingResult);

    // Auto-close after 3 seconds
    timeoutRef.current = setTimeout(() => {
      if (isOpen) {
        onClose();
      }
    }, 3000);
  };

  const handleError = (error: string, stepId?: string) => {
    console.error("❌ Transaction signing error:", error);
    console.error("🔍 Failed step:", stepId);

    if (stepId) {
      updateStep(stepId, "error");
    }

    setErrorMessage(error);
    setIsProcessing(false);
    setShowRetryOptions(true);
    flowActiveRef.current = false;

    // Send to global promise handler
    if ((window as any).__ledgerSignPromise) {
      console.log("🔗 Rejecting signing promise...");
      (window as any).__ledgerSignPromise.reject(new Error(error));
      delete (window as any).__ledgerSignPromise;
      console.log("❌ Signing promise rejected and cleaned up");
    }

    // Send to callback
    onError?.(error);
  };

  const startSigningFlow = async () => {
    if (flowActiveRef.current || isProcessing) {
      console.log("⚠️ Signing flow already active, skipping");
      return;
    }

    console.log("🚀 Starting Ledger transaction signing flow");
    console.log("📄 Transaction:", transaction);

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

      // Step 4: Review transaction (just a UI step)
      updateStep("review-transaction", "in-progress");
      console.log("📋 Preparing transaction for review...");

      // Small delay to show the review step
      await new Promise((resolve) => setTimeout(resolve, 1000));
      updateStep("review-transaction", "completed");

      // Step 5: Sign transaction
      updateStep("sign-transaction", "in-progress");
      console.log("✍️ Signing transaction...");

      const signedTransaction = await ledgerService.signEthereumTransaction(
        device.id!,
        transaction,
        derivationPath
      );

      handleSuccess(signedTransaction, device);
    } catch (error: any) {
      console.error("❌ Signing flow failed:", error);

      // Determine which step failed
      const failedStep = currentStep || "discover";
      handleError(error.message, failedStep);
    }
  };

  const handleRetry = () => {
    console.log("🔄 Retrying signing flow...");
    resetModalState();

    // Start flow after a brief delay
    setTimeout(() => {
      if (isOpen) {
        startSigningFlow();
      }
    }, 500);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  // Format transaction value for display
  const formatTransactionValue = (value: string) => {
    try {
      // Convert wei to ETH for display
      const valueInWei = BigInt(value);
      const valueInEth = Number(valueInWei) / 1e18;
      return valueInEth.toFixed(6) + " ETH";
    } catch {
      return value + " wei";
    }
  };

  // Get chain name from chainId
  const getChainName = (chainId: number) => {
    const chains: Record<number, string> = {
      1: "Ethereum",
      137: "Polygon",
      56: "BSC",
      42161: "Arbitrum",
      10: "Optimism",
      8453: "Base",
      43114: "Avalanche",
      250: "Fantom",
    };
    return chains[chainId] || `Chain ${chainId}`;
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
            <strong>On your Ledger:</strong> Find &quot;Ethereum&quot; app and
            press both buttons to open it
          </div>
        );
      case "review-transaction":
        return (
          <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <strong>On your Ledger:</strong> Review the transaction details
            carefully
          </div>
        );
      case "sign-transaction":
        return (
          <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
            <strong>On your Ledger:</strong> Press the right button to confirm
            and sign the transaction
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
              <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg flex items-center justify-center border border-orange-200">
                <span className="text-orange-600">✍️</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Sign Transaction
                </h2>
                <p className="text-sm text-gray-500">
                  Sign with your Ledger device
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

        {/* Transaction Details */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Transaction Details
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">To:</span>
              <span className="font-mono text-gray-900">
                {transaction.to.slice(0, 6)}...{transaction.to.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Value:</span>
              <span className="font-medium text-gray-900">
                {formatTransactionValue(transaction.value)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Chain:</span>
              <span className="text-gray-900">
                {getChainName(transaction.chainId)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gas Limit:</span>
              <span className="text-gray-900">{transaction.gasLimit}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>
              Step {Math.max(1, completedSteps + (isProcessing ? 1 : 0))} of{" "}
              {steps.length}
            </span>
            <span className="font-medium">
              {isCompleted ? "Signed" : hasError ? "Error" : "Signing..."}
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
                    <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full" />
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
          {isCompleted && result?.signedTransaction && (
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Transaction signed successfully!
                </p>
                <p className="text-xs text-green-700 mt-1 font-mono">
                  Hash: {result.signedTransaction.hash.slice(0, 10)}...
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
                  ❌ Signing failed
                </p>
                <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
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
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ✍️ Review and confirm the transaction on your Ledger device
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

// Hook for transaction signing
export function useLedgerSignTransaction() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [result, setResult] = useState<LedgerSignTransactionResult | null>(
    null
  );

  const signTransaction = (
    transaction: EthereumTransaction,
    derivationPath?: string
  ): Promise<LedgerSignTransactionResult> => {
    console.log("🎬 Starting Ledger transaction signing via hook");
    console.log("📄 Transaction:", transaction);

    return new Promise((resolve, reject) => {
      // Store resolvers for the signing promise
      (window as any).__ledgerSignPromise = { resolve, reject };
      console.log("🔗 Signing promise stored");

      // Open modal
      setIsModalOpen(true);
      setResult(null);
      console.log("📂 Signing modal opened, waiting for user interaction");
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    // Clean up any pending promises
    if ((window as any).__ledgerSignPromise) {
      (window as any).__ledgerSignPromise.reject(new Error("Modal closed"));
      delete (window as any).__ledgerSignPromise;
    }
  };

  const handleComplete = (result: LedgerSignTransactionResult) => {
    setResult(result);
  };

  const handleError = (error: string) => {
    console.error("Hook received signing error:", error);
  };

  return {
    isModalOpen,
    result,
    signTransaction,
    closeModal,
    handleComplete,
    handleError,
  };
}
