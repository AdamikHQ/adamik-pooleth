// Real CCTP v2 implementation using Circle's contracts
// Based on https://developers.circle.com/stablecoins/evm-smart-contracts

import { ethers } from "ethers";

// TODO Enable all of these
// Arbitrum, Base, Codex, Ethereum, Linea, OP Mainnet, Polygon PoS, Solana, Unichain, World Chain
export type SupportedChain =
  | "arbitrum"
  | "base"
  | "codex"
  | "ethereum"
  | "linea"
  | "op-mainnet"
  | "polygon-pos"
  | "unichain"
  | "world-chain";
export type BridgeStep = "idle" | "approved" | "burned" | "minted";

export interface BridgeRequest {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: number;
  recipientAddress: string;
  senderAddress: string;
}

export interface BridgeStatus {
  status: "pending" | "success" | "error";
  message: string;
  transactionHash: string;
  attestation: string;
}

export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
  tokenMessengerAddress: string;
  messageTransmitterAddress: string;
  usdcAddress: string;
  domain: number;
}

export interface BridgeTransferParams {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  // TODO get balance as a param, from Adamik API, instead of local getUSDCBalance function
  usdcBalance: string;
  amount: string;
  recipient: string;
}

export interface BridgeTransferResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  messageHash?: string;
  attestation?: string;
  messageBytes?: string;
  nonce?: string;
  sourceDomain?: number;
}

export interface AttestationResult {
  success: boolean;
  attestation?: string;
  message?: string;
  error?: string;
}

export interface MintResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface FeeResult {
  success: boolean;
  feeRateBps?: number;
  error?: string;
}

export interface FastTransferInfo {
  feeRate: number;
  estimatedFee: string;
}

export interface BridgeState {
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  amount: string;
  recipient: string;
  bridgeStep: BridgeStep;
  transferResult: BridgeTransferResult | null;
  attestationResult: AttestationResult | null;
  isWaitingForAttestation: boolean;
  timestamp: number;
}

export interface BridgeBalanceInfo {
  balance: string;
  //allowance: string;
}

// Wallet provider interface to support Privy and other wallet providers
export interface WalletProvider {
  getSigner: () => Promise<ethers.Signer>;
  switchChain?: (chainId: number) => Promise<void>;
  isPrivy?: boolean;
}

// CCTP v2 Contract ABIs (minimal required functions)
const USDC_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
];

const TOKEN_MESSENGER_ABI = [
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "destinationCaller", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "minFinalityThreshold", type: "uint32" },
    ],
    outputs: [{ name: "nonce", type: "uint64" }],
  },
  {
    type: "function",
    name: "localMinter",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
];

const MESSAGE_TRANSMITTER_ABI = [
  {
    type: "function",
    name: "receiveMessage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    type: "function",
    name: "usedNonces",
    stateMutability: "view",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "MessageSent",
    inputs: [
      { name: "message", type: "bytes", indexed: false },
      { name: "nonce", type: "bytes32", indexed: true },
      { name: "sourceDomain", type: "uint32", indexed: true },
      { name: "destinationDomain", type: "uint32", indexed: true },
      { name: "sender", type: "bytes32", indexed: true },
      { name: "recipient", type: "bytes32", indexed: true },
      { name: "destinationCaller", type: "bytes32", indexed: false },
      { name: "finalityThresholdExecuted", type: "uint32", indexed: false },
    ],
  },
];

export class CCTPService {
  //private useTestnet: boolean;
  private walletProvider?: WalletProvider;

  // EVM Chain configurations
  // Based on https://developers.circle.com/stablecoins/evm-smart-contracts
  private mainnetConfigs: Record<SupportedChain, ChainConfig> = {
    ethereum: {
      chainId: 1,
      rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/demo",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
      domain: 0,
    },
    arbitrum: {
      chainId: 42161,
      rpcUrl: "https://arb1.arbitrum.io/rpc",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC on Arbitrum
      domain: 3,
    },
    base: {
      chainId: 8453,
      rpcUrl: "https://mainnet.base.org",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
      domain: 6,
    },
    "op-mainnet": {
      chainId: 10,
      rpcUrl: "https://mainnet.optimism.io",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on Optimism
      domain: 2,
    },
    "polygon-pos": {
      chainId: 137,
      rpcUrl: "https://polygon-rpc.com",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon
      domain: 7,
    },
    unichain: {
      chainId: 1301,
      rpcUrl: "https://rpc.unichain.org",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0x078D782b760474a361dDA0AF3839290b0EF57AD6", // USDC on Unichain
      domain: 10,
    },
    "world-chain": {
      chainId: 480,
      rpcUrl: "https://worldchain-mainnet.g.alchemy.com/public",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0x79a02482a880bce3f13e09da970dc34db4cd24d1", // USDC on World Chain
      domain: 14,
    },
    linea: {
      chainId: 59144,
      rpcUrl: "https://rpc.linea.build",
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff", // USDC on Linea
      domain: 11,
    },
    codex: {
      chainId: 81224,
      rpcUrl: "https://rpc.codex.xyz", // Codex RPC URL
      tokenMessengerAddress: "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d", // TokenMessengerV2
      messageTransmitterAddress: "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64", // MessageTransmitterV2
      usdcAddress: "0xd996633a415985DBd7D6D12f4A4343E31f5037cf", // USDC on Codex
      domain: 12,
    },
  };

