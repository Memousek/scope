/**
 * Supabase implementation of PlannedAllocationRepository
 * Handles all planned allocation database operations with proper error handling
 */

import { createClient } from '@/lib/supabase/client';
import { 
  PlannedAllocation, 
  CreatePlannedAllocationData, 
  UpdatePlannedAllocationData, 
  PlannedAllocationFilter,
  PlannedAllocationSummary 
} from '@/lib/domain/models/planned-allocation.model';
import { PlannedAllocationRepository } from '@/lib/domain/repositories/planned-allocation.repository';

export class SupabasePlannedAllocationRepository implements PlannedAllocationRepository {
  async findById(id: string): Promise<PlannedAllocation | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('planned_allocations')
      .select(`
        *,
        team_members!inner(name),
        projects(name)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return this.mapToModel(data);
  }

  async findByFilter(filter: PlannedAllocationFilter): Promise<PlannedAllocation[]> {
    const supabase = createClient();
    let query = supabase
      .from('planned_allocations')
      .select(`
        *,
        team_members!inner(name),
        projects(name)
      `);

    if (filter.scopeId) {
      query = query.eq('scope_id', filter.scopeId);
    }
    if (filter.teamMemberId) {
      query = query.eq('team_member_id', filter.teamMemberId);
    }
    if (filter.projectId) {
      query = query.eq('project_id', filter.projectId);
    }
    if (filter.dateFrom) {
      query = query.gte('date', filter.dateFrom.toISOString().split('T')[0]);
    }
    if (filter.dateTo) {
      query = query.lte('date', filter.dateTo.toISOString().split('T')[0]);
    }
    if (filter.role) {
      query = query.eq('role', filter.role);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) {
      console.error('Error fetching planned allocations:', error);
      throw new Error(`Failed to fetch planned allocations: ${error.message}`);
    }

    return (data || []).map(this.mapToModel);
  }

  async findByScopeId(scopeId: string): Promise<PlannedAllocation[]> {
    return this.findByFilter({ scopeId });
  }

  async findByTeamMemberId(teamMemberId: string): Promise<PlannedAllocation[]> {
    return this.findByFilter({ teamMemberId });
  }

  async findByDateRange(scopeId: string, dateFrom: Date, dateTo: Date): Promise<PlannedAllocation[]> {
    return this.findByFilter({ scopeId, dateFrom, dateTo });
  }

  async create(data: CreatePlannedAllocationData): Promise<PlannedAllocation> {
    const supabase = createClient();
    
    const insertData = {
      scope_id: data.scopeId,
      team_member_id: data.teamMemberId,
      project_id: data.projectId,
      date: data.date.toISOString().split('T')[0],
      allocation_fte: data.allocationFte,
      role: data.role,
      external_project_name: data.externalProjectName,
      description: data.description
    };

    const { data: result, error } = await supabase
      .from('planned_allocations')
      .insert(insertData)
      .select(`
        *,
        team_members!inner(name),
        projects(name)
      `)
      .single();

    if (error || !result) {
      throw new Error(`Failed to create planned allocation: ${error?.message}`);
    }

    return this.mapToModel(result);
  }

  async update(id: string, data: UpdatePlannedAllocationData): Promise<PlannedAllocation> {
    const supabase = createClient();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (data.projectId !== undefined) updateData.project_id = data.projectId;
    if (data.allocationFte !== undefined) updateData.allocation_fte = data.allocationFte;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.externalProjectName !== undefined) updateData.external_project_name = data.externalProjectName;
    if (data.description !== undefined) updateData.description = data.description;

    const { data: result, error } = await supabase
      .from('planned_allocations')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        team_members!inner(name),
        projects(name)
      `)
      .single();

    if (error || !result) {
      throw new Error(`Failed to update planned allocation: ${error?.message}`);
    }

    return this.mapToModel(result);
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('planned_allocations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete planned allocation: ${error.message}`);
    }
  }

  async deleteByFilter(filter: PlannedAllocationFilter): Promise<void> {
    const supabase = createClient();
    let query = supabase.from('planned_allocations').delete();

    if (filter.scopeId) {
      query = query.eq('scope_id', filter.scopeId);
    }
    if (filter.teamMemberId) {
      query = query.eq('team_member_id', filter.teamMemberId);
    }
    if (filter.projectId) {
      query = query.eq('project_id', filter.projectId);
    }
    if (filter.dateFrom) {
      query = query.gte('date', filter.dateFrom.toISOString().split('T')[0]);
    }
    if (filter.dateTo) {
      query = query.lte('date', filter.dateTo.toISOString().split('T')[0]);
    }
    if (filter.role) {
      query = query.eq('role', filter.role);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to delete planned allocations: ${error.message}`);
    }
  }

  async getSummary(scopeId: string, dateFrom: Date, dateTo: Date): Promise<PlannedAllocationSummary[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('planned_allocations')
      .select(`
        team_member_id,
        team_members!inner(name),
        project_id,
        projects(name),
        allocation_fte,
        date
      `)
      .eq('scope_id', scopeId)
      .gte('date', dateFrom.toISOString().split('T')[0])
      .lte('date', dateTo.toISOString().split('T')[0])
      .order('team_member_id')
      .order('date');

    if (error) {
      throw new Error(`Failed to get planned allocation summary: ${error.message}`);
    }

    // Group by team member
    const grouped = (data || []).reduce((acc, item: any) => {
      const memberId = item.team_member_id;
      if (!acc[memberId]) {
        acc[memberId] = {
          teamMemberId: memberId,
          teamMemberName: item.team_members?.name || 'Neznámý člen',
          totalAllocatedFte: 0,
          dateRange: { from: dateFrom, to: dateTo },
          projectBreakdown: []
        };
      }
      
      acc[memberId].totalAllocatedFte += Number(item.allocation_fte);
      
      // Add to project breakdown
      const projectId = item.project_id;
      const projectName = item.project_id ? (item.projects as any)?.name || 'Neznámý projekt' : item.external_project_name || 'Externí projekt';
      
      let projectBreakdown = acc[memberId].projectBreakdown.find(p => p.projectId === projectId);
      if (!projectBreakdown) {
        projectBreakdown = {
          projectId,
          projectName,
          totalFte: 0,
          days: 0
        };
        acc[memberId].projectBreakdown.push(projectBreakdown);
      }
      
      projectBreakdown.totalFte += Number(item.allocation_fte);
      projectBreakdown.days += 1;
      
      return acc;
    }, {} as Record<string, PlannedAllocationSummary>);

    return Object.values(grouped);
  }

  private mapToModel(data: Record<string, unknown>): PlannedAllocation {
    return {
      id: data.id,
      scopeId: data.scope_id,
      teamMemberId: data.team_member_id,
      projectId: data.project_id,
      date: new Date(data.date),
      allocationFte: Number(data.allocation_fte),
      role: data.role,
      externalProjectName: data.external_project_name,
      description: data.description,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}
