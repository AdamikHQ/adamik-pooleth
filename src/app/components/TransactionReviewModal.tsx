"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { stringToChainId } from "@/app/config/privyChains";

interface TransactionData {
  to: string;
  value: string;
  chainId: string;
  data?: string;
  gasLimit?: string;
  description?: string;
}

interface TransactionReviewModalProps {
  isOpen: boolean;
  transactionData: TransactionData | null;
  onClose: () => void;
  onConfirm?: (result: TransactionResult) => void;
  onError?: (error: string) => void;
}

interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  details?: any;
}

// Helper function to get chain name from chainId
const getChainName = (chainId: string): string => {
  const chainNames: Record<string, string> = {
    ethereum: "Ethereum",
    sepolia: "Sepolia",
    polygon: "Polygon",
    base: "Base",
    arbitrum: "Arbitrum",
    optimism: "Optimism",
    bsc: "BSC",
    avalanche: "Avalanche",
  };
  return chainNames[chainId] || chainId;
};

// Helper function to format value
const formatValue = (value: string): string => {
  const valueNum = parseFloat(value);

  if (valueNum === 0) return "0";

  // Convert from wei to ETH for display (18 decimals)
  const ethValue = valueNum / Math.pow(10, 18);

  if (ethValue < 0.000001) {
    return `${valueNum} wei`;
  }

  return `${ethValue.toFixed(6)} ETH`;
};

// Helper function to detect transaction type
const getTransactionType = (
  data: TransactionData
): {
  type: "native_transfer" | "token_transfer" | "contract_interaction";
  details: any;
} => {
  if (!data.data || data.data === "0x") {
    return {
      type: "native_transfer",
      details: {
        title: "Native Token Transfer",
        description: "Sending native currency",
      },
    };
  }

  // Check for ERC-20 transfer (function signature: 0xa9059cbb)
  if (data.data.startsWith("0xa9059cbb")) {
    const recipientHex = data.data.slice(10, 74); // 32 bytes after function selector
    const amountHex = data.data.slice(74, 138); // Next 32 bytes

    const recipient = "0x" + recipientHex.slice(24); // Remove padding
    const amount = BigInt("0x" + amountHex).toString();

    return {
      type: "token_transfer",
      details: {
        title: "Token Transfer",
        description: "Sending ERC-20 tokens",
        tokenRecipient: recipient,
        tokenAmount: amount,
      },
    };
  }

  return {
    type: "contract_interaction",
    details: {
      title: "Smart Contract Interaction",
      description: "Calling smart contract function",
    },
  };
};

