/**
 * Supabase Project Progress Repository Implementation
 * Handles all project progress database operations with proper error handling
 */

import { createClient } from '@/lib/supabase/client';
import { 
  ProjectProgressRepository, 
  ProjectProgress, 
  CreateProjectProgressData, 
  UpdateProjectProgressData 
} from '@/lib/domain/repositories/project-progress.repository';

export class SupabaseProjectProgressRepository implements ProjectProgressRepository {
  async create(data: CreateProjectProgressData): Promise<ProjectProgress> {
    const supabase = createClient();
    
    const { data: progress, error } = await supabase
      .from('project_progress')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating project progress:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to create project progress: ${errorMessage}`);
    }

    return progress;
  }

  async findByProjectId(projectId: string): Promise<ProjectProgress[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching project progress:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch project progress: ${errorMessage}`);
    }

    return data || [];
  }

  async findById(id: string): Promise<ProjectProgress | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching project progress by ID:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch project progress: ${errorMessage}`);
    }

    return data;
  }

  async update(id: string, data: UpdateProjectProgressData): Promise<ProjectProgress> {
    const supabase = createClient();
    
    const { data: progress, error } = await supabase
      .from('project_progress')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project progress:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to update project progress: ${errorMessage}`);
    }

    return progress;
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('project_progress')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project progress:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to delete project progress: ${errorMessage}`);
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('project_progress')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.error('Error deleting project progress by project ID:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to delete project progress: ${errorMessage}`);
    }
  }
}