/**
 * Planned Allocation domain model for future allocation planning
 * Represents planned daily allocations for team members across projects
 */

export interface PlannedAllocation {
  id: string;
  scopeId: string;
  teamMemberId: string;
  projectId: string | null;
  date: Date;
  allocationFte: number; // 0.0 to 2.0
  role: string;
  externalProjectName?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlannedAllocationData {
  scopeId: string;
  teamMemberId: string;
  projectId: string | null;
  date: Date;
  allocationFte: number;
  role: string;
  externalProjectName?: string;
  description?: string;
}

export interface UpdatePlannedAllocationData {
  projectId?: string | null;
  allocationFte?: number;
  role?: string;
  externalProjectName?: string;
  description?: string;
}

export interface PlannedAllocationFilter {
  scopeId?: string;
  teamMemberId?: string;
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  role?: string;
}

export interface PlannedAllocationSummary {
  teamMemberId: string;
  teamMemberName: string;
  totalAllocatedFte: number;
  dateRange: {
    from: Date;
    to: Date;
  };
  projectBreakdown: Array<{
    projectId: string | null;
    projectName: string;
    totalFte: number;
    days: number;
  }>;
}
