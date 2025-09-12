import { Project, TeamMember, ProjectDeliveryInfo } from '@/app/components/scope/types';
import { isHoliday } from '@/app/utils/holidays';

/**
 * Date utilities for scheduling.
 * Weekend-only by default; can globally include public holidays via setCalendarConfig.
 */

type CalendarConfig = { includeHolidays: boolean; country: string; subdivision?: string | null };
let calendarConfig: CalendarConfig = { includeHolidays: true, country: 'CZ', subdivision: null };

export function setCalendarConfig(cfg: Partial<CalendarConfig>): void {
  calendarConfig = { ...calendarConfig, ...cfg };
}

/**
 * Calculate project delivery date based on workflow dependencies (sequentially)
 * @param workflowDependencies - pole závislostí (např. [{from: 'BE', to: 'FE', ...}])
 * @param project - projekt s mandays a done
 * @param team - pole členů týmu
 * @param assignments - pole přiřazení (teamMemberId, role)
 * @param startDate - datum zahájení (default: dnes)
 */

export function calculateDeliveryDateByWorkflow(
  workflowDependencies: Array<{ from: string; to: string }>,
  project: Project,
  team: TeamMember[],
  assignments: Array<{ teamMemberId: string; role: string }> = [],
  startDate: Date = new Date()
): Date {
  // Získáme unikátní pořadí rolí podle workflow (od začátku do konce)
  const orderedRoles: string[] = [];
  workflowDependencies.forEach(dep => {
    if (!orderedRoles.includes(dep.from)) orderedRoles.push(dep.from);
    if (!orderedRoles.includes(dep.to)) orderedRoles.push(dep.to);
  });

  let currentDate = new Date(startDate);

  orderedRoles.forEach(role => {
    // Najdi assignmenty pro roli
    const assignedMembers = team.filter(member =>
      assignments.some(a => a.teamMemberId === member.id && (a.role === role || a.role === role.toUpperCase()))
    );
    const fte = assignedMembers.reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const mandays = Number(project[`${role}_mandays`]) || 0;
    const done = Number(project[`${role}_done`]) || 0;
    const remainingMandays = mandays * (1 - (done / 100));
    const days = remainingMandays / fte;
    const workdays = Math.ceil(days);
    currentDate = addWorkdays(currentDate, workdays);
  });

  return currentDate;
}
/**
 * Utility functions for date calculations and workday operations
 * Extracted from ProjectSection component for reusability
 */



/**
 * Add specified number of workdays to a date (excluding weekends)
 */
export function addWorkdays(date: Date, workdays: number): Date {
  const result = new Date(date);
  let added = 0;
  
  while (added < workdays) {
    result.setDate(result.getDate() + 1);
    if (isWorkday(result)) {
      added++;
    }
  }
  
  return result;
}

// Helper: workday predicate and signed difference without off-by-one
export function isWorkday(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  if (calendarConfig.includeHolidays && isHoliday(d, calendarConfig.country, calendarConfig.subdivision)) return false;
  return true;
}

/**
 * Signed workdays difference excluding the start day.
 * Positive = rezervA (end po startu), Negative = skluz (end před startem).
 * Returns 0 when same calendar day.
 */
export function getWorkdaysDiff(start: Date, end: Date): number {
  const a = new Date(start);
  a.setHours(0, 0, 0, 0);
  const b = new Date(end);
  b.setHours(0, 0, 0, 0);
  if (a.getTime() === b.getTime()) return 0;

  const sign = b > a ? 1 : -1;
  const from = sign === 1 ? a : b;
  const to = sign === 1 ? b : a;

  const d = new Date(from);
  d.setDate(d.getDate() + 1); // start day itself se nepočítá

  let count = 0;
  while (d <= to) {
    if (isWorkday(d)) count++;
    d.setDate(d.getDate() + 1);
  }
  return sign * count;
}

/**
 * Get array of workdays between two dates (excluding weekends)
 */
export function getWorkdaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  
  while (d <= end) {
    if (isWorkday(d)) {
      days.push(new Date(d));
    }
    d.setDate(d.getDate() + 1);
  }
  
  return days;
}

/**
 * Get number of workdays between two dates (excluding weekends)
 */
export function getWorkdaysCount(start: Date, end: Date): number {
  const workdays = getWorkdaysBetween(start, end);
  return workdays.length;
}

/**
 * Calculate project delivery information including calculated delivery date and slip
 */
