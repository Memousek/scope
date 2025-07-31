/**
 * Custom hook for managing scope roles
 * Provides access to configurable roles for a scope
 */

import { useState, useEffect, useCallback } from 'react';
import { ContainerService } from '@/lib/container.service';
import { ManageScopeRolesService } from '@/lib/domain/services/manage-scope-roles.service';
import { ScopeRole } from '@/lib/domain/models/scope-role.model';

export function useScopeRoles(scopeId: string) {
  const [roles, setRoles] = useState<ScopeRole[]>([]);
  const [activeRoles, setActiveRoles] = useState<ScopeRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  /**
   * Load roles for the given scope
   */
  const loadRoles = useCallback(async () => {
    if (!scopeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const manageRolesService = ContainerService.getInstance().get(ManageScopeRolesService);
      const allRoles = await manageRolesService.getScopeRoles(scopeId);
      const active = await manageRolesService.getActiveScopeRoles(scopeId);
      
      setRoles(allRoles);
      setActiveRoles(active);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  /**
   * Create a new role
   */
  const createRole = useCallback(async (roleData: {
    key: string;
    label: string;
    color: string;
    translationKey: string;
    isActive?: boolean;
    order?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const manageRolesService = ContainerService.getInstance().get(ManageScopeRolesService);
      const newRole = await manageRolesService.createScopeRole({
        scopeId,
        ...roleData
      });
      
      setRoles(prev => [...prev, newRole]);
      if (newRole.isActive) {
        setActiveRoles(prev => [...prev, newRole]);
      }
      setLastUpdate(Date.now());
      
      return newRole;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  /**
   * Update an existing role
   */
  const updateRole = useCallback(async (id: string, updates: {
    label?: string;
    color?: string;
    translationKey?: string;
    isActive?: boolean;
    order?: number;
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      const manageRolesService = ContainerService.getInstance().get(ManageScopeRolesService);
      const updatedRole = await manageRolesService.updateScopeRole(id, updates);
      
      setRoles(prev => prev.map(role => role.id === id ? updatedRole : role));
      setActiveRoles(prev => {
        if (updatedRole.isActive) {
          return prev.some(role => role.id === id) 
            ? prev.map(role => role.id === id ? updatedRole : role)
            : [...prev, updatedRole];
        } else {
          return prev.filter(role => role.id !== id);
        }
      });
      setLastUpdate(Date.now());
      
      return updatedRole;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a role
   */
  const deleteRole = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const manageRolesService = ContainerService.getInstance().get(ManageScopeRolesService);
      await manageRolesService.deleteScopeRole(id);
      
      setRoles(prev => prev.filter(role => role.id !== id));
      setActiveRoles(prev => prev.filter(role => role.id !== id));
      setLastUpdate(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initialize default roles for scope
   */
  const initializeDefaultRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const manageRolesService = ContainerService.getInstance().get(ManageScopeRolesService);
      const defaultRoles = await manageRolesService.initializeDefaultRoles(scopeId);
      
      setRoles(defaultRoles);
      setActiveRoles(defaultRoles.filter(role => role.isActive));
      setLastUpdate(Date.now());
      
      return defaultRoles;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize default roles');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load roles on mount and when scopeId changes
  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // Reload roles when lastUpdate changes (after role modifications)
  useEffect(() => {
    if (lastUpdate > 0) {
      loadRoles();
    }
  }, [lastUpdate, loadRoles]);

  return {
    roles,
    activeRoles,
    loading,
    error,
    lastUpdate,
    loadRoles,
    createRole,
    updateRole,
    deleteRole,
    initializeDefaultRoles,
    clearError,
  };
} 