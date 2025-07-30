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
  const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
  const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
  const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
  
  // Zbývající mandays pro projekt (podle aktuálního progressu)
  const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
  const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
  const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
  
  // Zbývající dny potřebné pro dokončení
  const feDays = feRem / feFte;
  const beDays = beRem / beFte;
  const qaDays = qaRem / qaFte;
  
  const remainingWorkdays = Math.ceil(Math.max(feDays, beDays)) + Math.ceil(qaDays);
  
  // Počítat od dnešního data + zbývající práce
  const today = new Date();
  const calculatedDeliveryDate = addWorkdays(today, remainingWorkdays);
  
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
  
  let diffWorkdays: number | null = null;
  let slip: number | null = null;
  if (deliveryDate) {
    // Rozdíl = počet pracovních dnů mezi plánovaným a vypočítaným termínem
    // Pozitivní = máme rezervu (vypočítaný termín je před plánovaným)
    // Negativní = máme skluz (vypočítaný termín je po plánovaném)
    diffWorkdays = getWorkdaysCount(deliveryDate, calculatedDeliveryDate);
    
    // Skluz = pokud je vypočítaný termín po plánovaném termínu
    if (calculatedDeliveryDate > deliveryDate) {
      slip = getWorkdaysCount(deliveryDate, calculatedDeliveryDate);
    } else {
      slip = 0; // Projekt není opožděný
    }
  }
  
  return {
    calculatedDeliveryDate,
    slip,
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
      slip: deliveryDate ? getWorkdaysCount(deliveryDate, farFutureDate) : null,
      diffWorkdays: deliveryDate ? getWorkdaysCount(deliveryDate, farFutureDate) : null,
      deliveryDate,
    };
  }

  // Calculate FTE for each role based on assignments
  const feFte = assignedTeamMembers
    .filter(member => projectAssignments.some(assignment => 
      assignment.teamMemberId === member.id && assignment.role === 'FE'
    ))
    .reduce((sum, m) => sum + (m.fte || 0), 0);

  const beFte = assignedTeamMembers
    .filter(member => projectAssignments.some(assignment => 
      assignment.teamMemberId === member.id && assignment.role === 'BE'
    ))
    .reduce((sum, m) => sum + (m.fte || 0), 0);

  const qaFte = assignedTeamMembers
    .filter(member => projectAssignments.some(assignment => 
      assignment.teamMemberId === member.id && assignment.role === 'QA'
    ))
    .reduce((sum, m) => sum + (m.fte || 0), 0);

  const pmFte = assignedTeamMembers
    .filter(member => projectAssignments.some(assignment => 
      assignment.teamMemberId === member.id && assignment.role === 'PM'
    ))
    .reduce((sum, m) => sum + (m.fte || 0), 0);

  const dplFte = assignedTeamMembers
    .filter(member => projectAssignments.some(assignment => 
      assignment.teamMemberId === member.id && assignment.role === 'DPL'
    ))
    .reduce((sum, m) => sum + (m.fte || 0), 0);
  
  // Zbývající mandays pro projekt (podle aktuálního progressu)
  const feRem = feFte > 0 ? Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100) : 0;
  const beRem = beFte > 0 ? Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100) : 0;
  const qaRem = qaFte > 0 ? Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100) : 0;
  const pmRem = pmFte > 0 ? Number(project.pm_mandays) * (1 - (Number(project.pm_done) || 0) / 100) : 0;
  const dplRem = dplFte > 0 ? Number(project.dpl_mandays) * (1 - (Number(project.dpl_done) || 0) / 100) : 0;
  
  // Zbývající dny potřebné pro dokončení (pouze pro přiřazené role)
  const feDays = feFte > 0 ? feRem / feFte : 0;
  const beDays = beFte > 0 ? beRem / beFte : 0;
  const qaDays = qaFte > 0 ? qaRem / qaFte : 0;
  const pmDays = pmFte > 0 ? pmRem / pmFte : 0;
  const dplDays = dplFte > 0 ? dplRem / dplFte : 0;
  
  const remainingWorkdays = Math.ceil(Math.max(feDays, beDays, pmDays, dplDays)) + Math.ceil(qaDays);
  
  // Počítat od dnešního data + zbývající práce
  const today = new Date();
  const calculatedDeliveryDate = addWorkdays(today, remainingWorkdays);
  
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
  
  let diffWorkdays: number | null = null;
  let slip: number | null = null;
  if (deliveryDate) {
    // Rozdíl = počet pracovních dnů mezi plánovaným a vypočítaným termínem
    // Pozitivní = máme rezervu (vypočítaný termín je před plánovaným)
    // Negativní = máme skluz (vypočítaný termín je po plánovaném)
    diffWorkdays = getWorkdaysCount(deliveryDate, calculatedDeliveryDate);
    
    // Skluz = pokud je vypočítaný termín po plánovaném termínu
    if (calculatedDeliveryDate > deliveryDate) {
      slip = getWorkdaysCount(deliveryDate, calculatedDeliveryDate);
    } else {
      slip = 0; // Projekt není opožděný
    }
  }
  
  return {
    calculatedDeliveryDate,
    slip,
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
    
    // Calculate project duration in workdays (same as in calculateProjectDeliveryInfo)
    const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    
    const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
    const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
    const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
    
    const feDays = feRem / feFte;
    const beDays = beRem / beFte;
    const qaDays = qaRem / qaFte;
    
    const projectWorkdays = Math.ceil(Math.max(feDays, beDays)) + Math.ceil(qaDays);
    
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
    const feFte = assignments
      .filter(assignment => assignment.role === 'FE')
      .reduce((sum, assignment) => sum + assignment.allocationFte, 0);
    
    const beFte = assignments
      .filter(assignment => assignment.role === 'BE')
      .reduce((sum, assignment) => sum + assignment.allocationFte, 0);
    
    const qaFte = assignments
      .filter(assignment => assignment.role === 'QA')
      .reduce((sum, assignment) => sum + assignment.allocationFte, 0);
    
    const pmFte = assignments
      .filter(assignment => assignment.role === 'PM')
      .reduce((sum, assignment) => sum + assignment.allocationFte, 0);
    
    const dplFte = assignments
      .filter(assignment => assignment.role === 'DPL')
      .reduce((sum, assignment) => sum + assignment.allocationFte, 0);
    
    const feRem = feFte > 0 ? Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100) : 0;
    const beRem = beFte > 0 ? Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100) : 0;
    const qaRem = qaFte > 0 ? Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100) : 0;
    const pmRem = pmFte > 0 ? Number(project.pm_mandays) * (1 - (Number(project.pm_done) || 0) / 100) : 0;
    const dplRem = dplFte > 0 ? Number(project.dpl_mandays) * (1 - (Number(project.dpl_done) || 0) / 100) : 0;
    
    const feDays = feFte > 0 ? feRem / feFte : 0;
    const beDays = beFte > 0 ? beRem / beFte : 0;
    const qaDays = qaFte > 0 ? qaRem / qaFte : 0;
    const pmDays = pmFte > 0 ? pmRem / pmFte : 0;
    const dplDays = dplFte > 0 ? dplRem / dplFte : 0;
    
    const projectWorkdays = Math.ceil(Math.max(feDays, beDays, pmDays, dplDays)) + Math.ceil(qaDays);
    
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