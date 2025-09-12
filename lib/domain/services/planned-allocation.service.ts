/**
 * Service for managing planned allocations
 * Handles business logic for future allocation planning
 */

import { 
  PlannedAllocation, 
  CreatePlannedAllocationData, 
  UpdatePlannedAllocationData, 
  PlannedAllocationFilter,
  PlannedAllocationSummary 
} from '../models/planned-allocation.model';
import { PlannedAllocationRepository } from '../repositories/planned-allocation.repository';
import { SupabasePlannedAllocationRepository } from '../../data/repositories/supabase/planned-allocation.repository';

export class PlannedAllocationService {
  private repository: PlannedAllocationRepository;

  constructor(repository?: PlannedAllocationRepository) {
    this.repository = repository || new SupabasePlannedAllocationRepository();
  }

  /**
   * Get planned allocation by ID
   */
  async getById(id: string): Promise<PlannedAllocation | null> {
    return this.repository.findById(id);
  }

  /**
   * Get planned allocations by filter
   */
  async getByFilter(filter: PlannedAllocationFilter): Promise<PlannedAllocation[]> {
    return this.repository.findByFilter(filter);
  }

  /**
   * Get all planned allocations for a scope
   */
  async getByScopeId(scopeId: string): Promise<PlannedAllocation[]> {
    return this.repository.findByScopeId(scopeId);
  }

  /**
   * Get planned allocations for a specific team member
   */
  async getByTeamMemberId(teamMemberId: string): Promise<PlannedAllocation[]> {
    return this.repository.findByTeamMemberId(teamMemberId);
  }

  /**
   * Get planned allocations for a date range
   */
  async getByDateRange(scopeId: string, dateFrom: Date, dateTo: Date): Promise<PlannedAllocation[]> {
    return this.repository.findByDateRange(scopeId, dateFrom, dateTo);
  }

  /**
   * Create a new planned allocation
   */
  async create(data: CreatePlannedAllocationData): Promise<PlannedAllocation> {
    // Validate allocation FTE
    if (data.allocationFte < 0 || data.allocationFte > 2) {
      throw new Error('Allocation FTE must be between 0 and 2');
    }

    // Allow planning for past dates (for corrections and adjustments)
    // Only warn if date is more than 30 days in the past
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (data.date < thirtyDaysAgo) {
      console.warn('Creating planned allocation for date more than 30 days in the past:', data.date);
    }

    // Check for existing allocation on the same date for the same team member
    const existing = await this.repository.findByFilter({
      teamMemberId: data.teamMemberId,
      dateFrom: data.date,
      dateTo: data.date
    });

    if (existing.length > 0) {
      throw new Error('Planned allocation already exists for this team member on this date');
    }

    return this.repository.create(data);
  }

  /**
   * Update an existing planned allocation
   */
  async update(id: string, data: UpdatePlannedAllocationData): Promise<PlannedAllocation> {
    // Validate allocation FTE if provided
    if (data.allocationFte !== undefined && (data.allocationFte < 0 || data.allocationFte > 2)) {
      throw new Error('Allocation FTE must be between 0 and 2');
    }

    return this.repository.update(id, data);
  }

  /**
   * Delete a planned allocation
   */
  async delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * Delete planned allocations by filter
   */
  async deleteByFilter(filter: PlannedAllocationFilter): Promise<void> {
    return this.repository.deleteByFilter(filter);
  }

  /**
   * Get allocation summary for a date range
   */
  async getSummary(scopeId: string, dateFrom: Date, dateTo: Date): Promise<PlannedAllocationSummary[]> {
    return this.repository.getSummary(scopeId, dateFrom, dateTo);
  }

  /**
   * Bulk create planned allocations
   */
  async createBulk(allocations: CreatePlannedAllocationData[]): Promise<PlannedAllocation[]> {
    const results: PlannedAllocation[] = [];
    
    for (const allocation of allocations) {
      try {
        const result = await this.create(allocation);
        results.push(result);
      } catch (error) {
        console.error(`Failed to create planned allocation for ${allocation.teamMemberId} on ${allocation.date}:`, error);
        // Continue with other allocations even if one fails
      }
    }
    
    return results;
  }

