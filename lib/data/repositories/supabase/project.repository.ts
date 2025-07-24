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
        fe_mandays: project.feMandays ?? 0,
        be_mandays: project.beMandays ?? 0,
        qa_mandays: project.qaMandays ?? 0,
        pm_mandays: project.pmMandays ?? 0,
        dpl_mandays: project.dplMandays ?? 0,
        fe_done: project.feDone ?? 0,
        be_done: project.beDone ?? 0,
        qa_done: project.qaDone ?? 0,
        pm_done: project.pmDone ?? 0,
        dpl_done: project.dplDone ?? 0,
        delivery_date: project.deliveryDate?.toISOString(),
        slip: project.slip ?? 0
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
    if (project.feMandays !== undefined) updateData.fe_mandays = project.feMandays ?? 0;
    if (project.beMandays !== undefined) updateData.be_mandays = project.beMandays ?? 0;
    if (project.qaMandays !== undefined) updateData.qa_mandays = project.qaMandays ?? 0;
    if (project.pmMandays !== undefined) updateData.pm_mandays = project.pmMandays ?? 0;
    if (project.dplMandays !== undefined) updateData.dpl_mandays = project.dplMandays ?? 0;
    if (project.feDone !== undefined) updateData.fe_done = project.feDone ?? 0;
    if (project.beDone !== undefined) updateData.be_done = project.beDone ?? 0;
    if (project.qaDone !== undefined) updateData.qa_done = project.qaDone ?? 0;
    if (project.pmDone !== undefined) updateData.pm_done = project.pmDone ?? 0;
    if (project.dplDone !== undefined) updateData.dpl_done = project.dplDone ?? 0;
    if (project.deliveryDate !== undefined) updateData.delivery_date = project.deliveryDate?.toISOString();
    if (project.slip !== undefined) updateData.slip = project.slip ?? 0;

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
