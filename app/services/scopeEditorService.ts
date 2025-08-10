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

export interface CreateInviteLinkData {
  scopeId: string;
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
  .from('users_meta')
      .select('user_id')
      .eq('email', email);

    return data && data.length > 0 ? data[0].user_id : null;
  }

  /**
   * Create an invite link for scope sharing (without email)
   */
  static async createInviteLink(createData: CreateInviteLinkData): Promise<string> {
    const { scopeId } = createData;
    
    const token = uuidv4();
    const insertObj = { 
      scope_id: scopeId, 
      invite_token: token 
    };

    const supabase = createClient();
    const { error } = await supabase.from('scope_editors').insert([insertObj]);
    
    if (error) {
      throw new Error('INVITE_LINK_CREATION_FAILED');
    }

    return token;
  }

  /**
   * Check if user is the owner of the scope
   */
  static async checkScopeOwnership(scopeId: string, userId: string): Promise<boolean> {
    const supabase = createClient();
    const { data } = await supabase
      .from('scopes')
      .select('owner_id')
      .eq('id', scopeId)
      .single();
    
    return data?.owner_id === userId;
  }

  /**
   * Check if user is an editor of the scope
   */
  static async checkScopeEditor(scopeId: string, userId: string): Promise<boolean> {
    const supabase = createClient();
    const { data } = await supabase
      .from('scope_editors')
      .select('id')
      .eq('scope_id', scopeId)
      .eq('user_id', userId)
      .not('accepted_at', 'is', null);
    
    return !!(data && data.length > 0);
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
    
    // Check if the user is trying to invite themselves (owner)
    if (userId) {
      const isOwner = await this.checkScopeOwnership(scopeId, userId);
      if (isOwner) {
        throw new Error('CANNOT_INVITE_OWNER');
      }
    }
    
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
