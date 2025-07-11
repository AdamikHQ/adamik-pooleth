"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

import Image from "next/image";

// Privy authentication
import { usePrivy, useWallets } from "@privy-io/react-auth";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";
import {
  LedgerGetAddressModal,
  useLedgerGetAddress,
} from "./components/LedgerGetAddressModal";
import {
  LedgerSignTransactionModal,
  useLedgerSignTransaction,
} from "./components/LedgerSignTransactionModal";
import {
  TransactionReviewModal,
  useTransactionReview,
} from "./components/TransactionReviewModal";

// Types
import { AgentConfig, SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useHandleServerEvent } from "./hooks/useHandleServerEvent";

// Utilities
import { createRealtimeConnection } from "./lib/realtimeConnection";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";

import useAudioDownload from "./hooks/useAudioDownload";

// CCTP Service
import { CCTPService, WalletProvider } from "@/app/services/cctp";

// Get the CCTP service instance
const cctpService = new CCTPService();

// Export the CCTP service instance for use in other modules
export { cctpService };

export default function App() {
  const searchParams = useSearchParams();

  // Privy authentication hooks
  const { ready, authenticated, login, logout, user, sendTransaction } =
    usePrivy();
  const { wallets } = useWallets();

  // Use urlCodec directly from URL search params (default: "opus")
  const urlCodec = searchParams.get("codec") || "opus";

  const { transcriptItems, addTranscriptMessage, addTranscriptBreadcrumb } =
    useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    AgentConfig[] | null
  >(null);

  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(false);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(true);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(true);

  const [isOutputAudioBufferActive, setIsOutputAudioBufferActive] =
    useState<boolean>(false);
  const [manualDisconnect, setManualDisconnect] = useState(false);
  const [ledgerConnectionInfo, setLedgerConnectionInfo] = useState<{
    isConnected: boolean;
    address?: string;
    deviceName?: string;
  }>({
    isConnected: false,
  });
  const [currentTransactionToSign, setCurrentTransactionToSign] =
    useState<any>(null);

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  // Initialize Ledger address modal
  const {
    isModalOpen: isLedgerGetAddressModalOpen,
    handleComplete: handleLedgerCompleteDefault,
    handleError: handleLedgerErrorDefault,
    closeModal: closeLedgerModal,
    getAddress: startLedgerFlow,
  } = useLedgerGetAddress();

  // Initialize Ledger transaction signing modal
  const {
    isModalOpen: isLedgerSignModalOpen,
    signTransaction: startLedgerSignTransaction,
    closeModal: closeLedgerSignModal,
    handleComplete: handleLedgerSignCompleteDefault,
    handleError: handleLedgerSignErrorDefault,
  } = useLedgerSignTransaction();

  // Initialize Transaction Review modal
  const {
    isOpen: isTransactionModalOpen,
    transactionData,
    closeModal: closeTransactionModal,
    handleComplete: handleTransactionComplete,
    handleError: handleTransactionError,
    openModal: openTransactionModal,
  } = useTransactionReview();

  // Custom handlers to track Ledger connection state
  const handleLedgerComplete = (result: any) => {
    console.log("🎉 Ledger connection completed:", result);
    if (result.success && result.address) {
      setLedgerConnectionInfo({
        isConnected: true,
        address: result.address,
        deviceName: result.deviceName || "Ledger Device",
      });
    }
    handleLedgerCompleteDefault(result);
  };

  const handleLedgerError = (error: string) => {
    console.log("❌ Ledger connection error:", error);
    setLedgerConnectionInfo({
      isConnected: false,
    });
    handleLedgerErrorDefault(error);
  };

  // Custom handlers for Ledger transaction signing
  const handleLedgerSignComplete = (result: any) => {
    console.log("🎉 Ledger transaction signing completed:", result);
    if (result.success && result.signedTransaction) {
      console.log(
        "✅ Transaction signed successfully:",
        result.signedTransaction
      );
      // You can add additional logic here, like broadcasting the transaction
    }
    handleLedgerSignCompleteDefault(result);
  };

  const handleLedgerSignError = (error: string) => {
    console.log("❌ Ledger transaction signing error:", error);
    handleLedgerSignErrorDefault(error);
  };

  // Set up the global trigger function for the voice agent
  useEffect(() => {
    (window as any).__triggerLedgerModal = () => {
      console.log("🔐 APP: Voice agent triggered Ledger modal");
      console.log(
        "🔗 APP: Checking for __ledgerConnectionPromise:",
        !!(window as any).__ledgerConnectionPromise
      );
      console.log(
        "📋 APP: Promise details:",
        (window as any).__ledgerConnectionPromise
      );

      // Simply open the modal - it will handle the promise resolution
      console.log("🚀 APP: Opening Ledger modal...");
      startLedgerFlow().catch((error) => {
        console.error("❌ APP: Failed to start Ledger flow:", error);
      });
    };

    // Set up global transaction modal trigger
    (window as any).__triggerTransactionModal = (transactionData: any) => {
      console.log("💸 APP: Voice agent triggered Transaction modal");
      console.log("📋 APP: Transaction data:", transactionData);
      console.log(
        "🔗 APP: Checking for __transactionReviewPromise:",
        !!(window as any).__transactionReviewPromise
      );

      // Open our custom transaction modal
      console.log("🚀 APP: Opening Transaction Review modal...");
      openTransactionModal(transactionData).catch((error) => {
        console.error("❌ APP: Failed to open transaction modal:", error);
      });
    };

    // Set up global Ledger transaction signing trigger
    (window as any).__triggerLedgerSignTransaction = (transactionData: any) => {
      console.log("✍️ APP: Voice agent triggered Ledger transaction signing");
      console.log("📋 APP: Transaction data:", transactionData);
      console.log(
        "🔗 APP: Checking for __ledgerSignPromise:",
        !!(window as any).__ledgerSignPromise
      );

      // Store the transaction data for the modal
      setCurrentTransactionToSign(transactionData);

      // Open Ledger signing modal
      console.log("🚀 APP: Opening Ledger signing modal...");
      startLedgerSignTransaction(transactionData).catch((error) => {
        console.error("❌ APP: Failed to start Ledger signing:", error);
      });
    };

    // Cleanup on unmount (but don't clean up the promises here as they might be in use)
    return () => {
      delete (window as any).__triggerLedgerModal;
      delete (window as any).__triggerTransactionModal;
      delete (window as any).__triggerLedgerSignTransaction;
      // Don't delete promises here as it causes timing issues
    };
  }, []); // Remove dependencies to prevent premature cleanup

  // Get user's embedded wallet
  const userWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

  // Configure CCTP wallet provider when Privy is authenticated
  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      const walletProvider: WalletProvider = {
        getSigner: async () => {
          if (!authenticated || !wallets.length) {
            throw new Error("No authenticated wallet available");
          }

          const wallet = wallets[0];

          // Get the Ethereum provider from the wallet
          let provider;

          try {
            // Use getEthereumProvider() method which is the standard way to get provider from Privy wallets
            provider = await wallet.getEthereumProvider();
          } catch (error) {
            throw new Error(
              `Failed to get provider from wallet: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }

          if (!provider) {
            throw new Error("No valid provider found for wallet");
          }

          const { BrowserProvider } = await import("ethers");
          const ethersProvider = new BrowserProvider(provider);
          return ethersProvider.getSigner();
        },
        switchChain: async (chainId: number) => {
          if (!authenticated || !wallets.length) {
            throw new Error("No authenticated wallet available");
          }
          const wallet = wallets[0];
          await wallet.switchChain(chainId);
        },
        sendTransaction: sendTransaction, // Add Privy's sendTransaction function
        isPrivy: true,
      };

      cctpService.setWalletProvider(walletProvider);
    }
  }, [authenticated, wallets, sendTransaction]);

  // Auto-connect to Voice Agent upon Privy authentication
  useEffect(() => {
    if (
      authenticated &&
      userWallet &&
      sessionStatus === "DISCONNECTED" &&
      !manualDisconnect
    ) {
      connectToRealtime();
    }
  }, [authenticated, userWallet, sessionStatus, manualDisconnect]);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    if (dcRef.current && dcRef.current.readyState === "open") {
      logClientEvent(eventObj, eventNameSuffix);
      dcRef.current.send(JSON.stringify(eventObj));
    } else {
      logClientEvent(
        { attemptedEvent: eventObj.type },
        "error.data_channel_not_open"
      );
      console.error(
        "Failed to send message - no data channel available",
        eventObj
      );
    }
  };

  const handleServerEventRef = useHandleServerEvent({
    setSessionStatus,
    selectedAgentName,
    selectedAgentConfigSet,
    sendClientEvent,
    setSelectedAgentName,
    setIsOutputAudioBufferActive,
    userContext:
      authenticated && user && userWallet
        ? {
            userId: user.id,
            walletAddress: userWallet.address,
          }
        : undefined,
  });

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    // Only update session if user is authenticated and has a wallet
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName &&
      authenticated &&
      userWallet
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(true);
    }
  }, [
    selectedAgentConfigSet,
    selectedAgentName,
    sessionStatus,
    authenticated,
    userWallet,
  ]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      console.log(
        `[PTT] Mode changed - isPTTActive=${isPTTActive}, sessionStatus=${sessionStatus}, updating session...`
      );
      updateSession();
    } else {
      console.log(
        `[PTT] Mode changed but not connected - isPTTActive=${isPTTActive}, sessionStatus=${sessionStatus}`
      );
    }
  }, [isPTTActive]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!authenticated && sessionStatus !== "DISCONNECTED") {
      disconnectFromRealtime();
    }
  }, [authenticated]);

  // Clear Ledger connection state when user logs out
  useEffect(() => {
    if (!authenticated) {
      setLedgerConnectionInfo({
        isConnected: false,
      });
    }
  }, [authenticated]);

  // The modal now handles all Ledger operations internally
  // No need for transcript monitoring since the voice agent will trigger the modal directly

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    if (sessionStatus !== "DISCONNECTED") return;
    setSessionStatus("CONNECTING");

    try {
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) {
        return;
      }

      if (!audioElementRef.current) {
        audioElementRef.current = document.createElement("audio");
      }
      audioElementRef.current.autoplay = isAudioPlaybackEnabled;

      const { pc, dc } = await createRealtimeConnection(
        EPHEMERAL_KEY,
        audioElementRef,
        urlCodec
      );
      pcRef.current = pc;
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        logClientEvent({}, "data_channel.open");
      });
      dc.addEventListener("close", () => {
        logClientEvent({}, "data_channel.close");
      });
      dc.addEventListener("error", (err: any) => {
        logClientEvent({ error: err }, "data_channel.error");
      });
      dc.addEventListener("message", (e: MessageEvent) => {
        handleServerEventRef.current(JSON.parse(e.data));
      });

      setDataChannel(dc);
    } catch (err) {
      console.error("Error connecting to realtime:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    console.log("Disconnecting from realtime...");

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) {
          sender.track.stop();
        }
      });

      pcRef.current.close();
      pcRef.current = null;
    }
    setDataChannel(null);
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);

    logClientEvent({}, "disconnected");

    console.log(
      "Disconnected. Wake word detection will restart via useEffect."
    );
    // Wake word detection will restart automatically via useEffect when sessionStatus becomes "DISCONNECTED"
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          id,
          type: "message",
          role: "user",
          content: [{ type: "input_text", text }],
        },
      },
      "(simulated user text message)"
    );
    sendClientEvent(
      { type: "response.create" },
      "(trigger response after simulated user text message)"
    );
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Clear all audio buffers when updating session
    sendClientEvent(
      { type: "input_audio_buffer.clear" },
      "clear audio buffer on session update"
    );

    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    const turnDetection = isPTTActive
      ? null
      : {
          type: "server_vad",
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    const instructions = currentAgent?.instructions || "";
    const tools = currentAgent?.tools || [];

    const sessionUpdateEvent = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "sage",
        input_audio_transcription: { model: "whisper-1" },
        turn_detection: turnDetection,
        tools,
      },
    };

    console.log(
      `[updateSession] isPTTActive=${isPTTActive}, turnDetection=`,
      turnDetection
    );
    sendClientEvent(
      sessionUpdateEvent,
      `session update (PTT: ${isPTTActive ? "ON" : "OFF"})`
    );

    // Additional buffer clearing for PTT mode changes to ensure clean state
    if (isPTTActive) {
      // When enabling PTT, ensure we clear any pending VAD state
      setTimeout(() => {
        sendClientEvent(
          { type: "input_audio_buffer.clear" },
          "clear VAD state for PTT mode"
        );
      }, 100);
    }

    if (shouldTriggerResponse) {
      sendSimulatedUserMessage("hi");
    }
  };

  const cancelAssistantSpeech = async () => {
    // Send a response.cancel if the most recent assistant conversation item is IN_PROGRESS. This implicitly does a item.truncate as well
    const mostRecentAssistantMessage = [...transcriptItems]
      .reverse()
      .find((item) => item.role === "assistant");

    if (!mostRecentAssistantMessage) {
      console.warn("can't cancel, no recent assistant message found");
      return;
    }
    if (mostRecentAssistantMessage.status === "IN_PROGRESS") {
      sendClientEvent(
        { type: "response.cancel" },
        "(cancel due to user interruption)"
      );
    }

    // Send an output_audio_buffer.cancel if the isOutputAudioBufferActive is True
    if (isOutputAudioBufferActive) {
      sendClientEvent(
        { type: "output_audio_buffer.clear" },
        "(cancel due to user interruption)"
      );
    }
  };

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    cancelAssistantSpeech();

    sendClientEvent(
      {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: userText.trim() }],
        },
      },
      "(send user text message)"
    );
    setUserText("");

    sendClientEvent({ type: "response.create" }, "(trigger response)");
  };

  const handleTalkButtonDown = () => {
    console.log(
      `[PTT] Button down - sessionStatus: ${sessionStatus}, dataChannel ready: ${
        dataChannel?.readyState === "open"
      }, isPTTActive: ${isPTTActive}`
    );

    if (sessionStatus !== "CONNECTED" || dataChannel?.readyState !== "open")
      return;
    cancelAssistantSpeech();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: "input_audio_buffer.clear" }, "clear PTT buffer");
    console.log(`[PTT] Started speaking`);
  };

  const handleTalkButtonUp = () => {
    console.log(
      `[PTT] Button up - sessionStatus: ${sessionStatus}, dataChannel ready: ${
        dataChannel?.readyState === "open"
      }, isPTTUserSpeaking: ${isPTTUserSpeaking}`
    );

    if (
      sessionStatus !== "CONNECTED" ||
      dataChannel?.readyState !== "open" ||
      !isPTTUserSpeaking
    )
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: "input_audio_buffer.commit" }, "commit PTT");
    sendClientEvent({ type: "response.create" }, "trigger response PTT");
    console.log(`[PTT] Stopped speaking, committed audio`);
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      setManualDisconnect(true);
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      setManualDisconnect(false);
      connectToRealtime();
    }
  };

  // const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const newAgentConfig = e.target.value;
  //   const url = new URL(window.location.toString());
  //   url.searchParams.set("agentConfig", newAgentConfig);
  //   window.location.replace(url.toString());
  // };

  // const handleSelectedAgentChange = (
  //   e: React.ChangeEvent<HTMLSelectElement>
  // ) => {
  //   const newAgentName = e.target.value;
  //   setSelectedAgentName(newAgentName);
  // };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    } else {
      // Default to push-to-talk enabled
      setIsPTTActive(true);
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  // const agentSetKey = searchParams.get("agentConfig") || "default";

  // Show loading while Privy initializes
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm p-10 rounded-3xl shadow-2xl max-w-md w-full border border-gray-200">
          <div className="text-center">
            {/* Welcome Text and Logo */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to
              </h1>
              <div className="mb-4">
                <Image
                  src="/logo_pooleth.svg"
                  alt="Pooleth"
                  width={200}
                  height={47}
                  className="mx-auto h-12 w-auto"
                />
              </div>
              <p className="text-gray-600 leading-relaxed">
                Your egg-celent crypto CFO assistant. Sign in to get started
                with voice-powered portfolio management.
              </p>
            </div>

            {/* Sign In Button */}
            <button
              onClick={login}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              Sign In to Continue
            </button>

            {/* Info Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-700 font-medium mb-1">
                🔐 Secure Wallet Creation
              </p>
              <p className="text-xs text-blue-600">
                Privy will create a secure wallet for you automatically
              </p>
            </div>

            {/* Features */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Voice-enabled blockchain interactions
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Secure embedded wallet management
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                Real-time blockchain assistant
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-base flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 relative">
      {/* Modern Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 max-md:px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/pooleth-hero.svg"
              alt="Pooleth Hero"
              width={120}
              height={120}
              className="h-14 w-auto"
            />
            <Image
              src="/logo_pooleth.svg"
              alt="Pooleth Logo"
              width={132}
              height={47}
              className="h-11 w-auto"
            />
            {/* Removed as per instructions */}
          </div>

          {/* User Information */}
          <div className="flex items-center space-x-4">
            <div className="text-right max-sm:text-left">
              {(user?.email?.address || user?.phone?.number) && (
                <div className="text-sm font-medium text-gray-700">
                  {user?.email?.address || user?.phone?.number}
                </div>
              )}
              {userWallet && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 font-mono">
                  {/* Privy Wallet Address with Logo */}
                  <div className="flex items-center space-x-1.5">
                    <Image
                      src="/Privy_Symbol_Black.png"
                      alt="Privy"
                      width={16}
                      height={16}
                      className="h-4 w-4 object-contain"
                    />
                    <span className="text-gray-600 font-medium">Privy</span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">
                    {`${userWallet.address.slice(
                      0,
                      6
                    )}...${userWallet.address.slice(-4)}`}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userWallet.address);
                      // Simple feedback - replace icon with checkmark
                      const button =
                        document.activeElement as HTMLButtonElement;
                      const originalHTML = button.innerHTML;
                      button.innerHTML = "✓";
                      button.style.color = "rgb(34, 197, 94)"; // green color
                      setTimeout(() => {
                        button.innerHTML = originalHTML;
                        button.style.color = "";
                      }, 1000);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy Privy address"
                  >
                    <svg
                      className="w-3 h-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              )}

              {/* Ledger Connection Indicator */}
              {ledgerConnectionInfo.isConnected && (
                <div className="flex items-center space-x-2 text-xs text-green-600 font-mono mt-1">
                  <div className="flex items-center space-x-1.5">
                    <div className="relative flex items-center">
                      <Image
                        src="/ledger_horizontal.svg"
                        alt="Ledger"
                        width={32}
                        height={16}
                        className="h-4 w-auto object-contain"
                      />
                      {/* Green connection dot */}
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white shadow-sm"></div>
                    </div>
                    <span className="text-green-700 font-medium">
                      {ledgerConnectionInfo.deviceName}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-green-600">
                    {ledgerConnectionInfo.address
                      ? `${ledgerConnectionInfo.address.slice(
                          0,
                          6
                        )}...${ledgerConnectionInfo.address.slice(-4)}`
                      : ledgerConnectionInfo.address}
                  </span>
                  <button
                    onClick={() => {
                      if (ledgerConnectionInfo.address) {
                        navigator.clipboard.writeText(
                          ledgerConnectionInfo.address
                        );
                        // Simple feedback - replace icon with checkmark
                        const button =
                          document.activeElement as HTMLButtonElement;
                        const originalHTML = button.innerHTML;
                        button.innerHTML = "✓";
                        button.style.color = "rgb(34, 197, 94)"; // green color
                        setTimeout(() => {
                          button.innerHTML = originalHTML;
                          button.style.color = "";
                        }, 1000);
                      }
                    }}
                    className="p-1 hover:bg-green-50 rounded transition-colors"
                    title="Copy Ledger address"
                  >
                    <svg
                      className="w-3 h-3 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 gap-6 p-6 overflow-hidden max-md:gap-4 max-md:p-4 max-sm:flex-col">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          downloadRecording={downloadRecording}
          canSend={
            sessionStatus === "CONNECTED" &&
            dcRef.current?.readyState === "open"
          }
        />

        <Events isExpanded={isEventsPaneExpanded} />
      </div>

      <BottomToolbar
        sessionStatus={sessionStatus}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
      />

      {/* Ledger Hardware Wallet Address Modal */}
      <LedgerGetAddressModal
        isOpen={isLedgerGetAddressModalOpen}
        onClose={closeLedgerModal}
        onComplete={handleLedgerComplete}
        onError={handleLedgerError}
      />

      {/* Transaction Review Modal */}
      <TransactionReviewModal
        isOpen={isTransactionModalOpen}
        transactionData={transactionData}
        onClose={closeTransactionModal}
        onConfirm={handleTransactionComplete}
        onError={handleTransactionError}
      />

      {/* Ledger Transaction Signing Modal */}
      {currentTransactionToSign && (
        <LedgerSignTransactionModal
          isOpen={isLedgerSignModalOpen}
          onClose={() => {
            closeLedgerSignModal();
            setCurrentTransactionToSign(null);
          }}
          transaction={currentTransactionToSign}
          derivationPath="44'/60'/0'/0/0"
          onComplete={handleLedgerSignComplete}
          onError={handleLedgerSignError}
        />
      )}
    </div>
  );
}
