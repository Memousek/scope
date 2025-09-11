import { createClient } from '@/lib/supabase/client';
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";
import { ScopeEditor } from "@/lib/domain/models/scope-editor.model";

export class SupabaseScopeEditorRepository extends ScopeEditorRepository {
  async create(scopeEditor: Omit<ScopeEditor, "id" | "createdAt">): Promise<ScopeEditor> {
    const supabase = createClient();
    const insertData: Record<string, unknown> = {
      scope_id: scopeEditor.scopeId,
      email: scopeEditor.email
    };

    if (scopeEditor.userId) {
      insertData.user_id = scopeEditor.userId;
    }
    if (scopeEditor.inviteToken) {
      insertData.invite_token = scopeEditor.inviteToken;
    }
    if (scopeEditor.acceptedAt) {
      insertData.accepted_at = scopeEditor.acceptedAt.toISOString();
    }
    if (scopeEditor.invitedAt) {
      insertData.invited_at = scopeEditor.invitedAt.toISOString();
    }

    const { data, error } = await supabase
      .from('scope_editors')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create scope editor: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('scope_editors')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete scope editor: ${error.message}`);
    }
  }

  async deleteByScopeId(filter: {scopeId?: string | null, userId?: string | null}): Promise<void> {
    const supabase = createClient();

    const query = supabase.from('scope_editors').delete();

    if (filter.scopeId !== undefined && filter.scopeId !== null) {
      query.eq('scope_id', filter.scopeId);
    }

    if (filter.userId !== undefined && filter.userId !== null) {
      query.eq('user_id', filter.userId);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to delete scope editors by scope ID: ${error.message}`);
    }
  }

  async findById(id: string): Promise<ScopeEditor | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scope_editors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapToModel(data);
  }

  async findByScopeId(scopeId: string): Promise<ScopeEditor[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scope_editors')
      .select('*')
      .eq('scope_id', scopeId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findByUserId(userId: string): Promise<ScopeEditor[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scope_editors')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findByScopeIdAndEmail(scopeId: string, email: string): Promise<ScopeEditor[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scope_editors')
      .select('*')
      .eq('scope_id', scopeId)
      .eq('email', email);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findByScopeIdAndUserId(scopeId: string, userId: string): Promise<ScopeEditor[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scope_editors')
      .select('*')
      .eq('scope_id', scopeId)
      .eq('user_id', userId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findByScopeIdAndToken(scopeId: string, token: string): Promise<ScopeEditor[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scope_editors')
      .select('*')
      .eq('scope_id', scopeId)
      .eq('invite_token', token);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findBy(params: {
    email: string | null;
    scopeId?: string | null;
    userId?: string | null
  }): Promise<ScopeEditor[]> {
    const supabase = createClient();
    let query = supabase.from('scope_editors').select('*');

    // Pro email a userId používáme AND logiku, ne OR
    if (params.email !== undefined && params.email !== null) {
      query = query.eq('email', params.email);
    }
    if (params.scopeId !== undefined && params.scopeId !== null) {
      query = query.eq('scope_id', params.scopeId);
    }
    if (params.userId !== undefined && params.userId !== null) {
      query = query.eq('user_id', params.userId);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.mapToModel);
  }

  async update(id: string, scopeEditor: Partial<ScopeEditor>): Promise<ScopeEditor> {
    const supabase = createClient();
    const updateData: Record<string, string | null | undefined> = {};

    if (scopeEditor.scopeId !== undefined) updateData.scope_id = scopeEditor.scopeId;
    if (scopeEditor.userId !== undefined) updateData.user_id = scopeEditor.userId;
    if (scopeEditor.email !== undefined) updateData.email = scopeEditor.email;
    if (scopeEditor.inviteToken !== undefined) updateData.invite_token = scopeEditor.inviteToken;
    if (scopeEditor.acceptedAt !== undefined) {
      updateData.accepted_at = scopeEditor.acceptedAt ? scopeEditor.acceptedAt.toISOString() : null;
    }
    if (scopeEditor.invitedAt !== undefined) {
      updateData.invited_at = scopeEditor.invitedAt ? scopeEditor.invitedAt.toISOString() : null;
    }

    const { data, error } = await supabase
      .from('scope_editors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update scope editor: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  private mapToModel(data: unknown): ScopeEditor {
    return {
      id: data.id,
      scopeId: data.scope_id,
      userId: data.user_id,
      email: data.email,
      inviteToken: data.invite_token,
      acceptedAt: data.accepted_at ? new Date(data.accepted_at) : null,
      invitedAt: data.invited_at ? new Date(data.invited_at) : null,
      createdAt: new Date(data.created_at)
    };
  }
}
