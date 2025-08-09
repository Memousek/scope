import { Project, TeamMember, ProjectDeliveryInfo } from '@/app/components/scope/types';

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
    const day = result.getDay();
    if (day !== 0 && day !== 6) { // 0 = neděle, 6 = sobota
      added++;
    }
  }
  
  return result;
}

/**
 * Get array of workdays between two dates (excluding weekends)
 */
export function getWorkdaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  
  while (d <= end) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
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
    // Rozdíl = počet pracovních dnů mezi plánovaným a vypočítaným termínem
    // Pozitivní = máme rezervu (vypočítaný termín je před plánovaným)
    // Negativní = máme skluz (vypočítaný termín je po plánovaném)
    if (calculatedDeliveryDate > deliveryDate) {
      // Skluz - vypočítaný termín je později než plánovaný
      diffWorkdays = -getWorkdaysCount(deliveryDate, calculatedDeliveryDate);
    } else {
      // Rezerva - vypočítaný termín je dříve než plánovaný
      diffWorkdays = getWorkdaysCount(calculatedDeliveryDate, deliveryDate);
    }
  }
  
  return {
    calculatedDeliveryDate,
    diffWorkdays,
    deliveryDate,
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
  
  // Calculate slippage: positive = reserve, negative = slippage
  if (calculatedDeliveryDate > priorityEndDate) {
    // Slippage - calculated date is after priority date
    return -getWorkdaysCount(priorityEndDate, calculatedDeliveryDate);
  } else {
    // Reserve - calculated date is before priority date
    return getWorkdaysCount(calculatedDeliveryDate, priorityEndDate);
  }
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

  // If no assignments, project cannot be completed - return large slip
  if (assignedTeamMembers.length === 0) {
    const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
    
    // Return a date far in the future to indicate project cannot be completed
    const farFutureDate = new Date();
    farFutureDate.setFullYear(farFutureDate.getFullYear() + 10); // 10 years in the future
    
    return {
      calculatedDeliveryDate: farFutureDate,
      diffWorkdays: deliveryDate ? getWorkdaysCount(deliveryDate, farFutureDate) : null,
      deliveryDate,
    };
  }

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
    const rem = fte > 0 ? mandays * (1 - (done / 100)) : 0;
    const days = fte > 0 ? rem / fte : 0;

    if (days > maxDays) maxDays = days;
  });
  
  const remainingWorkdays = Math.ceil(maxDays);
  
  // Počítat od dnešního data + zbývající práce
  const today = new Date();
  const calculatedDeliveryDate = addWorkdays(today, remainingWorkdays);
  
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
  
  let diffWorkdays: number | null = null;
  if (deliveryDate) {
    // Rozdíl = počet pracovních dnů mezi plánovaným a vypočítaným termínem
    // Pozitivní = máme rezervu (vypočítaný termín je před plánovaným)
    // Negativní = máme skluz (vypočítaný termín je po plánovaném)
    diffWorkdays = getWorkdaysCount(deliveryDate, calculatedDeliveryDate);
  } else {
    // Pokud není nastaven delivery_date, počítáme rozdíl mezi calculatedDeliveryDate a dnešním datem
    // Pozitivní = projekt bude hotový v budoucnosti
    // Negativní = projekt měl být hotový v minulosti
    diffWorkdays = getWorkdaysCount(today, calculatedDeliveryDate);
  }
  
  return {
    calculatedDeliveryDate,
    diffWorkdays,
    deliveryDate,
  };
}

/**
 * Calculate priority start and end dates for all projects
 * Returns map of projectId -> { priorityStartDate, priorityEndDate, blockingProjectName }
 */