export function calculateProjectDeliveryInfo(
  project: Project, 
  team: TeamMember[]
): ProjectDeliveryInfo {
  // Získáme všechny role (standardní i custom) podle klíčů v projektu
  const roleKeys = Object.keys(project)
    .filter(key => key.endsWith('_mandays'))
    .map(key => key.replace(/_mandays$/, ''));

  let maxDays = 0;

  roleKeys.forEach(roleKey => {
    // Najdeme FTE pro tuto roli
    const fte = team.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
      .reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    
    const mandays = Number(project[`${roleKey}_mandays`]) || 0;
    const done = Number(project[`${roleKey}_done`]) || 0;
    const rem = mandays * (1 - (done / 100));
    const days = rem / fte;

    if (days > maxDays) maxDays = days;
  });
  
  const remainingWorkdays = Math.ceil(maxDays);
  
  // Počítat od dnešního data + zbývající práce
  const today = new Date();
  const calculatedDeliveryDate = addWorkdays(today, remainingWorkdays);
  
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
  
  let diffWorkdays: number | null = null;
  if (deliveryDate) {
    // Pozitivní = rezerva, Negativní = skluz
    diffWorkdays = getWorkdaysDiff(calculatedDeliveryDate, deliveryDate);
  }
  
  return {
    calculatedDeliveryDate,
    diffWorkdays,
    deliveryDate,
  };
}

/**
 * Enhanced project delivery calculation with allocation support
 * This function can be used when allocation settings are available
 */
export async function calculateProjectDeliveryInfoWithAllocation(
  project: Project,
  team: TeamMember[],
  projectAssignments: Array<{ teamMemberId: string; role: string }> = [],
  allocationSettings?: {
    enabled?: boolean;
    calculationMode?: 'allocation' | 'fte' | 'hybrid';
    includeExternalProjects?: boolean;
    defaultAllocationFte?: number;
  },
  dateFrom?: Date,
  dateTo?: Date
): Promise<ProjectDeliveryInfo & { allocationDetails?: unknown }> {
  // Suppress unused parameter warnings - these are part of the interface
  void projectAssignments;
  void dateFrom;
  void dateTo;
  // If allocation is not enabled or not available, fall back to standard calculation
  if (!allocationSettings?.enabled) {
    return calculateProjectDeliveryInfo(project, team);
  }

  // For now, return standard calculation with allocation details placeholder
  // In a real implementation, this would use the AllocationCalculationService
  const standardResult = calculateProjectDeliveryInfo(project, team);
  
  return {
    ...standardResult,
    allocationDetails: {
      calculationMode: allocationSettings.calculationMode || 'fte',
      allocationEnabled: allocationSettings.enabled,
      note: 'Allocation calculation would be implemented here'
    }
  };
}

/**
 * Calculate slippage against priority deadline
 * Returns positive number for reserve, negative for slippage
 */
export function calculatePrioritySlippage(
  project: Project,
  priorityEndDate: Date,
  team: TeamMember[],
  projectAssignments: Array<{ teamMemberId: string; role: string }> = []
): number {
  const today = new Date();
  
  // Get assigned team members for this project
  const assignedTeamMembers = team.filter(member => 
    projectAssignments.some(assignment => assignment.teamMemberId === member.id)
  );

  // Calculate total project duration and current progress
  const roleKeys = Object.keys(project)
    .filter(key => key.endsWith('_mandays'))
    .map(key => key.replace(/_mandays$/, ''));

  let maxRemainingDays = 0;

  roleKeys.forEach(roleKey => {
    const fte = assignedTeamMembers
      .filter(member => projectAssignments.some(assignment => 
        assignment.teamMemberId === member.id && 
        (assignment.role === roleKey.toUpperCase() || assignment.role === roleKey)
      ))
      .reduce((sum, m) => sum + (m.fte || 0), 0);

    const mandays = Number((project as Record<string, unknown>)[`${roleKey}_mandays`]) || 0;
    const done = Number((project as Record<string, unknown>)[`${roleKey}_done`]) || 0;
    
    const remainingMandays = mandays * (1 - (done / 100));
    
    // Pokud má projekt přiřazené lidi, použijeme jejich skutečné FTE
    // Pokud ne, použijeme rozumné výchozí FTE 1.0 místo 0.1
    const effectiveFte = fte > 0 ? fte : 1.0;
    const days = remainingMandays / effectiveFte;

    if (days > maxRemainingDays) maxRemainingDays = days;
  });

  // Calculate remaining workdays
  const remainingWorkdays = Math.ceil(maxRemainingDays);
  const calculatedDeliveryDate = addWorkdays(today, remainingWorkdays);
  
  // Positive = reserve, Negative = slippage
  return getWorkdaysDiff(calculatedDeliveryDate, priorityEndDate);
}

/**
 * Calculate project delivery information using assigned team members
 * This function uses project team assignments instead of the full team
 */
