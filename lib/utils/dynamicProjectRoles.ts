/**
 * Dynamic Project Roles Utility
 * Refaktorovaný utility pro konfigurovatelné role
 */

import { ScopeRole } from '@/lib/domain/models/scope-role.model';

export interface ProjectRoleProgress {
  mandays: number;
  done: number;
  percentage: number;
}

/**
 * Získá roli podle klíče z pole rolí
 */
export function getRoleByKey(roles: ScopeRole[], key: string): ScopeRole | undefined {
  return roles.find(role => role.key === key);
}

/**
 * Získá všechny klíče rolí
 */
export function getRoleKeys(roles: ScopeRole[]): string[] {
  return roles.map(role => role.key);
}

/**
 * Získá všechny mandays klíče
 */
export function getMandaysKeys(roles: ScopeRole[]): string[] {
  return roles.map(role => `${role.key}_mandays`);
}

/**
 * Získá všechny done klíče
 */
export function getDoneKeys(roles: ScopeRole[]): string[] {
  return roles.map(role => `${role.key}_done`);
}

/**
 * Vypočítá progress pro konkrétní roli v projektu
 */
export function calculateRoleProgress(
  project: Record<string, unknown> | { [key: string]: unknown }, 
  role: ScopeRole
): ProjectRoleProgress | null {
  const mandaysKey = `${role.key}_mandays`;
  const doneKey = `${role.key}_done`;
  
  // Použijeme Record<string, unknown> pro přístup k dynamickým vlastnostem
  const mandays = (project as Record<string, unknown>)[mandaysKey] as number;
  const donePercent = (project as Record<string, unknown>)[doneKey] as number;
  
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
export function calculateTotalProgress(
  project: Record<string, unknown> | { [key: string]: unknown },
  roles: ScopeRole[]
): number {
  let totalDone = 0;
  let totalMandays = 0;

  roles.forEach(role => {
    const progress = calculateRoleProgress(project, role);
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
export function getActiveRoles(
  project: Record<string, unknown> | { [key: string]: unknown },
  roles: ScopeRole[]
): ScopeRole[] {
  return roles.filter(role => {
    const mandaysKey = `${role.key}_mandays`;
    const mandays = (project as Record<string, unknown>)[mandaysKey] as number;
    return mandays && mandays > 0;
  });
}

/**
 * Vytvoří objekt s výchozími hodnotami pro nový projekt
 */
export function getDefaultProjectValues(roles: ScopeRole[]): Record<string, number | null> {
  const defaults: Record<string, number | null> = {};
  
  roles.forEach(role => {
    defaults[`${role.key}_mandays`] = null;
    defaults[`${role.key}_done`] = 0;
  });
  
  return defaults;
}

/**
 * Validuje, zda má projekt alespoň jednu roli s mandays > 0
 */
export function hasActiveRoles(
  project: Record<string, unknown> | { [key: string]: unknown },
  roles: ScopeRole[]
): boolean {
  return getActiveRoles(project, roles).length > 0;
}

/**
 * Získá seznam rolí pro validaci
 */
export function getRolesForValidation(roles: ScopeRole[]): Array<{ key: string; label: string }> {
  return roles.map(role => ({
    key: role.key,
    label: role.label
  }));
}

/**
 * Převede ScopeRole na formát kompatibilní s původním PROJECT_ROLES
 */
export function convertToLegacyFormat(roles: ScopeRole[]): Array<{
  key: string;
  label: string;
  mandaysKey: string;
  doneKey: string;
  color: string;
  translationKey: string;
}> {
  return roles.map(role => ({
    key: role.key,
    label: role.label,
    mandaysKey: `${role.key}_mandays`,
    doneKey: `${role.key}_done`,
    color: role.color,
    translationKey: role.translationKey
  }));
} 