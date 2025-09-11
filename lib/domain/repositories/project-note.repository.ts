/**
 * Repository interface for project note operations
 * Defines the contract for project note data access
 */

export interface ProjectNote {
  id?: string;
  project_id: string;
  text: string;
  author_id: string;
  created_at?: string;
  updated_at?: string;
  author?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export interface CreateProjectNoteData {
  project_id: string;
  text: string;
  author_id: string;
}

export interface UpdateProjectNoteData {
  text: string;
}

export abstract class ProjectNoteRepository {
  abstract create(data: CreateProjectNoteData): Promise<ProjectNote>;
  abstract findByProjectId(projectId: string): Promise<ProjectNote[]>;
  abstract findById(id: string): Promise<ProjectNote | null>;
  abstract update(id: string, data: UpdateProjectNoteData): Promise<ProjectNote>;
  abstract delete(id: string): Promise<void>;
}
