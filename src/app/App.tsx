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

function App() {
  const searchParams = useSearchParams();

  // Privy authentication hooks
  const { ready, authenticated, login, logout, user } = usePrivy();
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
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] =
    useState<boolean>(true);

  const [isOutputAudioBufferActive, setIsOutputAudioBufferActive] =
    useState<boolean>(false);
  const [manualDisconnect, setManualDisconnect] = useState(false);

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  // Get user's embedded wallet
  const userWallet = wallets.find(
    (wallet) => wallet.walletClientType === "privy"
  );

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

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentConfig = e.target.value;
    const url = new URL(window.location.toString());
    url.searchParams.set("agentConfig", newAgentConfig);
    window.location.replace(url.toString());
  };

  // const handleSelectedAgentChange = (
  //   e: React.ChangeEvent<HTMLSelectElement>
  // ) => {
  //   const newAgentName = e.target.value;
  //   setSelectedAgentName(newAgentName);
  // };

  // Instead of using setCodec, we update the URL and refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

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

  const agentSetKey = searchParams.get("agentConfig") || "default";

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
            {/* Logo */}
            <div className="mb-8">
              <Image
                src="/Adamik_logo_flat_blue.svg"
                alt="Adamik Agent"
                width={200}
                height={42}
                className="mx-auto h-12 w-auto"
              />
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Welcome to Adamik Agent
              </h1>
              <p className="text-gray-600 leading-relaxed">
                Your voice-enabled blockchain assistant. Sign in to get started
                with automated blockchain interactions.
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
                A secure embedded wallet will be automatically created for you
                upon sign in
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
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Image
              src="/Adamik_logo_flat_blue.svg"
              alt="Adamik Logo"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
            <h1 className="text-xl font-bold text-gray-900 max-sm:hidden">
              Voice Agent
            </h1>
          </div>

          <div className="flex items-center space-x-4 max-sm:space-x-2">
            <div className="flex items-center space-x-3 max-sm:space-x-2">
              <label className="text-sm font-medium text-gray-700 max-sm:hidden">
                Agent
              </label>
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer min-w-[120px] max-sm:min-w-[100px] max-sm:px-3 max-sm:py-1 max-sm:text-xs"
                  value={agentSetKey}
                  onChange={handleAgentChange}
                >
                  {Object.keys(allAgentSets).map((agentKey) => (
                    <option key={agentKey} value={agentKey}>
                      {agentKey}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* User Information */}
            <div className="flex items-center space-x-4 pl-4 border-l border-gray-200 max-sm:pl-0 max-sm:border-l-0 max-sm:border-t max-sm:pt-3 max-sm:w-full max-sm:justify-between">
              <div className="text-right max-sm:text-left">
                <div className="text-sm font-medium text-gray-700">
                  {user?.email?.address || user?.phone?.number || "User"}
                </div>
                {userWallet && (
                  <div className="text-xs text-gray-500 font-mono">
                    {userWallet.address?.slice(0, 6)}...
                    {userWallet.address?.slice(-4)}
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
        codec={urlCodec}
        onCodecChange={handleCodecChange}
      />
    </div>
  );
}

export default App;
