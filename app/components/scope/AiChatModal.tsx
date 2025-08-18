/**
 * AI Chat Modal Component
 * Modal for AI chat interface with project management assistant
 * Supports both OpenAI and Gemini providers
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useProjects } from '@/app/hooks/useProjects';
import { useScopeRoles } from '@/app/hooks/useScopeRoles';
import { useTeam } from '@/app/hooks/useTeam';
import { useScopeUsage } from '@/app/hooks/useData';
import { useTranslation } from '@/lib/translation';
import { AiService, ChatMessage, AiAnalysisResult } from '@/app/services/aiService';
import { FiMessageCircle, FiSend, FiMinus } from 'react-icons/fi';

interface AiChatModalProps {
  onClose: () => void;
  scopeId: string;
  isOpen?: boolean;
}

interface ChatMessageDisplay {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  error?: string;
}

export function AiChatModal({ onClose, scopeId, isOpen = true }: AiChatModalProps) {
  // Floating button state
  const [panelOpen, setPanelOpen] = useState(isOpen);
  const chatButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  // Open panel when modal is mounted if isOpen is true
  useEffect(() => {
    if (isOpen) {
      setPanelOpen(true);
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  // Trap focus inside panel when open
  useEffect(() => {
    if (!panelOpen) return;
    const handleFocus = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusable = Array.from(document.querySelectorAll('.ai-chat-panel [tabindex], .ai-chat-panel button, .ai-chat-panel textarea'))
          .filter(el => !(el as HTMLElement).hasAttribute('disabled'));
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (document.activeElement === last && !e.shiftKey) {
          e.preventDefault();
          first.focus();
        } else if (document.activeElement === first && e.shiftKey) {
          e.preventDefault();
          last.focus();
        }
      }
      if (e.key === 'Escape') {
        setPanelOpen(false);
        onClose();
        chatButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleFocus);
    return () => document.removeEventListener('keydown', handleFocus);
  }, [panelOpen, onClose]);
  const {
    projects,
    loadProjects
  } = useProjects(scopeId);
  const { roles, activeRoles } = useScopeRoles(scopeId);
  const {
    team,
    loadTeam
  } = useTeam(scopeId);
  const { data: scopeUsage } = useScopeUsage(scopeId);
  const [chatMessage, setChatMessage] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessageDisplay[]>([]);

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const aiService = useMemo(() => new AiService(), []);

  const checkApiKey = useCallback(async () => {
    try {
      const hasKey = await aiService.hasApiKey();
      setHasApiKey(hasKey);
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasApiKey(false);
    }
  }, [aiService]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (panelOpen) {
      checkApiKey();
      loadProjects();
      loadTeam();
    }
  }, [panelOpen, loadProjects, loadTeam, checkApiKey]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isAiTyping) return;

    const userMessage = chatMessage.trim();
    setChatMessage("");

    // Add user message
    const userMessageDisplay: ChatMessageDisplay = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessageDisplay]);

    // Prepare chat history for AI (user/assistant only)
    const chatHistory: ChatMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    setIsAiTyping(true);

    try {
      // Přidáme prázdný placeholder pro streaming/inkrementální update
      const assistantId = (Date.now() + 1).toString();
      // Placeholder bublina s "..." pro vizuální indikaci, místo separátního typing bubble
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '...', timestamp: new Date() }]);

      const result: AiAnalysisResult = await aiService.sendMessage(
        scopeId,
        userMessage,
        chatHistory,
        undefined,
        // onDelta: průběžné doplňování textu
            (delta) => {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: ((m.content || '') === '...' ? '' : (m.content || '')) + delta } : m));
        }
      );

      // Finální obsah (pokud přišel jako celek)
      if (result.message) {
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: result.message } : m));
      }
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessageDisplay: ChatMessageDisplay = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t("aiError"),
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setMessages(prev => [...prev, errorMessageDisplay]);
    } finally {
      setIsAiTyping(false);
    }
  };


  return (
    <>
      {/* Floating Chat Button (hidden when panel open) */}
      {!panelOpen && (
        <button
          ref={chatButtonRef}
          className="bottom-6 cursor-pointer duration-200 fixed flex h-16 hover:scale-105 hover:shadow-xl hover:to-blue-600 items-center justify-center opacity-100 right-24 shadow-lg text-white to-blue-500 transform transition-all w-16 z-50 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500"
          aria-label="Otevřít AI chat"
          title="Otevřít AI chat"
          onClick={() => setPanelOpen(true)}
          tabIndex={0}
        >
          <span className="sr-only">Otevřít AI chat</span>
          <FiMessageCircle className="w-6 h-6 transition-transform duration-200 group-hover:rotate-12" />
        </button>
      )}

      {/* Chat Panel */}
      {panelOpen && (
  <div
    className="fixed bottom-8 right-20 w-[400px] h-[55vh] min-h-[500px] max-h-[80vh] overflow-y-auto rounded-3xl shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] backdrop-blur-xl flex flex-col border border-purple-300 dark:border-blue-900 z-50 animate-fade-in ai-chat-panel"
    role="dialog"
    aria-modal="true"
    aria-label="AI Chat Panel"
    tabIndex={-1}
  >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-purple-300 dark:border-blue-900 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-t-3xl shadow-md">
            <div className="flex items-center gap-2 text-white font-semibold drop-shadow-lg">
              <FiMessageCircle className="w-5 h-5" />
              {t("aiChat")}
            </div>
            <div className="flex items-center gap-2">
              {/* Minimize button */}
              <button
                className="text-white hover:text-blue-200 transition-colors text-lg font-bold px-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={() => setPanelOpen(false)}
                title="Minimalizovat chat"
                aria-label="Minimalizovat chat"
                tabIndex={0}
              >
                <FiMinus />
              </button>
              {/* Close button with warning */}
              <button
                ref={closeButtonRef}
                className="text-white hover:text-pink-200 transition-colors text-xl font-bold px-2 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-400"
                onClick={() => setShowCloseWarning(true)}
                title="Zavřít chat"
                aria-label="Zavřít AI chat"
                tabIndex={0}
              >
                ×
              </button>
            </div>
          </div>
          {/* Close warning dialog */}
          {showCloseWarning && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className=" rounded-2xl shadow-2xl p-6 max-w-xs w-full border border-pink-300 dark:border-blue-900 bg-white dark:bg-gray-900">
                <h2 className="text-lg font-bold mb-2 text-pink-600 dark:text-pink-400">{t("closeChatWarningTitle") || "Opravdu zavřít chat?"}</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">{t("closeChatWarningText") || "Při zavření chatu bude konverzace nenávratně smazána."}</p>
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600"
                    onClick={() => setShowCloseWarning(false)}
                  >{t("cancel") || "Zrušit"}</button>
                  <button
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-blue-500 text-white font-semibold hover:from-pink-600 hover:to-blue-600"
                    onClick={() => {
                      setShowCloseWarning(false);
                      setPanelOpen(false);
                      onClose();
                      chatButtonRef.current?.focus();
                      setMessages([]);
                    }}
                  >{t("close") || "Zavřít"}</button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-transparent">
            {messages.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <FiMessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-xl p-4 text-white shadow-lg">
                  <p className="text-base font-medium">{t("aiHelpText")}</p>
                  {hasApiKey === false && (
                    <p className="text-sm mt-2 text-yellow-200">⚠️ {t("aiApiKeyRequired")}</p>
                  )}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                    <FiMessageCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[70%] rounded-xl p-4 ${message.role === 'assistant' ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white' : 'bg-blue-500 text-white'} shadow-lg whitespace-pre-line font-medium`}>
                  {message.content === '...'
                    ? (
                      <div className="flex items-center space-x-1" aria-live="polite" aria-label="AI píše">
                        <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce"></span>
                        <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce delay-150"></span>
                        <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce delay-300"></span>
                      </div>
                    )
                    : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  {message.error && (
                    <div className="text-xs text-red-500 mt-2">{message.error}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
            {isAiTyping && !messages.some(m => m.role === 'assistant' && m.content === '...') && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <FiMessageCircle className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-xl p-4 text-white shadow-lg">
                  <div className="flex items-center space-x-1 mt-2">
                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce delay-75"></span>
                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce delay-150"></span>
                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce delay-225"></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-5 border-t border-purple-300 dark:border-blue-900 bg-white/70 dark:bg-gray-900/70 rounded-b-3xl backdrop-blur-lg">
            <div className="flex gap-2">
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={hasApiKey ? t("askAboutScope") : t("setApiKeyFirst")}
                disabled={!hasApiKey || isAiTyping}
                className="h-[50px] flex-1  p-2 flex items-center justify-center border border-purple-300 dark:border-blue-900 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-400 dark:text-white disabled:opacity-50 shadow-md"
                rows={2}
                aria-label="Napiš zprávu AI"
                tabIndex={0}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim() || !hasApiKey || isAiTyping}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white rounded-xl hover:from-pink-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                aria-label="Odeslat zprávu AI"
                tabIndex={0}
              >
                <FiSend className="w-5 h-5" />
              </button>
            </div>
            {/* Debug sekce: výpis odesílaného kontextu do AI */}
            <details className="mt-4 text-xs select-all">
              <summary className="cursor-pointer font-semibold">Debug: Kontext odesílaný do AI</summary>
              <pre className="overflow-x-auto max-h-60 whitespace-pre-wrap break-words bg-gray-100 dark:bg-gray-800 p-2 rounded-xl border border-purple-200 dark:border-blue-900">
                {/* JSON výpis */}
                {JSON.stringify({ projects, roles, activeRoles, team, scopeUsage }, null, 2)}
                {"\n---\nTextový kontext pro AI:\n"}
                {projects && projects.length > 0
                  ? projects.map(project => (
                      [
                        `Projekt: ${project.name}`,
                        `Priorita: ${project.priority}`,
                        `Status: ${project.status}`,
                        `Progress: ${
                          (
                            Number(project.fe_mandays || 0) +
                            Number(project.be_mandays || 0) +
                            Number(project.qa_mandays || 0) +
                            Number(project.pm_mandays || 0) +
                            Number(project.dpl_mandays || 0)
                          ) > 0
                            ? Math.round(
                                (
                                  Number(project.fe_done || 0) +
                                  Number(project.be_done || 0) +
                                  Number(project.qa_done || 0) +
                                  Number(project.pm_done || 0) +
                                  Number(project.dpl_done || 0)
                                ) /
                                (
                                  Number(project.fe_mandays || 0) +
                                  Number(project.be_mandays || 0) +
                                  Number(project.qa_mandays || 0) +
                                  Number(project.pm_mandays || 0) +
                                  Number(project.dpl_mandays || 0)
                                ) * 100
                              )
                            : 0
                          }%`,
                        `Mandays: FE(${project.fe_mandays || 0}), BE(${project.be_mandays || 0}), QA(${project.qa_mandays || 0}), PM(${project.pm_mandays || 0}), DPL(${project.dpl_mandays || 0})`,
                        `Done: FE(${project.fe_done || 0}), BE(${project.be_done || 0}), QA(${project.qa_done || 0}), PM(${project.pm_done || 0}), DPL(${project.dpl_done || 0})`,
                        `Termín: ${project.delivery_date || 'Neuveden'}`,
                        `Poznámky: ${(project.notes && project.notes.length > 0) ? project.notes.map(note => note.text).join('; ') : 'Žádné poznámky'}`,
                        '---'
                      ].join('\n')
                    )).join('\n\n')
                  : 'Žádné projekty'}
              </pre>
            </details>
          </div>
        </div>
      )}
    </>
  );
}
