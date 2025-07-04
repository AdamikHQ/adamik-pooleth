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
  codec: string;
  onCodecChange: (newCodec: string) => void;
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
  codec,
  onCodecChange,
}: BottomToolbarProps) {
  const isConnected = sessionStatus === "CONNECTED";
  const isConnecting = sessionStatus === "CONNECTING";

  const handleCodecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCodec = e.target.value;
    onCodecChange(newCodec);
  };

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

          {/* Codec Selection */}
          <div className="flex items-center space-x-3 max-sm:w-full">
            <label className="text-sm font-medium text-gray-700 max-sm:w-16 max-sm:flex-shrink-0">
              Codec
            </label>
            <div className="relative max-sm:flex-1">
              <select
                id="codec-select"
                value={codec}
                onChange={handleCodecChange}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer min-w-[140px] max-sm:w-full max-sm:min-w-0"
              >
                <option value="opus">Opus (48 kHz)</option>
                <option value="pcmu">PCMU (8 kHz)</option>
                <option value="pcma">PCMA (8 kHz)</option>
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
        </div>
      </div>
    </footer>
  );
}

export default BottomToolbar;
