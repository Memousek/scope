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
    
    // Načteme poznámky z project_notes tabulky
    const { data: notesData, error: notesError } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false });
    
    if (notesError) throw new Error(notesError.message);
    
    if (!notesData || notesData.length === 0) {
      return [];
    }
    
    // Načteme autory z user_meta tabulky
    const authorIds = [...new Set(notesData.map(note => note.author_id).filter(Boolean))];
    let authorsMap = new Map();
    
    if (authorIds.length > 0) {
      // Načteme autory z user_meta tabulky najednou
      const { data: authorsData, error: authorsError } = await supabase
        .from('user_meta')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', authorIds);
      
      if (!authorsError && authorsData) {
        authorsData.forEach(author => {
          authorsMap.set(author.user_id, author);
        });
      }
    }
    
    // Zkombinujeme poznámky s autory
    return notesData.map(note => {
      const author = authorsMap.get(note.author_id);
      return {
        id: note.id,
        text: note.text,
        author: author ? {
          id: author.user_id,
          fullName: author.full_name || '',
          email: author.email || '',
          createdAt: new Date(0),
          updatedAt: new Date(0),
          additional: {
            avatar_url: author.avatar_url || undefined
          },
        } : {
          id: note.author_id,
          fullName: 'Neznámý uživatel',
          email: '',
          createdAt: new Date(0),
          updatedAt: new Date(0),
          additional: {},
        },
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      };
    });
  }
}
