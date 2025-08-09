import { createClient } from '@/lib/supabase/client';
import { Plan } from "@/lib/domain/models/plan.model";
import { PlanRepository } from "@/lib/domain/repositories/plan.repository";
import { injectable } from 'inversify';

@injectable()
export class SupabasePlanRepository implements PlanRepository {
  async findById(id: string): Promise<Plan | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapToModel(data as Record<string, unknown>);
  }

  async findByName(name: string): Promise<Plan | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !data) return null;
    return this.mapToModel(data as Record<string, unknown>);
  }

  async findAll(): Promise<Plan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price_monthly', { ascending: true });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((row) => this.mapToModel(row));
  }

  async findActive(): Promise<Plan[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((row) => this.mapToModel(row));
  }

  async create(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Plan> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .insert({
        name: plan.name,
        display_name: plan.displayName,
        description: plan.description,
        price_monthly: plan.priceMonthly,
        price_yearly: plan.priceYearly,
        features: plan.features,
        max_projects: plan.maxProjects,
        max_team_members: plan.maxTeamMembers,
        max_scopes: plan.maxScopes,
        has_export: plan.hasExport,
        has_api_access: plan.hasApiAccess,
        has_advanced_analytics: plan.hasAdvancedAnalytics,
        is_active: plan.isActive
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create plan: ${error?.message}`);
    }

    return this.mapToModel(data as Record<string, unknown>);
  }

  async update(id: string, plan: Partial<Plan>): Promise<Plan> {
    const supabase = createClient();
    const updateData: Record<string, unknown> = {};

    if (plan.name !== undefined) updateData.name = plan.name;
    if (plan.displayName !== undefined) updateData.display_name = plan.displayName;
    if (plan.description !== undefined) updateData.description = plan.description;
    if (plan.priceMonthly !== undefined) updateData.price_monthly = plan.priceMonthly;
    if (plan.priceYearly !== undefined) updateData.price_yearly = plan.priceYearly;
    if (plan.features !== undefined) updateData.features = plan.features;
    if (plan.maxProjects !== undefined) updateData.max_projects = plan.maxProjects;
    if (plan.maxTeamMembers !== undefined) updateData.max_team_members = plan.maxTeamMembers;
    if (plan.maxScopes !== undefined) updateData.max_scopes = plan.maxScopes;
    if (plan.hasExport !== undefined) updateData.has_export = plan.hasExport;
    if (plan.hasApiAccess !== undefined) updateData.has_api_access = plan.hasApiAccess;
    if (plan.hasAdvancedAnalytics !== undefined) updateData.has_advanced_analytics = plan.hasAdvancedAnalytics;
    if (plan.isActive !== undefined) updateData.is_active = plan.isActive;

    const { data, error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update plan: ${error?.message}`);
    }

    return this.mapToModel(data as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete plan: ${error.message}`);
    }
  }

  async getUserPlan(userId: string): Promise<Plan | null> {
    const supabase = createClient();

    // 1) Get plan_id from user_meta
    const { data: meta, error: metaError } = await supabase
      .from('user_meta')
      .select('plan_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (metaError || !meta?.plan_id) return null;

    // 2) Load the actual plan by id
    const { data: planRow, error: planError } = await supabase
      .from('plans')
      .select('*')
      .eq('id', meta.plan_id)
      .single();

    if (planError || !planRow) return null;

    return this.mapToModel(planRow as Record<string, unknown>);
  }

  async updateUserPlan(userId: string, planId: string): Promise<boolean> {
    const supabase = createClient();

    const { error } = await supabase
      .from('user_meta')
      .update({ plan_id: planId })
      .eq('user_id', userId);

    return !error;
  }

  private mapToModel(data: Record<string, unknown>): Plan {
    // Normalize features to string[]
    let features: string[] = [];
    const raw = data.features as unknown;
    if (Array.isArray(raw)) {
      features = raw as string[];
    } else if (typeof raw === 'string') {
      try { features = JSON.parse(raw); } catch { features = []; }
    }

    return {
      id: data.id as string,
      name: data.name as string,
      displayName: (data.display_name as string) ?? (data.name as string),
      description: (data.description as string) ?? undefined,
      priceMonthly: (data.price_monthly as number) ?? undefined,
      priceYearly: (data.price_yearly as number) ?? undefined,
      features,
      maxProjects: (data.max_projects as number) ?? 0,
      maxTeamMembers: (data.max_team_members as number) ?? 0,
      maxScopes: (data.max_scopes as number) ?? 0,
      hasExport: Boolean(data.has_export),
      hasApiAccess: Boolean(data.has_api_access),
      hasAdvancedAnalytics: Boolean(data.has_advanced_analytics),
      isActive: Boolean(data.is_active),
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string)
    };
  }
}
