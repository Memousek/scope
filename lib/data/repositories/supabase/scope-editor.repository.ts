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

    async deleteByScopeId(scopeId: string): Promise<void> {
        const supabase = createClient();
        const { error } = await supabase
            .from('scope_editors')
            .delete()
            .eq('scope_id', scopeId);

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