export function calculateProjectDeliveryInfoWithAssignments(
  project: Project, 
  team: TeamMember[],
  projectAssignments: Array<{ teamMemberId: string; role: string }>
): ProjectDeliveryInfo {
  // Get assigned team members for this project
  const assignedTeamMembers = team.filter(member => 
    projectAssignments.some(assignment => assignment.teamMemberId === member.id)
  );

  // Získáme všechny role (standardní i custom) podle klíčů v projektu
  const roleKeys = Object.keys(project)
    .filter(key => key.endsWith('_mandays'))
    .map(key => key.replace(/_mandays$/, ''));

  let maxDays = 0;

  roleKeys.forEach(roleKey => {
    // Najdeme všechny assignmenty pro tuto roli (label u custom rolí)
    const fte = assignedTeamMembers
      .filter(member => projectAssignments.some(assignment => 
        assignment.teamMemberId === member.id && 
        (assignment.role === roleKey.toUpperCase() || assignment.role === roleKey)
      ))
      .reduce((sum, m) => sum + (m.fte || 0), 0);

    const mandays = Number(project[`${roleKey}_mandays`]) || 0;
    const done = Number(project[`${roleKey}_done`]) || 0;
    const rem = mandays * (1 - (done / 100));

    // Fallback: když není FTE přiřazeno, počítej s 1.0, ať nevznikají extrémní termíny
    const effectiveFte = fte > 0 ? fte : 1.0;
    const days = rem / effectiveFte;

    if (days > maxDays) maxDays = days;
  });
  
  const remainingWorkdays = Math.ceil(maxDays);
  
  // Počítat od dnešního data + zbývající práce
  const today = new Date();
  const calculatedDeliveryDate = addWorkdays(today, remainingWorkdays);
  
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
  
  let diffWorkdays: number | null = null;
  if (deliveryDate) {
    // Pozitivní = rezerva, Negativní = skluz
    diffWorkdays = getWorkdaysDiff(calculatedDeliveryDate, deliveryDate);
  } else {
    // Pokud není nastaven delivery_date, srovnávejme s dneškem
    diffWorkdays = getWorkdaysDiff(today, calculatedDeliveryDate);
  }
  
  return {
    calculatedDeliveryDate,
    diffWorkdays,
    deliveryDate,
  };
}

