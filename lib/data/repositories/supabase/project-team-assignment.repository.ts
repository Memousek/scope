import { createClient } from '@/lib/supabase/client';
import { ProjectTeamAssignment } from "@/lib/domain/models/project-team-assignment.model";
import { ProjectTeamAssignmentRepository } from "@/lib/domain/repositories/project-team-assignment.repository";

export class SupabaseProjectTeamAssignmentRepository implements ProjectTeamAssignmentRepository {
  async findById(id: string): Promise<ProjectTeamAssignment | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_team_assignments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapToModel(data);
  }

  async findByProjectId(projectId: string): Promise<ProjectTeamAssignment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_team_assignments')
      .select('*')
      .eq('project_id', projectId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findByTeamMemberId(teamMemberId: string): Promise<ProjectTeamAssignment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_team_assignments')
      .select('*')
      .eq('team_member_id', teamMemberId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async findByScopeId(scopeId: string): Promise<ProjectTeamAssignment[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_team_assignments')
      .select(`
        *,
        projects!inner(scope_id)
      `)
      .eq('projects.scope_id', scopeId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async create(assignment: Omit<ProjectTeamAssignment, 'id' | 'createdAt'>): Promise<ProjectTeamAssignment> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_team_assignments')
      .insert({
        project_id: assignment.projectId,
        team_member_id: assignment.teamMemberId,
        role: assignment.role,
        allocation_fte: assignment.allocationFte
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create project team assignment: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async update(id: string, assignment: Partial<ProjectTeamAssignment>): Promise<ProjectTeamAssignment> {
    const supabase = createClient();
    const updateData: Record<string, string | number | boolean | null | undefined> = {};

    if (assignment.projectId !== undefined) updateData.project_id = assignment.projectId;
    if (assignment.teamMemberId !== undefined) updateData.team_member_id = assignment.teamMemberId;
    if (assignment.role !== undefined) updateData.role = assignment.role;
    if (assignment.allocationFte !== undefined) updateData.allocation_fte = assignment.allocationFte;

    const { data, error } = await supabase
      .from('project_team_assignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update project team assignment: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_team_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project team assignment: ${error.message}`);
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_team_assignments')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to delete project team assignments by project ID: ${error.message}`);
    }
  }

  async deleteByTeamMemberId(teamMemberId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_team_assignments')
      .delete()
      .eq('team_member_id', teamMemberId);

    if (error) {
      throw new Error(`Failed to delete project team assignments by team member ID: ${error.message}`);
    }
  }

  // eslint-disable-next-line
  private mapToModel(data: any): ProjectTeamAssignment {
    return {
      id: data.id,
      projectId: data.project_id,
      teamMemberId: data.team_member_id,
      role: data.role,
      allocationFte: data.allocation_fte,
      createdAt: new Date(data.created_at)
    };
  }
} 