  /*
  private testnetConfigs: Record<SupportedChain, ChainConfig> = {
    arbitrum: {
      chainId: 421614,
      rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
      tokenMessengerAddress: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterAddress: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      domain: 3,
    },
    "world-chain": {
      chainId: 4801,
      rpcUrl: "https://worldchain-sepolia.g.alchemy.com/public",
      tokenMessengerAddress: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      messageTransmitterAddress: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      usdcAddress: "0x66145f38cbac35ca6f1dfb4914df98f1614aea88",
      domain: 14,
    },
  };

  constructor(useTestnet: boolean = true) {
    this.useTestnet = useTestnet;
  }
  */

  setWalletProvider(provider: WalletProvider) {
    this.walletProvider = provider;
  }

  // Bridge State Management
  /*
  saveBridgeState(state: Partial<BridgeState>): void {
    localStorage.setItem("cctp-bridge-state", JSON.stringify(state));
  }

  loadBridgeState(): Partial<BridgeState> {
    const saved = localStorage.getItem("cctp-bridge-state");
    if (!saved) return {};

    const parsed = JSON.parse(saved);
    if (
      parsed.timestamp &&
      Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000
    ) {
      this.clearBridgeState();
      return {};
    }
    return parsed;
  }

  clearBridgeState(): void {
    localStorage.removeItem("cctp-bridge-state");
  }

  // Balance and Allowance Information
  async getBalanceInfo(
    chain: SupportedChain,
    address: string
  ): Promise<BridgeBalanceInfo> {
    const balance = await this.getUSDCBalance(chain, address);
    const allowance = await this.getUSDCAllowance(chain, address);
    return { balance, allowance };
  }
  */

  // Fast Transfer Fee Estimation
  async estimateFastTransferFee(
    sourceChain: SupportedChain,
    destinationChain: SupportedChain,
    amount: string
  ): Promise<FastTransferInfo | null> {
    if (!amount || parseFloat(amount) <= 0) {
      return null;
    }

    const feeResult = await this.getFastTransferFeeRate(
      sourceChain,
      destinationChain
    );

    if (feeResult.success && feeResult.feeRateBps) {
      const feeRate = feeResult.feeRateBps;
      const estimatedFee = (parseFloat(amount) * feeRate) / 10000;
      const minFee = 0.000001;
      const finalFee = Math.max(estimatedFee, minFee);

      return {
        feeRate: feeRate,
        estimatedFee: finalFee.toFixed(6),
      };
    }

    return null;
  }

  // High-level Bridge Operations
  async executeBridgeApproval(
    sourceChain: SupportedChain,
    amount: string
  ): Promise<BridgeTransferResult> {
    return await this.approveUSDC(sourceChain, amount);
  }

  async executeBridgeTransfer(
    params: BridgeTransferParams
  ): Promise<BridgeTransferResult> {
    const result = await this.initiateTransfer(params);

    if (result.success && result.messageHash && result.sourceDomain) {
      // Automatically start waiting for attestation
      setTimeout(async () => {
        await this.waitForAttestation(
          result.messageHash!,
          result.sourceDomain!
        );
      }, 1000);
    }

    return result;
  }

  async executeBridgeMinting(
    destinationChain: SupportedChain,
    messageBytes: string,
    attestation: string
  ): Promise<MintResult> {
    return await this.mintOnDestination(
      destinationChain,
      messageBytes,
      attestation
    );
  }

  // Transfer validation
  validateTransferParams(
    params: BridgeTransferParams,
    balance: string,
    allowance: string
  ): {
    isValid: boolean;
    needsApproval: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!params.amount || parseFloat(params.amount) <= 0) {
      errors.push("Amount must be greater than 0");
    }

    if (!params.recipient || !ethers.isAddress(params.recipient)) {
      errors.push("Invalid recipient address");
    }

