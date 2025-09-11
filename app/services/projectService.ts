/**
 * Service layer for project-related API operations
 * Centralizes all Supabase calls for projects
 */

import { createClient } from '@/lib/supabase/client';
import { Project, ProjectProgress } from '@/app/components/scope/types';
import { ContainerService } from '@/lib/container.service';
import { ProjectRepository } from '@/lib/domain/repositories/project.repository';

export interface CreateProjectData {
  name: string;
  priority: number;
  delivery_date: string | null;
  start_day?: string | null; // Vlastní startovní den projektu pro souběžnou práci
  status?: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended';
  custom_role_data?: Record<string, number> | null;
  // Dynamické role data - klíče budou generovány z scope_roles
  [key: string]: string | number | null | undefined | Record<string, number> | null; // Pro role sloupce jako fe_mandays, be_done, atd.
}

export class ProjectService {
  /**
   * Load all projects for a scope
   */
  static async loadProjects(scopeId: string): Promise<Project[]> {
    const projectRepository = ContainerService.getInstance().get(ProjectRepository);
    const domainProjects = await projectRepository.findByScopeId(scopeId);
    
    const componentProjects = await Promise.all(domainProjects.map(async domainProject => {
      // Načteme poznámky pro tento projekt
      const { ProjectNoteService } = await import('./projectNoteService');
      const notes = await ProjectNoteService.getNotes(domainProject.id);
      
      const componentProject = {
        id: domainProject.id,
        name: domainProject.name,
        priority: domainProject.priority,
        delivery_date: domainProject.deliveryDate?.toISOString() || null,
        start_day: domainProject.startDay?.toISOString() || null,
        created_at: domainProject.createdAt.toISOString(),
        status: domainProject.status || 'not_started',
        // Map standard role data
        fe_mandays: domainProject.feMandays,
        be_mandays: domainProject.beMandays,
        qa_mandays: domainProject.qaMandays,
        pm_mandays: domainProject.pmMandays,
        dpl_mandays: domainProject.dplMandays,
        fe_done: domainProject.feDone,
        be_done: domainProject.beDone,
        qa_done: domainProject.qaDone,
        pm_done: domainProject.pmDone,
        dpl_done: domainProject.dplDone,
        // Map custom role data from customRoleData property
        ...(domainProject.customRoleData || {}),
        // Přidáme poznámky
        notes: notes
      } as Project;
      
      // Remove domain-specific properties to avoid conflicts
      delete (componentProject as unknown as Record<string, unknown>).startDay;
      
      return componentProject;
    }));
    
    return componentProjects;
  }

