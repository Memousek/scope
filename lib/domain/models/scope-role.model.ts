/**
 * Scope Role Model
 * Reprezentuje konfigurovatelnou roli v rámci scope
 */

export interface ScopeRole {
  id: string;
  scopeId: string;
  key: string;
  label: string;
  color: string;
  translationKey: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScopeRoleData {
  scopeId: string;
  key: string;
  label: string;
  color: string;
  translationKey: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateScopeRoleData {
  label?: string;
  color?: string;
  translationKey?: string;
  isActive?: boolean;
  order?: number;
} 