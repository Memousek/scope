import { inject, injectable } from 'inversify';
import { ProjectRoleDependencyRepository } from '@/lib/domain/repositories/project-role-dependency.repository';
import { ProjectTeamAssignmentRepository } from '@/lib/domain/repositories/project-team-assignment.repository';
import { ProjectRoleDependency } from '@/lib/domain/models/project-role-dependency.model';

export interface DependencyItem {
  from: string;
  to: string;
  type: 'blocking' | 'waiting' | 'parallel';
  description: string;
}

export interface ActiveWorker {
  role: string;
  name: string;
  avatar: string;
  status: 'active' | 'waiting' | 'blocked';
  team_member_id?: string;
  allocation_fte?: number;
}

export interface ProjectDependencyData {
  workflow_type: string;
  dependencies: DependencyItem[];
  active_workers: ActiveWorker[];
}

export interface CreateProjectRoleDependencyData {
  projectId: string;
  workflowType: string;
  dependencies: DependencyItem[];
  activeWorkers: ActiveWorker[];
}

@injectable()
export class ManageProjectRoleDependenciesService {
  constructor(
    @inject(ProjectRoleDependencyRepository) private projectRoleDependencyRepository: ProjectRoleDependencyRepository,
    @inject(ProjectTeamAssignmentRepository) private projectTeamAssignmentRepository: ProjectTeamAssignmentRepository
  ) {}

  /**
   * Get project dependencies with team assignments
   */
  async getProjectDependencies(projectId: string): Promise<ProjectDependencyData> {
    // Get role dependencies
    const dependencies = await this.projectRoleDependencyRepository.findByProjectId(projectId);
    
    // Get team assignments
    const teamAssignments = await this.projectTeamAssignmentRepository.findByProjectId(projectId);
    
    // Convert dependencies to new format
    let workflow_type = 'FE-First';
    let dependencies_list: DependencyItem[] = [];

    if (dependencies) {
      // Determine workflow type based on existing dependencies
      if (dependencies.parallel_mode) {
        workflow_type = 'Parallel';
      } else if (dependencies.fe_depends_on_be) {
        workflow_type = 'BE-First';
      } else {
        workflow_type = 'FE-First';
      }

      // Convert boolean dependencies to dependency list
      if (dependencies.be_depends_on_fe) {
        dependencies_list.push({
          from: 'FE',
          to: 'BE',
          type: 'waiting',
          description: 'FE čeká na BE API'
        });
      }
      if (dependencies.fe_depends_on_be) {
        dependencies_list.push({
          from: 'BE',
          to: 'FE',
          type: 'waiting',
          description: 'BE čeká na FE komponenty'
        });
      }
      if (dependencies.qa_depends_on_be) {
        dependencies_list.push({
          from: 'BE',
          to: 'QA',
          type: 'blocking',
          description: 'QA nemůže testovat bez BE'
        });
      }
      if (dependencies.qa_depends_on_fe) {
        dependencies_list.push({
          from: 'FE',
          to: 'QA',
          type: 'waiting',
          description: 'QA testuje FE po dokončení'
        });
      }
    } else {
      // Default dependencies for FE-First
      dependencies_list = [
        { from: 'PM', to: 'FE', type: 'blocking', description: 'PM definuje požadavky pro FE' },
        { from: 'FE', to: 'BE', type: 'waiting', description: 'FE čeká na BE API' },
        { from: 'BE', to: 'QA', type: 'blocking', description: 'QA nemůže testovat bez BE' },
        { from: 'FE', to: 'QA', type: 'waiting', description: 'QA testuje FE po dokončení' }
      ];
    }

    // Convert team assignments to active workers
    const active_workers: ActiveWorker[] = teamAssignments.map(assignment => {
      const isActive = dependencies?.current_active_roles?.includes(assignment.role.toLowerCase()) || false;
      return {
        role: assignment.role,
        name: `${assignment.role} tým (${assignment.teamMemberId})`,
        avatar: 'users',
        status: isActive ? 'active' : 'waiting',
        team_member_id: assignment.teamMemberId,
        allocation_fte: assignment.allocationFte
      };
    });

    return {
      workflow_type,
      dependencies: dependencies_list,
      active_workers
    };
  }

