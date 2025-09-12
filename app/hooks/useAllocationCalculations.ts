/**
 * Hook for allocation-based calculations
 * Provides easy access to allocation calculation service
 */

import { useCallback, useState } from 'react';
import { ContainerService } from '@/lib/container.service';
import { AllocationCalculationService } from '@/lib/domain/services/allocation-calculation.service';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { Project } from '@/app/components/scope/types';
import { TeamMember } from '@/lib/domain/models/team-member.model';

export interface UseAllocationCalculationsResult {
  calculateProjectDelivery: (project: Project, team: TeamMember[], projectAssignments?: Array<{ teamMemberId: string; role: string }>) => Promise<unknown>;
  calculateTeamCapacity: (team: TeamMember[], dateFrom: Date, dateTo: Date) => Promise<unknown>;
  calculateProjectCapacity: (projectId: string, team: TeamMember[], dateFrom: Date, dateTo: Date) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function useAllocationCalculations(scopeId: string): UseAllocationCalculationsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateProjectDelivery = useCallback(async (
    project: Project,
    team: TeamMember[],
    projectAssignments: Array<{ teamMemberId: string; role: string }> = []
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get allocation settings
      const settings = await ScopeSettingsService.get(scopeId);
      if (!settings?.allocation?.enabled) {
        throw new Error('Allocation calculations are not enabled for this scope');
      }

      // Get allocation calculation service
      const container = ContainerService.getInstance();
      const allocationService = container.get(AllocationCalculationService);

      // Calculate project delivery with allocation
      const result = await allocationService.calculateProjectDeliveryInfoWithAllocation(
        project,
        team,
        projectAssignments,
        settings,
        new Date(), // dateFrom - today
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // dateTo - one year from now
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  const calculateTeamCapacity = useCallback(async (
    team: TeamMember[],
    dateFrom: Date,
    dateTo: Date
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get allocation settings
      const settings = await ScopeSettingsService.get(scopeId);
      if (!settings?.allocation?.enabled) {
        throw new Error('Allocation calculations are not enabled for this scope');
      }

      // Get allocation calculation service
      const container = ContainerService.getInstance();
      const allocationService = container.get(AllocationCalculationService);

      // Calculate team capacity
      const result = await allocationService.calculateTeamCapacity(
        scopeId,
        team,
        dateFrom,
        dateTo,
        settings
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  const calculateProjectCapacity = useCallback(async (
    projectId: string,
    team: TeamMember[],
    dateFrom: Date,
    dateTo: Date
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Get allocation settings
      const settings = await ScopeSettingsService.get(scopeId);
      if (!settings?.allocation?.enabled) {
        throw new Error('Allocation calculations are not enabled for this scope');
      }

      // Get allocation calculation service
      const container = ContainerService.getInstance();
      const allocationService = container.get(AllocationCalculationService);

      // Calculate project capacity
      const result = await allocationService.calculateProjectCapacity(
        projectId,
        team,
        dateFrom,
        dateTo,
        settings
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  return {
    calculateProjectDelivery,
    calculateTeamCapacity,
    calculateProjectCapacity,
    loading,
    error
  };
}
