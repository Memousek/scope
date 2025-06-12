import { Project } from "@/lib/domain/models/project.model";

export abstract class ProjectRepository {
    abstract findById(id: string): Promise<Project | null>;
    abstract findByScopeId(scopeId: string): Promise<Project[]>;
    abstract create(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project>;
    abstract update(id: string, project: Partial<Project>): Promise<Project>;
    abstract delete(id: string): Promise<void>;
}