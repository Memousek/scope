/**
 * Utility functions for date calculations and workday operations
 * Extracted from ProjectSection component for reusability
 */

import { Project, TeamMember, ProjectDeliveryInfo } from '@/app/components/scope/types';


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
    diffWorkdays = getWorkdaysCount(deliveryDate, calculatedDeliveryDate);
  }
  
  return {
    calculatedDeliveryDate,
    diffWorkdays,
    deliveryDate,
  };
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
      // Najdeme FTE pro tuto roli
      const fte = team.filter(m => m.role === roleKey.toUpperCase() || m.role === roleKey)
        .reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
      
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
  projectAssignments: Record<string, Array<{ teamMemberId: string; role: string; allocationFte: number }>>
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
    const assignments = projectAssignments[project.id] || [];
    
    // If no assignments, project cannot be completed - use very long duration
    if (assignments.length === 0) {
      const projectWorkdays = 365 * 10; // 10 years of workdays
      
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
      
      // Priority end date = start + very long duration
      const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);
      
      result[project.id] = { priorityStartDate, priorityEndDate, blockingProjectName };
      continue;
    }
    
    // Calculate project duration in workdays using assignments
    // Získáme všechny role (standardní i custom) podle klíčů v projektu
    const roleKeys = Object.keys(project)
      .filter(key => key.endsWith('_mandays'))
      .map(key => key.replace(/_mandays$/, ''));

    let maxDays = 0;

    roleKeys.forEach(roleKey => {
      // Najdeme všechny assignmenty pro tuto roli (label u custom rolí)
      const fte = assignments
        .filter(assignment => assignment.role === roleKey.toUpperCase() || assignment.role === roleKey)
        .reduce((sum, assignment) => sum + assignment.allocationFte, 0);

      const mandays = Number(project[`${roleKey}_mandays`]) || 0;
      const done = Number(project[`${roleKey}_done`]) || 0;
      const rem = fte > 0 ? mandays * (1 - (done / 100)) : 0;
      const days = fte > 0 ? rem / fte : 0;

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
    
    // Priority end date = start + project duration in workdays
    const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);
    
    result[project.id] = { priorityStartDate, priorityEndDate, blockingProjectName };
  }
  
  return result;
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