/**
 * Service layer for scope-related API operations
 * Centralizes all operations for scopes
 */

import { createClient } from '@/lib/supabase/client';

export interface ScopeData {
  id: string;
  name: string;
  description?: string;
}

export class ScopeService {
  /**
   * Load scope by ID
   */
  static async loadScope(scopeId: string): Promise<ScopeData | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scopes')
      .select('*')
      .eq('id', scopeId)
      .single();

    if (error) {
      console.error('Chyba při načítání scope:', error);
      return null;
    }

    return data;
  }

  /**
   * Update scope description
   */
  static async updateScopeDescription(scopeId: string, description: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('scopes')
      .update({ description })
      .eq('id', scopeId);

    if (error) {
      throw new Error('Chyba při ukládání popisu');
    }
  }

  /**
   * Update scope name
   */
  static async updateScopeName(scopeId: string, name: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('scopes')
      .update({ name: name.trim() })
      .eq('id', scopeId);

    if (error) {
      throw new Error('Chyba při ukládání názvu');
    }
  }
}
