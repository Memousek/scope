/**
 * Hook for allocation-based calculations
 * Provides easy access to allocation calculation service
 */

import { useCallback, useState } from 'react';
import { ContainerService } from '@/lib/container.service';
import { AllocationCalculationService } from '@/lib/domain/services/allocation-calculation.service';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { Project as UIProject } from '@/app/components/scope/types';
import { Project } from '@/lib/domain/models/project.model';
import { TeamMember } from '@/lib/domain/models/team-member.model';

export interface UseAllocationCalculationsResult {
  calculateProjectDelivery: (project: UIProject, team: TeamMember[], projectAssignments?: Array<{ teamMemberId: string; role: string }>) => Promise<unknown>;
  calculateTeamCapacity: (team: TeamMember[], dateFrom: Date, dateTo: Date) => Promise<unknown>;
  calculateProjectCapacity: (projectId: string, team: TeamMember[], dateFrom: Date, dateTo: Date) => Promise<unknown>;
  loading: boolean;
  error: string | null;
}

export function useAllocationCalculations(scopeId: string): UseAllocationCalculationsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateProjectDelivery = useCallback(async (
    project: UIProject,
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

      // Convert UI project to domain project
      const domainProject: Project = {
        id: project.id,
        scopeId: scopeId,
        name: project.name,
        priority: project.priority,
        feMandays: project.fe_mandays ? Number(project.fe_mandays) : undefined,
        beMandays: project.be_mandays ? Number(project.be_mandays) : undefined,
        qaMandays: project.qa_mandays ? Number(project.qa_mandays) : undefined,
        pmMandays: project.pm_mandays ? Number(project.pm_mandays) : undefined,
        dplMandays: project.dpl_mandays ? Number(project.dpl_mandays) : undefined,
        feDone: Number(project.fe_done) || 0,
        beDone: Number(project.be_done) || 0,
        qaDone: Number(project.qa_done) || 0,
        pmDone: Number(project.pm_done) || 0,
        dplDone: Number(project.dpl_done) || 0,
        deliveryDate: project.delivery_date ? new Date(project.delivery_date as string) : undefined,
        createdAt: new Date(project.created_at as string),
        startedAt: project.started_at ? new Date(project.started_at as string) : undefined,
        startDay: project.start_day ? new Date(project.start_day as string) : undefined,
        customRoleData: project.custom_role_data || undefined,
        status: project.status as 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended'
      };

      // Calculate project delivery with allocation
      const result = await allocationService.calculateProjectDeliveryInfoWithAllocation(
        domainProject,
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
