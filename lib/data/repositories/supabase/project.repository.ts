import { createClient } from '@/lib/supabase/client';
import { Project } from "@/lib/domain/models/project.model";
import { ProjectRepository } from "@/lib/domain/repositories/project.repository";

export class SupabaseProjectRepository implements ProjectRepository {
  async findById(id: string): Promise<Project | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapToModel(data);
  }

  async findByScopeId(scopeId: string): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('scope_id', scopeId);

    if (error || !data) return [];

    return data.map(this.mapToModel);
  }

  async create(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .insert({
        scope_id: project.scopeId,
        name: project.name,
        priority: project.priority,
        fe_mandays: project.feMandays,
        be_mandays: project.beMandays,
        qa_mandays: project.qaMandays,
        pm_mandays: project.pmMandays,
        dpl_mandays: project.dplMandays,
        fe_done: project.feDone,
        be_done: project.beDone,
        qa_done: project.qaDone,
        pm_done: project.pmDone,
        dpl_done: project.dplDone,
        delivery_date: project.deliveryDate?.toISOString(),
        slip: project.slip
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create project: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async update(id: string, project: Partial<Project>): Promise<Project> {
    const supabase = createClient();
    const updateData: Record<string, string | number | boolean | null | undefined> = {};

    if (project.scopeId !== undefined) updateData.scope_id = project.scopeId;
    if (project.name !== undefined) updateData.name = project.name;
    if (project.priority !== undefined) updateData.priority = project.priority;
    if (project.feMandays !== undefined) updateData.fe_mandays = project.feMandays;
    if (project.beMandays !== undefined) updateData.be_mandays = project.beMandays;
    if (project.qaMandays !== undefined) updateData.qa_mandays = project.qaMandays;
    if (project.pmMandays !== undefined) updateData.pm_mandays = project.pmMandays;
    if (project.dplMandays !== undefined) updateData.dpl_mandays = project.dplMandays;
    if (project.feDone !== undefined) updateData.fe_done = project.feDone;
    if (project.beDone !== undefined) updateData.be_done = project.beDone;
    if (project.qaDone !== undefined) updateData.qa_done = project.qaDone;
    if (project.pmDone !== undefined) updateData.pm_done = project.pmDone;
    if (project.dplDone !== undefined) updateData.dpl_done = project.dplDone;
    if (project.deliveryDate !== undefined) updateData.delivery_date = project.deliveryDate?.toISOString();
    if (project.slip !== undefined) updateData.slip = project.slip;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update project: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  // eslint-disable-next-line
  private mapToModel(data: any): Project {
    return {
      id: data.id,
      scopeId: data.scope_id,
      name: data.name,
      priority: data.priority,
      feMandays: data.fe_mandays,
      beMandays: data.be_mandays,
      qaMandays: data.qa_mandays,
      pmMandays: data.pm_mandays,
      dplMandays: data.dpl_mandays,
      feDone: data.fe_done,
      beDone: data.be_done,
      qaDone: data.qa_done,
      pmDone: data.pm_done,
      dplDone: data.dpl_done,
      deliveryDate: data.delivery_date ? new Date(data.delivery_date) : undefined,
      createdAt: new Date(data.created_at),
      slip: data.slip
    };
  }
}
