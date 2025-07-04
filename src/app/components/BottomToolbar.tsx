import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomToolbarProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isPTTActive: boolean;
  setIsPTTActive: (val: boolean) => void;
  isPTTUserSpeaking: boolean;
  handleTalkButtonDown: () => void;
  handleTalkButtonUp: () => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (val: boolean) => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (val: boolean) => void;
}

function BottomToolbar({
  sessionStatus,
  onToggleConnection,
  isPTTActive,
  setIsPTTActive,
  isPTTUserSpeaking,
  handleTalkButtonDown,
  handleTalkButtonUp,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  function getConnectionButtonLabel() {
    if (isConnected) return "Disconnect";
    if (isConnecting) return "Connecting...";
    return "Connect";
  }

  function getConnectionButtonClasses() {
    const baseClasses =
      "flex items-center justify-center px-6 py-3 text-sm font-medium rounded-xl transition-all duration-200 min-w-[120px]";

    if (isConnected) {
      return `${baseClasses} bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg`;
    }
    if (isConnecting) {
      return `${baseClasses} bg-gray-400 text-white cursor-not-allowed`;
    }
    return `${baseClasses} bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg`;
  }

  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-4 max-md:px-4 max-md:py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto max-lg:flex-col max-lg:space-y-4 max-lg:items-stretch">
        {/* Connection Control */}
        <div className="flex items-center space-x-4 max-lg:justify-center">
          <button
            onClick={onToggleConnection}
            className={getConnectionButtonClasses()}
            disabled={isConnecting}
          >
            {isConnecting && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
            )}
            {getConnectionButtonLabel()}
          </button>
        </div>

        {/* Audio Controls */}
        <div className="flex items-center space-x-8 max-md:space-x-4 max-sm:flex-col max-sm:space-x-0 max-sm:space-y-4">
          {/* Push to Talk */}
          <div className="flex items-center space-x-4 bg-gray-50 px-4 py-2 rounded-xl max-sm:w-full max-sm:justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="push-to-talk"
                type="checkbox"
                checked={isPTTActive}
                onChange={(e) => setIsPTTActive(e.target.checked)}
                disabled={!isConnected}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label
                htmlFor="push-to-talk"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Push to talk
              </label>
            </div>
            <button
              onMouseDown={handleTalkButtonDown}
              onMouseUp={handleTalkButtonUp}
              onTouchStart={handleTalkButtonDown}
              onTouchEnd={handleTalkButtonUp}
              disabled={!isPTTActive}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                isPTTUserSpeaking
                  ? "bg-blue-600 text-white shadow-md"
                  : isPTTActive
                  ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {isPTTUserSpeaking ? "Speaking..." : "Talk"}
            </button>
          </div>

          {/* Audio Playback */}
          <div className="flex items-center space-x-2">
            <input
              id="audio-playback"
              type="checkbox"
              checked={isAudioPlaybackEnabled}
              onChange={(e) => setIsAudioPlaybackEnabled(e.target.checked)}
              disabled={!isConnected}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label
              htmlFor="audio-playback"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Audio playback
            </label>
          </div>
        </div>

        {/* Settings and View Controls */}
        <div className="flex items-center space-x-6 max-md:space-x-4 max-sm:flex-col max-sm:space-x-0 max-sm:space-y-4 max-sm:w-full">
          {/* Logs Toggle */}
          <div className="flex items-center space-x-2 max-sm:justify-center">
            <input
              id="logs"
              type="checkbox"
              checked={isEventsPaneExpanded}
              onChange={(e) => setIsEventsPaneExpanded(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <label
              htmlFor="logs"
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
              Show Logs
            </label>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default BottomToolbar;
