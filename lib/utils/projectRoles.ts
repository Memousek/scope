/**
 * Project Roles Utility
 * Centralizovaná definice rolí pro projekty s typy, konstantami a helper funkcemi
 */

export interface ProjectRole {
  key: string;
  label: string;
  mandaysKey: string;
  doneKey: string;
  color: string;
  translationKey: string;
}

export interface ProjectRoleProgress {
  mandays: number;
  done: number;
  percentage: number;
}

/**
 * Definice všech projektových rolí
 */
export const PROJECT_ROLES: ProjectRole[] = [
  {
    key: 'fe',
    label: 'FE',
    mandaysKey: 'fe_mandays',
    doneKey: 'fe_done',
    color: '#2563eb',
    translationKey: 'fe_mandays'
  },
  {
    key: 'be',
    label: 'BE',
    mandaysKey: 'be_mandays',
    doneKey: 'be_done',
    color: '#059669',
    translationKey: 'be_mandays'
  },
  {
    key: 'qa',
    label: 'QA',
    mandaysKey: 'qa_mandays',
    doneKey: 'qa_done',
    color: '#f59e42',
    translationKey: 'qa_mandays'
  },
  {
    key: 'pm',
    label: 'PM',
    mandaysKey: 'pm_mandays',
    doneKey: 'pm_done',
    color: '#a21caf',
    translationKey: 'pm_mandays'
  },
  {
    key: 'dpl',
    label: 'DPL',
    mandaysKey: 'dpl_mandays',
    doneKey: 'dpl_done',
    color: '#e11d48',
    translationKey: 'dpl_mandays'
  }
];

/**
 * Získá roli podle klíče
 */
export function getRoleByKey(key: string): ProjectRole | undefined {
  return PROJECT_ROLES.find(role => role.key === key);
}

/**
 * Získá všechny klíče rolí
 */
export function getRoleKeys(): string[] {
  return PROJECT_ROLES.map(role => role.key);
}

/**
 * Získá všechny mandays klíče
 */
export function getMandaysKeys(): string[] {
  return PROJECT_ROLES.map(role => role.mandaysKey);
}

/**
 * Získá všechny done klíče
 */
export function getDoneKeys(): string[] {
  return PROJECT_ROLES.map(role => role.doneKey);
}

/**
 * Vypočítá progress pro konkrétní roli v projektu
 */
export function calculateRoleProgress(project: Record<string, unknown> | { [key: string]: unknown }, roleKey: string): ProjectRoleProgress | null {
  const role = getRoleByKey(roleKey);
  if (!role) return null;

  const mandays = project[role.mandaysKey] as number;
  const donePercent = project[role.doneKey] as number;
  
  if (!mandays || mandays === 0) return null;
  
  // donePercent je procento (0-100), převedeme na mandays
  const doneMandays = (donePercent / 100) * mandays;
  
  return {
    mandays,
    done: doneMandays,
    percentage: Math.round(donePercent)
  };
}

/**
 * Vypočítá celkový progress projektu ze všech rolí
 */
export function calculateTotalProgress(project: Record<string, unknown> | { [key: string]: unknown }): number {
  let totalDone = 0;
  let totalMandays = 0;

  PROJECT_ROLES.forEach(role => {
    const progress = calculateRoleProgress(project, role.key);
    if (progress) {
      totalDone += progress.done;
      totalMandays += progress.mandays;
    }
  });

  return totalMandays > 0 ? Math.round((totalDone / totalMandays) * 100) : 0;
}

/**
 * Získá pouze aktivní role (ty, které mají mandays > 0)
 */
export function getActiveRoles(project: Record<string, unknown> | { [key: string]: unknown }): ProjectRole[] {
  return PROJECT_ROLES.filter(role => {
    const mandays = project[role.mandaysKey] as number;
    return mandays && mandays > 0;
  });
}

/**
 * Vytvoří objekt s výchozími hodnotami pro nový projekt
 */
export function getDefaultProjectValues(): Record<string, number | null> {
  const defaults: Record<string, number | null> = {};
  
  PROJECT_ROLES.forEach(role => {
    defaults[role.mandaysKey] = null;
    defaults[role.doneKey] = 0;
  });
  
  return defaults;
}

/**
 * Validuje, zda má projekt alespoň jednu roli s mandays > 0
 */
export function hasActiveRoles(project: Record<string, unknown> | { [key: string]: unknown }): boolean {
  return getActiveRoles(project).length > 0;
}

/**
 * Získá seznam rolí pro validaci (používá se v validationUtils)
 */
export function getRolesForValidation(): Array<{ key: string; label: string }> {
  return PROJECT_ROLES.map(role => ({
    key: role.key,
    label: role.label
  }));
} 