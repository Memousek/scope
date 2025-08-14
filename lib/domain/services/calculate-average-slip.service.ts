import { injectable, inject } from 'inversify';
import { ProjectRepository } from '../repositories/project.repository';
import { TeamMemberRepository } from '../repositories/team-member.repository';
import { createClient } from '@/lib/supabase/client';
import Holidays from 'date-holidays';

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

  // Cache holiday calculators per country/subdivision to avoid repeated instantiation
  private holidaysCache = new Map<string, Holidays>();

  /**
   * Add specified number of workdays to a date (excluding weekends and optional holidays)
   */
  private addWorkdays(date: Date, workdays: number, includeHolidays: boolean, country: string, subdivision?: string | null): Date {
    const result = new Date(date);
    let added = 0;
    
    while (added < workdays) {
      result.setDate(result.getDate() + 1);
      if (this.isWorkday(result, includeHolidays, country, subdivision)) {
        added++;
      }
    }
    
    return result;
  }

  /**
   * Workday predicate (weekdays; optional public holidays)
   */
  private isWorkday(d: Date, includeHolidays: boolean, country: string, subdivision?: string | null): boolean {
    const day = d.getDay();
    if (day === 0 || day === 6) return false;
    if (includeHolidays && this.isHoliday(d, country, subdivision || undefined)) return false;
    return true;
  }

  private getHolidayChecker(country: string, subdivision?: string | null): Holidays {
    const key = `${country.toUpperCase()}${subdivision ? `:${subdivision}` : ''}`;
    let hd = this.holidaysCache.get(key);
    if (!hd) {
      hd = subdivision ? new Holidays(country, subdivision) : new Holidays(country);
      this.holidaysCache.set(key, hd);
    }
    return hd;
  }

  private isHoliday(date: Date, country: string, subdivision?: string | null): boolean {
    return Boolean(this.getHolidayChecker(country, subdivision).isHoliday(date));
  }

  /**
   * Signed workdays difference excluding the start day.
   * Positive = reserve (end after start), Negative = slip (end before start).
   * Returns 0 when same calendar day.
   */
  private getWorkdaysDiff(start: Date, end: Date, includeHolidays: boolean, country: string, subdivision?: string | null): number {
    const a = new Date(start);
    a.setHours(0, 0, 0, 0);
    const b = new Date(end);
    b.setHours(0, 0, 0, 0);
    if (a.getTime() === b.getTime()) return 0;

    const sign = b > a ? 1 : -1;
    const from = sign === 1 ? a : b;
    const to = sign === 1 ? b : a;

    const d = new Date(from);
    d.setDate(d.getDate() + 1); // do not count the start day itself

    let count = 0;
    while (d <= to) {
      if (this.isWorkday(d, includeHolidays, country, subdivision)) count++;
      d.setDate(d.getDate() + 1);
    }
    return sign * count;
  }

  /**
   * Get number of workdays between two dates (excluding weekends)
   */
  private getWorkdaysCount(start: Date, end: Date, includeHolidays: boolean, country: string, subdivision?: string | null): number {
    const days: Date[] = [];
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    
    while (d <= end) {
      if (this.isWorkday(d, includeHolidays, country, subdivision)) {
        days.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    
    return days.length;
  }

  /**
   * Calculate priority dates for projects
   */
  private calculatePriorityDates(projects: unknown[], team: unknown[], includeHolidays: boolean, country: string, subdivision?: string | null): Record<string, { priorityStartDate: Date; priorityEndDate: Date }> {
    // Sort projects by priority (ascending), then by created_at
    const sorted = [...projects].sort((a: unknown, b: unknown) => {
      const aProject = a as { priority: number; createdAt: string };
      const bProject = b as { priority: number; createdAt: string };
      if (aProject.priority !== bProject.priority) return aProject.priority - bProject.priority;
      return new Date(aProject.createdAt).getTime() - new Date(bProject.createdAt).getTime();
    });
    
    const result: Record<string, { priorityStartDate: Date; priorityEndDate: Date }> = {};
    const currentStart = new Date(); // Start today
    
    for (let i = 0; i < sorted.length; i++) {
      const project = sorted[i] as Record<string, unknown>;
      
      // Calculate project duration
      const roleKeys = Object.keys(project)
        .filter(key => key.endsWith('Mandays'))
        .map(key => key.replace('Mandays', ''));

      let maxDays = 0;
      roleKeys.forEach(roleKey => {
        const teamMembers = team as Array<{ role: string; fte: number }>;
        const fte = teamMembers.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
          .reduce((sum, m) => sum + (m.fte || 0), 0) || 1; // default to 1.0 if no FTE
        
        const mandays = Number(project[`${roleKey}Mandays`]) || 0;
        const done = Number(project[`${roleKey}Done`]) || 0;
        const remainingMandays = mandays * (1 - (done / 100));
        const days = remainingMandays / fte;

        if (days > maxDays) maxDays = days;
      });
      
      const projectWorkdays = Math.ceil(maxDays);
      
      let priorityStartDate: Date;
      if (i === 0) {
        priorityStartDate = new Date(currentStart);
      } else {
        const prev = sorted[i - 1] as { id: string };
        const prevEnd = result[prev.id].priorityEndDate;
        const nextStart = new Date(prevEnd);
        nextStart.setDate(nextStart.getDate() + 1);
        
        // Skip non-workdays (weekends + holidays)
        while (!this.isWorkday(nextStart, includeHolidays, country, subdivision)) {
          nextStart.setDate(nextStart.getDate() + 1);
        }
        
        priorityStartDate = nextStart;
      }
      
      // Priority end date = start + project duration
      const priorityEndDate = this.addWorkdays(priorityStartDate, projectWorkdays, includeHolidays, country, subdivision);
      
      const projectWithId = project as { id: string };
      result[projectWithId.id] = { priorityStartDate, priorityEndDate };
    }
    
    return result;
  }

  async execute(scopeId: string): Promise<AverageSlipResult> {
    // Load scope settings to determine holiday behavior
    const supabase = createClient();
    const { data: scopeRow } = await supabase
      .from('scopes')
      .select('settings')
      .eq('id', scopeId)
      .maybeSingle();
    const settings = (scopeRow?.settings || {}) as { calendar?: { includeHolidays?: boolean; includeCzechHolidays?: boolean; country?: string; subdivision?: string | null } };
    const includeHolidays = typeof settings.calendar?.includeHolidays === 'boolean' ? settings.calendar?.includeHolidays : !!settings.calendar?.includeCzechHolidays;
    const country = settings.calendar?.country || 'CZ';
    const subdivision = settings.calendar?.subdivision || null;
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

    // Calculate priority dates
    const priorityDates = this.calculatePriorityDates(projects, team, includeHolidays, country, subdivision);

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
        const teamMembers = team as Array<{ role: string; fte: number }>;
        const fte = teamMembers.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
          .reduce((sum, m) => sum + (m.fte || 0), 0) || 1; // default to 1.0 if no FTE
        
        const mandays = Number((project as unknown as Record<string, unknown>)[`${roleKey}Mandays`]) || 0;
        const done = Number((project as unknown as Record<string, unknown>)[`${roleKey}Done`]) || 0;
        const remainingMandays = mandays * (1 - (done / 100));
        const days = remainingMandays / fte;

        if (days > maxDays) maxDays = days;
      });

      const remainingWorkdays = Math.ceil(maxDays);
      const today = new Date();
      const calculatedDeliveryDate = this.addWorkdays(today, remainingWorkdays, includeHolidays, country, subdivision);
      
      // Calculate slip against priority date using signed workday diff (positive = reserve, negative = slip)
      const finalSlip = this.getWorkdaysDiff(calculatedDeliveryDate, priorityDate.priorityEndDate, includeHolidays, country, subdivision);

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