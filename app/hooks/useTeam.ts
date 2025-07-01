/**
 * Custom hook for managing team members state and operations
 * Provides CRUD operations for team members with loading states and error handling
 */

import { useState, useCallback } from 'react';
import { TeamMember } from '@/app/components/scope/types';
import { TeamService, CreateTeamMemberData } from '@/app/services/teamService';

export function useTeam(scopeId: string) {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load team members for the given scope
   */
  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await TeamService.loadTeam(scopeId);
      setTeam(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  /**
   * Add a new team member to the scope
   */
  const addTeamMember = useCallback(async (memberData: CreateTeamMemberData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await TeamService.createTeamMember(scopeId, memberData);
      setTeam(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team member');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  /**
   * Update an existing team member
   */
  const updateTeamMember = useCallback(async (memberId: string, updates: Partial<TeamMember>) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await TeamService.updateTeamMember(memberId, updates);
      setTeam(prev => prev.map(m => m.id === memberId ? data : m));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team member');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a team member
   */
  const deleteTeamMember = useCallback(async (memberId: string) => {
    if (!confirm('Opravdu chcete tohoto člena týmu smazat?')) {
      return false;
    }

    setLoading(true);
    setError(null);
    
    try {
      await TeamService.deleteTeamMember(memberId);
      setTeam(prev => prev.filter(m => m.id !== memberId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team member');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get team capacity by role
   */
  const getTeamCapacity = useCallback((role: string) => {
    return team
      .filter(member => member.role === role)
      .reduce((sum, member) => sum + (member.fte || 0), 0);
  }, [team]);

  /**
   * Check if team has members with specific role
   */
  const hasRole = useCallback((role: string) => {
    return team.some(member => member.role === role);
  }, [team]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    team,
    loading,
    error,
    loadTeam,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    getTeamCapacity,
    hasRole,
    clearError,
  };
} 