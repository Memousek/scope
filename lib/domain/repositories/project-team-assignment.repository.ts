import { ProjectTeamAssignment } from "@/lib/domain/models/project-team-assignment.model";

export abstract class ProjectTeamAssignmentRepository {
  abstract findById(id: string): Promise<ProjectTeamAssignment | null>;

  abstract findByProjectId(projectId: string): Promise<ProjectTeamAssignment[]>;

  abstract findByTeamMemberId(teamMemberId: string): Promise<ProjectTeamAssignment[]>;

  abstract findByScopeId(scopeId: string): Promise<ProjectTeamAssignment[]>;

  abstract create(assignment: Omit<ProjectTeamAssignment, 'id' | 'createdAt'>): Promise<ProjectTeamAssignment>;

  abstract update(id: string, assignment: Partial<ProjectTeamAssignment>): Promise<ProjectTeamAssignment>;

  abstract delete(id: string): Promise<void>;

  abstract deleteByProjectId(projectId: string): Promise<void>;

  abstract deleteByTeamMemberId(teamMemberId: string): Promise<void>;
} 