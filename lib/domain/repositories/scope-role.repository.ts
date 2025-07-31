/**
 * Scope Role Repository Interface
 * Definuje operace pro práci s konfigurovatelnými rolemi
 */

import { ScopeRole, CreateScopeRoleData, UpdateScopeRoleData } from '../models/scope-role.model';

export const ScopeRoleRepositorySymbol = Symbol('ScopeRoleRepository');

export interface ScopeRoleRepository {
  findByScopeId(scopeId: string): Promise<ScopeRole[]>;
  findActiveByScopeId(scopeId: string): Promise<ScopeRole[]>;
  findById(id: string): Promise<ScopeRole | null>;
  findByKey(scopeId: string, key: string): Promise<ScopeRole | null>;
  create(data: CreateScopeRoleData): Promise<ScopeRole>;
  update(id: string, data: UpdateScopeRoleData): Promise<ScopeRole>;
  delete(id: string): Promise<void>;
  deleteByScopeId(scopeId: string): Promise<void>;
} 