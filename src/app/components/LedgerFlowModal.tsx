"use client";

import { useState, useEffect } from "react";

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
  currentStep?: string;
  steps?: LedgerStep[];
  onRetry?: () => void;
}

const defaultSteps: LedgerStep[] = [
  {
    id: "discover",
    title: "Discovering Device",
    description: "Looking for connected Ledger devices",
    status: "pending",
    icon: "🔍",
  },
  {
    id: "connect",
    title: "Connecting to Device",
    description: "Establishing connection with your Ledger",
    status: "pending",
    icon: "🔗",
  },
  {
    id: "open-app",
    title: "Opening Ethereum App",
    description: "Please open the Ethereum app on your device",
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
  currentStep,
  steps = defaultSteps,
  onRetry,
}: LedgerFlowModalProps) {
  const [internalSteps, setInternalSteps] = useState<LedgerStep[]>(steps);

  useEffect(() => {
    if (currentStep) {
      setInternalSteps((prevSteps) =>
        prevSteps.map((step) => {
          if (step.id === currentStep) {
            return { ...step, status: "in-progress" };
          } else if (
            prevSteps.findIndex((s) => s.id === step.id) <
            prevSteps.findIndex((s) => s.id === currentStep)
          ) {
            return { ...step, status: "completed" };
          }
          return step;
        })
      );
    }
  }, [currentStep]);

  // Removed unused function updateStepStatus

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
        return "text-green-600 bg-green-50 border-green-200";
      case "in-progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const hasError = internalSteps.some((step) => step.status === "error");
  const isCompleted = internalSteps.every(
    (step) => step.status === "completed"
  );
  const currentStepIndex = internalSteps.findIndex(
    (step) => step.status === "in-progress"
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔐</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Ledger Connection
                </h2>
                <p className="text-sm text-gray-600">
                  Connecting to your hardware wallet
                </p>
              </div>
            </div>
            {(isCompleted || hasError) && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
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
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  (internalSteps.filter((s) => s.status === "completed")
                    .length /
                    internalSteps.length) *
                  100
                }%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>
              Step{" "}
              {currentStepIndex >= 0
                ? currentStepIndex + 1
                : internalSteps.filter((s) => s.status === "completed")
                    .length}{" "}
              of {internalSteps.length}
            </span>
            <span>
              {isCompleted ? "Complete" : hasError ? "Error" : "In Progress"}
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="p-6 space-y-4">
          {internalSteps.map((step) => (
            <div
              key={step.id}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${getStatusColor(
                step.status
              )}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 text-2xl">
                  {step.status === "in-progress" ? (
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  ) : (
                    <span className="text-lg">
                      {getStatusIcon(step.status)} {step.icon}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs opacity-80 mt-1">{step.description}</p>
                  {step.status === "in-progress" && step.id === "open-app" && (
                    <div className="mt-2 p-2 bg-amber-100 rounded border border-amber-200">
                      <p className="text-xs text-amber-800">
                        ⚠️ Please manually open the Ethereum app on your Ledger
                        device
                      </p>
                    </div>
                  )}
                  {step.status === "in-progress" &&
                    step.id === "get-address" && (
                      <div className="mt-2 p-2 bg-blue-100 rounded border border-blue-200">
                        <p className="text-xs text-blue-800">
                          🔍 You may be asked to verify the address on your
                          device screen
                        </p>
                      </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          {hasError && (
            <div className="space-y-3">
              <div className="p-3 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ❌ Connection failed. Please check that your Ledger device is:
                </p>
                <ul className="text-xs text-red-700 mt-2 space-y-1 ml-4">
                  <li>• Connected via USB</li>
                  <li>• Unlocked with PIN</li>
                  <li>• Ethereum app is installed</li>
                  <li>• Using Chrome, Edge, or Chromium browser</li>
                </ul>
              </div>
              <div className="flex space-x-3">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    🔄 Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="space-y-3">
              <div className="p-3 bg-green-100 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Successfully connected to your Ledger hardware wallet!
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Your secure address has been retrieved and is ready for use.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {!hasError && !isCompleted && (
            <div className="p-3 bg-blue-100 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                🔐 Please keep your Ledger device connected and follow any
                prompts on the device screen.
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
  const [currentStep, setCurrentStep] = useState<string>("");
  const [steps, setSteps] = useState<LedgerStep[]>(defaultSteps);

  const startFlow = () => {
    setIsModalOpen(true);
    setCurrentStep("discover");
    setSteps(
      defaultSteps.map((step) => ({ ...step, status: "pending" as const }))
    );
  };

  const updateStep = (stepId: string, status: LedgerStep["status"]) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.id === stepId ? { ...step, status } : step))
    );

    if (status === "in-progress") {
      setCurrentStep(stepId);
    }
  };

  const completeStep = (stepId: string) => {
    updateStep(stepId, "completed");
  };

  const errorStep = (stepId: string) => {
    updateStep(stepId, "error");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentStep("");
  };

  return {
    isModalOpen,
    currentStep,
    steps,
    startFlow,
    updateStep,
    completeStep,
    errorStep,
    closeModal,
  };
}
