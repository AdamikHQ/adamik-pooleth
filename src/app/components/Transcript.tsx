"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-white min-h-0 rounded-2xl shadow-lg border border-gray-200">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-white border-b border-gray-100 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-800">Conversation</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyTranscript}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ClipboardCopyIcon className="w-4 h-4" />
              <span>{justCopied ? "Copied!" : "Copy"}</span>
            </button>
            <button
              onClick={downloadRecording}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Download Audio</span>
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div
          ref={transcriptRef}
          className="overflow-auto p-6 flex flex-col gap-y-6 h-full scroll-smooth"
        >
          {transcriptItems.map((item) => {
            const {
              itemId,
              type,
              role,
              data,
              expanded,
              timestamp,
              title = "",
              isHidden,
              guardrailResult,
            } = item;

            if (isHidden) {
              return null;
            }

            if (type === "MESSAGE") {
              const isUser = role === "user";
              const containerClasses = `flex ${
                isUser ? "justify-end" : "justify-start"
              } mb-1`;

              const isBracketedMessage =
                title.startsWith("[") && title.endsWith("]");
              const messageStyle = isBracketedMessage
                ? "italic text-gray-500"
                : "";
              const displayTitle = isBracketedMessage
                ? title.slice(1, -1)
                : title;

              return (
                <div key={itemId} className={containerClasses}>
                  <div className={`max-w-lg ${isUser ? "ml-12" : "mr-12"}`}>
                    {/* Message Bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isUser
                          ? "bg-blue-600 text-white rounded-br-lg"
                          : "bg-gray-100 text-gray-800 rounded-bl-lg"
                      } ${guardrailResult ? "rounded-b-lg" : ""} shadow-sm`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        <ReactMarkdown
                          className={messageStyle}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 last:mb-0">{children}</p>
                            ),
                            code: ({ children }) => (
                              <code
                                className={`px-1 py-0.5 rounded text-xs font-mono ${
                                  isUser ? "bg-blue-500" : "bg-gray-200"
                                }`}
                              >
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre
                                className={`p-3 rounded-lg text-xs font-mono overflow-x-auto ${
                                  isUser ? "bg-blue-500" : "bg-gray-200"
                                }`}
                              >
                                {children}
                              </pre>
                            ),
                          }}
                        >
                          {displayTitle}
                        </ReactMarkdown>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div
                      className={`mt-1 px-2 ${
                        isUser ? "text-right" : "text-left"
                      }`}
                    >
                      <span className="text-xs text-gray-400 font-mono">
                        {timestamp}
                      </span>
                    </div>

                    {/* Guardrail Result */}
                    {guardrailResult && (
                      <div
                        className={`mt-2 ${
                          isUser ? "text-right" : "text-left"
                        }`}
                      >
                        <div className="inline-block bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-xl">
                          <GuardrailChip guardrailResult={guardrailResult} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div
                  key={itemId}
                  className="flex flex-col justify-center items-center text-gray-500 text-sm my-4"
                >
                  <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-gray-400">
                        {timestamp}
                      </span>
                      <div
                        className={`flex items-center text-sm font-medium text-gray-600 ${
                          data ? "cursor-pointer hover:text-gray-800" : ""
                        }`}
                        onClick={() =>
                          data && toggleTranscriptItemExpand(itemId)
                        }
                      >
                        {data && (
                          <span
                            className={`text-gray-400 mr-2 transform transition-transform duration-200 select-none ${
                              expanded ? "rotate-90" : "rotate-0"
                            }`}
                          >
                            ▶
                          </span>
                        )}
                        {title}
                      </div>
                    </div>
                  </div>
                  {expanded && data && (
                    <div className="mt-4 w-full max-w-2xl">
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words overflow-x-auto">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              // Fallback for unknown types
              return (
                <div
                  key={itemId}
                  className="flex justify-center items-center my-2"
                >
                  <div className="bg-red-50 border border-red-200 px-4 py-2 rounded-xl">
                    <span className="text-sm text-red-600 font-medium">
                      Unknown item type: {type}
                    </span>
                    <span className="ml-2 text-xs text-red-400">
                      {timestamp}
                    </span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>

      {/* Message Input */}
      <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
        <div className="flex items-center space-x-4 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <input
            ref={inputRef}
            type="text"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSend) {
                onSendMessage();
              }
            }}
            className="flex-1 px-2 py-2 text-sm bg-transparent border-none outline-none placeholder-gray-400"
            placeholder="Type your message..."
          />
          <button
            onClick={onSendMessage}
            disabled={!canSend || !userText.trim()}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Image src="arrow.svg" alt="Send" width={20} height={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Transcript;