  /**
   * Create a new project
   */
  static async createProject(scopeId: string, projectData: CreateProjectData): Promise<Project> {
    
    const projectRepository = ContainerService.getInstance().get(ProjectRepository);
    
    // Explicitní mapování standardních rolí
    const feMandays = (projectData as Record<string, unknown>).fe_mandays as number ?? 0;
    const beMandays = (projectData as Record<string, unknown>).be_mandays as number ?? 0;
    const qaMandays = (projectData as Record<string, unknown>).qa_mandays as number ?? 0;
    const pmMandays = (projectData as Record<string, unknown>).pm_mandays as number ?? 0;
    const dplMandays = (projectData as Record<string, unknown>).dpl_mandays as number ?? 0;

    const feDone = (projectData as Record<string, unknown>).fe_done as number ?? 0;
    const beDone = (projectData as Record<string, unknown>).be_done as number ?? 0;
    const qaDone = (projectData as Record<string, unknown>).qa_done as number ?? 0;
    const pmDone = (projectData as Record<string, unknown>).pm_done as number ?? 0;
    const dplDone = (projectData as Record<string, unknown>).dpl_done as number ?? 0;

    // Extrahujeme custom role data
    const customRoleData: Record<string, number> = {};
    const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
    
    // Pokud máme custom_role_data v projectData, použijeme to
    if (projectData.custom_role_data) {
      Object.assign(customRoleData, projectData.custom_role_data);
    } else {
      // Jinak extrahujeme z dynamických vlastností
      Object.entries(projectData).forEach(([key, value]) => {
        if ((key.includes('_mandays') || key.includes('_done')) && 
            !['fe_mandays', 'be_mandays', 'qa_mandays', 'pm_mandays', 'dpl_mandays', 'fe_done', 'be_done', 'qa_done', 'pm_done', 'dpl_done'].includes(key)) {
          const roleKey = key.replace(/_mandays$/, '').replace(/_done$/, '');
          if (!standardRoleKeys.includes(roleKey)) {
            customRoleData[key] = value as number || 0;
          }
        }
      });
    }

    const domainProject = await projectRepository.create({
      scopeId,
      name: projectData.name,
      priority: projectData.priority,
      deliveryDate: projectData.delivery_date ? new Date(projectData.delivery_date) : undefined,
      startDay: projectData.start_day && typeof projectData.start_day === 'string' ? new Date(projectData.start_day) : undefined,
      status: projectData.status || 'not_started',
      feMandays,
      beMandays,
      qaMandays,
      pmMandays,
      dplMandays,
      feDone,
      beDone,
      qaDone,
      pmDone,
      dplDone,
      // Přidáme custom role data
      ...(Object.keys(customRoleData).length > 0 ? { customRoleData } : {})
    });
    
    // Načteme poznámky pro nový projekt
    const { ProjectNoteService } = await import('./projectNoteService');
    const notes = await ProjectNoteService.getNotes(domainProject.id);
    
    // Map domain project to component project
    return {
      id: domainProject.id,
      name: domainProject.name,
      priority: domainProject.priority,
      delivery_date: domainProject.deliveryDate?.toISOString() || null,
      start_day: domainProject.startDay?.toISOString() || null,
      created_at: domainProject.createdAt.toISOString(),
      status: domainProject.status || 'not_started',
      // Map standard role data
      fe_mandays: domainProject.feMandays,
      be_mandays: domainProject.beMandays,
      qa_mandays: domainProject.qaMandays,
      pm_mandays: domainProject.pmMandays,
      dpl_mandays: domainProject.dplMandays,
      fe_done: domainProject.feDone,
      be_done: domainProject.beDone,
      qa_done: domainProject.qaDone,
      pm_done: domainProject.pmDone,
      dpl_done: domainProject.dplDone,
      // Map custom role data from customRoleData property only
      ...(domainProject.customRoleData || {}),
      // Přidáme poznámky
      notes: notes
    } as Project;
  }

  /**
   * Update an existing project
   */
  static async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const projectRepository = ContainerService.getInstance().get(ProjectRepository);
    
    // Map component updates to domain updates
    const domainUpdates: Record<string, unknown> = {};
    
    if (updates.name !== undefined) domainUpdates.name = updates.name;
    if (updates.priority !== undefined) domainUpdates.priority = updates.priority;
    if (updates.delivery_date !== undefined) domainUpdates.deliveryDate = updates.delivery_date ? new Date(updates.delivery_date) : undefined;
    if (updates.start_day !== undefined) domainUpdates.startDay = updates.start_day ? new Date(updates.start_day) : null;
    if (updates.status !== undefined) domainUpdates.status = updates.status;
    // startedAt logika
    if ((updates.status as string) === 'in_progress') {
      if (!('startedAt' in updates) || !updates.startedAt) {
        domainUpdates.startedAt = new Date();
      } else if (typeof updates.startedAt === 'string') {
        domainUpdates.startedAt = new Date(updates.startedAt);
      }
      // Pokud je null nebo undefined, nenastavuj vůbec
    } else if (updates.status && (updates.status as string) !== 'in_progress') {
      domainUpdates.startedAt = undefined;
    }
    
    // Map standard role data
    if ((updates as Record<string, unknown>).fe_mandays !== undefined) domainUpdates.feMandays = (updates as Record<string, unknown>).fe_mandays as number;
    if ((updates as Record<string, unknown>).be_mandays !== undefined) domainUpdates.beMandays = (updates as Record<string, unknown>).be_mandays as number;
    if ((updates as Record<string, unknown>).qa_mandays !== undefined) domainUpdates.qaMandays = (updates as Record<string, unknown>).qa_mandays as number;
    if ((updates as Record<string, unknown>).pm_mandays !== undefined) domainUpdates.pmMandays = (updates as Record<string, unknown>).pm_mandays as number;
    if ((updates as Record<string, unknown>).dpl_mandays !== undefined) domainUpdates.dplMandays = (updates as Record<string, unknown>).dpl_mandays as number;
    if ((updates as Record<string, unknown>).fe_done !== undefined) domainUpdates.feDone = (updates as Record<string, unknown>).fe_done as number;
    if ((updates as Record<string, unknown>).be_done !== undefined) domainUpdates.beDone = (updates as Record<string, unknown>).be_done as number;
    if ((updates as Record<string, unknown>).qa_done !== undefined) domainUpdates.qaDone = (updates as Record<string, unknown>).qa_done as number;
    if ((updates as Record<string, unknown>).pm_done !== undefined) domainUpdates.pmDone = (updates as Record<string, unknown>).pm_done as number;
    if ((updates as Record<string, unknown>).dpl_done !== undefined) domainUpdates.dplDone = (updates as Record<string, unknown>).dpl_done as number;
    