  /**
   * Create planned allocation for multiple dates
   */
  async createForDateRange(
    baseAllocation: Omit<CreatePlannedAllocationData, 'date'>,
    dates: Date[],
    skipExisting: boolean = true
  ): Promise<PlannedAllocation[]> {
    const allocations: CreatePlannedAllocationData[] = [];
    
    for (const date of dates) {
      const allocationData: CreatePlannedAllocationData = {
        ...baseAllocation,
        date
      };
      
      if (skipExisting) {
        // Check if allocation already exists
        const existing = await this.repository.findByFilter({
          teamMemberId: baseAllocation.teamMemberId,
          dateFrom: date,
          dateTo: date
        });
        
        if (existing.length > 0) {
          console.log(`Skipping existing allocation for ${baseAllocation.teamMemberId} on ${date.toISOString().split('T')[0]}`);
          continue;
        }
      }
      
      allocations.push(allocationData);
    }
    
    return this.createBulk(allocations);
  }

  /**
   * Copy allocations from one date to another
   */
  async copyAllocations(
    scopeId: string, 
    fromDate: Date, 
    toDate: Date, 
    teamMemberIds?: string[]
  ): Promise<PlannedAllocation[]> {
    const filter: PlannedAllocationFilter = {
      scopeId,
      dateFrom: fromDate,
      dateTo: fromDate
    };

    if (teamMemberIds) {
      // Copy specific team members
      const results: PlannedAllocation[] = [];
      for (const memberId of teamMemberIds) {
        const allocations = await this.repository.findByFilter({
          ...filter,
          teamMemberId: memberId
        });
        
        for (const allocation of allocations) {
          try {
            const newAllocation = await this.create({
              scopeId: allocation.scopeId,
              teamMemberId: allocation.teamMemberId,
              projectId: allocation.projectId,
              date: toDate,
              allocationFte: allocation.allocationFte,
              role: allocation.role,
              externalProjectName: allocation.externalProjectName,
              description: allocation.description
            });
            results.push(newAllocation);
          } catch (error) {
            console.error(`Failed to copy allocation for ${allocation.teamMemberId}:`, error);
          }
        }
      }
      return results;
    } else {
      // Copy all allocations
      const allocations = await this.repository.findByFilter(filter);
      const newAllocations: CreatePlannedAllocationData[] = allocations.map(allocation => ({
        scopeId: allocation.scopeId,
        teamMemberId: allocation.teamMemberId,
        projectId: allocation.projectId,
        date: toDate,
        allocationFte: allocation.allocationFte,
        role: allocation.role,
        externalProjectName: allocation.externalProjectName,
        description: allocation.description
      }));
      
      return this.createBulk(newAllocations);
    }
  }

  /**
   * Get allocation conflicts (over-allocated team members)
   */
  async getConflicts(scopeId: string, dateFrom: Date, dateTo: Date): Promise<Array<{
    teamMemberId: string;
    teamMemberName: string;
    date: Date;
    totalAllocated: number;
    maxFte: number;
    conflicts: PlannedAllocation[];
  }>> {
    const allocations = await this.repository.findByDateRange(scopeId, dateFrom, dateTo);
    
    // Group by team member and date
    const grouped = allocations.reduce((acc, allocation) => {
      const key = `${allocation.teamMemberId}-${allocation.date.toISOString().split('T')[0]}`;
      if (!acc[key]) {
        acc[key] = {
          teamMemberId: allocation.teamMemberId,
          teamMemberName: '', // Will be filled from allocation data
          date: allocation.date,
          totalAllocated: 0,
          maxFte: 1.0, // Default FTE, should be fetched from team member data
          allocations: []
        };
      }
      acc[key].totalAllocated += allocation.allocationFte;
      acc[key].allocations.push(allocation);
      return acc;
    }, {} as Record<string, any>);

    // Find conflicts
    const conflicts = Object.values(grouped)
      .filter((group: any) => group.totalAllocated > group.maxFte)
      .map((group: any) => ({
        teamMemberId: group.teamMemberId,
        teamMemberName: group.teamMemberName,
        date: group.date,
        totalAllocated: group.totalAllocated,
        maxFte: group.maxFte,
        conflicts: group.allocations
      }));

    return conflicts;
  }
}
