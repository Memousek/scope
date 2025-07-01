import { createClient } from '@/lib/supabase/client';
import { Scope } from "@/lib/domain/models/scope.model";
import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";

export class SupabaseScopeRepository implements ScopeRepository {
  async findById(id: string): Promise<Scope | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scopes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapToModel(data);
  }

  async findByIds(ids: string[]): Promise<Scope[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scopes')
      .select('*')
      .in('id', ids);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findByOwnerId(ownerId: string): Promise<Scope[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scopes')
      .select('*')
      .eq('owner_id', ownerId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async create(scope: Omit<Scope, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scope> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scopes')
      .insert({
        name: scope.name,
        description: scope.description,
        owner_id: scope.ownerId
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create scope: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async update(id: string, scope: Partial<Scope>): Promise<Scope> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('scopes')
      .update({
        name: scope.name,
        description: scope.description,
        owner_id: scope.ownerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update scope: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('scopes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete scope: ${error.message}`);
    }
  }

  // eslint-disable-next-line
  private mapToModel(data: any): Scope {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerId: data.owner_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}