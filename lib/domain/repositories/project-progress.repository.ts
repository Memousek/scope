/**
 * Repository interface for project progress operations
 * Defines the contract for project progress data access
 */

export interface ProjectProgress {
  id?: string;
  project_id: string;
  date: string;
  fe_done?: number;
  be_done?: number;
  qa_done?: number;
  pm_done?: number;
  dpl_done?: number;
  fe_mandays?: number;
  be_mandays?: number;
  qa_mandays?: number;
  pm_mandays?: number;
  dpl_mandays?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: string | number | undefined; // Index signature for compatibility
}

export interface CreateProjectProgressData {
  project_id: string;
  date: string;
  fe_done?: number;
  be_done?: number;
  qa_done?: number;
  pm_done?: number;
  dpl_done?: number;
  fe_mandays?: number;
  be_mandays?: number;
  qa_mandays?: number;
  pm_mandays?: number;
  dpl_mandays?: number;
}

export interface UpdateProjectProgressData {
  fe_done?: number;
  be_done?: number;
  qa_done?: number;
  pm_done?: number;
  dpl_done?: number;
  fe_mandays?: number;
  be_mandays?: number;
  qa_mandays?: number;
  pm_mandays?: number;
  dpl_mandays?: number;
  [key: string]: string | number | undefined; // Index signature for compatibility
}

export abstract class ProjectProgressRepository {
  abstract create(data: CreateProjectProgressData): Promise<ProjectProgress>;
  abstract findByProjectId(projectId: string): Promise<ProjectProgress[]>;
  abstract findById(id: string): Promise<ProjectProgress | null>;
  abstract update(id: string, data: UpdateProjectProgressData): Promise<ProjectProgress>;
  abstract delete(id: string): Promise<void>;
  abstract deleteByProjectId(projectId: string): Promise<void>;
}