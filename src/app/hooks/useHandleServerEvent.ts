"use client";

import { useRef } from "react";
import { ServerEvent, SessionStatus, AgentConfig } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useSendTransaction } from "@privy-io/react-auth";

export interface UseHandleServerEventParams {
  setSessionStatus: (status: SessionStatus) => void;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  setSelectedAgentName: (name: string) => void;
  shouldForceResponse?: boolean;
  setIsOutputAudioBufferActive: (active: boolean) => void;
  userContext?: { userId: string; walletAddress?: string };
}

export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
  setIsOutputAudioBufferActive,
  userContext,
}: UseHandleServerEventParams) {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  const { sendTransaction } = useSendTransaction();

  const assistantDeltasRef = useRef<{ [itemId: string]: string }>({});

  const handleFunctionCall = async (functionCallParams: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    const args = JSON.parse(functionCallParams.arguments);
    const currentAgent = selectedAgentConfigSet?.find(
      (a) => a.name === selectedAgentName
    );

    addTranscriptBreadcrumb(`function call: ${functionCallParams.name}`, args);

    if (currentAgent?.toolLogic?.[functionCallParams.name]) {
      const fn = currentAgent.toolLogic[functionCallParams.name];
      const fnResult = await fn(
        args,
        transcriptItems,
        addTranscriptBreadcrumb,
        userContext
      );
      addTranscriptBreadcrumb(
        `function call result: ${functionCallParams.name}`,
        fnResult
      );

      // Handle transaction requests from requestUserSignature
      if (functionCallParams.name === "requestUserSignature") {
        try {
          const resultText = fnResult.content?.[0]?.text || "{}";

          // Try to parse the result
          let result;
          try {
            result = JSON.parse(resultText);
          } catch (parseError) {
            console.error(
              "Failed to parse requestUserSignature result:",
              resultText
            );

            // If it's an error message, show it to the user
            if (resultText.startsWith("Error:")) {
              sendClientEvent({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: functionCallParams.call_id,
                  output: resultText,
                },
              });
              sendClientEvent({ type: "response.create" });
              return;
            }
            throw parseError;
          }

          if (result.type === "transaction_request" && result.data) {
            // Use Privy's sendTransaction for EVM transaction handling
            try {
              const transactionData = result.data;
              const { to, value, chainId, data, gasLimit } = transactionData;

              if (!to) {
                throw new Error("No recipient address found");
              }

              if (!value && value !== 0) {
                throw new Error("No transaction value found");
              }

              // Build transaction request for Privy
              const transactionRequest = {
                to,
                value: value.toString(),
                ...(data && { data }),
                ...(gasLimit && { gasLimit }),
              };

              // Use Privy's sendTransaction
              const transactionResult = await sendTransaction(
                transactionRequest,
                {
                  address: userContext?.walletAddress,
                }
              );

              console.log("Transaction successful:", transactionResult.hash);

              // Send successful response back to the agent
              sendClientEvent({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: functionCallParams.call_id,
                  output: JSON.stringify({
                    success: true,
                    transactionHash: transactionResult.hash,
                    to: to,
                    value: value,
                    chainId: chainId,
                  }),
                },
              });
              sendClientEvent({ type: "response.create" });
              return;
            } catch (error) {
              console.error("Transaction failed:", error);

              // Send error response back to the agent
              sendClientEvent({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: functionCallParams.call_id,
                  output: JSON.stringify({
                    success: false,
                    error:
                      error instanceof Error ? error.message : String(error),
                    details:
                      "Transaction failed. Please check your wallet and try again.",
                  }),
                },
              });
              sendClientEvent({ type: "response.create" });
              return;
            }
          }
        } catch (error) {
          console.error("Error handling transaction request:", error);
        }
      }

      // Custom user-friendly message for createWallet
      if (functionCallParams.name === "createWallet") {
        let userMessage = "";
        try {
          const result = JSON.parse(fnResult.content?.[0]?.text || "{}{}");
          if (result.wallet && typeof result.alreadyExisted === "boolean") {
            if (result.alreadyExisted) {
              userMessage = `You already have a ${
                result.requestedChain
              } wallet. The wallet address starts with ${result.wallet.address.slice(
                0,
                4
              )} and ends with ${result.wallet.address.slice(-3)}.`;
            } else {
              userMessage = `Your new ${
                result.requestedChain
              } wallet has been successfully created! The wallet address starts with ${result.wallet.address.slice(
                0,
                4
              )} and ends with ${result.wallet.address.slice(-3)}.`;
            }
          } else {
            userMessage = fnResult.content?.[0]?.text || "";
          }
        } catch {
          userMessage = fnResult.content?.[0]?.text || "";
        }
        sendClientEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: functionCallParams.call_id,
            output: userMessage,
          },
        });
        sendClientEvent({ type: "response.create" });
        return;
      }

      // Default: send raw JSON/text for other tools
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(fnResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    } else if (functionCallParams.name === "transferAgents") {
      const destinationAgent = args.destination_agent;
      const newAgentConfig =
        selectedAgentConfigSet?.find((a) => a.name === destinationAgent) ||
        null;
      if (newAgentConfig) {
        setSelectedAgentName(destinationAgent);
      }
      const functionCallOutput = {
        destination_agent: destinationAgent,
        did_transfer: !!newAgentConfig,
      };
      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(functionCallOutput),
        },
      });
      addTranscriptBreadcrumb(
        `function call: ${functionCallParams.name} response`,
        functionCallOutput
      );
    } else {
      const simulatedResult = { result: true };
      addTranscriptBreadcrumb(
        `function call fallback: ${functionCallParams.name}`,
        simulatedResult
      );

      sendClientEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: functionCallParams.call_id,
          output: JSON.stringify(simulatedResult),
        },
      });
      sendClientEvent({ type: "response.create" });
    }
  };

  const handleServerEvent = (serverEvent: ServerEvent) => {
    logServerEvent(serverEvent);

    switch (serverEvent.type) {
      case "session.created": {
        if (serverEvent.session?.id) {
          setSessionStatus("CONNECTED");
          addTranscriptBreadcrumb(
            `session.id: ${
              serverEvent.session.id
            }\nStarted at: ${new Date().toLocaleString()}`
          );
        }
        break;
      }

      case "output_audio_buffer.started": {
        setIsOutputAudioBufferActive(true);
        break;
      }
      case "output_audio_buffer.stopped": {
        setIsOutputAudioBufferActive(false);
        break;
      }

      case "conversation.item.created": {
        let text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          "";
        const role = serverEvent.item?.role as "user" | "assistant";
        const itemId = serverEvent.item?.id;

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          // don't add transcript message if already exists
          break;
        }

        if (itemId && role) {
          if (role === "user" && !text) {
            text = "[Transcribing...]";
          }
          addTranscriptMessage(itemId, role, text);
        }
        break;
      }

      case "conversation.item.input_audio_transcription.completed": {
        const itemId = serverEvent.item_id;
        const finalTranscript =
          !serverEvent.transcript || serverEvent.transcript === "\n"
            ? "[inaudible]"
            : serverEvent.transcript;
        if (itemId) {
          updateTranscriptMessage(itemId, finalTranscript, false);
        }
        break;
      }

      case "response.audio_transcript.delta": {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || "";
        if (itemId) {
          // Update the transcript message with the new text.
          updateTranscriptMessage(itemId, deltaText, true);

          // Accumulate the deltas and run the output guardrail at regular intervals.
          if (!assistantDeltasRef.current[itemId]) {
            assistantDeltasRef.current[itemId] = "";
          }
          assistantDeltasRef.current[itemId] += deltaText;
        }
        break;
      }

      case "response.done": {
        if (serverEvent.response?.output) {
          serverEvent.response.output.forEach((outputItem) => {
            if (
              outputItem.type === "function_call" &&
              outputItem.name &&
              outputItem.arguments
            ) {
              handleFunctionCall({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              }).catch(() => {});
            }
          });
        }
        break;
      }

      case "response.output_item.done": {
        const itemId = serverEvent.item?.id;
        if (itemId) {
          updateTranscriptItem(itemId, { status: "DONE" });
        }
        break;
      }

      default:
        break;
    }
  };

  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}
