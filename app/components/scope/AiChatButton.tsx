/**
 * AI Chat Button Component
 * Floating action button to open AI chat modal
 * Shows different states based on API key availability
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/translation';
import { AiService } from '@/app/services/aiService';

interface AiChatButtonProps {
  onClick: () => void;
}

export function AiChatButton({ onClick }: AiChatButtonProps) {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { t } = useTranslation();

  const aiService = useMemo(() => new AiService(), []);

  // případné další hooky nebo logika

  const checkApiKey = useCallback(async () => {
    try {
      setIsLoading(true);
      const hasKey = await aiService.hasApiKey();
      setHasApiKey(hasKey);
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasApiKey(false);
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  if (isLoading) {
    return (
      <button
        className="fixed bottom-6 right-24 w-16 h-16 text-white rounded-full shadow-lg bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-50 flex items-center justify-center z-50"
        disabled
        aria-label={t("loading")}
      >
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-24 w-16 h-16 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center group z-50 ${
        hasApiKey
          ? 'cursor-pointer opacity-100 outline outline-2 outline-gray-500'
          : 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-50'
      }`}
          style={{
            filter: 'drop-shadow(-8px -10px 46px #0000005f)',
            backdropFilter: 'brightness(1.1) blur(2px) url(#displacementFilter)',
            WebkitBackdropFilter: 'brightness(1.1) blur(2px) url(#displacementFilter)',
          }}
      aria-label={hasApiKey ? t("askAi") : t("aiRequiresApiKey")}
      disabled={!hasApiKey}
      title={hasApiKey ? t("askAi") : t("setApiKeyInProfile")}
    >
      <span className="sr-only">Ask AI</span>
      <svg
        className={`w-6 h-6 transition-transform duration-200 ${
          hasApiKey ? 'group-hover:rotate-12' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {!hasApiKey && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">!</span>
        </div>
      )}
    </button>
  );
} 