    // Map custom role data
    Object.entries(updates).forEach(([key, value]) => {
      if ((key.includes('_mandays') || key.includes('_done')) && 
          !['fe_mandays', 'be_mandays', 'qa_mandays', 'pm_mandays', 'dpl_mandays', 'fe_done', 'be_done', 'qa_done', 'pm_done', 'dpl_done'].includes(key)) {
        domainUpdates[key] = value;
      }
    });
    
    // Handle custom_role_data if present
    if ((updates as Record<string, unknown>).custom_role_data) {
      domainUpdates.customRoleData = (updates as Record<string, unknown>).custom_role_data;
    }
    
    // Zajisti, že startedAt není null
    if (domainUpdates.startedAt === null) {
      domainUpdates.startedAt = undefined;
    }
    
    // Vytvoř nový objekt s správnými typy pro doménový model
    const domainProjectUpdates: Partial<import('../../lib/domain/models/project.model').Project> = {
      ...domainUpdates,
      startedAt: domainUpdates.startedAt instanceof Date ? domainUpdates.startedAt : undefined
    };
    
    const domainProject = await projectRepository.update(projectId, domainProjectUpdates);
    
    // Načteme poznámky pro aktualizovaný projekt
    const { ProjectNoteService } = await import('./projectNoteService');
    const notes = await ProjectNoteService.getNotes(domainProject.id);
    
