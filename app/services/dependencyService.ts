import { createClient } from '@/lib/supabase/client';

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

export class DependencyService {
  private static supabase = createClient();

  /**
   * Get project dependencies with team assignments
   */
  static async getProjectDependencies(projectId: string): Promise<ProjectDependencyData> {
    // Get role dependencies
    const { data: dependencies, error: depsError } = await this.supabase
      .from('project_role_dependencies')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (depsError && depsError.code !== 'PGRST116') {
      console.error('Error fetching dependencies:', depsError);
    }
    
    // Get team assignments
    const { data: teamAssignments, error: assignmentsError } = await this.supabase
      .from('project_team_assignments')
      .select(`
        *,
        team_members (
          id,
          name,
          role,
          fte
        )
      `)
      .eq('project_id', projectId);

    if (assignmentsError) {
      console.error('Error fetching team assignments:', assignmentsError);
    }
    
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

    // Convert team assignments to active workers with proper status mapping
    const active_workers: ActiveWorker[] = (teamAssignments || []).map(assignment => {
      // Try to get status from worker_states if available, otherwise use current_active_roles
      let status: 'active' | 'waiting' | 'blocked' = 'waiting';
      
      console.log('Processing assignment:', assignment.role, 'dependencies:', dependencies);
      
      if (dependencies?.worker_states) {
        // If we have worker_states, use them
        console.log('Using worker_states:', dependencies.worker_states);
        const workerState = dependencies.worker_states.find((ws: any) => 
          ws.role.toLowerCase() === assignment.role.toLowerCase()
        );
        if (workerState) {
          status = workerState.status;
          console.log('Found worker state for', assignment.role, ':', workerState);
        }
      } else if (dependencies?.current_active_roles) {
        // Fallback to current_active_roles (legacy)
        console.log('Using current_active_roles:', dependencies.current_active_roles);
        const isActive = dependencies.current_active_roles.includes(assignment.role.toLowerCase());
        status = isActive ? 'active' : 'waiting';
      }
      
      console.log('Final status for', assignment.role, ':', status);
      
      return {
        role: assignment.role,
        name: `${assignment.role} tým (${assignment.team_members?.name || assignment.team_member_id})`,
        avatar: '👥',
        status,
        team_member_id: assignment.team_member_id,
        allocation_fte: assignment.allocation_fte
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
  static async saveProjectDependencies(data: CreateProjectRoleDependencyData): Promise<any> {
    // Convert workflow type and dependencies to boolean flags
    const be_depends_on_fe = data.dependencies.some(d => d.from === 'FE' && d.to === 'BE');
    const fe_depends_on_be = data.dependencies.some(d => d.from === 'BE' && d.to === 'FE');
    const qa_depends_on_be = data.dependencies.some(d => d.from === 'BE' && d.to === 'QA');
    const qa_depends_on_fe = data.dependencies.some(d => d.from === 'FE' && d.to === 'QA');
    const parallel_mode = data.workflowType === 'Parallel';

    // Get current active roles from active_workers (for backward compatibility)
    const current_active_roles = data.activeWorkers
      .filter(worker => worker.status === 'active')
      .map(worker => worker.role.toLowerCase());

    // Create worker_states array with all worker statuses
    const worker_states = data.activeWorkers.map(worker => ({
      role: worker.role,
      status: worker.status,
      team_member_id: worker.team_member_id,
      allocation_fte: worker.allocation_fte
    }));
    
    console.log('Saving worker_states:', worker_states);

    // Check if dependencies already exist
    const { data: existingDeps } = await this.supabase
      .from('project_role_dependencies')
      .select('id')
      .eq('project_id', data.projectId)
      .single();

    if (existingDeps) {
      // Update existing dependencies
      const { data: updatedDeps, error: updateError } = await this.supabase
        .from('project_role_dependencies')
        .update({
          be_depends_on_fe,
          fe_depends_on_be,
          qa_depends_on_be,
          qa_depends_on_fe,
          parallel_mode,
          current_active_roles,
          worker_states,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDeps.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update project role dependency: ${updateError.message}`);
      }

      return updatedDeps;
    } else {
      // Create new dependencies
      const { data: newDeps, error: createError } = await this.supabase
        .from('project_role_dependencies')
        .insert({
          project_id: data.projectId,
          be_depends_on_fe,
          fe_depends_on_be,
          qa_depends_on_be,
          qa_depends_on_fe,
          parallel_mode,
          current_active_roles,
          worker_states
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create project role dependency: ${createError.message}`);
      }

      return newDeps;
    }
  }

  /**
   * Get workflow templates
   */
  static getWorkflowTemplates() {
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
  static getDefaultActiveWorkers(projectAssignments: Array<{ teamMemberId: string; role: string }>): ActiveWorker[] {
    return projectAssignments.map(assignment => ({
      role: assignment.role,
      name: `${assignment.role} tým (${assignment.teamMemberId})`,
      avatar: '👥',
      status: 'waiting',
      team_member_id: assignment.teamMemberId
    }));
  }
} 