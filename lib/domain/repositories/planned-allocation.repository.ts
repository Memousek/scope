/**
 * Repository interface for planned allocation data operations
 */

import { 
  PlannedAllocation, 
  CreatePlannedAllocationData, 
  UpdatePlannedAllocationData, 
  PlannedAllocationFilter,
  PlannedAllocationSummary 
} from '../models/planned-allocation.model';

export interface PlannedAllocationRepository {
  findById(id: string): Promise<PlannedAllocation | null>;
  findByFilter(filter: PlannedAllocationFilter): Promise<PlannedAllocation[]>;
  findByScopeId(scopeId: string): Promise<PlannedAllocation[]>;
  findByTeamMemberId(teamMemberId: string): Promise<PlannedAllocation[]>;
  findByDateRange(scopeId: string, dateFrom: Date, dateTo: Date): Promise<PlannedAllocation[]>;
  create(data: CreatePlannedAllocationData): Promise<PlannedAllocation>;
  update(id: string, data: UpdatePlannedAllocationData): Promise<PlannedAllocation>;
  delete(id: string): Promise<void>;
  deleteByFilter(filter: PlannedAllocationFilter): Promise<void>;
  getSummary(scopeId: string, dateFrom: Date, dateTo: Date): Promise<PlannedAllocationSummary[]>;
}
