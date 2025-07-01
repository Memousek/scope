/**
 * Utility functions for form and data validation
 * Centralizes validation logic across the application
 */

import { Project, TeamMember } from '@/app/components/scope/types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate project data
 */
export function validateProject(project: Partial<Project>): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields
  if (!project.name?.trim()) {
    errors.push({ field: 'name', message: 'Název projektu je povinný' });
  }

  if (project.priority === undefined || project.priority < 1) {
    errors.push({ field: 'priority', message: 'Priorita musí být alespoň 1' });
  }

  // Validate mandays and done percentages
  const roles = [
    { key: 'fe', label: 'FE' },
    { key: 'be', label: 'BE' },
    { key: 'qa', label: 'QA' },
    { key: 'pm', label: 'PM' },
    { key: 'dpl', label: 'DPL' },
  ];

  roles.forEach(({ key, label }) => {
    const mandaysKey = `${key}_mandays` as keyof Project;
    const doneKey = `${key}_done` as keyof Project;
    
    const mandays = Number(project[mandaysKey]);
    const done = Number(project[doneKey]);

    if (mandays > 0) {
      if (done < 0 || done > 100) {
        errors.push({ 
          field: doneKey, 
          message: `Procento hotovo pro ${label} musí být mezi 0 a 100` 
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate team member data
 */
export function validateTeamMember(member: Partial<TeamMember>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!member.name?.trim()) {
    errors.push({ field: 'name', message: 'Jméno je povinné' });
  }

  if (!member.role?.trim()) {
    errors.push({ field: 'role', message: 'Role je povinná' });
  }

  if (member.fte === undefined || member.fte <= 0 || member.fte > 2) {
    errors.push({ field: 'fte', message: 'FTE musí být mezi 0.01 a 2.0' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate delivery date
 */
export function validateDeliveryDate(date: string | null): ValidationResult {
  const errors: ValidationError[] = [];

  if (date) {
    const deliveryDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (deliveryDate < today) {
      errors.push({ 
        field: 'delivery_date', 
        message: 'Termín dodání nemůže být v minulosti' 
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get field error message
 */
export function getFieldError(field: string, errors: ValidationError[]): string | undefined {
  return errors.find(error => error.field === field)?.message;
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: ValidationError[]): boolean {
  return errors.length > 0;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate required field
 */
export function isRequired(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
} 