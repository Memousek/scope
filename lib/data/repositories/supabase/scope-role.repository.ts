/**
 * Supabase Scope Role Repository Implementation
 * Implementace repository pro práci s konfigurovatelnými rolemi v Supabase
 */

import { createClient } from '@/lib/supabase/client';
import { ScopeRoleRepository } from '@/lib/domain/repositories/scope-role.repository';
import { ScopeRole, CreateScopeRoleData, UpdateScopeRoleData } from '@/lib/domain/models/scope-role.model';

export class SupabaseScopeRoleRepository implements ScopeRoleRepository {
  async findByScopeId(scopeId: string): Promise<ScopeRole[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('scope_roles')
      .select('*')
      .eq('scope_id', scopeId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching scope roles:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch scope roles: ${errorMessage}`);
    }

    return data.map(this.mapFromDatabase);
  }

  async findActiveByScopeId(scopeId: string): Promise<ScopeRole[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('scope_roles')
      .select('*')
      .eq('scope_id', scopeId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching active scope roles:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch active scope roles: ${errorMessage}`);
    }

    return data.map(this.mapFromDatabase);
  }

  async findById(id: string): Promise<ScopeRole | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('scope_roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching scope role by id:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch scope role: ${errorMessage}`);
    }

    return this.mapFromDatabase(data);
  }

  async findByKey(scopeId: string, key: string): Promise<ScopeRole | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('scope_roles')
      .select('*')
      .eq('scope_id', scopeId)
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching scope role by key:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch scope role by key: ${errorMessage}`);
    }

    return this.mapFromDatabase(data);
  }

  async create(data: CreateScopeRoleData): Promise<ScopeRole> {
    const supabase = createClient();
    
    const insertData = {
      scope_id: data.scopeId,
      key: data.key,
      label: data.label,
      color: data.color,
      translation_key: data.translationKey,
      is_active: data.isActive ?? true,
      order_index: data.order ?? 0
    };

    const { data: result, error } = await supabase
      .from('scope_roles')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating scope role:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to create scope role: ${errorMessage}`);
    }

    return this.mapFromDatabase(result);
  }

  async update(id: string, data: UpdateScopeRoleData): Promise<ScopeRole> {
    const supabase = createClient();
    
    const updateData: Record<string, unknown> = {};
    if (data.label !== undefined) updateData.label = data.label;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.translationKey !== undefined) updateData.translation_key = data.translationKey;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.order !== undefined) updateData.order_index = data.order;

    const { data: result, error } = await supabase
      .from('scope_roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating scope role:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to update scope role: ${errorMessage}`);
    }

    return this.mapFromDatabase(result);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('scope_roles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting scope role:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to delete scope role: ${errorMessage}`);
    }
  }

  async deleteByScopeId(scopeId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('scope_roles')
      .delete()
      .eq('scope_id', scopeId);

    if (error) {
      console.error('Error deleting scope roles by scope id:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to delete scope roles: ${errorMessage}`);
    }
  }

  private mapFromDatabase(data: Record<string, unknown>): ScopeRole {
    return {
      id: data.id as string,
      scopeId: data.scope_id as string,
      key: data.key as string,
      label: data.label as string,
      color: data.color as string,
      translationKey: data.translation_key as string,
      isActive: data.is_active as boolean,
      order: data.order_index as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string)
    };
  }
} 