export function TransactionReviewModal({
  isOpen,
  transactionData,
  onClose,
  onConfirm,
  onError,
}: TransactionReviewModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<
    "review" | "signing" | "completed" | "error"
  >("review");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [result, setResult] = useState<TransactionResult | null>(null);

  const { sendTransaction } = usePrivy();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && transactionData) {
      setStep("review");
      setIsProcessing(false);
      setErrorMessage("");
      setResult(null);
    }
  }, [isOpen, transactionData]);

  if (!isOpen || !transactionData) return null;

  const { type, details } = getTransactionType(transactionData);
  const chainName = getChainName(transactionData.chainId);
  const formattedValue = formatValue(transactionData.value);
  const isNativeTransfer =
    type === "native_transfer" && parseFloat(transactionData.value) > 0;

  const handleConfirm = async () => {
    setIsProcessing(true);
    setStep("signing");

    try {
      // Map string chainId to numeric chain ID for Privy
      const numericChainId = stringToChainId[transactionData.chainId];

      if (!numericChainId) {
        throw new Error(
          `Chain ID "${
            transactionData.chainId
          }" is not supported. Supported chains: ${Object.keys(
            stringToChainId
          ).join(", ")}`
        );
      }

      // Build transaction request for Privy
      const transactionRequest = {
        to: transactionData.to,
        value: transactionData.value.toString(),
        chainId: numericChainId,
        ...(transactionData.data && { data: transactionData.data }),
        ...(transactionData.gasLimit && { gasLimit: transactionData.gasLimit }),
      };

      console.log("📝 Sending transaction:", transactionRequest);

      // Use Privy's sendTransaction with disabled UI to prevent double modal
      const transactionResult = await sendTransaction(transactionRequest, {
        uiOptions: {
          showWalletUIs: false, // Disable Privy's modal since we're using our own
        },
      });

      console.log("✅ Transaction successful:", transactionResult.hash);

      const successResult: TransactionResult = {
        success: true,
        transactionHash: transactionResult.hash,
        details: {
          to: transactionData.to,
          value: transactionData.value,
          chainId: transactionData.chainId,
        },
      };

      setResult(successResult);
      setStep("completed");

      // Call onConfirm callback
      onConfirm?.(successResult);

      // Auto-close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error: any) {
      console.error("❌ Transaction failed:", error);

      const errorResult: TransactionResult = {
        success: false,
        error: error.message || "Transaction failed",
        details: "Transaction failed. Please check your wallet and try again.",
      };

      setErrorMessage(error.message || "Transaction failed");
      setResult(errorResult);
      setStep("error");
      setIsProcessing(false);

      // Call onError callback
      onError?.(error.message || "Transaction failed");
    }
  };

  const handleCancel = () => {
    if (!isProcessing) {
      onError?.("Transaction cancelled by user");
      onClose();
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case "review":
        return "🔍";
      case "signing":
        return "✍️";
      case "completed":
        return "✅";
      case "error":
        return "❌";
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case "review":
        return "Review Transaction";
      case "signing":
        return "Signing Transaction...";
      case "completed":
        return "Transaction Completed";
      case "error":
        return "Transaction Failed";
    }
  };

  const renderTransactionDetails = () => {
    return (
      <div className="space-y-4">
        {/* Transaction Type */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">
              {type === "native_transfer"
                ? "💸"
                : type === "token_transfer"
                ? "🪙"
                : "⚙️"}
            </span>
            <h3 className="font-semibold text-blue-900">{details.title}</h3>
          </div>
          <p className="text-blue-700 text-sm">
            {transactionData.description || details.description}
          </p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          {/* To Address */}
          <div className="flex justify-between items-start">
            <span className="text-sm font-medium text-gray-600">To:</span>
            <div className="text-right">
              <div className="font-mono text-sm text-gray-900 break-all">
                {transactionData.to}
              </div>
              {type === "token_transfer" &&
                details.tokenRecipient &&
                details.tokenRecipient !== transactionData.to && (
                  <div className="text-xs text-gray-500 mt-1">
                    Token recipient:{" "}
                    {`${details.tokenRecipient.slice(
                      0,
                      6
                    )}...${details.tokenRecipient.slice(-4)}`}
                  </div>
                )}
            </div>
          </div>

          {/* Value */}
          {isNativeTransfer && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Amount:</span>
              <span className="font-semibold text-gray-900">
                {formattedValue}
              </span>
            </div>
          )}

          {/* Token Amount for ERC-20 transfers */}
          {type === "token_transfer" && details.tokenAmount && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">
                Token Amount:
              </span>
              <span className="font-semibold text-gray-900">
                {details.tokenAmount} units
              </span>
            </div>
          )}

          {/* Network */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Network:</span>
            <span className="font-semibold text-gray-900">{chainName}</span>
          </div>

          {/* Contract Data */}
          {transactionData.data && transactionData.data !== "0x" && (
            <div className="border-t pt-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-600">Data:</span>
                <div className="text-right max-w-xs">
                  <div className="font-mono text-xs text-gray-700 break-all bg-gray-50 p-2 rounded">
                    {transactionData.data.slice(0, 50)}...
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {transactionData.data.length} characters
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Warning for high-value transactions */}
        {parseFloat(transactionData.value) > Math.pow(10, 17) && ( // > 0.1 ETH
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <span className="text-amber-600 font-semibold">⚠️</span>
              <div>
                <p className="text-amber-800 font-medium text-sm">
                  High Value Transaction
                </p>
                <p className="text-amber-700 text-xs">
                  Please double-check the recipient address and amount before
                  confirming.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                <span className="text-xl">{getStepIcon()}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {getStepTitle()}
                </h2>
                <p className="text-sm text-gray-500">
                  {step === "review" && "Review and confirm your transaction"}
                  {step === "signing" && "Please confirm in your wallet"}
                  {step === "completed" && "Transaction sent successfully"}
                  {step === "error" && "Something went wrong"}
                </p>
              </div>
            </div>
            {step === "review" && !isProcessing && (
              <button
                onClick={handleCancel}
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

        {/* Content */}
        <div className="p-6">
          {step === "review" && renderTransactionDetails()}

          {step === "signing" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Waiting for wallet confirmation...
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Please check your wallet to sign the transaction
              </p>
            </div>
          )}

          {step === "completed" && result && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Transaction Sent!
              </h3>
              <p className="text-gray-600 mb-4">
                Your transaction has been submitted to the blockchain
              </p>
              {result.transactionHash && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">
                    Transaction Hash:
                  </p>
                  <p className="font-mono text-sm text-gray-700 break-all">
                    {result.transactionHash}
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Transaction Failed
              </h3>
              <p className="text-gray-600 mb-4">{errorMessage}</p>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "review" && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isProcessing ? "Processing..." : "Confirm Transaction"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Hook for easy usage (similar to useLedgerFlow)
export function useTransactionReview() {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionData, setTransactionData] =
    useState<TransactionData | null>(null);

  const openModal = (data: TransactionData): Promise<TransactionResult> => {
    return new Promise((resolve, reject) => {
      setTransactionData(data);
      setIsOpen(true);

      // Store promise resolvers globally so the modal can access them
      (window as any).__transactionReviewPromise = {
        resolve,
        reject,
      };
    });
  };

  const closeModal = () => {
    setIsOpen(false);
    setTransactionData(null);

    // Clean up promise if it exists
    if ((window as any).__transactionReviewPromise) {
      delete (window as any).__transactionReviewPromise;
    }
  };

  const handleComplete = (result: TransactionResult) => {
    console.log("✅ Transaction completed:", result);

    // Resolve global promise
    if ((window as any).__transactionReviewPromise) {
      (window as any).__transactionReviewPromise.resolve(result);
      delete (window as any).__transactionReviewPromise;
    }
  };

  const handleError = (error: string) => {
    console.error("❌ Transaction error:", error);

    // Reject global promise
    if ((window as any).__transactionReviewPromise) {
      (window as any).__transactionReviewPromise.reject(new Error(error));
      delete (window as any).__transactionReviewPromise;
    }
  };

  return {
    // Modal props
    isOpen,
    transactionData,
    closeModal,
    handleComplete,
    handleError,

    // Control function
    openModal,
  };
}
