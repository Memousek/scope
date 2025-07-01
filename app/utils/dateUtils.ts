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
 * Calculate project delivery information including calculated delivery date and slip
 */
export function calculateProjectDeliveryInfo(
  project: Project, 
  team: TeamMember[]
): ProjectDeliveryInfo {
  const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
  const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
  const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
  
  const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
  const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
  const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
  
  const feDays = feRem / feFte;
  const beDays = beRem / beFte;
  const qaDays = qaRem / qaFte;
  
  const totalWorkdays = Math.ceil(Math.max(feDays, beDays)) + Math.ceil(qaDays);
  const today = new Date();
  const calculatedDeliveryDate = addWorkdays(today, totalWorkdays);
  const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
  
  let diffWorkdays: number | null = null;
  if (deliveryDate) {
    const workdaysToPlanned = getWorkdaysBetween(today, deliveryDate).length - 1;
    diffWorkdays = workdaysToPlanned - totalWorkdays;
  }
  
  return {
    calculatedDeliveryDate,
    slip: diffWorkdays,
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