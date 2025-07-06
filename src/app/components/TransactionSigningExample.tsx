"use client";

import { useState } from "react";
import {
  LedgerSignTransactionModal,
  useLedgerSignTransaction,
} from "./LedgerSignTransactionModal";
import { type EthereumTransaction } from "../services/ledger";

export function TransactionSigningExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sampleTransaction, setSampleTransaction] =
    useState<EthereumTransaction>({
      to: "0x742C15d71eE3Ca0065B1dd95d31F4b43b4e7A8f8",
      value: "1000000000000000000", // 1 ETH in wei
      data: "0x",
      gasLimit: "21000",
      gasPrice: "20000000000", // 20 gwei
      nonce: "1",
      chainId: 1, // Ethereum mainnet
    });

  // Alternative: using the hook
  const {
    isModalOpen: hookModalOpen,
    result,
    signTransaction,
    closeModal,
    handleComplete,
    handleError,
  } = useLedgerSignTransaction();

  const handleDirectModalSign = () => {
    setIsModalOpen(true);
  };

  const handleHookSign = async () => {
    try {
      console.log("🚀 Starting transaction signing via hook...");
      const result = await signTransaction(sampleTransaction);
      console.log("✅ Transaction signed:", result);
      alert(`Transaction signed! Hash: ${result.signedTransaction?.hash}`);
    } catch (error) {
      console.error("❌ Signing failed:", error);
      alert(`Signing failed: ${error}`);
    }
  };

  const handleTransactionChange = (
    field: keyof EthereumTransaction,
    value: string | number
  ) => {
    setSampleTransaction((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          🔐 Ledger Transaction Signing Demo
        </h2>

        {/* Transaction Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Address
            </label>
            <input
              type="text"
              value={sampleTransaction.to}
              onChange={(e) => handleTransactionChange("to", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              placeholder="0x..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Value (wei)
              </label>
              <input
                type="text"
                value={sampleTransaction.value}
                onChange={(e) =>
                  handleTransactionChange("value", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder="1000000000000000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chain ID
              </label>
              <select
                value={sampleTransaction.chainId}
                onChange={(e) =>
                  handleTransactionChange("chainId", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={1}>Ethereum (1)</option>
                <option value={137}>Polygon (137)</option>
                <option value={56}>BSC (56)</option>
                <option value={42161}>Arbitrum (42161)</option>
                <option value={10}>Optimism (10)</option>
                <option value={8453}>Base (8453)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gas Limit
              </label>
              <input
                type="text"
                value={sampleTransaction.gasLimit}
                onChange={(e) =>
                  handleTransactionChange("gasLimit", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder="21000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gas Price (wei)
              </label>
              <input
                type="text"
                value={sampleTransaction.gasPrice || ""}
                onChange={(e) =>
                  handleTransactionChange("gasPrice", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                placeholder="20000000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nonce
            </label>
            <input
              type="text"
              value={sampleTransaction.nonce}
              onChange={(e) => handleTransactionChange("nonce", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              placeholder="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data (optional)
            </label>
            <input
              type="text"
              value={sampleTransaction.data || "0x"}
              onChange={(e) => handleTransactionChange("data", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              placeholder="0x"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={handleDirectModalSign}
            className="flex-1 py-3 px-4 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            📝 Sign with Direct Modal
          </button>

          <button
            onClick={handleHookSign}
            className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            🎣 Sign with Hook
          </button>
        </div>

        {/* Transaction Preview */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Transaction Preview
          </h3>
          <pre className="text-xs text-gray-600 font-mono overflow-x-auto">
            {JSON.stringify(sampleTransaction, null, 2)}
          </pre>
        </div>

        {/* Hook Result Display */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-medium text-green-800 mb-2">
              ✅ Signing Result
            </h3>
            <div className="text-xs text-green-700 space-y-1">
              <div>
                <strong>Success:</strong> {result.success ? "Yes" : "No"}
              </div>
              {result.signedTransaction && (
                <>
                  <div>
                    <strong>Hash:</strong>{" "}
                    <span className="font-mono">
                      {result.signedTransaction.hash}
                    </span>
                  </div>
                  <div>
                    <strong>Signature R:</strong>{" "}
                    <span className="font-mono">
                      {result.signedTransaction.signature.r}
                    </span>
                  </div>
                  <div>
                    <strong>Signature S:</strong>{" "}
                    <span className="font-mono">
                      {result.signedTransaction.signature.s}
                    </span>
                  </div>
                  <div>
                    <strong>Signature V:</strong>{" "}
                    <span className="font-mono">
                      {result.signedTransaction.signature.v}
                    </span>
                  </div>
                </>
              )}
              {result.deviceName && (
                <div>
                  <strong>Device:</strong> {result.deviceName}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Direct Modal Usage */}
      <LedgerSignTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={sampleTransaction}
        derivationPath="44'/60'/0'/0/0"
        onComplete={(result) => {
          console.log("✅ Direct modal signing completed:", result);
          alert(`Transaction signed! Hash: ${result.signedTransaction?.hash}`);
          setIsModalOpen(false);
        }}
        onError={(error) => {
          console.error("❌ Direct modal signing failed:", error);
          alert(`Signing failed: ${error}`);
        }}
      />

      {/* Hook Modal */}
      <LedgerSignTransactionModal
        isOpen={hookModalOpen}
        onClose={closeModal}
        transaction={sampleTransaction}
        derivationPath="44'/60'/0'/0/0"
        onComplete={handleComplete}
        onError={handleError}
      />
    </div>
  );
}
