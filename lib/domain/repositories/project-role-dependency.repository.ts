import { ProjectRoleDependency } from "@/lib/domain/models/project-role-dependency.model";

export abstract class ProjectRoleDependencyRepository {
  abstract findById(id: string): Promise<ProjectRoleDependency | null>;

  abstract findByProjectId(projectId: string): Promise<ProjectRoleDependency | null>;

  abstract create(dependency: Omit<ProjectRoleDependency, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProjectRoleDependency>;

  abstract update(id: string, dependency: Partial<ProjectRoleDependency>): Promise<ProjectRoleDependency>;

  abstract delete(id: string): Promise<void>;

  abstract deleteByProjectId(projectId: string): Promise<void>;
} 