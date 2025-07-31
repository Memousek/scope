import { injectable, inject } from 'inversify';
import { ProjectRepository } from '../repositories/project.repository';
import { TeamMemberRepository } from '../repositories/team-member.repository';

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

  /**
   * Add specified number of workdays to a date (excluding weekends)
   */
  private addWorkdays(date: Date, workdays: number): Date {
    const result = new Date(date);
    let added = 0;
    
    while (added < workdays) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) { // 0 = neděle, 6 = sobota
        added++;
      }
    }
    
    return result;
  }

  /**
   * Get number of workdays between two dates (excluding weekends)
   */
  private getWorkdaysCount(start: Date, end: Date): number {
    const days: Date[] = [];
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        days.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    
    return days.length;
  }

  async execute(scopeId: string): Promise<AverageSlipResult> {
    const [projects, team] = await Promise.all([
      this.projectRepository.findByScopeId(scopeId),
      this.teamMemberRepository.findByScopeId(scopeId)
    ]);

    if (projects.length === 0) {
      return {
        averageSlip: 0,
        totalProjects: 0,
        delayedProjects: 0,
        onTimeProjects: 0,
        aheadProjects: 0
      };
    }

    // Calculate slip for each project
    const projectsWithCalculatedSlip = projects.map(project => {
      let finalSlip: number | null = null;

      // Only calculate slip if project has a delivery date
      if (project.deliveryDate) {
        // Calculate remaining work for each role
        const roleKeys = Object.keys(project)
          .filter(key => key.endsWith('Mandays'))
          .map(key => key.replace('Mandays', ''));

        let maxDays = 0;

        roleKeys.forEach(roleKey => {
          const fte = team.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
            .reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
          
          const mandays = Number((project as unknown as Record<string, unknown>)[`${roleKey}Mandays`]) || 0;
          const done = Number((project as unknown as Record<string, unknown>)[`${roleKey}Done`]) || 0;
          const rem = mandays * (1 - (done / 100));
          const days = rem / fte;

          if (days > maxDays) maxDays = days;
        });

        const remainingWorkdays = Math.ceil(maxDays);
        
        // Calculate delivery date from today + remaining work
        const today = new Date();
        const calculatedDeliveryDate = this.addWorkdays(today, remainingWorkdays);
        
        // Calculate slip (difference between planned and calculated delivery)
        const plannedDeliveryDate = new Date(project.deliveryDate);
        finalSlip = this.getWorkdaysCount(plannedDeliveryDate, calculatedDeliveryDate);
      }

      return {
        ...project,
        calculatedSlip: finalSlip
      };
    });
    
    const projectsWithSlip = projectsWithCalculatedSlip.filter(project => project.calculatedSlip !== null);
    
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

    return {
      averageSlip,
      totalProjects: projects.length,
      delayedProjects,
      onTimeProjects,
      aheadProjects
    };
  }
} 