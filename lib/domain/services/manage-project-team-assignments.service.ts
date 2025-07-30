import { inject, injectable } from 'inversify';
import { ProjectTeamAssignmentRepository } from '@/lib/domain/repositories/project-team-assignment.repository';
import { ProjectRepository } from '@/lib/domain/repositories/project.repository';
import { TeamMemberRepository } from '@/lib/domain/repositories/team-member.repository';
import { ProjectTeamAssignment } from '@/lib/domain/models/project-team-assignment.model';
import { Project } from '@/lib/domain/models/project.model';
import { TeamMember } from '@/lib/domain/models/team-member.model';

export interface ProjectTeamAssignmentWithDetails extends ProjectTeamAssignment {
  teamMember: TeamMember;
  project: Project;
}

export interface CreateProjectTeamAssignmentData {
  projectId: string;
  teamMemberId: string;
  role: string;
  allocationFte: number;
}

@injectable()
export class ManageProjectTeamAssignmentsService {
  constructor(
    @inject(ProjectTeamAssignmentRepository) private projectTeamAssignmentRepository: ProjectTeamAssignmentRepository,
    @inject(ProjectRepository) private projectRepository: ProjectRepository,
    @inject(TeamMemberRepository) private teamMemberRepository: TeamMemberRepository
  ) {}

  /**
   * Create a new team assignment for a project
   */
  async createAssignment(data: CreateProjectTeamAssignmentData): Promise<ProjectTeamAssignment> {
    // Verify that project and team member exist
    const [project, teamMember] = await Promise.all([
      this.projectRepository.findById(data.projectId),
      this.teamMemberRepository.findById(data.teamMemberId)
    ]);

    if (!project) {
      throw new Error(`Project with ID ${data.projectId} not found`);
    }

    if (!teamMember) {
      throw new Error(`Team member with ID ${data.teamMemberId} not found`);
    }

    // Check if assignment already exists
    const existingAssignments = await this.projectTeamAssignmentRepository.findByProjectId(data.projectId);
    const alreadyAssigned = existingAssignments.some(
      assignment => assignment.teamMemberId === data.teamMemberId && assignment.role === data.role
    );

    if (alreadyAssigned) {
      throw new Error(`Team member is already assigned to this project with role ${data.role}`);
    }

    const assignment: Omit<ProjectTeamAssignment, 'id' | 'createdAt'> = {
      projectId: data.projectId,
      teamMemberId: data.teamMemberId,
      role: data.role,
      allocationFte: data.allocationFte
    };

    return await this.projectTeamAssignmentRepository.create(assignment);
  }

  /**
   * Get all team assignments for a project with details
   */
  async getProjectAssignments(projectId: string): Promise<ProjectTeamAssignmentWithDetails[]> {
    const assignments = await this.projectTeamAssignmentRepository.findByProjectId(projectId);
    
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const [teamMember, project] = await Promise.all([
          this.teamMemberRepository.findById(assignment.teamMemberId),
          this.projectRepository.findById(assignment.projectId)
        ]);

        if (!teamMember || !project) {
          throw new Error(`Failed to load details for assignment ${assignment.id}`);
        }

        return {
          ...assignment,
          teamMember,
          project
        };
      })
    );

    return assignmentsWithDetails;
  }

  /**
   * Get all team assignments for a scope with details
   */
  async getScopeAssignments(scopeId: string): Promise<ProjectTeamAssignmentWithDetails[]> {
    const assignments = await this.projectTeamAssignmentRepository.findByScopeId(scopeId);
    
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const [teamMember, project] = await Promise.all([
          this.teamMemberRepository.findById(assignment.teamMemberId),
          this.projectRepository.findById(assignment.projectId)
        ]);

        if (!teamMember || !project) {
          throw new Error(`Failed to load details for assignment ${assignment.id}`);
        }

        return {
          ...assignment,
          teamMember,
          project
        };
      })
    );

    return assignmentsWithDetails;
  }

  /**
   * Get all assignments for a team member
   */
  async getTeamMemberAssignments(teamMemberId: string): Promise<ProjectTeamAssignmentWithDetails[]> {
    const assignments = await this.projectTeamAssignmentRepository.findByTeamMemberId(teamMemberId);
    
    const assignmentsWithDetails = await Promise.all(
      assignments.map(async (assignment) => {
        const [teamMember, project] = await Promise.all([
          this.teamMemberRepository.findById(assignment.teamMemberId),
          this.projectRepository.findById(assignment.projectId)
        ]);

        if (!teamMember || !project) {
          throw new Error(`Failed to load details for assignment ${assignment.id}`);
        }

        return {
          ...assignment,
          teamMember,
          project
        };
      })
    );

    return assignmentsWithDetails;
  }

  /**
   * Update a team assignment
   */
  async updateAssignment(id: string, data: Partial<CreateProjectTeamAssignmentData>): Promise<ProjectTeamAssignment> {
    const assignment = await this.projectTeamAssignmentRepository.findById(id);
    if (!assignment) {
      throw new Error(`Assignment with ID ${id} not found`);
    }

    // If updating project or team member, verify they exist
    if (data.projectId) {
      const project = await this.projectRepository.findById(data.projectId);
      if (!project) {
        throw new Error(`Project with ID ${data.projectId} not found`);
      }
    }

    if (data.teamMemberId) {
      const teamMember = await this.teamMemberRepository.findById(data.teamMemberId);
      if (!teamMember) {
        throw new Error(`Team member with ID ${data.teamMemberId} not found`);
      }
    }

    const updateData: Partial<ProjectTeamAssignment> = {};
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.teamMemberId !== undefined) updateData.teamMemberId = data.teamMemberId;
    if (data.role !== undefined) updateData.role = data.role;

    return await this.projectTeamAssignmentRepository.update(id, updateData);
  }

  /**
   * Delete a team assignment
   */
  async deleteAssignment(id: string): Promise<void> {
    const assignment = await this.projectTeamAssignmentRepository.findById(id);
    if (!assignment) {
      throw new Error(`Assignment with ID ${id} not found`);
    }

    await this.projectTeamAssignmentRepository.delete(id);
  }

  /**
   * Delete all assignments for a project
   */
  async deleteProjectAssignments(projectId: string): Promise<void> {
    await this.projectTeamAssignmentRepository.deleteByProjectId(projectId);
  }

  /**
   * Delete all assignments for a team member
   */
  async deleteTeamMemberAssignments(teamMemberId: string): Promise<void> {
    await this.projectTeamAssignmentRepository.deleteByTeamMemberId(teamMemberId);
  }
} 