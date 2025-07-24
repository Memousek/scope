/**
 * Service layer for scope editor-related API operations
 * Centralizes all operations for scope editors and invitations
 */

import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface InviteEditorData {
  scopeId: string;
  email: string;
}

export class ScopeEditorService {
  /**
   * Check if editor already exists for scope and email
   */
  static async checkExistingEditor(scopeId: string, email: string): Promise<boolean> {
    const supabase = createClient();
    const { data } = await supabase
      .from('scope_editors')
      .select('id')
      .eq('scope_id', scopeId)
      .eq('email', email);
    
    return !!(data && data.length > 0);
  }

  /**
   * Check if user exists in auth.users
   */
  static async findUserByEmail(email: string): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email);
    
    return data && data.length > 0 ? data[0].id : null;
  }

  /**
   * Invite a new editor to scope
   */
  static async inviteEditor(inviteData: InviteEditorData): Promise<void> {
    const { scopeId, email } = inviteData;
    
    // Check if editor already exists
    const exists = await this.checkExistingEditor(scopeId, email);
    if (exists) {
      throw new Error('EDITOR_ALREADY_EXISTS');
    }

    // Check if user exists
    const userId = await this.findUserByEmail(email);
    
    const token = uuidv4();
    const insertObj: Record<string, unknown> = { 
      scope_id: scopeId, 
      email: email, 
      invite_token: token 
    };
    
    if (userId) {
      insertObj.user_id = userId;
      insertObj.accepted_at = new Date().toISOString();
    }

    const supabase = createClient();
    const { error } = await supabase.from('scope_editors').insert([insertObj]);
    
    if (error) {
      throw new Error('INVITE_FAILED');
    }
  }

  /**
   * Remove editor from scope
   */
  static async removeEditor(editorId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('scope_editors')
      .delete()
      .eq('id', editorId);

    if (error) {
      throw new Error('REMOVE_FAILED');
    }
  }
}