// -- helper: první pracovní den po daném datu
function nextWorkday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (!isWorkday(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Calculate priority start and end dates for all projects (řetězení na sebe)
 */
export function calculatePriorityDates(
  projects: Project[],
  team: TeamMember[]
): Record<string, { 
  priorityStartDate: Date; 
  priorityEndDate: Date; 
  blockingProjectName?: string; 
}> {
  const sorted = [...projects].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const result: Record<string, { 
    priorityStartDate: Date; 
    priorityEndDate: Date; 
    blockingProjectName?: string; 
  }> = {};

  // „kurzor“ – od kdy lze začít plánovat další projekt
  let chainCursor = new Date(); // dnes
  let lastProjectName: string | undefined = undefined;

  for (const project of sorted) {
    const roleKeys = Object.keys(project)
      .filter(k => k.endsWith('_mandays'))
      .map(k => k.replace(/_mandays$/, ''));

    let maxDays = 0;
    roleKeys.forEach(roleKey => {
      const fte = team
        .filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
        .reduce((s, m) => s + (m.fte || 0), 0);
      const mandays = Number(project[`${roleKey}_mandays`]) || 0;
      const done = Number(project[`${roleKey}_done`]) || 0;
      const rem = mandays * (1 - done / 100);
      const effectiveFte = fte > 0 ? fte : 1.0;
      const days = rem / effectiveFte;
      if (days > maxDays) maxDays = days;
    });

    const projectWorkdays = Math.ceil(maxDays);

    // start je vždy řetězený z chainCursor
    const priorityStartDate = new Date(chainCursor);
    const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);

    result[project.id] = {
      priorityStartDate,
      priorityEndDate,
      blockingProjectName: lastProjectName,
    };

    // posuň kurzor na první pracovní den po konci právě naplánovaného projektu
    chainCursor = nextWorkday(priorityEndDate);
    lastProjectName = project.name;
  }

  return result;
}

/**
 * Calculate priority dates with assignments & workflow (řetězení na sebe)
 */
export function calculatePriorityDatesWithAssignments(
  projects: Project[],
  projectAssignments: Record<string, Array<{ teamMemberId: string; role: string; allocationFte: number }>>,
  workflowDependencies?: Record<string, {
    workflow_type: string;
    dependencies: Array<{ from: string; to: string; type: 'blocking' | 'waiting' | 'parallel' }>;
    active_workers: Array<{ role: string; status: 'active' | 'waiting' | 'blocked' }>;
  }>,
  team?: TeamMember[]
): Record<string, { 
  priorityStartDate: Date; 
  priorityEndDate: Date; 
  blockingProjectName?: string;
  lostWorkdaysDueToVacations?: number; 
}> {
  const activeProjects = projects.filter(p => {
    const s = p.status || 'not_started';
    return s === 'in_progress' || s === 'not_started' || s === 'paused';
  });

  const sorted = [...activeProjects].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const pr = { in_progress: 1, not_started: 2, paused: 3 } as const;
    const ap = pr[(a.status || 'not_started') as keyof typeof pr];
    const bp = pr[(b.status || 'not_started') as keyof typeof pr];
    if (ap !== bp) return ap - bp;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const result: Record<string, { 
    priorityStartDate: Date; 
    priorityEndDate: Date; 
    blockingProjectName?: string; 
    lostWorkdaysDueToVacations?: number;
  }> = {};

  let chainCursor = new Date(); // dnes
  let lastProjectName: string | undefined = undefined;

  // Helper: is member on vacation on given ISO date
  const isOnVacation = (member: TeamMember | undefined, date: Date): boolean => {
    if (!member || !Array.isArray(member.vacations) || member.vacations.length === 0) return false;
    const iso = date.toISOString().slice(0, 10);
    return member.vacations.some((r) => r.start <= iso && iso <= r.end);
  };

  // Helper: simulate remaining mandays burn-down with per-day available FTE (considering vacations)
  const simulateEndDate = (
    start: Date,
    remainingMandays: number,
    assignees: Array<{ member: TeamMember | undefined; allocationFte: number }>
  ): Date => {
    const cursor = new Date(start);
    let remaining = remainingMandays;
    // Safety guard to avoid infinite loop
    let safety = 0;
    while (remaining > 0 && safety < 5000) {
      safety++;
      // move to next day (including start day as a working chunk)
      if (isWorkday(cursor)) {
        const dailyFte = assignees.reduce((sum, a) => sum + (isOnVacation(a.member, cursor) ? 0 : a.allocationFte), 0);
        // if no capacity this workday, time passes but remaining stays
        if (dailyFte > 0) {
          remaining -= dailyFte;
        }
      }
      if (remaining <= 0) break;
      cursor.setDate(cursor.getDate() + 1);
    }
    return new Date(cursor);
  };

  // Helper: simulate without vacations (always full allocation FTE on workdays)
  const simulateEndDateNoVacations = (
    start: Date,
    remainingMandays: number,
    assignees: Array<{ member: TeamMember | undefined; allocationFte: number }>
  ): Date => {
    const cursor = new Date(start);
    let remaining = remainingMandays;
    let safety = 0;
    while (remaining > 0 && safety < 5000) {
      safety++;
      if (isWorkday(cursor)) {
        const dailyFte = assignees.reduce((sum, a) => sum + a.allocationFte, 0);
        if (dailyFte > 0) {
          remaining -= dailyFte;
        }
      }
      if (remaining <= 0) break;
      cursor.setDate(cursor.getDate() + 1);
    }
    return new Date(cursor);
  };

  for (const project of sorted) {
    const assignments = projectAssignments[project.id] || [];
    const roleKeys = Object.keys(project)
      .filter(k => k.endsWith('_mandays'))
      .map(k => k.replace(/_mandays$/, ''));

    // --- spočítáme potřebné pracovní dny (stejná logika jako dřív)
    let maxDays = 0;
    const wf = workflowDependencies?.[project.id];

    // Pokud máme workflow závislosti, použijeme sekvenční plánování rolí
    if (wf) {
      // Použij start_day pokud je nastaven, jinak chainCursor
      const priorityStartDate = project.start_day ? new Date(project.start_day) : new Date(chainCursor);

      // 1) Dny pro jednotlivé role dle přiřazení (allocationFte)
      const roleDays: Record<string, number> = {};
      roleKeys.forEach(roleKey => {
        const roleAssignees = assignments
          .filter(a => a.role === roleKey || a.role === roleKey.toUpperCase())
          .map(a => ({ member: team?.find(m => m.id === a.teamMemberId), allocationFte: a.allocationFte }));
        const mandays = Number(project[`${roleKey}_mandays`]) || 0;
        const done = Number(project[`${roleKey}_done`]) || 0;
        const remaining = mandays * (1 - done / 100);
        // If we have team/assignees, simulate later when start date is known
        const baseFte = roleAssignees.reduce((s, a) => s + a.allocationFte, 0);
        const effectiveFte = baseFte > 0 ? baseFte : 1.0;
        roleDays[roleKey] = Math.ceil(remaining / effectiveFte);
      });

      // 2) Naplánujeme role podle závislostí (sekvenčně přes pracovní dny)
      const findRoleKey = (name: string): string | undefined =>
        roleKeys.find(k => k === name || k.toUpperCase() === name.toUpperCase());

      const dependsOnMap: Record<string, string[]> = {};
      roleKeys.forEach(roleKey => {
        const dependsOn = wf.dependencies
          .filter(d => d.to.toUpperCase() === roleKey.toUpperCase() || d.to === roleKey)
          .map(d => findRoleKey(d.from))
          .filter((v): v is string => Boolean(v));
        dependsOnMap[roleKey] = dependsOn;
      });

      const roleEndDates: Record<string, Date> = {};
      const scheduled = new Set<string>();
      const maxIterations = roleKeys.length * 3;
      let iterations = 0;

      while (scheduled.size < roleKeys.length && iterations < maxIterations) {
        iterations++;
        let progressed = false;

        for (const roleKey of roleKeys) {
          if (scheduled.has(roleKey)) continue;
          const deps = dependsOnMap[roleKey] || [];
          const depsMet = deps.every(dep => scheduled.has(dep));
          if (!depsMet && deps.length > 0) continue;

          const startDate = deps.length > 0
            ? new Date(Math.max(...deps.map(dep => roleEndDates[dep]?.getTime() || 0)))
            : priorityStartDate;
          // If we have team and assignments, simulate with vacations; else fallback to constant days
          const roleAssignees = assignments
            .filter(a => a.role === roleKey || a.role === roleKey.toUpperCase())
            .map(a => ({ member: team?.find(m => m.id === a.teamMemberId), allocationFte: a.allocationFte }));
          const mandays = Number(project[`${roleKey}_mandays`]) || 0;
          const done = Number(project[`${roleKey}_done`]) || 0;
          const remaining = mandays * (1 - done / 100);
          const endDate = roleAssignees.length > 0 && team
            ? simulateEndDate(startDate, remaining, roleAssignees)
            : addWorkdays(startDate, roleDays[roleKey] || 0);
          roleEndDates[roleKey] = endDate;
          scheduled.add(roleKey);
          progressed = true;
        }

        if (!progressed) {
          // Cyklická závislost nebo nekonzistence – fallback: použij max trvání paralelně
          const fallbackDays = Math.max(...Object.values(roleDays));
          const fallbackEnd = addWorkdays(priorityStartDate, isFinite(fallbackDays) ? fallbackDays : 0);
          roleEndDates['__fallback__'] = fallbackEnd;
          break;
        }
      }

      // 3) Základní konec projektu je max z dokončení rolí
      let projectEndDate = new Date(Math.max(...Object.values(roleEndDates).map(d => d.getTime())));

      // Vypočítáme také hypotetický konec BEZ zohlednění dovolených (stejné závislosti)
      const roleEndDatesNoVac: Record<string, Date> = {};
      {
        const scheduled2 = new Set<string>();
        let iterations2 = 0;
        const maxIterations2 = roleKeys.length * 3;
        while (scheduled2.size < roleKeys.length && iterations2 < maxIterations2) {
          iterations2++;
          let progressed2 = false;
          for (const roleKey of roleKeys) {
            if (scheduled2.has(roleKey)) continue;
            const deps = dependsOnMap[roleKey] || [];
            const depsMet = deps.every(dep => scheduled2.has(dep));
            if (!depsMet && deps.length > 0) continue;
            const startDate = deps.length > 0
              ? new Date(Math.max(...deps.map(dep => roleEndDatesNoVac[dep]?.getTime() || 0)))
              : priorityStartDate;
            const roleAssignees = assignments
              .filter(a => a.role === roleKey || a.role === roleKey.toUpperCase())
              .map(a => ({ member: team?.find(m => m.id === a.teamMemberId), allocationFte: a.allocationFte }));
            const mandays = Number(project[`${roleKey}_mandays`]) || 0;
            const done = Number(project[`${roleKey}_done`]) || 0;
            const remaining = mandays * (1 - done / 100);
            const endNoVac = roleAssignees.length > 0 && team
              ? simulateEndDateNoVacations(startDate, remaining, roleAssignees)
              : addWorkdays(startDate, roleDays[roleKey] || 0);
            roleEndDatesNoVac[roleKey] = endNoVac;
            scheduled2.add(roleKey);
            progressed2 = true;
          }
          if (!progressed2) break;
        }
      }
      let projectEndDateNoVac = new Date(Math.max(...Object.values(roleEndDatesNoVac).map(d => d.getTime())));

      // 4) Posun kvůli blokacím/čekání – pouze posunout, ne násobně navyšovat
      const BLOCKED_SHIFT_DAYS = 5;
      const WAITING_SHIFT_DAYS = 2;
      let shiftDays = 0;
      wf.active_workers.forEach(w => {
        const roleKey = findRoleKey(w.role);
        if (!roleKey) return;
        if (w.status === 'blocked') shiftDays += BLOCKED_SHIFT_DAYS;
        else if (w.status === 'waiting') shiftDays += WAITING_SHIFT_DAYS;
      });
      if (shiftDays > 0) {
        projectEndDate = addWorkdays(projectEndDate, shiftDays);
        projectEndDateNoVac = addWorkdays(projectEndDateNoVac, shiftDays);
      }

      result[project.id] = {
        priorityStartDate,
        priorityEndDate: projectEndDate,
        blockingProjectName: lastProjectName,
        lostWorkdaysDueToVacations: Math.max(0, getWorkdaysDiff(projectEndDateNoVac, projectEndDate)),
      };

      // VŽDY posuň kurzor na další pracovní den po konci projektu
      // Tím zajistíme, že další projekty bez start_day začnou od správného bodu
      // chainCursor = nextWorkday(projectEndDate);
      
      // Posuň chainCursor na největší končící datum (z předchozího chainCursor a aktuálního projektu)
      chainCursor = nextWorkday(new Date(Math.max(chainCursor.getTime(), projectEndDate.getTime())));
      lastProjectName = project.name;
      continue;
    } else if (assignments.length === 0) {
      roleKeys.forEach(roleKey => {
        const mandays = Number(project[`${roleKey}_mandays`]) || 0;
        const done = Number(project[`${roleKey}_done`]) || 0;
        const remaining = mandays * (1 - done / 100);
        const days = remaining / 1.0;
        if (days > maxDays) maxDays = days;
      });
    } else {
      // Bez workflow: simuluj per roli od startu projektu a vezmi nejpozdější konec
      const projectStart = new Date(chainCursor);
      let latestEnd: Date | null = null;
      let latestEndNoVac: Date | null = null;
      roleKeys.forEach(roleKey => {
        const roleAssignees = assignments
          .filter(a => a.role === roleKey || a.role === roleKey.toUpperCase())
          .map(a => ({ member: team?.find(m => m.id === a.teamMemberId), allocationFte: a.allocationFte }));
        const mandays = Number(project[`${roleKey}_mandays`]) || 0;
        const done = Number(project[`${roleKey}_done`]) || 0;
        const remaining = mandays * (1 - done / 100);
        let roleEnd: Date;
        let roleEndNoVac: Date;
        if (roleAssignees.length > 0 && team) {
          roleEnd = simulateEndDate(projectStart, remaining, roleAssignees);
          roleEndNoVac = simulateEndDateNoVacations(projectStart, remaining, roleAssignees);
        } else {
          const baseFte = roleAssignees.reduce((s, a) => s + a.allocationFte, 0);
          const effectiveFte = baseFte > 0 ? baseFte : 1.0;
          roleEnd = addWorkdays(projectStart, Math.ceil(remaining / effectiveFte));
          roleEndNoVac = addWorkdays(projectStart, Math.ceil(remaining / effectiveFte));
        }
        latestEnd = latestEnd ? new Date(Math.max(latestEnd.getTime(), roleEnd.getTime())) : roleEnd;
        latestEndNoVac = latestEndNoVac ? new Date(Math.max(latestEndNoVac.getTime(), roleEndNoVac.getTime())) : roleEndNoVac;
      });
      if (latestEnd) {
        maxDays = getWorkdaysDiff(projectStart, latestEnd);
        if (maxDays < 0) maxDays = 0;
        // uložíme hypotetické bez dovolených
        const existing = (result as Record<string, { __baselineNoVac?: Date }>)[project.id] || {};
        const merged: { __baselineNoVac?: Date } = { ...existing, __baselineNoVac: latestEndNoVac || existing.__baselineNoVac };
        (result as Record<string, { __baselineNoVac?: Date }>)[project.id] = merged;
      }
    }

    const projectWorkdays = Math.ceil(maxDays);

    // --- ŘETĚZENÝ START: použij start_day pokud je nastaven, jinak chainCursor
    const priorityStartDate = project.start_day ? new Date(project.start_day) : new Date(chainCursor);
    const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);

    const baselineNoVac = (result as Record<string, { __baselineNoVac?: Date }>)[project.id]?.__baselineNoVac;
    result[project.id] = {
      priorityStartDate,
      priorityEndDate,
      blockingProjectName: lastProjectName,
      lostWorkdaysDueToVacations: baselineNoVac ? Math.max(0, getWorkdaysDiff(baselineNoVac, priorityEndDate)) : 0,
    };

    // VŽDY posuň kurzor na další pracovní den po konci projektu
    // Tím zajistíme, že další projekty bez start_day začnou od správného bodu
    // chainCursor = nextWorkday(priorityEndDate);
    
    // Posuň chainCursor na největší končící datum (z předchozího chainCursor a aktuálního projektu)
    chainCursor = nextWorkday(new Date(Math.max(chainCursor.getTime(), priorityEndDate.getTime())));
    lastProjectName = project.name;
  }

  return result;
}