    // Map domain project to component project
    return {
      id: domainProject.id,
      name: domainProject.name,
      priority: domainProject.priority,
      delivery_date: domainProject.deliveryDate?.toISOString() || null,
      created_at: domainProject.createdAt.toISOString(),
      start_day: domainProject.startDay?.toISOString() || null,
      status: domainProject.status || 'not_started',
      // Map standard role data
      fe_mandays: domainProject.feMandays,
      be_mandays: domainProject.beMandays,
      qa_mandays: domainProject.qaMandays,
      pm_mandays: domainProject.pmMandays,
      dpl_mandays: domainProject.dplMandays,
      fe_done: domainProject.feDone,
      be_done: domainProject.beDone,
      qa_done: domainProject.qaDone,
      pm_done: domainProject.pmDone,
      dpl_done: domainProject.dplDone,
      // Map custom role data from customRoleData property
      ...(domainProject.customRoleData || {}),
      // Přidáme poznámky
      notes: notes
    } as Project;
  }

  /**
   * Delete a project and its associated progress data
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    const projectRepository = ContainerService.getInstance().get(ProjectRepository);
    
    // Delete associated progress data first
    const supabase = createClient();
    await supabase.from('project_progress').delete().eq('project_id', projectId);
    
    // Delete the project
    await projectRepository.delete(projectId);
    return true;
  }

  /**
   * Save project progress changes
   */
  static async saveProjectProgress(projectId: string, progressData: Partial<ProjectProgress>): Promise<void> {
    const supabase = createClient();
    
    // Filtrujeme pouze standardní role data pro project_progress
    const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
    const filteredProgressData: Partial<ProjectProgress> = {};
    
    Object.entries(progressData).forEach(([key, value]) => {
      const roleKey = key.replace(/_done$/, '').replace(/_mandays$/, '');
      if (standardRoleKeys.includes(roleKey)) {
        (filteredProgressData as Record<string, unknown>)[key] = value;
      }
    });
    
    const progress: ProjectProgress = {
      project_id: projectId,
      date: new Date().toISOString(),
      ...filteredProgressData
    };

    const { error } = await supabase.from('project_progress').insert([progress]);
    if (error) throw error;

    // Also update the current project values
    const projectUpdates: Partial<Project> = {};
  if (progressData.fe_done !== undefined && progressData.fe_done !== null) projectUpdates["fe_done"] = progressData.fe_done;
  if (progressData.be_done !== undefined && progressData.be_done !== null) projectUpdates["be_done"] = progressData.be_done;
  if (progressData.qa_done !== undefined && progressData.qa_done !== null) projectUpdates["qa_done"] = progressData.qa_done;
  if (progressData.pm_done !== undefined && progressData.pm_done !== null) projectUpdates["pm_done"] = progressData.pm_done;
  if (progressData.dpl_done !== undefined && progressData.dpl_done !== null) projectUpdates["dpl_done"] = progressData.dpl_done;
    
    // For NOT NULL columns, only update if we have a valid number
    if (progressData.fe_mandays !== undefined && progressData.fe_mandays !== null) projectUpdates.fe_mandays = progressData.fe_mandays;
    if (progressData.be_mandays !== undefined && progressData.be_mandays !== null) projectUpdates.be_mandays = progressData.be_mandays;
    if (progressData.qa_mandays !== undefined && progressData.qa_mandays !== null) projectUpdates.qa_mandays = progressData.qa_mandays;
    
    // For NULLABLE columns, we can send null
    if (progressData.pm_mandays !== undefined) projectUpdates.pm_mandays = progressData.pm_mandays;
    if (progressData.dpl_mandays !== undefined) projectUpdates.dpl_mandays = progressData.dpl_mandays;

    if (Object.keys(projectUpdates).length > 0) {
      // Použijeme repository místo přímého Supabase update, aby se zachovaly custom role data
      const projectRepository = ContainerService.getInstance().get(ProjectRepository);
      
      // Map component project updates to domain project updates
      const domainProjectUpdates: Partial<import('../../lib/domain/models/project.model').Project> = {};
      
      // Map standard role data from component format to domain format
      if (projectUpdates.fe_done !== undefined) domainProjectUpdates.feDone = projectUpdates.fe_done as number;
      if (projectUpdates.be_done !== undefined) domainProjectUpdates.beDone = projectUpdates.be_done as number;
      if (projectUpdates.qa_done !== undefined) domainProjectUpdates.qaDone = projectUpdates.qa_done as number;
      if (projectUpdates.pm_done !== undefined) domainProjectUpdates.pmDone = projectUpdates.pm_done as number;
      if (projectUpdates.dpl_done !== undefined) domainProjectUpdates.dplDone = projectUpdates.dpl_done as number;
      
      if (projectUpdates.fe_mandays !== undefined) domainProjectUpdates.feMandays = projectUpdates.fe_mandays as number;
      if (projectUpdates.be_mandays !== undefined) domainProjectUpdates.beMandays = projectUpdates.be_mandays as number;
      if (projectUpdates.qa_mandays !== undefined) domainProjectUpdates.qaMandays = projectUpdates.qa_mandays as number;
      if (projectUpdates.pm_mandays !== undefined) domainProjectUpdates.pmMandays = projectUpdates.pm_mandays as number;
      if (projectUpdates.dpl_mandays !== undefined) domainProjectUpdates.dplMandays = projectUpdates.dpl_mandays as number;
      
      await projectRepository.update(projectId, domainProjectUpdates);
    }
  }

  /**
   * Load project progress history
   */
  static async loadProjectProgress(projectId: string): Promise<ProjectProgress[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update project progress entry
   */
  static async updateProjectProgress(progressId: string, updates: Partial<ProjectProgress>): Promise<void> {
    const supabase = createClient();
    
    // First, get the progress entry to find the project_id
    const { data: progressData, error: progressError } = await supabase
      .from('project_progress')
      .select('project_id')
      .eq('id', progressId)
      .single();

    if (progressError) {
      throw progressError;
    }

    // Update the progress entry
    const { error: updateError } = await supabase
      .from('project_progress')
      .update(updates)
      .eq('id', progressId);

    if (updateError) {
      throw updateError;
    }

    // Also update the current project values
    const projectUpdates: Partial<Project> = {};
    if (updates.fe_done !== undefined && updates.fe_done !== null) projectUpdates.fe_done = updates.fe_done;
    if (updates.be_done !== undefined && updates.be_done !== null) projectUpdates.be_done = updates.be_done;
    if (updates.qa_done !== undefined && updates.qa_done !== null) projectUpdates.qa_done = updates.qa_done;
    if (updates.pm_done !== undefined && updates.pm_done !== null) projectUpdates.pm_done = updates.pm_done;
    if (updates.dpl_done !== undefined && updates.dpl_done !== null) projectUpdates.dpl_done = updates.dpl_done;
    
    // For NOT NULL columns, only update if we have a valid number
    if (updates.fe_mandays !== undefined && updates.fe_mandays !== null) projectUpdates.fe_mandays = updates.fe_mandays;
    if (updates.be_mandays !== undefined && updates.be_mandays !== null) projectUpdates.be_mandays = updates.be_mandays;
    if (updates.qa_mandays !== undefined && updates.qa_mandays !== null) projectUpdates.qa_mandays = updates.qa_mandays;
    
    // For NULLABLE columns, we can send null
    if (updates.pm_mandays !== undefined) projectUpdates.pm_mandays = updates.pm_mandays;
    if (updates.dpl_mandays !== undefined) projectUpdates.dpl_mandays = updates.dpl_mandays;

    if (Object.keys(projectUpdates).length > 0) {
      // Try to get the current project data first
      const { error: getProjectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', progressData.project_id)
        .single();

      if (getProjectError) {
        throw getProjectError;
      }
      
      const { error: projectError } = await supabase
        .from('projects')
        .update(projectUpdates)
        .eq('id', progressData.project_id);

      if (projectError) {
        throw projectError;
      }
    }
  }

  /**
   * Delete project progress entry
   */
  static async deleteProjectProgress(progressId: string): Promise<void> {
    const supabase = createClient();
    
    // First, get the progress entry to find the project_id
    const { data: progressData, error: progressError } = await supabase
      .from('project_progress')
      .select('project_id')
      .eq('id', progressId)
      .single();

    if (progressError) {
      throw progressError;
    }

    // Delete the progress entry
    const { error: deleteError } = await supabase
      .from('project_progress')
      .delete()
      .eq('id', progressId);

    if (deleteError) {
      throw deleteError;
    }

    // Check if this was the last progress entry for the project
    const { data: remainingProgress, error: countError } = await supabase
      .from('project_progress')
      .select('id')
      .eq('project_id', progressData.project_id);

    if (countError) {
      throw countError;
    }

    // If no progress entries remain, reset the project values to 0
    if (!remainingProgress || remainingProgress.length === 0) {
      const { error: resetError } = await supabase
        .from('projects')
        .update({
          fe_done: 0,
          be_done: 0,
          qa_done: 0,
          pm_done: 0,
          dpl_done: 0,
          fe_mandays: null,
          be_mandays: null,
          qa_mandays: null,
          pm_mandays: null,
          dpl_mandays: null
        })
        .eq('id', progressData.project_id);

      if (resetError) {
        throw resetError;
      }
    }
  }

  /**
   * Sync project progress with timesheet data
   * This automatically updates project progress based on actual work logged
   */
  static async syncProjectProgressWithTimesheets(
    projectId: string, 
    timesheetData: Array<{
      memberId: string;
      projectId: string;
      role: string;
      hours: number;
      date: Date;
    }>
  ): Promise<void> {
    const supabase = createClient();
    
    // Filter timesheets for this project
    const projectTimesheets = timesheetData.filter(ts => ts.projectId === projectId);
    
    if (projectTimesheets.length === 0) {
      return;
    }
    
    // Group by role and calculate total hours
    const roleProgress = projectTimesheets.reduce((acc, ts) => {
      const roleKey = ts.role.toLowerCase().replace(/\s+/g, '');
      if (!acc[roleKey]) {
        acc[roleKey] = { hours: 0, mandays: 0 };
      }
      acc[roleKey].hours += ts.hours;
      acc[roleKey].mandays = acc[roleKey].hours / 8;
      return acc;
    }, {} as Record<string, { hours: number; mandays: number }>);
    
    // Get current project data to calculate progress percentages
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (!project) {
      return;
    }
    
    // Calculate progress updates for each role
    const progressUpdates: Partial<ProjectProgress> = {};
    
    Object.entries(roleProgress).forEach(([role, data]) => {
      const mandaysKey = `${role}_mandays`;
      const doneKey = `${role}_done`;
      
      const estimatedMandays = Number(project[mandaysKey] || 0);
      if (estimatedMandays > 0) {
        // Calculate progress as percentage and round to nearest integer
        const progressPercentage = Math.min((data.mandays / estimatedMandays) * 100, 100);
        const roundedPercentage = Math.round(progressPercentage);
        (progressUpdates as Record<string, unknown>)[doneKey] = roundedPercentage;
        
      }
    });
    
    // Save progress update if we have any changes
    if (Object.keys(progressUpdates).length > 0) {
      await this.saveProjectProgress(projectId, progressUpdates);
    }
  }

  /**
   * Bulk sync all projects in a scope with timesheet data
   */
  static async syncAllProjectsWithTimesheets(
    scopeId: string,
    timesheetData: Array<{
      memberId: string;
      projectId: string;
      role: string;
      hours: number;
      date: Date;
    }>
  ): Promise<void> {
    // Get all projects for this scope
    const projects = await this.loadProjects(scopeId);
    
    // Sync each project
    for (const project of projects) {
      await this.syncProjectProgressWithTimesheets(project.id, timesheetData);
    }
  }
} 