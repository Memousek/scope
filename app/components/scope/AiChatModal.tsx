/**
 * AI Chat Modal Component
 * - Modal s chat interface
 * - Připraveno pro napojení na AI API
 */

import { useState } from "react";
import { FiMessageCircle } from "react-icons/fi";
import { Modal } from "@/app/components/ui/Modal";
import { useTranslation } from "@/lib/translation";

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
}

export function AiChatModal({ isOpen, onClose }: AiChatModalProps) {
  const [chatMessage, setChatMessage] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const { t } = useTranslation();

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    setIsAiTyping(true);
    setChatMessage("");

    setTimeout(() => {
      setIsAiTyping(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("aichat")}
      icon={<FiMessageCircle className="w-6 h-6" />}
    >
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <FiMessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-3 ">
              <p className="text-sm">
                Hi im your personal AI project manager.
              </p>
            </div>
          </div>

          {isAiTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <FiMessageCircle className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your scope..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            rows={2}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatMessage.trim() || isAiTyping}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
            Send
          </button>
        </div>
      </div>
    </Modal>
  );
}