/**
 * Calculate project delivery information using workflow dependencies and active workers
 * This function considers workflow dependencies and active worker statuses for more accurate delivery estimates
 */
export function calculateProjectDeliveryInfoWithWorkflow(
  project: Project, 
  team: TeamMember[],
  projectAssignments: Array<{ teamMemberId: string; role: string }>,
  workflowDependencies?: {
    workflow_type: string;
    dependencies: Array<{ from: string; to: string; type: 'blocking' | 'waiting' | 'parallel' }>;
    active_workers: Array<{ role: string; status: 'active' | 'waiting' | 'blocked' }>;
  }
): ProjectDeliveryInfo {

  // Získáme všechny role (standardní i custom) podle klíčů v projektu
  const roleKeys = Object.keys(project)
    .filter(key => key.endsWith('_mandays'))
    .map(key => key.replace(/_mandays$/, ''));

  // Pokud máme workflow závislosti, použijeme je pro výpočet
  if (workflowDependencies) {
    return calculateWithWorkflowDependencies(
      project, 
      team, 
      projectAssignments, 
      roleKeys, 
      workflowDependencies
    );
  }

  // Fallback na výpočet bez workflow
  return calculateProjectDeliveryInfoWithAssignments(project, team, projectAssignments);
}

/**
 * Calculate delivery info considering workflow dependencies
 */
