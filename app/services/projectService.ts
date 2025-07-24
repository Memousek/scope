/**
 * Service layer for project-related API operations
 * Centralizes all Supabase calls for projects
 */

import { createClient } from '@/lib/supabase/client';
import { Project, ProjectProgress } from '@/app/components/scope/types';

export interface CreateProjectData {
  name: string;
  priority: number;
  fe_mandays: number | null;
  be_mandays: number | null;
  qa_mandays: number | null;
  pm_mandays: number | null;
  dpl_mandays: number | null;
  fe_done: number;
  be_done: number;
  qa_done: number;
  pm_done: number;
  dpl_done: number;
  delivery_date: string | null;
}

export class ProjectService {
  /**
   * Load all projects for a scope
   */
  static async loadProjects(scopeId: string): Promise<Project[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('scope_id', scopeId)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new project
   */
  static async createProject(scopeId: string, projectData: CreateProjectData): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...projectData, scope_id: scopeId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing project
   */
  static async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a project and its associated progress data
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    const supabase = createClient();
    
    // Delete associated progress data first
    await supabase.from('project_progress').delete().eq('project_id', projectId);
    
    // Delete the project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
    return true;
  }

  /**
   * Save project progress changes
   */
  static async saveProjectProgress(projectId: string, progressData: Partial<ProjectProgress>): Promise<void> {
    const supabase = createClient();
    const progress: ProjectProgress = {
      project_id: projectId,
      date: new Date().toISOString(),
      ...progressData
    };

    const { error } = await supabase.from('project_progress').insert([progress]);
    if (error) throw error;
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
    const { error } = await supabase
      .from('project_progress')
      .update(updates)
      .eq('id', progressId);

    if (error) throw error;
  }

  /**
   * Delete project progress entry
   */
  static async deleteProjectProgress(progressId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_progress')
      .delete()
      .eq('id', progressId);

    if (error) throw error;
  }
} 