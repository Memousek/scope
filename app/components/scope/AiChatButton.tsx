/**
 * AI Chat Floating Action Button Component
 * - Floating action button pro otevření AI chatu
 * - Moderní design s animacemi
 * - Připraveno pro napojení na AI API
 */

interface AiChatButtonProps {
  onClick: () => void;
}

export function AiChatButton({ onClick }: AiChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="hidden cursor-not-allowed fixed bottom-6 right-24 w-16 h-16 bg-gradient-to-r from-gray-500 to-gray-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center group z-50 opacity-50"
      aria-label="Ask AI"
      disabled={true}
    >
      <span className="sr-only">Ask AI</span>
      <svg
        className="w-6 h-6 group-hover:rotate-12 transition-transform duration-200"
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
    </button>
  );
} 