/**
 * AI Service for OpenAI and Gemini API integration
 * - Handles communication with OpenAI and Gemini APIs
 * - Analyzes scope and project data
 * - Provides project management insights
 * - Supports switching between AI providers
 */

import { createClient } from '@/lib/supabase/client';
// Removed unused imports to satisfy linter and because server builds context

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiAnalysisResult {
  message: string;
  suggestions?: string[];
  insights?: string[];
}

export type AiProvider = 'openai' | 'gemini';

export class AiService {
  private supabase = createClient();

  /**
   * Get user's AI settings (provider and API keys)
   */
  private async getUserAiSettings(): Promise<{
    provider: AiProvider;
    openaiKey: string | null;
    geminiKey: string | null;
  }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: userData } = await this.supabase
      .from('user_meta')
      .select('ai_provider')
      .eq('user_id', user.id)
      .single();

    return {
      provider: (userData?.ai_provider as AiProvider) || 'openai',
      openaiKey: null,
      geminiKey: null
    };
  }

  /**
   * Get scope data with projects
   */
  // Klient už nenačítá detailní data; vše sestaví serverový endpoint.
  private async getScopeData(): Promise<null> { return null; }

  /**
   * Create context for AI analysis
   */
  private createContext(): string { return ''; }

  /**
   * Send message to OpenAI API
   */
  private async sendOpenAiMessage(
    apiKey: string,
    messages: ChatMessage[],
    _onDelta?: (delta: string) => void
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    if (_onDelta) _onDelta(content);
    return content;
  }

  /**
   * Send message to Gemini API
   */
  private async sendGeminiMessage(
    apiKey: string,
    messages: ChatMessage[],
    _onDelta?: (delta: string) => void
  ): Promise<string> {
    // Oddělit system a ostatní zprávy
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const otherMessages = messages.filter(msg => msg.role !== 'system');

    // Pokud existuje aspoň jedna user zpráva, připojit system obsah na začátek první user zprávy
    const firstUserIdx = otherMessages.findIndex(msg => msg.role === 'user');
    if (systemMessages.length > 0 && firstUserIdx !== -1) {
      otherMessages[firstUserIdx].content =
        systemMessages.map(m => m.content).join('\n') + '\n' + otherMessages[firstUserIdx].content;
    }

    // Převést na Gemini formát
    const geminiMessages = otherMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          maxOutputTokens: 2500,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (!parts || !Array.isArray(parts) || !parts[0]?.text) {
      return 'Odpověď od Gemini neobsahuje žádný text. Zkuste prosím zadat kratší nebo jinak formulovaný dotaz.';
    }
    const content = parts[0].text;
    if (_onDelta) _onDelta(content);
    return content;
  }

  /**
   * Send message to selected AI provider
   */
  async sendMessage(
    scopeId: string,
    userMessage: string,
    chatHistory: ChatMessage[] = [],
    onTyping?: (isTyping: boolean) => void,
    onDelta?: (delta: string) => void
  ): Promise<AiAnalysisResult> {
    if (onTyping) onTyping(true);
    const aiSettings = await this.getUserAiSettings();
    const { provider } = aiSettings;

    // Check if API key is available for selected provider
    // Klíče řeší server

    // Server sestaví kontext i systémový prompt. Na klientu posíláme jen historii a uživatelskou zprávu.
    const messages: ChatMessage[] = chatHistory.length === 0
      ? [{ role: 'user', content: userMessage }]
      : [...chatHistory, { role: 'user', content: userMessage }];
    try {
      // Proxy volání přes serverový endpoint
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, scopeId, userMessage, chatHistory: messages })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'AI server error');
      }
      const json = await res.json();
      const aiResponse: string = json.message as string;
      if (onDelta) onDelta(aiResponse);

      return {
        message: aiResponse,
        suggestions: this.extractSuggestions(aiResponse),
        insights: this.extractInsights(aiResponse)
      };
    } catch (error) {
      console.error('AI Service error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Chyba při komunikaci se serverovým AI endpointem: ${errorMessage}`);
    } finally {
      if (onTyping) onTyping(false);
    }
  }

  /**
   * Extract suggestions from AI response
   */
  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      if (line.includes('•') || line.includes('-') || line.includes('Suggestion:') || line.includes('Doporučení:')) {
        const suggestion = line.replace(/^[•\-]\s*/, '').replace(/^(Suggestion|Doporučení):\s*/, '').trim();
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions;
  }

  /**
   * Extract insights from AI response
   */
  private extractInsights(response: string): string[] {
    const insights: string[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      if (line.includes('Insight:') || line.includes('Poznatky:') || line.includes('Analýza:')) {
        const insight = line.replace(/^(Insight|Poznatky|Analýza):\s*/, '').trim();
        if (insight) {
          insights.push(insight);
        }
      }
    }

    return insights;
  }

  /**
   * Get current AI provider
   */
  async getCurrentProvider(): Promise<AiProvider> {
    const aiSettings = await this.getUserAiSettings();
    return aiSettings.provider;
  }

  /**
   * Check if user has API key for current provider
   */
  async hasApiKey(): Promise<boolean> {
    try {
      const aiSettings = await this.getUserAiSettings();
      // Klíč ověří server – klient vždy true, pokud je vybraný provider
      return !!aiSettings.provider;
    } catch {
      return false;
    }
  }
}
