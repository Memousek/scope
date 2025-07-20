import { inject, injectable } from 'inversify';
import { ProjectRepository } from '@/lib/domain/repositories/project.repository';
import { TeamMemberRepository } from '@/lib/domain/repositories/team-member.repository';
import { calculateProjectDeliveryInfo } from '@/app/utils/dateUtils';

import { Project as ComponentProject, TeamMember as ComponentTeamMember } from '@/app/components/scope/types';

export interface AverageSlipResult {
  averageSlip: number;
  totalProjects: number;
  delayedProjects: number;
  onTimeProjects: number;
  aheadProjects: number;
}

@injectable()
export class CalculateAverageSlipService {
  constructor(
    @inject(ProjectRepository) private projectRepository: ProjectRepository,
    @inject(TeamMemberRepository) private teamMemberRepository: TeamMemberRepository
  ) {}

  async execute(scopeId: string): Promise<AverageSlipResult> {
    const [projects, team] = await Promise.all([
      this.projectRepository.findByScopeId(scopeId),
      this.teamMemberRepository.findByScopeId(scopeId)
    ]);
    
    console.log('Projects found:', projects.length);
    console.log('Team members found:', team.length);
    
    if (projects.length === 0) {
      return {
        averageSlip: 0,
        totalProjects: 0,
        delayedProjects: 0,
        onTimeProjects: 0,
        aheadProjects: 0
      };
    }

    // Převést domain modely na component modely
    const componentProjects: ComponentProject[] = projects.map(project => ({
      id: project.id,
      name: project.name,
      priority: project.priority,
      fe_mandays: project.feMandays || null,
      be_mandays: project.beMandays || null,
      qa_mandays: project.qaMandays || null,
      pm_mandays: project.pmMandays || null,
      dpl_mandays: project.dplMandays || null,
      fe_done: project.feDone,
      be_done: project.beDone,
      qa_done: project.qaDone,
      pm_done: project.pmDone,
      dpl_done: project.dplDone,
      delivery_date: project.deliveryDate?.toISOString() || null,
      created_at: project.createdAt.toISOString(),
      slip: project.slip || null
    }));

    const componentTeam: ComponentTeamMember[] = team.map(member => ({
      id: member.id,
      name: member.name,
      role: member.role,
      fte: member.fte,
      created_at: member.createdAt.toISOString()
    }));

    // Počítat skluz dynamicky pro každý projekt
    const projectsWithCalculatedSlip = componentProjects.map(project => {
      const info = calculateProjectDeliveryInfo(project, componentTeam);
      // Použít dynamicky vypočítaný skluz, nebo uložený skluz, nebo null
      const finalSlip = info.slip !== null ? info.slip : (project.slip || null);
      return {
        ...project,
        calculatedSlip: finalSlip
      };
    });
    
    console.log('Projects with calculated slip:', projectsWithCalculatedSlip.map(p => ({ 
      name: p.name, 
      slip: p.calculatedSlip 
    })));
    
    const projectsWithSlip = projectsWithCalculatedSlip.filter(project => project.calculatedSlip !== null);
    
    console.log('Projects with defined slip:', projectsWithSlip.length);
    
    if (projectsWithSlip.length === 0) {
      return {
        averageSlip: 0,
        totalProjects: projects.length,
        delayedProjects: 0,
        onTimeProjects: 0,
        aheadProjects: 0
      };
    }

    const totalSlip = projectsWithSlip.reduce((sum, project) => sum + (project.calculatedSlip || 0), 0);
    const averageSlip = Math.round(totalSlip / projectsWithSlip.length);
    
    const delayedProjects = projectsWithSlip.filter(project => (project.calculatedSlip || 0) > 0).length;
    const onTimeProjects = projectsWithSlip.filter(project => (project.calculatedSlip || 0) === 0).length;
    const aheadProjects = projectsWithSlip.filter(project => (project.calculatedSlip || 0) < 0).length;
    
    console.log('Average slip calculation:', {
      totalSlip,
      averageSlip,
      delayedProjects,
      onTimeProjects,
      aheadProjects
    });

    return {
      averageSlip,
      totalProjects: projects.length,
      delayedProjects,
      onTimeProjects,
      aheadProjects
    };
  }
} 