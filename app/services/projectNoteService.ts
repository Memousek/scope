import { createClient } from '@/lib/supabase/client';

export interface CreateProjectNoteData {
  project_id: string;
  text: string;
  author_id: string;
  created_at?: string;
  updated_at?: string;
}

export class ProjectNoteService {
  static async updateNote(noteId: string, newText: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_notes')
      .update({ text: newText, updated_at: new Date().toISOString() })
      .eq('id', noteId);
    if (error) throw new Error(error.message);
  }

  static async deleteNote(noteId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_notes')
      .delete()
      .eq('id', noteId);
    if (error) throw new Error(error.message);
  }
  static async addNote(note: CreateProjectNoteData) {
    const supabase = createClient();
    // Insert note into project_notes table only
    const { data, error } = await supabase
      .from('project_notes')
      .insert({
        project_id: note.project_id,
        text: note.text,
        author_id: note.author_id,
        created_at: note.created_at || new Date().toISOString(),
        updated_at: note.updated_at || new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  static async getNotes(project_id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_notes')
      .select('*, author:user_meta(user_id, full_name, email)')
      .eq('project_id', project_id);
    if (error) throw new Error(error.message);
    return (data || []).map(note => ({
      id: note.id,
      text: note.text,
      author: note.author ? {
        id: note.author.user_id,
        fullName: note.author.full_name || '',
        email: note.author.email || '',
        createdAt: new Date(0),
        updatedAt: new Date(0),
        additional: {},
      } : {
        id: note.author_id,
        fullName: '',
        email: '',
        createdAt: new Date(0),
        updatedAt: new Date(0),
        additional: {},
      },
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }));
  }
}
