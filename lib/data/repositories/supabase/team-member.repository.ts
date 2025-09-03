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
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        scope_id: teamMember.scopeId,
        name: teamMember.name,
        role: teamMember.role,
        fte: teamMember.fte,
        md_rate: teamMember.mdRate
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create team member: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async update(id: string, teamMember: Partial<TeamMember>): Promise<TeamMember> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .update({
        scope_id: teamMember.scopeId,
        name: teamMember.name,
        role: teamMember.role,
        fte: teamMember.fte,
        md_rate: teamMember.mdRate,
        vacations: teamMember.vacations,
      })
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
      vacations: data.vacations,
      createdAt: new Date(data.created_at)
    };
  }
}