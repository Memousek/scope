/**
 * Service layer for scope-related API operations
 * Centralizes all operations for scopes
 */

import { ContainerService } from '@/lib/container.service';
import { ScopeRepository } from '@/lib/domain/repositories/scope.repository';

export interface ScopeData {
  id: string;
  name: string;
  description?: string;
}

export class ScopeService {
  /**
   * Load scope by ID
   */
  static async loadScope(scopeId: string): Promise<ScopeData | null> {
    const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
    const scope = await scopeRepository.findById(scopeId);
    
    if (!scope) {
      return null;
    }

    return {
      id: scope.id,
      name: scope.name,
      description: scope.description
    };
  }

  /**
   * Update scope description
   */
  static async updateScopeDescription(scopeId: string, description: string): Promise<void> {
    const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
    await scopeRepository.update(scopeId, { description });
  }

  /**
   * Update scope name
   */
  static async updateScopeName(scopeId: string, name: string): Promise<void> {
    const scopeRepository = ContainerService.getInstance().get(ScopeRepository);
    await scopeRepository.update(scopeId, { name: name.trim() });
  }
}
