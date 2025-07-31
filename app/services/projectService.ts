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

    // Also update the current project values
    const projectUpdates: Partial<Project> = {};
    if (progressData.fe_done !== undefined && progressData.fe_done !== null) projectUpdates.fe_done = progressData.fe_done;
    if (progressData.be_done !== undefined && progressData.be_done !== null) projectUpdates.be_done = progressData.be_done;
    if (progressData.qa_done !== undefined && progressData.qa_done !== null) projectUpdates.qa_done = progressData.qa_done;
    if (progressData.pm_done !== undefined && progressData.pm_done !== null) projectUpdates.pm_done = progressData.pm_done;
    if (progressData.dpl_done !== undefined && progressData.dpl_done !== null) projectUpdates.dpl_done = progressData.dpl_done;
    
    // For NOT NULL columns, only update if we have a valid number
    if (progressData.fe_mandays !== undefined && progressData.fe_mandays !== null) projectUpdates.fe_mandays = progressData.fe_mandays;
    if (progressData.be_mandays !== undefined && progressData.be_mandays !== null) projectUpdates.be_mandays = progressData.be_mandays;
    if (progressData.qa_mandays !== undefined && progressData.qa_mandays !== null) projectUpdates.qa_mandays = progressData.qa_mandays;
    
    // For NULLABLE columns, we can send null
    if (progressData.pm_mandays !== undefined) projectUpdates.pm_mandays = progressData.pm_mandays;
    if (progressData.dpl_mandays !== undefined) projectUpdates.dpl_mandays = progressData.dpl_mandays;

    if (Object.keys(projectUpdates).length > 0) {
      const { error: projectError } = await supabase
        .from('projects')
        .update(projectUpdates)
        .eq('id', projectId);

      if (projectError) throw projectError;
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
    console.log('ProjectService.updateProjectProgress called with:', progressId, updates);
    const supabase = createClient();
    
    // First, get the progress entry to find the project_id
    const { data: progressData, error: progressError } = await supabase
      .from('project_progress')
      .select('project_id')
      .eq('id', progressId)
      .single();

    if (progressError) {
      console.error('Error getting progress data:', progressError);
      throw progressError;
    }

    console.log('Found project_id:', progressData.project_id);

    // Update the progress entry
    const { error: updateError } = await supabase
      .from('project_progress')
      .update(updates)
      .eq('id', progressId);

    if (updateError) {
      console.error('Supabase error updating progress:', updateError);
      throw updateError;
    }

    console.log('Progress update successful');

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
      console.log('Updating project with:', projectUpdates);
      console.log('Project updates types:', Object.entries(projectUpdates).map(([key, value]) => `${key}: ${typeof value} (${value})`));
      console.log('Project ID:', progressData.project_id);
      
      // Try to get the current project data first
      const { data: currentProject, error: getProjectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', progressData.project_id)
        .single();

      if (getProjectError) {
        console.error('Error getting current project data:', getProjectError);
        throw getProjectError;
      }

      console.log('Current project data:', currentProject);
      
      const { error: projectError } = await supabase
        .from('projects')
        .update(projectUpdates)
        .eq('id', progressData.project_id);

      if (projectError) {
        console.error('Supabase error updating project:', projectError);
        console.error('Project updates that failed:', projectUpdates);
        console.error('Current project data:', currentProject);
        throw projectError;
      }
    }

    console.log('ProjectService.updateProjectProgress successful');
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
      console.error('Error getting progress data:', progressError);
      throw progressError;
    }

    // Delete the progress entry
    const { error: deleteError } = await supabase
      .from('project_progress')
      .delete()
      .eq('id', progressId);

    if (deleteError) {
      console.error('Supabase error deleting progress:', deleteError);
      throw deleteError;
    }

    // Check if this was the last progress entry for the project
    const { data: remainingProgress, error: countError } = await supabase
      .from('project_progress')
      .select('id')
      .eq('project_id', progressData.project_id);

    if (countError) {
      console.error('Error checking remaining progress:', countError);
      throw countError;
    }

    // If no progress entries remain, reset the project values to 0
    if (!remainingProgress || remainingProgress.length === 0) {
      console.log('No progress entries remaining, resetting project values');
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
        console.error('Supabase error resetting project:', resetError);
        throw resetError;
      }
    }

    console.log('ProjectService.deleteProjectProgress successful');
  }
} 