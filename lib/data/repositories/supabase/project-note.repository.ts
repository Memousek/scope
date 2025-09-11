/**
 * Supabase Project Note Repository Implementation
 * Handles all project note database operations with proper error handling
 */

import { createClient } from '@/lib/supabase/client';
import { 
  ProjectNoteRepository, 
  ProjectNote, 
  CreateProjectNoteData, 
  UpdateProjectNoteData 
} from '@/lib/domain/repositories/project-note.repository';

export class SupabaseProjectNoteRepository implements ProjectNoteRepository {
  async create(data: CreateProjectNoteData): Promise<ProjectNote> {
    const supabase = createClient();
    
    const { data: note, error } = await supabase
      .from('project_notes')
      .insert({
        project_id: data.project_id,
        text: data.text,
        author_id: data.author_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project note:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to create project note: ${errorMessage}`);
    }

    return note;
  }

  async findByProjectId(projectId: string): Promise<ProjectNote[]> {
    const supabase = createClient();
    
    const { data: notesData, error: notesError } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('Error fetching project notes:', notesError);
      const errorMessage = notesError.message || notesError.details || notesError.hint || 'Unknown error';
      throw new Error(`Failed to fetch project notes: ${errorMessage}`);
    }

    if (!notesData || notesData.length === 0) {
      return [];
    }

    // Get unique author IDs
    const authorIds = [...new Set(notesData.map(note => note.author_id))];
    
    // Fetch author information
    const { data: authorsData, error: authorsError } = await supabase
      .from('user_meta')
      .select('user_id, full_name, email, avatar_url')
      .in('user_id', authorIds);

    if (authorsError) {
      console.error('Error fetching note authors:', authorsError);
      // Continue without author info rather than failing
    }

    // Create author lookup map
    const authorMap = new Map();
    if (authorsData) {
      authorsData.forEach(author => {
        authorMap.set(author.user_id, {
          id: author.user_id,
          name: author.full_name || 'Unknown',
          email: author.email,
          avatar: author.avatar_url
        });
      });
    }

    // Combine notes with author information
    return notesData.map(note => ({
      ...note,
      author: authorMap.get(note.author_id) || {
        id: note.author_id,
        name: 'Unknown',
        email: '',
        avatar: null
      }
    }));
  }

  async findById(id: string): Promise<ProjectNote | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching project note by ID:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to fetch project note: ${errorMessage}`);
    }

    return data;
  }

  async update(id: string, data: UpdateProjectNoteData): Promise<ProjectNote> {
    const supabase = createClient();
    
    const { data: note, error } = await supabase
      .from('project_notes')
      .update({ 
        text: data.text, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project note:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to update project note: ${errorMessage}`);
    }

    return note;
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('project_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project note:', error);
      const errorMessage = error.message || error.details || error.hint || 'Unknown error';
      throw new Error(`Failed to delete project note: ${errorMessage}`);
    }
  }
}
