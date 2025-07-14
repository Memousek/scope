import { createClient } from '@/lib/supabase/client';
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";
import { ScopeEditor } from "@/lib/domain/models/scope-editor.model";

export class SupabaseScopeEditorRepository extends ScopeEditorRepository {
  async create(scopeEditor: Omit<ScopeEditor, "id" | "createdAt">): Promise<ScopeEditor> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scope_editors')
      .insert({
        scope_id: scopeEditor.scopeId,
        user_id: scopeEditor.userId,
        email: scopeEditor.email
      })
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

  async findBy(params: {
    email: string | null;
    scopeId?: string | null;
    userId?: string | null
  }): Promise<ScopeEditor[]> {
    const supabase = createClient();
    const orConditions: string[] = [];

    if (params.email !== undefined && params.email !== null) {
      orConditions.push(`email.eq.${params.email}`);
    }
    if (params.scopeId !== undefined && params.scopeId !== null) {
      orConditions.push(`scope_id.eq.${params.scopeId}`);
    }
    if (params.userId !== undefined && params.userId !== null) {
      orConditions.push(`user_id.eq.${params.userId}`);
    }

    let query = supabase.from('scope_editors').select('*');
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
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

  // eslint-disable-next-line
  private mapToModel(data: any): ScopeEditor {
    return {
      id: data.id,
      scopeId: data.scope_id,
      userId: data.user_id,
      email: data.email,
      createdAt: new Date(data.created_at)
    };
  }
}