function calculateWithWorkflowDependencies(
  project: Project,
  team: TeamMember[],
  projectAssignments: Array<{ teamMemberId: string; role: string }>,
  roleKeys: string[],
  workflowDependencies: {
    workflow_type: string;
    dependencies: Array<{ from: string; to: string; type: 'blocking' | 'waiting' | 'parallel' }>;
    active_workers: Array<{ role: string; status: 'active' | 'waiting' | 'blocked' }>;
  }
): ProjectDeliveryInfo {
  const today = new Date();
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;

  // Vypočítáme časy pro každou roli
  const roleTimings: Record<string, { 
    days: number; 
    canStart: boolean; 
    dependsOn: string[]; 
    isActive: boolean;
    progress: number;
  }> = {};

  // Inicializace časů pro všechny role
  roleKeys.forEach(roleKey => {
    const fteRaw = getRoleFTE(roleKey, team, projectAssignments);
    const effectiveFte = fteRaw > 0 ? fteRaw : 1.0;
    const mandays = Number(project[`${roleKey}_mandays`]) || 0;
    const done = Number(project[`${roleKey}_done`]) || 0;
    const remainingMandays = mandays * (1 - (done / 100));
    const days = remainingMandays / effectiveFte;

    const activeWorker = workflowDependencies.active_workers.find(w => 
      w.role.toUpperCase() === roleKey.toUpperCase() || w.role === roleKey
    );
    const isActive = activeWorker?.status === 'active';

    const dependsOn = workflowDependencies.dependencies
      .filter(d => d.to.toUpperCase() === roleKey.toUpperCase() || d.to === roleKey)
      .map(d => d.from);

    roleTimings[roleKey] = {
      days: Math.ceil(days),
      canStart: dependsOn.length === 0,
      dependsOn,
      isActive,
      progress: done
    };
  });

  const currentDate = new Date(today);
  const roleEndDates: Record<string, Date> = {};

  const processRoles = () => {
    let processedAny = false;

    roleKeys.forEach(roleKey => {
      const role = roleTimings[roleKey];
      if (roleEndDates[roleKey]) return;

      const dependenciesMet = role.dependsOn.every(depRole => {
        const depRoleKey = roleKeys.find(key => 
          key.toUpperCase() === depRole.toUpperCase() || key === depRole
        );
        return depRoleKey && roleEndDates[depRoleKey];
      });

      const activeWorker = workflowDependencies.active_workers.find(w => 
        w.role.toUpperCase() === roleKey.toUpperCase() || w.role === roleKey
      );
      const isBlocked = activeWorker?.status === 'blocked';

      if ((role.canStart || dependenciesMet) && !isBlocked) {
        const startDate = role.dependsOn.length > 0 
          ? new Date(Math.max(...role.dependsOn.map(depRole => {
              const depRoleKey = roleKeys.find(key => 
                key.toUpperCase() === depRole.toUpperCase() || key === depRole
              );
              return depRoleKey ? roleEndDates[depRoleKey]?.getTime() || 0 : 0;
            })))
          : currentDate;

        const endDate = addWorkdays(startDate, role.days);
        roleEndDates[roleKey] = endDate;
        processedAny = true;
      } else if (isBlocked) {
        const blockedDays = 10;
        const startDate = role.dependsOn.length > 0 
          ? new Date(Math.max(...role.dependsOn.map(depRole => {
              const depRoleKey = roleKeys.find(key => 
                key.toUpperCase() === depRole.toUpperCase() || key === depRole
              );
              return depRoleKey ? roleEndDates[depRoleKey]?.getTime() || 0 : 0;
            })))
          : currentDate;
        const endDate = addWorkdays(startDate, role.days + blockedDays);
        roleEndDates[roleKey] = endDate;
        processedAny = true;
      } else if (activeWorker?.status === 'waiting') {
        const waitingDays = 5;
        const startDate = role.dependsOn.length > 0 
          ? new Date(Math.max(...role.dependsOn.map(depRole => {
              const depRoleKey = roleKeys.find(key => 
                key.toUpperCase() === depRole.toUpperCase() || key === depRole
              );
              return depRoleKey ? roleEndDates[depRoleKey]?.getTime() || 0 : 0;
            })))
          : currentDate;
        const endDate = addWorkdays(startDate, role.days + waitingDays);
        roleEndDates[roleKey] = endDate;
        processedAny = true;
      }
    });

    return processedAny;
  };

  // Zpracováváme role, dokud nejsou všechny hotové
  while (Object.keys(roleEndDates).length < roleKeys.length) {
    const processed = processRoles();
    if (!processed) {
      // Pokud nemůžeme zpracovat žádnou roli, máme cyklickou závislost
      // Použijeme fallback výpočet
      console.warn('Cyclic dependency detected, using fallback calculation');
      return calculateProjectDeliveryInfoWithAssignments(project, team, projectAssignments);
    }
  }

  // Najdeme nejpozdější datum dokončení
  let latestEndDate = new Date(Math.max(...Object.values(roleEndDates).map(date => date.getTime())));
  
  // Přidáme dodatečný čas za blokace a čekání
  let additionalBlockedDays = 0;
  let additionalWaitingDays = 0;
  
  workflowDependencies.active_workers.forEach(worker => {
    const roleKey = roleKeys.find(key => 
      key.toUpperCase() === worker.role.toUpperCase() || key === worker.role
    );
    
    if (roleKey) {
      const fteRaw = getRoleFTE(roleKey, team, projectAssignments);
      const effectiveFte = fteRaw > 0 ? fteRaw : 1.0;
      const mandays = Number(project[`${roleKey}_mandays`]) || 0;
      const done = Number(project[`${roleKey}_done`]) || 0;
      const remainingMandays = mandays * (1 - (done / 100));
      const normalDays = remainingMandays / effectiveFte;
      
      if (worker.status === 'blocked') {
        additionalBlockedDays += Math.ceil(normalDays * 0.5);
      } else if (worker.status === 'waiting') {
        additionalWaitingDays += Math.ceil(normalDays * 0.2);
      }
    }
  });
  
  if (additionalBlockedDays > 0 || additionalWaitingDays > 0) {
    const totalAdditionalDays = additionalBlockedDays + additionalWaitingDays;
    latestEndDate = addWorkdays(latestEndDate, totalAdditionalDays);
  }
  
  let diffWorkdays: number | null = null;
  if (deliveryDate) {
    diffWorkdays = getWorkdaysDiff(latestEndDate, deliveryDate);
  } else {
    diffWorkdays = getWorkdaysDiff(today, latestEndDate);
  }

  return {
    calculatedDeliveryDate: latestEndDate,
    diffWorkdays,
    deliveryDate,
  };
}

/**
 * Helper function to get FTE for a specific role
 */
function getRoleFTE(
  roleKey: string, 
  team: TeamMember[], 
  projectAssignments: Array<{ teamMemberId: string; role: string }>
): number {
  return team
    .filter(member => projectAssignments.some(assignment => 
      assignment.teamMemberId === member.id && 
      (assignment.role.toUpperCase() === roleKey.toUpperCase() || assignment.role === roleKey)
    ))
    .reduce((sum, m) => sum + (m.fte || 0), 0);
}

/**
 * Format date to Czech locale string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Format date with time to Czech locale string
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}