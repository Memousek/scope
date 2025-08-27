/**
 * AI Chat Button Component
 * Floating action button with authentic Apple Liquid Glass design
 * Subtle glass effects with real transparency and reflections
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

  // Check API key availability
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
      className={`fixed bottom-6 right-24 w-16 h-16 text-white rounded-full transition-all duration-500 flex items-center justify-center group z-50 ${
        hasApiKey
          ? 'cursor-pointer'
          : 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed opacity-50'
      }`}
      style={{
        background: hasApiKey ? 'transparent' : undefined,
        backdropFilter: hasApiKey ? 'blur(40px) saturate(180%)' : undefined,
        WebkitBackdropFilter: hasApiKey ? 'blur(40px) saturate(180%)' : undefined,
      }}
      aria-label={hasApiKey ? t("askAi") : t("aiRequiresApiKey")}
      disabled={!hasApiKey}
      title={hasApiKey ? t("askAi") : t("setApiKeyInProfile")}
    >
      {/* Authentic Apple Liquid Glass */}
      {hasApiKey && (
        <>
          {/* Subtle purple-blue tint */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(147, 51, 234, 0.08) 0%, 
                  rgba(59, 130, 246, 0.06) 50%, 
                  rgba(147, 51, 234, 0.04) 100%)
              `,
            }}
          />

          {/* Real background reflection */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            {/* Primary light reflection */}
            <div 
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(circle at 30% 25%, rgba(255,255,255,0.3) 0%, transparent 40%),
                  radial-gradient(circle at 70% 75%, rgba(255,255,255,0.2) 0%, transparent 45%)
                `,
                filter: 'blur(0.5px)',
                animation: 'subtleReflection 8s ease-in-out infinite',
              }}
            />
            
            {/* Secondary reflection */}
            <div 
              className="absolute inset-0"
              style={{
                background: `
                  linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 35%),
                  radial-gradient(circle at 60% 40%, rgba(255,255,255,0.08) 0%, transparent 50%)
                `,
                filter: 'blur(1px)',
                animation: 'secondaryReflection 12s ease-in-out infinite',
              }}
            />
          </div>

          {/* Glass surface with depth */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                linear-gradient(135deg, 
                  rgba(255,255,255,0.18) 0%, 
                  rgba(255,255,255,0.08) 25%, 
                  rgba(255,255,255,0.04) 50%, 
                  rgba(0,0,0,0.01) 75%, 
                  rgba(255,255,255,0.06) 100%)
              `,
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: `
                0 0 0 1px rgba(255,255,255,0.12),
                inset 0 2px 0 rgba(255,255,255,0.25),
                inset 0 -1px 0 rgba(0,0,0,0.05),
                0 10px 35px rgba(0,0,0,0.18),
                0 5px 20px rgba(0,0,0,0.12)
              `,
            }}
          />

          {/* Hover light interaction */}
          <div 
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: `
                radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), 
                  rgba(255,255,255,0.25) 0%, 
                  rgba(255,255,255,0.08) 30%, 
                  transparent 60%)
              `,
              filter: 'blur(2px)',
            }}
          />
        </>
      )}

      {/* Icon with glass-appropriate styling */}
      <svg
        className={`w-6 h-6 transition-all duration-500 relative z-10 ${
          hasApiKey 
            ? 'group-hover:scale-105 drop-shadow-lg' 
            : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        style={{
          filter: hasApiKey ? 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))' : undefined,
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* Warning indicator for missing API key */}
      {!hasApiKey && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-white text-xs font-bold">!</span>
        </div>
      )}

      <style jsx>{`
        @keyframes subtleReflection {
          0%, 100% {
            transform: translateX(0) translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateX(-0.3px) translateY(-0.2px);
            opacity: 0.4;
          }
        }

        @keyframes secondaryReflection {
          0%, 100% {
            transform: translateX(0) translateY(0) scale(1);
            opacity: 0.12;
          }
          50% {
            transform: translateX(0.2px) translateY(-0.1px) scale(1.01);
            opacity: 0.16;
          }
        }

        /* Mouse tracking for light interaction */
        button:hover {
          --mouse-x: 50%;
          --mouse-y: 50%;
        }
      `}</style>
    </button>
  );
} 