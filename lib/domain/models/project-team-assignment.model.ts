/**
 * Model for project team assignments
 * Represents which team members are assigned to work on specific projects
 */
export interface ProjectTeamAssignment {
  id: string;
  projectId: string;
  teamMemberId: string;
  role: string; // Role for this specific project (can be different from team member's main role)
  allocationFte: number; // FTE (Full Time Equivalent) allocated to this project
  createdAt: Date;
} 