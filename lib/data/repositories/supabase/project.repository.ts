import { createClient } from '@/lib/supabase/client';
import { Project } from "@/lib/domain/models/project.model";
import { ProjectRepository } from "@/lib/domain/repositories/project.repository";

// Typ pro dynamické role data
type ProjectWithCustomRoles = Project & Record<string, string | number | null | undefined>;

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
    
    // Explicitní mapování standardních rolí
    const feMandays = project.feMandays ?? 0;
    const beMandays = project.beMandays ?? 0;
    const qaMandays = project.qaMandays ?? 0;
    const pmMandays = project.pmMandays ?? 0;
    const dplMandays = project.dplMandays ?? 0;

    const feDone = project.feDone ?? 0;
    const beDone = project.beDone ?? 0;
    const qaDone = project.qaDone ?? 0;
    const pmDone = project.pmDone ?? 0;
    const dplDone = project.dplDone ?? 0;

    // Extrahujeme custom role data
    const customRoleData: Record<string, number> = {};
    const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
    
    // Pokud máme customRoleData v project objektu, použijeme to
    if ((project as Record<string, unknown>).customRoleData) {
      Object.assign(customRoleData, (project as Record<string, unknown>).customRoleData as Record<string, number>);
    } else {
      // Jinak extrahujeme z dynamických vlastností
      Object.entries(project).forEach(([key, value]) => {
        if ((key.includes('_mandays') || key.includes('_done')) && 
            !['feMandays', 'beMandays', 'qaMandays', 'pmMandays', 'dplMandays', 'feDone', 'beDone', 'qaDone', 'pmDone', 'dplDone'].includes(key)) {
          const roleKey = key.replace(/_mandays$/, '').replace(/_done$/, '');
          if (!standardRoleKeys.includes(roleKey)) {
            customRoleData[key] = value as number || 0;
          }
        }
      });
    }

    const insertData: Record<string, unknown> = {
      scope_id: project.scopeId,
      name: project.name,
      priority: project.priority,
      fe_mandays: feMandays,
      be_mandays: beMandays,
      qa_mandays: qaMandays,
      pm_mandays: pmMandays,
      dpl_mandays: dplMandays,
      fe_done: feDone,
      be_done: beDone,
      qa_done: qaDone,
      pm_done: pmDone,
      dpl_done: dplDone,
      delivery_date: project.deliveryDate?.toISOString(),
      start_day: project.startDay?.toISOString(),
      status: project.status || 'not_started'
    };

    // Přidáme custom role data pokud existují
    if (Object.keys(customRoleData).length > 0) {
      insertData.custom_role_data = customRoleData;
    }

    // Safeguard - odstraníme slip property pokud existuje
    if (insertData.slip !== undefined) {
      delete insertData.slip;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create project: ${error?.message}`);
    }

    return this.mapToModel(data);
  }

  async update(id: string, project: Partial<Project>): Promise<Project> {
    const supabase = createClient();
    const updateData: Record<string, string | number | boolean | null | undefined | Record<string, number>> = {};

    // Standardní sloupce
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
    if (project.startDay !== undefined) updateData.start_day = project.startDay ? project.startDay.toISOString() : null;
    if (project.status !== undefined) {
      updateData.status = project.status;
    }
    if (project.startedAt !== undefined) updateData.started_at = project.startedAt ? (project.startedAt instanceof Date ? project.startedAt.toISOString() : project.startedAt) : null;

    // Extrahujeme custom role data
    const customRoleData: Record<string, number> = {};
    const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
    
    Object.keys(project).forEach(key => {
      if (key.includes('_mandays') || key.includes('_done')) {
        const roleKey = key.replace(/_mandays$/, '').replace(/_done$/, '');
        if (!standardRoleKeys.includes(roleKey)) {
          // Toto je custom role
          customRoleData[key] = (project as ProjectWithCustomRoles)[key] as number || 0;
        }
      }
    });

    // Pokud máme customRoleData v project objektu, použijeme to
    if ((project as Record<string, unknown>).customRoleData) {
      Object.assign(customRoleData, (project as Record<string, unknown>).customRoleData as Record<string, number>);
    }

    if (Object.keys(customRoleData).length > 0) {
      updateData.custom_role_data = customRoleData;
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
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


  private mapToModel(data: Record<string, unknown>): Project {
    const baseProject = {
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
      deliveryDate: data.delivery_date ? new Date(data.delivery_date as string) : undefined,
      createdAt: new Date(data.created_at as string),
      startedAt: data.started_at ? new Date(data.started_at as string) : undefined,
      startDay: data.start_day ? new Date(data.start_day as string) : undefined,
      status: (data.status as 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended') || 'not_started'
    };

    // Přidáme custom role data z JSON sloupce, ale pouze ty, které nejsou standardní
    const customRoleData = data.custom_role_data || {};
    
    const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
    
    // Filtrujeme pouze custom role data (ne standardní)
    const filteredCustomRoleData: Record<string, unknown> = {};
    Object.entries(customRoleData).forEach(([key, value]) => {
      const roleKey = key.replace(/_mandays$/, '').replace(/_done$/, '');
      if (!standardRoleKeys.includes(roleKey)) {
        filteredCustomRoleData[key] = value;
      }
    });
    
    const projectWithCustomRoles = { 
      ...baseProject, 
      customRoleData: filteredCustomRoleData,
      ...filteredCustomRoleData 
    };
    
    return projectWithCustomRoles as Project;
  }
}
