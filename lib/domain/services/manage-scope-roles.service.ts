/**
 * Manage Scope Roles Service
 * Service pro správu konfigurovatelných rolí v scope
 */

import { ContainerService } from '@/lib/container.service';
import { ScopeRoleRepository, ScopeRoleRepositorySymbol } from '@/lib/domain/repositories/scope-role.repository';
import { ScopeRole, CreateScopeRoleData, UpdateScopeRoleData } from '@/lib/domain/models/scope-role.model';

export class ManageScopeRolesService {
  private scopeRoleRepository: ScopeRoleRepository;

  constructor() {
    const container = ContainerService.getInstance();
    this.scopeRoleRepository = container.get<ScopeRoleRepository>(ScopeRoleRepositorySymbol);
  }

  /**
   * Získá všechny role pro scope
   */
  async getScopeRoles(scopeId: string): Promise<ScopeRole[]> {
    return this.scopeRoleRepository.findByScopeId(scopeId);
  }

  /**
   * Získá pouze aktivní role pro scope
   */
  async getActiveScopeRoles(scopeId: string): Promise<ScopeRole[]> {
    return this.scopeRoleRepository.findActiveByScopeId(scopeId);
  }

  /**
   * Získá roli podle ID
   */
  async getScopeRoleById(id: string): Promise<ScopeRole | null> {
    return this.scopeRoleRepository.findById(id);
  }

  /**
   * Získá roli podle klíče v scope
   */
  async getScopeRoleByKey(scopeId: string, key: string): Promise<ScopeRole | null> {
    return this.scopeRoleRepository.findByKey(scopeId, key);
  }

  /**
   * Vytvoří novou roli
   */
  async createScopeRole(data: CreateScopeRoleData): Promise<ScopeRole> {
    return this.scopeRoleRepository.create(data);
  }

  /**
   * Aktualizuje roli
   */
  async updateScopeRole(id: string, data: UpdateScopeRoleData): Promise<ScopeRole> {
    return this.scopeRoleRepository.update(id, data);
  }

  /**
   * Smaže roli
   */
  async deleteScopeRole(id: string): Promise<void> {
    return this.scopeRoleRepository.delete(id);
  }

  /**
   * Smaže všechny role pro scope
   */
  async deleteScopeRoles(scopeId: string): Promise<void> {
    return this.scopeRoleRepository.deleteByScopeId(scopeId);
  }

  /**
   * Inicializuje výchozí role pro scope
   */
  async initializeDefaultRoles(scopeId: string): Promise<{ roles: ScopeRole[], createdKeys: string[] }> {
    // Kontrola, které výchozí role chybí
    const existingRoles = await this.getScopeRoles(scopeId);
    const defaultRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
    const existingDefaultKeys = existingRoles
      .filter(role => defaultRoleKeys.includes(role.key))
      .map(role => role.key);
    const missingDefaultKeys = defaultRoleKeys.filter(key => !existingDefaultKeys.includes(key));

    if (missingDefaultKeys.length === 0) {
      throw new Error('Default roles have already been initialized');
    }

    const defaultRolesData: Record<string, CreateScopeRoleData> = {
      fe: {
        scopeId,
        key: 'fe',
        label: 'FE',
        color: '#2563eb',
        translationKey: 'fe_mandays',
        isActive: true,
        order: 1
      },
      be: {
        scopeId,
        key: 'be',
        label: 'BE',
        color: '#059669',
        translationKey: 'be_mandays',
        isActive: true,
        order: 2
      },
      qa: {
        scopeId,
        key: 'qa',
        label: 'QA',
        color: '#f59e42',
        translationKey: 'qa_mandays',
        isActive: true,
        order: 3
      },
      pm: {
        scopeId,
        key: 'pm',
        label: 'PM',
        color: '#a21caf',
        translationKey: 'pm_mandays',
        isActive: true,
        order: 4
      },
      dpl: {
        scopeId,
        key: 'dpl',
        label: 'DPL',
        color: '#e11d48',
        translationKey: 'dpl_mandays',
        isActive: true,
        order: 5
      }
    };

    const createdRoles: ScopeRole[] = [];
    for (const missingKey of missingDefaultKeys) {
      const roleData = defaultRolesData[missingKey];
      const role = await this.scopeRoleRepository.create(roleData);
      createdRoles.push(role);
    }

    return { roles: createdRoles, createdKeys: missingDefaultKeys };
  }
} 