  /**
   * Save project dependencies
   */
  async saveProjectDependencies(data: CreateProjectRoleDependencyData): Promise<ProjectRoleDependency> {
    // Convert workflow type and dependencies to boolean flags
    const be_depends_on_fe = data.dependencies.some(d => d.from === 'FE' && d.to === 'BE');
    const fe_depends_on_be = data.dependencies.some(d => d.from === 'BE' && d.to === 'FE');
    const qa_depends_on_be = data.dependencies.some(d => d.from === 'BE' && d.to === 'QA');
    const qa_depends_on_fe = data.dependencies.some(d => d.from === 'FE' && d.to === 'QA');
    const parallel_mode = data.workflowType === 'Parallel';

    // Get current active roles from active_workers
    const current_active_roles = data.activeWorkers
      .filter(worker => worker.status === 'active')
      .map(worker => worker.role.toLowerCase());

    // Check if dependencies already exist
    const existingDeps = await this.projectRoleDependencyRepository.findByProjectId(data.projectId);

    if (existingDeps) {
      // Update existing dependencies
      return await this.projectRoleDependencyRepository.update(existingDeps.id, {
        be_depends_on_fe,
        fe_depends_on_be,
        qa_depends_on_be,
        qa_depends_on_fe,
        parallel_mode,
        current_active_roles
      });
    } else {
      // Create new dependencies
      return await this.projectRoleDependencyRepository.create({
        projectId: data.projectId,
        be_depends_on_fe,
        fe_depends_on_be,
        qa_depends_on_be,
        qa_depends_on_fe,
        parallel_mode,
        current_active_roles
      });
    }
  }

  /**
   * Get workflow templates
   */
  getWorkflowTemplates() {
    return [
      {
        id: 'FE-First',
        name: 'FE-First',
        desc: 'Frontend → Backend → QA',
        flow: 'FE → BE → QA',
        description: 'Frontend se vyvíjí první, pak backend, nakonec QA testování',
        dependencies: [
          { from: 'PM', to: 'FE', type: 'blocking' as const, description: 'PM definuje požadavky pro FE' },
          { from: 'FE', to: 'BE', type: 'waiting' as const, description: 'FE čeká na BE API' },
          { from: 'BE', to: 'QA', type: 'blocking' as const, description: 'QA nemůže testovat bez BE' },
          { from: 'FE', to: 'QA', type: 'waiting' as const, description: 'QA testuje FE po dokončení' }
        ]
      },
      {
        id: 'BE-First',
        name: 'BE-First',
        desc: 'Backend → Frontend → QA',
        flow: 'BE → FE → QA',
        description: 'Backend se vyvíjí první, pak frontend, nakonec QA testování',
        dependencies: [
          { from: 'PM', to: 'BE', type: 'blocking' as const, description: 'PM definuje požadavky pro BE' },
          { from: 'BE', to: 'FE', type: 'waiting' as const, description: 'BE čeká na FE komponenty' },
          { from: 'FE', to: 'QA', type: 'blocking' as const, description: 'QA nemůže testovat bez FE' },
          { from: 'BE', to: 'QA', type: 'waiting' as const, description: 'QA testuje BE po dokončení' }
        ]
      },
      {
        id: 'Parallel',
        name: 'Parallel',
        desc: 'FE || BE → QA',
        flow: 'FE || BE → QA',
        description: 'Frontend a backend pracují paralelně, QA čeká na oba',
        dependencies: [
          { from: 'PM', to: 'FE', type: 'blocking' as const, description: 'PM definuje požadavky pro FE' },
          { from: 'PM', to: 'BE', type: 'blocking' as const, description: 'PM definuje požadavky pro BE' },
          { from: 'FE', to: 'QA', type: 'waiting' as const, description: 'QA testuje FE po dokončení' },
          { from: 'BE', to: 'QA', type: 'waiting' as const, description: 'QA testuje BE po dokončení' }
        ]
      }
    ];
  }

  /**
   * Get default active workers based on team assignments
   */
  getDefaultActiveWorkers(projectAssignments: Array<{ teamMemberId: string; role: string }>): ActiveWorker[] {
    return projectAssignments.map(assignment => ({
      role: assignment.role,
      name: `${assignment.role} tým (${assignment.teamMemberId})`,
      avatar: 'users',
      status: 'waiting',
      team_member_id: assignment.teamMemberId
    }));
  }
} 