export function calculatePriorityDates(
  projects: Project[], 
  team: TeamMember[]
): Record<string, { 
  priorityStartDate: Date; 
  priorityEndDate: Date; 
  blockingProjectName?: string; 
}> {
  // Sort projects by priority (ascending), then by created_at
  const sorted = [...projects].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  const result: Record<string, { 
    priorityStartDate: Date; 
    priorityEndDate: Date; 
    blockingProjectName?: string; 
  }> = {};
  
  const currentStart = new Date(); // Start today
  
  for (let i = 0; i < sorted.length; i++) {
    const project = sorted[i];
    
    // Získáme všechny role (standardní i custom) podle klíčů v projektu
    const roleKeys = Object.keys(project)
      .filter(key => key.endsWith('_mandays'))
      .map(key => key.replace(/_mandays$/, ''));

    let maxDays = 0;

    roleKeys.forEach(roleKey => {
      // Najdeme FTE pro tuto roli - použijeme skutečné FTE z týmu místo pevné hodnoty 1
      const fte = team.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
        .reduce((sum, m) => sum + (m.fte || 0), 0);
      
      // Pokud není nikdo přiřazen k roli, projekt nelze dokončit
      if (fte === 0) {
        maxDays = Math.max(maxDays, 365 * 10); // 10 let práce
        return;
      }
      
      const mandays = Number(project[`${roleKey}_mandays`]) || 0;
      const done = Number(project[`${roleKey}_done`]) || 0;
      const rem = mandays * (1 - (done / 100));
      const days = rem / fte;

      if (days > maxDays) maxDays = days;
    });
    
    const projectWorkdays = Math.ceil(maxDays);
    
    let priorityStartDate: Date;
    let blockingProjectName: string | undefined = undefined;
    
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
      blockingProjectName = prev.name;
    }
    
    // Priority end date = start + project duration
    const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);
    
    result[project.id] = { priorityStartDate, priorityEndDate, blockingProjectName };
  }
  
  return result;
}

/**
 * Calculate priority start and end dates for all projects using project assignments
 * Returns map of projectId -> { priorityStartDate, priorityEndDate, blockingProjectName }
 */
