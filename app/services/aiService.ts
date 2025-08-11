/**
 * AI Service for OpenAI and Gemini API integration
 * - Handles communication with OpenAI and Gemini APIs
 * - Analyzes scope and project data
 * - Provides project management insights
 * - Supports switching between AI providers
 */

import { createClient } from '@/lib/supabase/client';
import { Scope } from '@/lib/domain/models/scope.model';
import { Project } from '@/lib/domain/models/project.model';

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
      .select('ai_provider, open_api_key, gemini_api_key')
      .eq('user_id', user.id)
      .single();

    return {
      provider: (userData?.ai_provider as AiProvider) || 'openai',
      openaiKey: userData?.open_api_key ? atob(userData.open_api_key) : null,
      geminiKey: userData?.gemini_api_key ? atob(userData.gemini_api_key) : null
    };
  }

  /**
   * Get scope data with projects
   */
  private async getScopeData(scopeId: string): Promise<{
    scope: Scope;
    projects: Project[];
  } | null> {
    // Get scope
    const { data: scope } = await this.supabase
      .from('scopes')
      .select('*')
      .eq('id', scopeId)
      .single();

    if (!scope) return null;

    // Get projects
    const { data: projects } = await this.supabase
      .from('projects')
      .select(`
        *,
        project_notes (
          id,
          text,
          author:user_meta (id, full_name, email),
          created_at,
          updated_at
        )
      `)
      .eq('scope_id', scopeId)
      .order('priority', { ascending: true });

    return {
      scope,
      projects: projects || []
    };
  }

  /**
   * Create context for AI analysis
   */
  private createContext(scope: Scope, projects: Project[]): string {
    const projectDetails = projects.map(project => {
      const totalMandays = (project.feMandays || 0) + (project.beMandays || 0) +
        (project.qaMandays || 0) + (project.pmMandays || 0) +
        (project.dplMandays || 0);
      const totalDone = project.feDone + project.beDone + project.qaDone +
        project.pmDone + project.dplDone;
      const progress = totalMandays > 0 ? Math.round((totalDone / totalMandays) * 100) : 0;

      return `
        Project: ${project.name}
        Priority: ${project.priority}
        Status: ${project.status || 'not_started'}
        Progress: ${progress}%
        Mandays: FE(${project.feMandays || 0}), BE(${project.beMandays || 0}), QA(${project.qaMandays || 0}), PM(${project.pmMandays || 0}), DPL(${project.dplMandays || 0})
        Done: FE(${project.feDone}), BE(${project.beDone}), QA(${project.qaDone}), PM(${project.pmDone}), DPL(${project.dplDone})
        Delivery Date: ${project.deliveryDate || 'Not set'}
        Notes: ${project.notes?.map(note => note.text).join('; ') || 'No notes'}
      `;
    }).join('\n');

    return `
      SCOPE INFORMATION:
      Name: ${scope.name}
      Description: ${scope.description || 'No description'}
      Created: ${scope.createdAt}
      
      PROJECTS:
      ${projectDetails}
    `;
  }

  /**
   * Send message to OpenAI API
   */
  private async sendOpenAiMessage(
    apiKey: string,
    messages: ChatMessage[]
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
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  }

  /**
   * Send message to Gemini API
   */
  private async sendGeminiMessage(
    apiKey: string,
    messages: ChatMessage[]
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
    return parts[0].text;
  }

  /**
   * Send message to selected AI provider
   */
  async sendMessage(scopeId: string, userMessage: string, chatHistory: ChatMessage[] = [], onTyping?: (isTyping: boolean) => void): Promise<AiAnalysisResult> {
    if (onTyping) onTyping(true);
    const aiSettings = await this.getUserAiSettings();
    const { provider, openaiKey, geminiKey } = aiSettings;

    // Check if API key is available for selected provider
    if (provider === 'openai' && !openaiKey) {
      throw new Error('OpenAI API klíč nebyl nalezen. Přidejte prosím svůj API klíč v nastavení profilu.');
    }
    if (provider === 'gemini' && !geminiKey) {
      throw new Error('Gemini API klíč nebyl nalezen. Přidejte prosím svůj API klíč v nastavení profilu.');
    }

    const scopeData = await this.getScopeData(scopeId);
    if (!scopeData) {
      throw new Error('Scope not found');
    }

    const context = this.createContext(scopeData.scope, scopeData.projects);

    const MAX_CONTEXT_LENGTH = 3500;
    const MAX_USER_MESSAGE_LENGTH = 1000;

    const safeContext = context.length > MAX_CONTEXT_LENGTH
      ? context.slice(0, MAX_CONTEXT_LENGTH) + '\n...'
      : context;

    const safeUserMessage = userMessage.length > MAX_USER_MESSAGE_LENGTH
      ? userMessage.slice(0, MAX_USER_MESSAGE_LENGTH) + '\n...'
      : userMessage;

    const systemPrompt = `You are an AI project management assistant for a software development team. You have access to scope and project information.

Your role is to:
1. Analyze project progress and provide insights
2. Suggest improvements and optimizations
3. Help with resource allocation and timeline planning
4. Identify potential risks and bottlenecks
5. Answer questions about the scope and projects

Always keep your answers short, concise, and summarized. Focus only on the most important points. If the user requests more details, you can provide longer explanations.

Be helpful, professional, and provide actionable advice. Use Czech language for responses.

Current scope context:
${safeContext}`;

    const messages: ChatMessage[] = chatHistory.length === 0
      ? [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: safeUserMessage }
      ]
      : [
        ...chatHistory.slice(-10),
        { role: 'user', content: safeUserMessage }
      ];
    try {
      let aiResponse: string;

      if (provider === 'openai') {
        aiResponse = await this.sendOpenAiMessage(openaiKey!, messages);
      } else {
        aiResponse = await this.sendGeminiMessage(geminiKey!, messages);
      }

      console.log(chatHistory)

      return {
        message: aiResponse,
        suggestions: this.extractSuggestions(aiResponse),
        insights: this.extractInsights(aiResponse)
      };
    } catch (error) {
      console.error('AI Service error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (provider === 'openai') {
        throw new Error(`Chyba při komunikaci s OpenAI: ${errorMessage}`);
      } else {
        throw new Error(`Chyba při komunikaci s Gemini: ${errorMessage}`);
      }
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
      const { provider, openaiKey, geminiKey } = aiSettings;

      if (provider === 'openai') {
        return !!openaiKey;
      } else {
        return !!geminiKey;
      }
    } catch {
      return false;
    }
  }
}
