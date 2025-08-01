/**
 * Model for project role dependencies
 * Represents dependencies between different roles in a project workflow
 */
export interface ProjectRoleDependency {
  id: string;
  projectId: string;
  be_depends_on_fe: boolean;
  fe_depends_on_be: boolean;
  qa_depends_on_be: boolean;
  qa_depends_on_fe: boolean;
  parallel_mode: boolean;
  current_active_roles: string[];
  worker_states?: Array<{
    role: string;
    status: 'active' | 'waiting' | 'blocked';
    team_member_id?: string;
    allocation_fte?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
} 