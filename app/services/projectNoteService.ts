import { ContainerService } from '@/lib/container.service';
import { ProjectNoteRepository } from '@/lib/domain/repositories/project-note.repository';

export interface CreateProjectNoteData {
  project_id: string;
  text: string;
  author_id: string;
  created_at?: string;
  updated_at?: string;
}

export class ProjectNoteService {
  static async updateNote(noteId: string, newText: string) {
    const projectNoteRepository = ContainerService.getInstance().get(ProjectNoteRepository);
    await projectNoteRepository.update(noteId, { text: newText });
  }

  static async deleteNote(noteId: string) {
    const projectNoteRepository = ContainerService.getInstance().get(ProjectNoteRepository);
    await projectNoteRepository.delete(noteId);
  }
  static async addNote(note: CreateProjectNoteData) {
    const projectNoteRepository = ContainerService.getInstance().get(ProjectNoteRepository);
    return await projectNoteRepository.create({
      project_id: note.project_id,
      text: note.text,
      author_id: note.author_id
    });
  }

  static async getNotes(project_id: string) {
    const projectNoteRepository = ContainerService.getInstance().get(ProjectNoteRepository);
    const notes = await projectNoteRepository.findByProjectId(project_id);
    
    // Transform the notes to match the expected format
    return notes.map(note => ({
      id: note.id,
      text: note.text,
      author: note.author ? {
        id: note.author.id,
        fullName: note.author.name || '',
        email: note.author.email || '',
        createdAt: new Date(0),
        updatedAt: new Date(0),
        additional: {
          avatar_url: note.author.avatar || undefined
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
    }));
  }
}
