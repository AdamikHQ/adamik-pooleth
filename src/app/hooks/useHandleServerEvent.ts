"use client";

import { useRef } from "react";
import { ServerEvent, SessionStatus, AgentConfig } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { stringToChainId } from "@/app/config/privyChains";

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

      // Handle transaction requests from any function that returns a transaction_request
      try {
        const resultText = fnResult.content?.[0]?.text || "{}";

        // Try to parse the result
        let result;
        try {
          result = JSON.parse(resultText);
        } catch {
          console.error(
            `Failed to parse ${functionCallParams.name} result:`,
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
          // Don't throw the error, just continue with normal processing
          result = null;
        }

        // Check if any function returned a transaction_request (including nested ones)
        if (result && typeof result === "object") {
          const callId = functionCallParams.call_id || "unknown";

          // Check direct transaction_request
          if (result.type === "transaction_request" && result.data) {
            await handleTransactionRequest(result, callId);
            return;
          }

          // Check nested transaction_request (e.g., from secureFundsToLedger -> transferAssets -> sendTokenTransfer)
          if (
            result.transferResult?.type === "transaction_request" &&
            result.transferResult?.data
          ) {
            await handleTransactionRequest(result.transferResult, callId);
            return;
          }
        }
      } catch (error) {
        console.error("Error handling transaction request:", error);
      }

      // Extracted transaction handling logic
      async function handleTransactionRequest(
        transactionRequest: any,
        callId: string
      ) {
        if (
          transactionRequest.type === "transaction_request" &&
          transactionRequest.data
        ) {
          // Use our custom Transaction Review Modal instead of Privy's default modal
          try {
            const transactionData = transactionRequest.data;
            const { to, value, chainId, data, gasLimit } = transactionData;

            if (!to) {
              throw new Error("No recipient address found");
            }

            if (!value && value !== 0) {
              throw new Error("No transaction value found");
            }

            // Validate chain support
            const numericChainId = stringToChainId[chainId];

            if (!numericChainId) {
              throw new Error(
                `Chain ID "${chainId}" is not supported. Supported chains: ${Object.keys(
                  stringToChainId
                ).join(", ")}`
              );
            }

            // Prepare transaction data for our custom modal
            const modalTransactionData = {
              to,
              value: value.toString(),
              chainId,
              ...(data && { data }),
              ...(gasLimit && { gasLimit }),
              ...(transactionRequest.message && {
                description: transactionRequest.message,
              }),
            };

            console.log("💸 Triggering custom Transaction Review modal...");

            // Check if trigger function exists
            if (
              typeof (window as any).__triggerTransactionModal !== "function"
            ) {
              throw new Error(
                "Transaction modal trigger function not available"
              );
            }

            // Store promise resolvers globally so the modal can access them
            const promiseId = Math.random().toString(36).substr(2, 9);
            console.log(
              `🆔 TRANSACTION: Creating __transactionReviewPromise with ID: ${promiseId}`
            );

            const result = await new Promise<any>((resolve, reject) => {
              const promiseData = {
                resolve: (result: any) => {
                  console.log(
                    `✅ TRANSACTION: Promise ${promiseId} resolved with:`,
                    result
                  );
                  resolve(result);
                },
                reject: (error: any) => {
                  console.log(
                    `❌ TRANSACTION: Promise ${promiseId} rejected with:`,
                    error
                  );
                  reject(error);
                },
                id: promiseId,
                timeoutId: null as any,
              };

              (window as any).__transactionReviewPromise = promiseData;
              console.log(
                "📋 TRANSACTION: Promise stored globally:",
                promiseData
              );

              console.log(
                "📞 TRANSACTION: Calling __triggerTransactionModal()..."
              );
              // Trigger the modal to open
              (window as any).__triggerTransactionModal?.(modalTransactionData);

              // Set a timeout to prevent hanging
              const timeoutId = setTimeout(() => {
                console.warn(
                  `⏰ TRANSACTION: Transaction modal timed out after 60 seconds for promise ${promiseId}`
                );

                // Clean up the global promise before rejecting
                if (
                  (window as any).__transactionReviewPromise?.id === promiseId
                ) {
                  delete (window as any).__transactionReviewPromise;
                  console.log(
                    `🧹 TRANSACTION: Cleaned up timed out promise ${promiseId}`
                  );
                } else {
                  console.warn(
                    `⚠️ TRANSACTION: Promise ${promiseId} not found or already replaced at timeout`
                  );
                }

                reject(
                  new Error("Transaction modal timed out after 60 seconds")
                );
              }, 60000);

              // Store timeout ID for potential cleanup
              promiseData.timeoutId = timeoutId;
              console.log(
                `⏰ TRANSACTION: Timeout ${timeoutId} set for promise ${promiseId}`
              );
            });

            console.log("🎉 Received result from Transaction modal:", result);

            // Send successful response back to the agent
            sendClientEvent({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify({
                  success: result.success,
                  transactionHash: result.transactionHash,
                  to: modalTransactionData.to,
                  value: modalTransactionData.value,
                  chainId: modalTransactionData.chainId,
                }),
              },
            });
            sendClientEvent({ type: "response.create" });
            return;
          } catch (error: any) {
            console.error("❌ Transaction modal failed:", error);

            // Send error response back to the agent
            sendClientEvent({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : String(error),
                  details:
                    "Transaction failed. Please check your wallet and try again.",
                }),
              },
            });
            sendClientEvent({ type: "response.create" });
            return;
          }
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