    if (parseFloat(params.amount) > parseFloat(balance)) {
      errors.push("Insufficient balance");
    }

    const needsApproval =
      parseFloat(allowance) < parseFloat(params.amount || "0");

    return {
      isValid: errors.length === 0,
      needsApproval,
      errors,
    };
  }

  /*
  private getChainConfig(chain: SupportedChain): ChainConfig {
    return this.useTestnet
      ? this.testnetConfigs[chain]
      : this.mainnetConfigs[chain];
  }

  async getUSDCBalance(
    chain: SupportedChain,
    address: string
  ): Promise<string> {
    return await this.getEVMUSDCBalance(chain, address);
  }

  private async getEVMUSDCBalance(
    chain: SupportedChain,
    address: string
  ): Promise<string> {
    const config = this.getChainConfig(chain);
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid address format: ${address}`);
    }

    const network = await provider.getNetwork();
    if (Number(network.chainId) !== config.chainId) {
      throw new Error(
        `Chain ID mismatch: expected ${config.chainId}, got ${network.chainId}`
      );
    }

    const code = await provider.getCode(config.usdcAddress);
    if (code === "0x") {
      throw new Error(
        `No contract found at USDC address ${config.usdcAddress} on ${chain}`
      );
    }

    const usdcContract = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      provider
    );

    const decimals = await usdcContract.decimals();
    const balance = await usdcContract.balanceOf(address);
    return ethers.formatUnits(balance, decimals);
  }

  async getUSDCAllowance(
    chain: SupportedChain,
    owner: string
  ): Promise<string> {
    const config = this.mainnetConfigs[chain];
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const usdcContract = new ethers.Contract(
      config.usdcAddress,
      USDC_ABI,
      provider
    );

    const allowance = await usdcContract.allowance(
      owner,
      config.tokenMessengerAddress
    );
    const decimals = await usdcContract.decimals();

    return ethers.formatUnits(allowance, decimals);
  }
  */

  async approveUSDC(
    chain: SupportedChain,
    amount: string
  ): Promise<BridgeTransferResult> {
    try {
      const config = this.mainnetConfigs[chain];

      if (!this.walletProvider) {
        throw new Error(
          "No wallet provider set. Please connect a wallet first."
        );
      }

      await this.ensureCorrectNetwork(config);
      const signer = await this.walletProvider.getSigner();

      const usdcContract = new ethers.Contract(
        config.usdcAddress,
        USDC_ABI,
        signer
      );

      const decimals = await usdcContract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await usdcContract.approve(
        config.tokenMessengerAddress,
        amountInWei
      );

      await tx.wait();

      return {
        success: true,
        transactionHash: tx.hash,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async initiateTransfer(
    params: BridgeTransferParams
  ): Promise<BridgeTransferResult> {
    try {
      return await this.initiateEVMTransfer(params);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async initiateEVMTransfer(
    params: BridgeTransferParams
  ): Promise<BridgeTransferResult> {
    if (!this.walletProvider) {
      throw new Error("No wallet provider set. Please connect a wallet first.");
    }

    const sourceConfig = this.mainnetConfigs[params.sourceChain];
    const destinationDomain =
      this.mainnetConfigs[params.destinationChain].domain;

    await this.ensureCorrectNetwork(sourceConfig);
    const signer = await this.walletProvider.getSigner();

    const tokenMessenger = new ethers.Contract(
      sourceConfig.tokenMessengerAddress,
      TOKEN_MESSENGER_ABI,
      signer
    );
    const usdcContract = new ethers.Contract(
      sourceConfig.usdcAddress,
      USDC_ABI,
      signer
    );

    const mintRecipient = ethers.zeroPadValue(params.recipient, 32);
    const decimals = await usdcContract.decimals();
    const amountInWei = ethers.parseUnits(params.amount, decimals);

    const destinationCaller = ethers.ZeroHash;
    const minFinalityThreshold = 1000;

    const feeResult = await this.getFastTransferFeeRate(
      params.sourceChain,
      params.destinationChain
    );

    if (!feeResult.success || feeResult.feeRateBps === undefined) {
      throw new Error(
        `Fast Transfer not available: ${
          feeResult.error || "Unable to get fee rate"
        }`
      );
    }

    const maxFee = this.calculateFastTransferFee(
      params.amount,
      feeResult.feeRateBps
    );

    if (maxFee <= 0) {
      throw new Error("Invalid Fast Transfer fee calculation");
    }

    const totalRequired = ethers.parseUnits(params.amount, decimals) + maxFee;
    const usdcBalanceWei = ethers.parseUnits(params.usdcBalance, decimals);

    if (usdcBalanceWei < totalRequired) {
      const totalRequiredFormatted = ethers.formatUnits(
        totalRequired,
        decimals
      );
      throw new Error(
        `Insufficient USDC balance. Required: ${totalRequiredFormatted} USDC, Available: ${params.usdcBalance} USDC`
      );
    }

    const tx = await tokenMessenger.depositForBurn(
      amountInWei,
      destinationDomain,
      mintRecipient,
      sourceConfig.usdcAddress,
      destinationCaller,
      maxFee,
      minFinalityThreshold
    );

    const receipt = await tx.wait();

    let messageBytes: string | undefined;
    let nonce: string | undefined;

    const messageTransmitter = new ethers.Contract(
      sourceConfig.messageTransmitterAddress,
      MESSAGE_TRANSMITTER_ABI,
      signer
    );

    const messageSentEvent =
      messageTransmitter.interface.getEvent("MessageSent");
    if (messageSentEvent) {
      const messageSentTopic = messageSentEvent.topicHash;
      const messageSentLog = receipt.logs.find(
        (log: any) => log.topics[0] === messageSentTopic
      );

      if (messageSentLog) {
        const decodedLog = messageTransmitter.interface.parseLog({
          topics: messageSentLog.topics,
          data: messageSentLog.data,
        });

        if (decodedLog && decodedLog.args) {
          messageBytes = decodedLog.args.message as string;
          nonce = decodedLog.args.nonce as string;
        }
      }
    }

    return {
      success: true,
      transactionHash: tx.hash,
      messageHash: tx.hash,
      messageBytes,
      nonce,
      sourceDomain: sourceConfig.domain,
    };
  }

  async getAttestation(
    transactionHash: string,
    sourceDomain: number
  ): Promise<AttestationResult> {
    try {
      // const baseUrl = this.useTestnet
      //   ? "https://iris-api-sandbox.circle.com"
      //   : "https://iris-api.circle.com";

      const baseUrl = "https://iris-api.circle.com";
      const url = `${baseUrl}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: "Attestation not ready yet" };
        }
        const errorBody = await response.text();
        throw new Error(
          `Attestation API error: ${response.status} - ${errorBody}`
        );
      }

      const data = await response.json();

      if (
        !data.messages ||
        !Array.isArray(data.messages) ||
        data.messages.length === 0
      ) {
        return { success: false, error: "No messages found" };
      }

      const message = data.messages[0];

      if (message.status === "complete" && message.attestation) {
        return {
          success: true,
          attestation: message.attestation,
          message: message.message,
        };
      } else if (message.status === "pending_confirmations") {
        return { success: false, error: "Message pending confirmations" };
      } else {
        return {
          success: false,
          error: `Message status: ${message.status || "unknown"}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getFastTransferFeeRate(
    sourceChain: SupportedChain,
    destinationChain?: SupportedChain
  ): Promise<FeeResult> {
    const DEFAULT_MIN_FEE_RATE_BPS = 10;

    try {
      // const baseUrl = this.useTestnet
      //   ? "https://iris-api-sandbox.circle.com"
      //   : "https://iris-api.circle.com";

      const baseUrl = "https://iris-api.circle.com";
      const sourceConfig = this.mainnetConfigs[sourceChain];
      const sourceDomainId = sourceConfig.domain;

      const destChain =
        destinationChain ||
        (sourceChain === "arbitrum" ? "world-chain" : "arbitrum");
      const destConfig = this.mainnetConfigs[destChain];
      const destDomainId = destConfig.domain;

      const url = `${baseUrl}/v2/burn/USDC/fees/${sourceDomainId}/${destDomainId}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Fee API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          `Unexpected API response format: expected array, got ${typeof data}`
        );
      }

      const fastTransferOption = data.find(
        (option: any) => option.finalityThreshold === 1000
      );

      if (!fastTransferOption) {
        return { success: true, feeRateBps: DEFAULT_MIN_FEE_RATE_BPS };
      }

      let feeRateBps: number;
      if (fastTransferOption.minimumFee !== undefined) {
        feeRateBps = fastTransferOption.minimumFee;
      } else {
        feeRateBps = DEFAULT_MIN_FEE_RATE_BPS;
      }

      if (typeof feeRateBps !== "number" || feeRateBps < 0) {
        feeRateBps = DEFAULT_MIN_FEE_RATE_BPS;
      }

      if (feeRateBps === 0) {
        feeRateBps = DEFAULT_MIN_FEE_RATE_BPS;
      }

      return { success: true, feeRateBps };
    } catch {
      return { success: true, feeRateBps: DEFAULT_MIN_FEE_RATE_BPS };
    }
  }

  private calculateFastTransferFee(
    amountInUnits: string,
    feeRateBps: number
  ): bigint {
    const amountBigInt = ethers.parseUnits(amountInUnits, 6);
    const numerator = amountBigInt * BigInt(feeRateBps);
    const denominator = BigInt(10000);

    let calculatedFeeBigInt = numerator / denominator;

    if (
      calculatedFeeBigInt === BigInt(0) &&
      feeRateBps > 0 &&
      amountBigInt > BigInt(0)
    ) {
      calculatedFeeBigInt = (numerator + denominator - BigInt(1)) / denominator;
    }

    const minimumFeeBigInt = BigInt(1);
    const feeBigInt =
      calculatedFeeBigInt > minimumFeeBigInt
        ? calculatedFeeBigInt
        : minimumFeeBigInt;

    return feeBigInt;
  }

  async waitForAttestation(
    transactionHash: string,
    sourceDomain: number,
    maxAttempts: number = 60,
    delayMs: number = 5000
  ): Promise<AttestationResult> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.getAttestation(transactionHash, sourceDomain);

      if (result.success) {
        return result;
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return {
      success: false,
      error: `Attestation timeout after ${maxAttempts} attempts`,
    };
  }

  async mintOnDestination(
    destinationChain: SupportedChain,
    messageBytes: string,
    attestation: string
  ): Promise<MintResult> {
    try {
      return await this.mintOnEVM(destinationChain, messageBytes, attestation);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async completeTransfer(
    destinationChain: SupportedChain,
    message: string,
    attestation: string
  ): Promise<BridgeTransferResult> {
    try {
      return await this.completeEVMTransfer(
        destinationChain,
        message,
        attestation
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async mintOnEVM(
    destinationChain: SupportedChain,
    messageBytes: string,
    attestation: string
  ): Promise<MintResult> {
    const config = this.mainnetConfigs[destinationChain];

    if (!this.walletProvider) {
      throw new Error("No wallet provider set. Please connect a wallet first.");
    }

    await this.ensureCorrectNetwork(config);
    const signer = await this.walletProvider.getSigner();

    const messageTransmitter = new ethers.Contract(
      config.messageTransmitterAddress,
      MESSAGE_TRANSMITTER_ABI,
      signer
    );

    const tx = await messageTransmitter.receiveMessage(
      messageBytes,
      attestation
    );

    let receipt;
    try {
      receipt = await tx.wait();
    } catch {
      const maxAttempts = 60;
      let attempts = 0;

      while (!receipt && attempts < maxAttempts) {
        const provider = signer.provider;
        if (provider) {
          receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt) {
            break;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!receipt) {
        throw new Error(
          `Transaction ${tx.hash} failed to confirm after ${maxAttempts} attempts`
        );
      }
    }

    return {
      success: true,
      transactionHash: tx.hash,
    };
  }

  private async completeEVMTransfer(
    destinationChain: SupportedChain,
    message: string,
    attestation: string
  ): Promise<BridgeTransferResult> {
    const config = this.mainnetConfigs[destinationChain];

    if (!this.walletProvider) {
      throw new Error("No wallet provider set. Please connect a wallet first.");
    }

    await this.ensureCorrectNetwork(config);
    const signer = await this.walletProvider.getSigner();

    const messageTransmitter = new ethers.Contract(
      config.messageTransmitterAddress,
      MESSAGE_TRANSMITTER_ABI,
      signer
    );

    const tx = await messageTransmitter.receiveMessage(message, attestation);
    await tx.wait();

    return {
      success: true,
      transactionHash: tx.hash,
    };
  }

  getSupportedChains(): SupportedChain[] {
    return Object.keys(this.mainnetConfigs) as SupportedChain[];
  }

  getChainDisplayName(chain: SupportedChain): string {
    switch (chain) {
      case "arbitrum":
        return "Arbitrum";
      case "base":
        return "Base";
      case "codex":
        return "Codex";
      case "ethereum":
        return "Ethereum";
      case "linea":
        return "Linea";
      case "op-mainnet":
        return "OP Mainnet";
      case "polygon-pos":
        return "Polygon";
      case "unichain":
        return "Unichain";
      case "world-chain":
        return "World Chain";
      default:
        return chain;
    }
  }

  private async ensureCorrectNetwork(config: ChainConfig): Promise<void> {
    if (!this.walletProvider) {
      throw new Error("No wallet provider set");
    }

    if (this.walletProvider.switchChain) {
      await this.walletProvider.switchChain(config.chainId);
    }
  }
}
