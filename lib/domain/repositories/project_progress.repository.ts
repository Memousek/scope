import { ProjectProgress } from "@/lib/domain/models/project_progress.model";

export abstract class ProjectProgressRepository {
    abstract findById(id: string): Promise<ProjectProgress | null>;
    abstract findByProjectId(projectId: string): Promise<ProjectProgress[]>;
    abstract create(projectProgress: Omit<ProjectProgress, 'id' | 'createdAt'>): Promise<ProjectProgress>;
    abstract update(id: string, projectProgress: Partial<ProjectProgress>): Promise<ProjectProgress>;
    abstract delete(id: string): Promise<void>;
    abstract deleteByProjectId(projectId: string): Promise<void>;
}