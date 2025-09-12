/**
 * ScopeSettingsService
 * Persistuje nastavení scopu (např. Jira) v DB (tabulka scope_settings)
 */

import { ContainerService } from '@/lib/container.service';
import { ScopeRepository } from '@/lib/domain/repositories/scope.repository';

export interface ScopeSettings {
  jira?: {
    baseUrl?: string | null;
    email?: string | null;
    apiToken?: string | null;
    subtaskHandling?: 'include' | 'exclude' | 'parent'; // How to handle subtasks
  };
  debug?: { enabled?: boolean };
  calendar?: {
    // Preferred: generic include + selected country/subdivision
    includeHolidays?: boolean;
    country?: string; // e.g., 'CZ', 'DE', 'US'
    subdivision?: string | null; // optional, e.g., 'CA', 'ON', etc.
    // Backward compatibility with older setting
    includeCzechHolidays?: boolean;
  };
  allocation?: {
    enabled?: boolean; // Whether to use allocation table in calculations
    calculationMode?: 'allocation' | 'fte' | 'hybrid'; // How to calculate capacity
    includeExternalProjects?: boolean; // Whether to include external projects in calculations
    defaultAllocationFte?: number; // Default FTE when no allocation is set (0.0-2.0)
  };
  [key: string]: unknown;
}

export class ScopeSettingsService {
  static async get(scopeId: string): Promise<ScopeSettings | null> {
    try {
      const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
      const scope = await scopeRepository.findById(scopeId);
      if (!scope) {
        return null;
      }
      return (scope.settings as ScopeSettings) || null;
    } catch (err) {
      console.error('ScopeSettingsService.get failed:', err);
      throw new Error(`Failed to load scope settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  static async upsert(scopeId: string, settings: ScopeSettings): Promise<ScopeSettings> {
    try {
      const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
      // Načteme aktuální settings a mergneme
      const current = await this.get(scopeId);
      const merged = { ...(current || {}), ...settings } as Record<string, unknown>;
      
      const updatedScope = await scopeRepository.update(scopeId, { settings: merged });
      return (updatedScope.settings as ScopeSettings) || {};
    } catch (err) {
      console.error('ScopeSettingsService.upsert failed:', err);
      throw new Error(`Failed to save scope settings: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
}


