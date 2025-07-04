"use client";

import React, { useRef, useEffect } from "react";
import { useEvent } from "@/app/contexts/EventContext";
import { LoggedEvent } from "@/app/types";

export interface EventsProps {
  isExpanded: boolean;
}

function Events({ isExpanded }: EventsProps) {
  const eventLogsContainerRef = useRef<HTMLDivElement | null>(null);
  const prevEventCountRef = useRef(0);

  const { loggedEvents, toggleExpand } = useEvent();

  const getDirectionArrow = (direction: string) => {
    if (direction === "client")
      return { symbol: "↑", color: "#3b82f6", bgColor: "#eff6ff" }; // Blue
    if (direction === "server")
      return { symbol: "↓", color: "#10b981", bgColor: "#f0fdf4" }; // Green
    return { symbol: "•", color: "#6b7280", bgColor: "#f9fafb" }; // Gray
  };

  useEffect(() => {
    const hasNewEvent = loggedEvents.length > prevEventCountRef.current;

    if (isExpanded && hasNewEvent && eventLogsContainerRef.current) {
      eventLogsContainerRef.current.scrollTop =
        eventLogsContainerRef.current.scrollHeight;
    }

    // Update ref with current count
    prevEventCountRef.current = loggedEvents.length;
  }, [loggedEvents.length, isExpanded]); // Only depend on length, not the array itself

  return (
    <div
      className={
        (isExpanded
          ? "w-1/2 overflow-auto max-sm:w-full max-sm:h-80"
          : "w-0 overflow-hidden opacity-0") +
        " transition-all rounded-2xl duration-300 ease-in-out flex-col bg-white shadow-lg border border-gray-200"
      }
      ref={eventLogsContainerRef}
    >
      {isExpanded && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-white border-b border-gray-100 rounded-t-2xl max-sm:px-4">
            <h2 className="text-lg font-semibold text-gray-800">Logs</h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-3 text-xs max-sm:space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600 max-sm:hidden">Client</span>
                  <span className="text-gray-600 sm:hidden">C</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-gray-600 max-sm:hidden">Server</span>
                  <span className="text-gray-600 sm:hidden">S</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logs Container */}
          <div className="flex-1 overflow-auto">
            {loggedEvents.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 px-4">
                <div className="text-center">
                  <div className="text-sm font-medium">No logs yet</div>
                  <div className="text-xs mt-1">
                    Events will appear here once you connect
                  </div>
                </div>
              </div>
            ) : (
              loggedEvents.map((log, index) => {
                const arrowInfo = getDirectionArrow(log.direction);
                const isError =
                  log.eventName.toLowerCase().includes("error") ||
                  log.eventData?.response?.status_details?.error != null;

                const isLast = index === loggedEvents.length - 1;

                return (
                  <div
                    key={log.id}
                    className={`border-b border-gray-100 last:border-b-0 ${
                      isLast ? "bg-blue-50" : "hover:bg-gray-50"
                    } transition-colors`}
                  >
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="px-6 py-4 cursor-pointer max-sm:px-4 max-sm:py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0 max-sm:space-x-2">
                          {/* Direction Indicator */}
                          <div
                            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium max-sm:w-5 max-sm:h-5"
                            style={{
                              color: arrowInfo.color,
                              backgroundColor: arrowInfo.bgColor,
                            }}
                          >
                            {arrowInfo.symbol}
                          </div>

                          {/* Event Name */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium truncate max-sm:text-xs ${
                                isError ? "text-red-600" : "text-gray-800"
                              }`}
                            >
                              {log.eventName}
                            </div>
                            {isError && (
                              <div className="text-xs text-red-500 mt-1 max-sm:text-[10px]">
                                Error detected
                              </div>
                            )}
                          </div>

                          {/* Expand/Collapse Indicator */}
                          {log.eventData && (
                            <div className="flex items-center">
                              <svg
                                className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 max-sm:w-3 max-sm:h-3 ${
                                  log.expanded ? "rotate-90" : "rotate-0"
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="text-xs text-gray-500 font-mono ml-4 whitespace-nowrap max-sm:ml-2 max-sm:text-[10px] max-sm:hidden">
                          {log.timestamp}
                        </div>
                      </div>

                      {/* Mobile timestamp */}
                      <div className="text-xs text-gray-500 font-mono mt-2 sm:hidden">
                        {log.timestamp}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {log.expanded && log.eventData && (
                      <div className="px-6 pb-4 max-sm:px-4 max-sm:pb-3">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-sm:p-3">
                          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words overflow-x-auto max-sm:text-[10px]">
                            {JSON.stringify(log.eventData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Events;
