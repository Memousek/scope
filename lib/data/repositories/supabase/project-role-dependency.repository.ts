import { injectable } from 'inversify';
import { createClient } from '@/lib/supabase/client';
import { ProjectRoleDependencyRepository } from '@/lib/domain/repositories/project-role-dependency.repository';
import { ProjectRoleDependency } from '@/lib/domain/models/project-role-dependency.model';

@injectable()
export class SupabaseProjectRoleDependencyRepository implements ProjectRoleDependencyRepository {
  private supabase = createClient();

  async findById(id: string): Promise<ProjectRoleDependency | null> {
    const { data, error } = await this.supabase
      .from('project_role_dependencies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToModel(data);
  }

  async findByProjectId(projectId: string): Promise<ProjectRoleDependency | null> {
    const { data, error } = await this.supabase
      .from('project_role_dependencies')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapToModel(data);
  }

  async create(dependency: Omit<ProjectRoleDependency, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectRoleDependency> {
    const { data, error } = await this.supabase
      .from('project_role_dependencies')
      .insert({
        project_id: dependency.projectId,
        be_depends_on_fe: dependency.be_depends_on_fe,
        fe_depends_on_be: dependency.fe_depends_on_be,
        qa_depends_on_be: dependency.qa_depends_on_be,
        qa_depends_on_fe: dependency.qa_depends_on_fe,
        parallel_mode: dependency.parallel_mode,
        current_active_roles: dependency.current_active_roles
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project role dependency: ${error.message}`);
    }

    return this.mapToModel(data);
  }

  async update(id: string, dependency: Partial<ProjectRoleDependency>): Promise<ProjectRoleDependency> {
    const updateData: Record<string, unknown> = {};
    
    if (dependency.projectId !== undefined) updateData.project_id = dependency.projectId;
    if (dependency.be_depends_on_fe !== undefined) updateData.be_depends_on_fe = dependency.be_depends_on_fe;
    if (dependency.fe_depends_on_be !== undefined) updateData.fe_depends_on_be = dependency.fe_depends_on_be;
    if (dependency.qa_depends_on_be !== undefined) updateData.qa_depends_on_be = dependency.qa_depends_on_be;
    if (dependency.qa_depends_on_fe !== undefined) updateData.qa_depends_on_fe = dependency.qa_depends_on_fe;
    if (dependency.parallel_mode !== undefined) updateData.parallel_mode = dependency.parallel_mode;
    if (dependency.current_active_roles !== undefined) updateData.current_active_roles = dependency.current_active_roles;

    const { data, error } = await this.supabase
      .from('project_role_dependencies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project role dependency: ${error.message}`);
    }

    return this.mapToModel(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('project_role_dependencies')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project role dependency: ${error.message}`);
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const { error } = await this.supabase
      .from('project_role_dependencies')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      throw new Error(`Failed to delete project role dependencies: ${error.message}`);
    }
  }

  private mapToModel(data: Record<string, unknown>): ProjectRoleDependency {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      be_depends_on_fe: data.be_depends_on_fe as boolean,
      fe_depends_on_be: data.fe_depends_on_be as boolean,
      qa_depends_on_be: data.qa_depends_on_be as boolean,
      qa_depends_on_fe: data.qa_depends_on_fe as boolean,
      parallel_mode: data.parallel_mode as boolean,
      current_active_roles: (data.current_active_roles as string[]) || [],
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string)
    };
  }
} 