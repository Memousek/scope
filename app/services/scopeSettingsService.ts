/**
 * ScopeSettingsService
 * Persistuje nastavení scopu (např. Jira) v DB (tabulka scope_settings)
 */

import { createClient } from '@/lib/supabase/client';

export interface ScopeSettings {
  jira?: {
    baseUrl?: string | null;
    email?: string | null;
    apiToken?: string | null;
  };
  debug?: { enabled?: boolean };
  calendar?: {
    // Preferred: generic include + selected country/subdivision
    includeHolidays?: boolean;
    country?: string; // e.g., 'CZ', 'DE', 'US'
    subdivision?: string | null; // optional, e.g., 'CA', 'ON', etc.
    // Backward compatibility with older setting
    includeCzechHolidays?: boolean;
  };
  [key: string]: unknown;
}

export class ScopeSettingsService {
  static async get(scopeId: string): Promise<ScopeSettings | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('scopes')
        .select('settings')
        .eq('id', scopeId)
        .maybeSingle();
      if (error) {
        console.warn('ScopeSettingsService.get error', error);
        return null;
      }
      return (data?.settings as ScopeSettings) || null;
    } catch (err) {
      console.error('ScopeSettingsService.get failed:', err);
      throw new Error(`Failed to load scope settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  static async upsert(scopeId: string, settings: ScopeSettings): Promise<ScopeSettings> {
    try {
      const supabase = createClient();
      // Načteme aktuální settings a mergneme
      const current = await this.get(scopeId);
      const merged = { ...(current || {}), ...settings } as Record<string, unknown>;
      const { data, error } = await supabase
        .from('scopes')
        .update({ settings: merged })
        .eq('id', scopeId)
        .select('settings')
        .single();
      if (error) throw error;
      return (data.settings as ScopeSettings) || {};
    } catch (err) {
      console.error('ScopeSettingsService.upsert failed:', err);
      throw new Error(`Failed to save scope settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}


