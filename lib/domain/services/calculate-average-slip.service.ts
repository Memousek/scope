import { injectable, inject } from 'inversify';
import { ProjectRepository } from '../repositories/project.repository';
import { TeamMemberRepository } from '../repositories/team-member.repository';
import { ProjectTeamAssignmentRepository } from '../repositories/project-team-assignment.repository';

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
    @inject(TeamMemberRepository) private teamMemberRepository: TeamMemberRepository,
    @inject(ProjectTeamAssignmentRepository) private projectTeamAssignmentRepository: ProjectTeamAssignmentRepository
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

  /**
   * Calculate priority dates for projects
   */
  private calculatePriorityDates(projects: any[], team: any[]): Record<string, { priorityStartDate: Date; priorityEndDate: Date }> {
    // Sort projects by priority (ascending), then by created_at
    const sorted = [...projects].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
    const result: Record<string, { priorityStartDate: Date; priorityEndDate: Date }> = {};
    const currentStart = new Date(); // Start today
    
    for (let i = 0; i < sorted.length; i++) {
      const project = sorted[i];
      
      // Calculate project duration
      const roleKeys = Object.keys(project)
        .filter(key => key.endsWith('Mandays'))
        .map(key => key.replace('Mandays', ''));

      let maxDays = 0;
      roleKeys.forEach(roleKey => {
        const fte = team.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
          .reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
        
        const mandays = Number((project as unknown as Record<string, unknown>)[`${roleKey}Mandays`]) || 0;
        const done = Number((project as unknown as Record<string, unknown>)[`${roleKey}Done`]) || 0;
        const remainingMandays = mandays * (1 - (done / 100));
        const days = remainingMandays / fte;

        if (days > maxDays) maxDays = days;
      });
      
      const projectWorkdays = Math.ceil(maxDays);
      
      let priorityStartDate: Date;
      if (i === 0) {
        priorityStartDate = new Date(currentStart);
      } else {
        const prev = sorted[i - 1];
        const prevEnd = result[prev.id].priorityEndDate;
        const nextStart = new Date(prevEnd);
        nextStart.setDate(nextStart.getDate() + 1);
        
        // Skip weekends
        while (nextStart.getDay() === 0 || nextStart.getDay() === 6) {
          nextStart.setDate(nextStart.getDate() + 1);
        }
        
        priorityStartDate = nextStart;
      }
      
      // Priority end date = start + project duration
      const priorityEndDate = this.addWorkdays(priorityStartDate, projectWorkdays);
      
      result[project.id] = { priorityStartDate, priorityEndDate };
    }
    
    return result;
  }

  async execute(scopeId: string): Promise<AverageSlipResult> {
    const [projects, team, projectAssignments] = await Promise.all([
      this.projectRepository.findByScopeId(scopeId),
      this.teamMemberRepository.findByScopeId(scopeId),
      this.projectTeamAssignmentRepository.findByScopeId(scopeId)
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

    // Calculate priority dates
    const priorityDates = this.calculatePriorityDates(projects, team);

    // Calculate slip for each project using priority dates
    const projectsWithCalculatedSlip = projects.map(project => {
      const priorityDate = priorityDates[project.id];
      if (!priorityDate) return { ...project, calculatedSlip: null };

      // Calculate remaining work
      const roleKeys = Object.keys(project)
        .filter(key => key.endsWith('Mandays'))
        .map(key => key.replace('Mandays', ''));

      let maxDays = 0;
      roleKeys.forEach(roleKey => {
        const fte = team.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
          .reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
        
        const mandays = Number((project as unknown as Record<string, unknown>)[`${roleKey}Mandays`]) || 0;
        const done = Number((project as unknown as Record<string, unknown>)[`${roleKey}Done`]) || 0;
        const remainingMandays = mandays * (1 - (done / 100));
        const days = remainingMandays / fte;

        if (days > maxDays) maxDays = days;
      });

      const remainingWorkdays = Math.ceil(maxDays);
      const today = new Date();
      const calculatedDeliveryDate = this.addWorkdays(today, remainingWorkdays);
      
      // Calculate slip against priority date
      let finalSlip: number;
      if (calculatedDeliveryDate > priorityDate.priorityEndDate) {
        // Slippage - calculated date is after priority date
        finalSlip = -this.getWorkdaysCount(priorityDate.priorityEndDate, calculatedDeliveryDate);
      } else {
        // Reserve - calculated date is before priority date
        finalSlip = this.getWorkdaysCount(calculatedDeliveryDate, priorityDate.priorityEndDate);
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
    
    const delayedProjects = projectsWithSlip.filter(project => (project.calculatedSlip || 0) < 0).length;
    const onTimeProjects = projectsWithSlip.filter(project => (project.calculatedSlip || 0) === 0).length;
    const aheadProjects = projectsWithSlip.filter(project => (project.calculatedSlip || 0) > 0).length;

    return {
      averageSlip,
      totalProjects: projects.length,
      delayedProjects,
      onTimeProjects,
      aheadProjects
    };
  }
} 