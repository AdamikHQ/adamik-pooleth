"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSignRawHash } from "@privy-io/react-auth/extended-chains";

interface SigningRequest {
  chainId: string;
  chainType: string;
  description: string;
  encodedTransaction: any;
  hashToSign: string;
  status: string;
}

interface TransactionSignerProps {
  signingRequest: SigningRequest | null;
  onSignatureComplete: (signature: string) => void;
  onSignatureCancel: () => void;
}

export function TransactionSigner({
  signingRequest,
  onSignatureComplete,
  onSignatureCancel,
}: TransactionSignerProps) {
  const { user } = usePrivy();
  const { signRawHash } = useSignRawHash();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't render if no signing request
  if (!signingRequest) {
    return null;
  }

  const handleSign = async () => {
    if (!user || !signRawHash) {
      setError("User not authenticated or signRawHash not available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔐 Starting client-side transaction signing...");
      console.log("Transaction to sign:", signingRequest);

      // Get the wallet address from the encoded transaction
      const walletAddress =
        signingRequest.encodedTransaction?.senderAddress ||
        signingRequest.encodedTransaction?.transaction?.data?.senderAddress;

      if (!walletAddress) {
        throw new Error("No wallet address available for signing");
      }

      // Prepare the hash for signing
      let hashToSign = signingRequest.hashToSign;

      // Ensure the hash has 0x prefix for all chains
      if (!hashToSign.startsWith("0x")) {
        hashToSign = "0x" + hashToSign;
      }

      console.log("Hash to sign:", hashToSign);
      console.log("Wallet address:", walletAddress);
      console.log("Chain type:", signingRequest.chainType);

      // Sign the transaction hash using Privy's signRawHash
      const signResult = await signRawHash({
        address: walletAddress,
        chainType: signingRequest.chainType,
        hash: hashToSign,
      });

      console.log("✅ Transaction signed successfully:", signResult);

      // Call the completion callback with the signature
      onSignatureComplete(signResult.signature);
    } catch (err) {
      console.error("❌ Error signing transaction:", err);
      setError(
        err instanceof Error ? err.message : "Failed to sign transaction"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onSignatureCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🔐 Sign Transaction
          </h3>
          <p className="text-gray-600 mb-4">{signingRequest.description}</p>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="text-sm">
              <div className="mb-1">
                <span className="font-medium">Chain:</span>{" "}
                {signingRequest.chainId}
              </div>
              <div className="mb-1">
                <span className="font-medium">Type:</span>{" "}
                {signingRequest.chainType}
              </div>
              <div>
                <span className="font-medium">Hash:</span>{" "}
                <span className="font-mono text-xs break-all">
                  {signingRequest.hashToSign.substring(0, 20)}...
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSign}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing...
              </>
            ) : (
              "Sign Transaction"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
