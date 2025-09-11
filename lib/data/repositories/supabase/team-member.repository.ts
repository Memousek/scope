import { createClient } from '@/lib/supabase/client';
import { TeamMember } from "@/lib/domain/models/team-member.model";
import { TeamMemberRepository } from "@/lib/domain/repositories/team-member.repository";

export class SupabaseTeamMemberRepository implements TeamMemberRepository {
  async findById(id: string): Promise<TeamMember | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapToModel(data);
  }

  async findByScopeId(scopeId: string): Promise<TeamMember[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('scope_id', scopeId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async create(teamMember: Omit<TeamMember, 'id' | 'createdAt'>): Promise<TeamMember> {
    const supabase = createClient();
    const insertData: Record<string, unknown> = {
      scope_id: teamMember.scopeId,
      name: teamMember.name,
      role: teamMember.role,
      fte: teamMember.fte,
      md_rate: teamMember.mdRate,
      cost_md_rate: teamMember.costMdRate
    };

    if (teamMember.vacations) {
      insertData.vacations = JSON.stringify(teamMember.vacations);
    }

    const { data, error } = await supabase
      .from('team_members')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create team member: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async update(id: string, teamMember: Partial<TeamMember>): Promise<TeamMember> {
    const supabase = createClient();
    const updateData: Record<string, unknown> = {};

    if (teamMember.scopeId !== undefined) updateData.scope_id = teamMember.scopeId;
    if (teamMember.name !== undefined) updateData.name = teamMember.name;
    if (teamMember.role !== undefined) updateData.role = teamMember.role;
    if (teamMember.fte !== undefined) updateData.fte = teamMember.fte;
    if (teamMember.mdRate !== undefined) updateData.md_rate = teamMember.mdRate;
    if (teamMember.costMdRate !== undefined) updateData.cost_md_rate = teamMember.costMdRate;
    if (teamMember.vacations !== undefined) {
      updateData.vacations = teamMember.vacations ? JSON.stringify(teamMember.vacations) : null;
    }

    const { data, error } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update team member: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete team member: ${error.message}`);
    }
  }

  async deleteByScopeId(scopeId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('scope_id', scopeId);

    if (error) {
      throw new Error(`Failed to delete team members by project ID: ${error.message}`);
    }
  }

  // eslint-disable-next-line
  private mapToModel(data: any): TeamMember {
    return {
      id: data.id,
      scopeId: data.scope_id,
      name: data.name,
      role: data.role,
      fte: data.fte,
      mdRate: data.md_rate,
      costMdRate: data.cost_md_rate,
      vacations: data.vacations ? (typeof data.vacations === 'string' ? JSON.parse(data.vacations) : data.vacations) : undefined,
      createdAt: new Date(data.created_at)
    };
  }
}