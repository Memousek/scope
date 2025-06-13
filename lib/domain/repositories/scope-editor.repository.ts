import {ScopeEditor} from "@/lib/domain/models/scope-editor.model";

export abstract class ScopeEditorRepository {
    abstract findById(id: string): Promise<ScopeEditor | null>;

    abstract findByScopeId(scopeId: string): Promise<ScopeEditor[]>;

    abstract findByUserId(userId: string): Promise<ScopeEditor[]>;

    abstract findBy(params: {
        email: string | null,
        scopeId?: string | null;
        userId?: string | null
    }): Promise<ScopeEditor[]>;

    abstract create(scopeEditor: Omit<ScopeEditor, 'id' | 'createdAt'>): Promise<ScopeEditor>;

    abstract update(id: string, scopeEditor: Partial<ScopeEditor>): Promise<ScopeEditor>;

    abstract delete(id: string): Promise<void>;

    abstract deleteByScopeId(scopeId: string): Promise<void>;
}