export function calculatePriorityDatesWithAssignments(
  projects: Project[], 
  team: TeamMember[],
  projectAssignments: Record<string, Array<{ teamMemberId: string; role: string; allocationFte: number }>>,
  workflowDependencies?: Record<string, {
    workflow_type: string;
    dependencies: Array<{ from: string; to: string; type: 'blocking' | 'waiting' | 'parallel' }>;
    active_workers: Array<{ role: string; status: 'active' | 'waiting' | 'blocked' }>;
  }>
): Record<string, { 
  priorityStartDate: Date; 
  priorityEndDate: Date; 
  blockingProjectName?: string; 
}> {
  // Filter out inactive projects and sort by priority and status-aware ordering
  const activeProjects = projects.filter(project => {
    const status = project.status || 'not_started';
    // Only include projects that are actually active or ready to start
    return status === 'in_progress' || status === 'not_started' || status === 'paused';
  });
  
  // Sort active projects by priority and status-aware ordering
  const sorted = [...activeProjects].sort((a, b) => {
    // First sort by priority
    if (a.priority !== b.priority) return a.priority - b.priority;
    
    // Then sort by status priority (active projects first)
    const statusPriority = {
      'in_progress': 1,    // Nejvyšší priorita - aktivní projekty
      'not_started': 2,    // Projekty připravené k zahájení
      'paused': 3,         // Pozastavené projekty
    };
    
    const aStatus = (a.status || 'not_started') as 'in_progress' | 'not_started' | 'paused';
    const bStatus = (b.status || 'not_started') as 'in_progress' | 'not_started' | 'paused';
    const aStatusPriority = statusPriority[aStatus];
    const bStatusPriority = statusPriority[bStatus];
    
    if (aStatusPriority !== bStatusPriority) return aStatusPriority - bStatusPriority;
    
    // Finally sort by created_at
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  const result: Record<string, { 
    priorityStartDate: Date; 
    priorityEndDate: Date; 
    blockingProjectName?: string; 
  }> = {};
  
  const currentStart = new Date(); // Start today
  
  for (let i = 0; i < sorted.length; i++) {
    const project = sorted[i];
    const assignments = projectAssignments[project.id] || [];
    
    // If no assignments, project cannot be completed - use very long duration
    if (assignments.length === 0) {
      // Místo pevné hodnoty 10 let vypočítáme skutečnou dobu s minimálním FTE
      const roleKeys = Object.keys(project)
        .filter(key => key.endsWith('_mandays'))
        .map(key => key.replace(/_mandays$/, ''));

      let maxDays = 0;
      roleKeys.forEach(roleKey => {
        const mandays = Number(project[`${roleKey}_mandays`]) || 0;
        const done = Number(project[`${roleKey}_done`]) || 0;
        const remainingMandays = mandays * (1 - (done / 100));
        
        // Pokud není nikdo přiřazen k roli, použijeme rozumné výchozí FTE 1.0 místo 0.1
        const effectiveFte = 1.0;
        const days = remainingMandays / effectiveFte;

        if (days > maxDays) maxDays = days;
      });
      
      const projectWorkdays = Math.ceil(maxDays);
      
      let priorityStartDate: Date;
      let blockingProjectName: string | undefined = undefined;
      
      // Status-aware start date calculation
      const projectStatus = project.status || 'not_started';
      
      if (projectStatus === 'in_progress') {
        // Active projects start from today, regardless of position
        priorityStartDate = new Date(currentStart);
        blockingProjectName = undefined; // No blocking project for active projects
      } else if (i === 0) {
        // First non-active project starts from today
        priorityStartDate = new Date(currentStart);
      } else {
        // Other projects start after the previous one
        const prev = sorted[i - 1];
        const prevEnd = result[prev.id].priorityEndDate;
        const nextStart = new Date(prevEnd);
        nextStart.setDate(nextStart.getDate() + 1);
        
        // Skip weekends
        while (nextStart.getDay() === 0 || nextStart.getDay() === 6) {
          nextStart.setDate(nextStart.getDate() + 1);
        }
        
        priorityStartDate = nextStart;
        blockingProjectName = prev.name;
      }
      
      // Priority end date = start + calculated duration
      const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);
      
      result[project.id] = { priorityStartDate, priorityEndDate, blockingProjectName };
      continue;
    }
    
    // Calculate project duration in workdays using assignments and workflow states
    const roleKeys = Object.keys(project)
      .filter(key => key.endsWith('_mandays'))
      .map(key => key.replace(/_mandays$/, ''));

    let maxDays = 0;
    const projectWorkflow = workflowDependencies?.[project.id];

    // Pokud máme workflow data, použijeme workflow-aware výpočet
    if (projectWorkflow) {
      // Vypočítáme časy pro každou roli s ohledem na workflow stavy
      const roleTimings: Record<string, number> = {};

      roleKeys.forEach(roleKey => {
        const fte = assignments
          .filter(assignment => assignment.role === roleKey.toUpperCase() || assignment.role === roleKey)
          .reduce((sum, assignment) => sum + assignment.allocationFte, 0);

        const mandays = Number(project[`${roleKey}_mandays`]) || 0;
        const done = Number(project[`${roleKey}_done`]) || 0;
        const remainingMandays = mandays * (1 - (done / 100));
        
        // Pokud není nikdo přiřazen k roli, použijeme minimální FTE 0.1 pro výpočet
        const effectiveFte = fte > 0 ? fte : 1.0;
        const normalDays = remainingMandays / effectiveFte;

        const roleDays = normalDays;
        // Poznámka: Blokace a čekání se přidávají k celkovému termínu později
        // Zde počítáme pouze normální čas práce

        roleTimings[roleKey] = Math.ceil(roleDays);
      });

      // Najdeme nejdelší roli
      maxDays = Math.max(...Object.values(roleTimings));
    } else {
      // Fallback na původní výpočet bez workflow
      roleKeys.forEach(roleKey => {
        const fte = assignments
          .filter(assignment => assignment.role === roleKey.toUpperCase() || assignment.role === roleKey)
          .reduce((sum, assignment) => sum + assignment.allocationFte, 0);

        const mandays = Number(project[`${roleKey}_mandays`]) || 0;
        const done = Number(project[`${roleKey}_done`]) || 0;
        const remainingMandays = mandays * (1 - (done / 100));
        
        // Pokud není nikdo přiřazen k roli, použijeme minimální FTE 0.1 pro výpočet
        const effectiveFte = fte > 0 ? fte : 1.0;
        const days = remainingMandays / effectiveFte;

        if (days > maxDays) maxDays = days;
      });
    }

    let projectWorkdays = Math.ceil(maxDays);
    
    // Přidáme dodatečný čas za blokace a čekání
    if (projectWorkflow) {
      let additionalBlockedDays = 0;
      let additionalWaitingDays = 0;
      
      projectWorkflow.active_workers.forEach(worker => {
        // Najdeme roli v projektu podle názvu
        const roleKey = roleKeys.find(key => 
          key.toUpperCase() === worker.role.toUpperCase() || key === worker.role
        );
        
        if (roleKey) {
          const fte = assignments
            .filter(assignment => assignment.role === roleKey.toUpperCase() || assignment.role === roleKey)
            .reduce((sum, assignment) => sum + assignment.allocationFte, 0);
          const mandays = Number(project[`${roleKey}_mandays`]) || 0;
          const done = Number(project[`${roleKey}_done`]) || 0;
          const remainingMandays = mandays * (1 - (done / 100));
          const normalDays = fte > 0 ? remainingMandays / fte : 0;
          
          if (worker.status === 'blocked') {
            // Blokace = 50% z normálního času práce
            additionalBlockedDays += Math.ceil(normalDays * 0.5);
          } else if (worker.status === 'waiting') {
            // Čekání = 20% z normálního času práce
            additionalWaitingDays += Math.ceil(normalDays * 0.2);
          }
        }
      });
      
      projectWorkdays += additionalBlockedDays + additionalWaitingDays;
    }
    
    let priorityStartDate: Date;
    let blockingProjectName: string | undefined = undefined;
    
    // Status-aware start date calculation
    const projectStatus = project.status || 'not_started';
    
    if (projectStatus === 'in_progress') {
      // Active projects start from startedAt if available, otherwise from today
      if (project.startedAt) {
        priorityStartDate = new Date(project.startedAt);
      } else {
        priorityStartDate = new Date(currentStart);
      }
      blockingProjectName = undefined; // No blocking project for active projects
    } else if (i === 0) {
      // First non-active project starts from today
      priorityStartDate = new Date(currentStart);
    } else {
      // Other projects start after the previous one
      const prev = sorted[i - 1];
      const prevEnd = result[prev.id].priorityEndDate;
      const nextStart = new Date(prevEnd);
      nextStart.setDate(nextStart.getDate() + 1);
      
      // Skip weekends
      while (nextStart.getDay() === 0 || nextStart.getDay() === 6) {
        nextStart.setDate(nextStart.getDate() + 1);
      }
      
      priorityStartDate = nextStart;
      blockingProjectName = prev.name;
    }
    
    // Priority end date = start + project duration in workdays
    const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);
    
    result[project.id] = { priorityStartDate, priorityEndDate, blockingProjectName };
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
  // Get assigned team members for this project
  const assignedTeamMembers = team.filter(member => 
    projectAssignments.some(assignment => assignment.teamMemberId === member.id)
  );

  // If no assignments, project cannot be completed - return large slip
  if (assignedTeamMembers.length === 0) {
    const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
    
    // Return a date far in the future to indicate project cannot be completed
    const farFutureDate = new Date();
    farFutureDate.setFullYear(farFutureDate.getFullYear() + 10); // 10 years in the future
    
    return {
      calculatedDeliveryDate: farFutureDate,
      diffWorkdays: deliveryDate ? getWorkdaysCount(deliveryDate, farFutureDate) : null,
      deliveryDate,
    };
  }

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

  // Fallback na původní výpočet bez workflow
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
    const fte = getRoleFTE(roleKey, team, projectAssignments);
    const mandays = Number(project[`${roleKey}_mandays`]) || 0;
    const done = Number(project[`${roleKey}_done`]) || 0;
    const remainingMandays = mandays * (1 - (done / 100));
    const days = fte > 0 ? remainingMandays / fte : 0;

    // Zjistíme, zda je role aktivní
    const activeWorker = workflowDependencies.active_workers.find(w => 
      w.role.toUpperCase() === roleKey.toUpperCase() || w.role === roleKey
    );
    const isActive = activeWorker?.status === 'active';

    // Najdeme závislosti pro tuto roli
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

  // Vypočítáme celkový čas s ohledem na workflow
  const currentDate = new Date(today);

  // Pro každou roli vypočítáme, kdy může začít a skončit
  const roleEndDates: Record<string, Date> = {};

  // První fáze: role bez závislostí nebo s aktivními závislostmi
  const processRoles = () => {
    let processedAny = false;

    roleKeys.forEach(roleKey => {
      const role = roleTimings[roleKey];
      
      // Pokud už máme datum pro tuto roli, přeskočíme
      if (roleEndDates[roleKey]) return;

      // Zkontrolujeme, zda jsou všechny závislosti splněny
      const dependenciesMet = role.dependsOn.every(depRole => {
        const depRoleKey = roleKeys.find(key => 
          key.toUpperCase() === depRole.toUpperCase() || key === depRole
        );
        return depRoleKey && roleEndDates[depRoleKey];
      });

      // Zkontrolujeme, zda není role blokována
      const activeWorker = workflowDependencies.active_workers.find(w => 
        w.role.toUpperCase() === roleKey.toUpperCase() || w.role === roleKey
      );
      const isBlocked = activeWorker?.status === 'blocked';

      if ((role.canStart || dependenciesMet) && !isBlocked) {
        // Role může začít (není blokována)
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
        // Role je blokována - přidáme extra čas pro blokaci k normálnímu času
        const blockedDays = 30;
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
        // Role čeká - přidáme menší čas pro čekání k normálnímu času
        const waitingDays = 10;
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
    // Najdeme roli v projektu podle názvu
    const roleKey = roleKeys.find(key => 
      key.toUpperCase() === worker.role.toUpperCase() || key === worker.role
    );
    
    if (roleKey) {
      const fte = getRoleFTE(roleKey, team, projectAssignments);
      const mandays = Number(project[`${roleKey}_mandays`]) || 0;
      const done = Number(project[`${roleKey}_done`]) || 0;
      const remainingMandays = mandays * (1 - (done / 100));
      const normalDays = fte > 0 ? remainingMandays / fte : 0;
      
      if (worker.status === 'blocked') {
        // Blokace = 50% z normálního času práce
        additionalBlockedDays += Math.ceil(normalDays * 0.5);
      } else if (worker.status === 'waiting') {
        // Čekání = 20% z normálního času práce
        additionalWaitingDays += Math.ceil(normalDays * 0.2);
      }
    }
  });
  
  // Přidáme dodatečný čas k nejpozdějšímu datu
  if (additionalBlockedDays > 0 || additionalWaitingDays > 0) {
    const totalAdditionalDays = additionalBlockedDays + additionalWaitingDays;
    latestEndDate = addWorkdays(latestEndDate, totalAdditionalDays);
  }
  
  let diffWorkdays: number | null = null;
  if (deliveryDate) {
    // Rozdíl = počet pracovních dnů mezi plánovaným a vypočítaným termínem
    // Pozitivní = máme rezervu (vypočítaný termín je před plánovaným)
    // Negativní = máme skluz (vypočítaný termín je po plánovaném)
    if (latestEndDate > deliveryDate) {
      // Skluz - vypočítaný termín je později než plánovaný
      diffWorkdays = -getWorkdaysCount(deliveryDate, latestEndDate);
    } else {
      // Rezerva - vypočítaný termín je dříve než plánovaný
      diffWorkdays = getWorkdaysCount(latestEndDate, deliveryDate);
    }
  } else {
    diffWorkdays = getWorkdaysCount(today, latestEndDate);
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