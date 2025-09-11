/**
 * Supabase implementation of TimesheetRepository
 * Handles all timesheet database operations with proper error handling
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TimesheetRepository } from '../../domain/repositories/timesheet-repository';
import { 
  TimesheetEntry, 
  CreateTimesheetData, 
  UpdateTimesheetData, 
  TimesheetFilter, 
  TimesheetSummary 
} from '../../domain/models/timesheet';


export class SupabaseTimesheetRepository implements TimesheetRepository {
  private supabase;

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }
  }

  async create(data: CreateTimesheetData): Promise<TimesheetEntry> {
    const { data: timesheet, error } = await this.supabase
      .from('timesheets')
      .insert({
        member_id: data.memberId,
        project_id: data.projectId,
        scope_id: data.scopeId,
        date: data.date.toISOString().split('T')[0], // Convert to YYYY-MM-DD
        hours: data.hours,
        role: data.role,
        description: data.description,
        jira_issue_key: data.jiraIssueKey,
        jira_worklog_id: data.jiraWorklogId,
        external_id: data.externalId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create timesheet: ${error.message}`);
    }

    return this.mapDatabaseToDomain(timesheet);
  }

  async findById(id: string): Promise<TimesheetEntry | null> {
    const { data: timesheet, error } = await this.supabase
      .from('timesheets')
      .select(`
        *,
        team_members!inner(name),
        projects!inner(name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw new Error(`Failed to find timesheet: ${error.message}`);
    }

    return this.mapDatabaseToDomain(timesheet);
  }

  async update(id: string, data: UpdateTimesheetData): Promise<TimesheetEntry> {
    const updateData: Record<string, unknown> = {};
    
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.jiraIssueKey !== undefined) updateData.jira_issue_key = data.jiraIssueKey;
    if (data.jiraWorklogId !== undefined) updateData.jira_worklog_id = data.jiraWorklogId;

    const { data: timesheet, error } = await this.supabase
      .from('timesheets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update timesheet: ${error.message}`);
    }

    return this.mapDatabaseToDomain(timesheet);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('timesheets')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete timesheet: ${error.message}`);
    }
  }

  async findByFilter(filter: TimesheetFilter): Promise<TimesheetEntry[]> {
    let query = this.supabase
      .from('timesheets')
      .select(`
        *,
        team_members!inner(name),
        projects!inner(name)
      `);

    if (filter.memberId) query = query.eq('member_id', filter.memberId);
    if (filter.projectId) query = query.eq('project_id', filter.projectId);
    if (filter.scopeId) query = query.eq('scope_id', filter.scopeId);
    if (filter.role) query = query.eq('role', filter.role);
    if (filter.dateFrom) query = query.gte('date', filter.dateFrom.toISOString().split('T')[0]);
    if (filter.dateTo) query = query.lte('date', filter.dateTo.toISOString().split('T')[0]);

    const { data: timesheets, error } = await query.order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to find timesheets: ${error.message}`);
    }

    return timesheets.map(this.mapDatabaseToDomain);
  }

  async findByMember(memberId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]> {
    return this.findByFilter({ memberId, dateFrom, dateTo });
  }

  async findByProject(projectId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]> {
    return this.findByFilter({ projectId, dateFrom, dateTo });
  }

  async findByScope(scopeId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]> {
    return this.findByFilter({ scopeId, dateFrom, dateTo });
  }

  async getSummaryByMember(memberId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary | null> {
    const timesheets = await this.findByMember(memberId, dateFrom, dateTo);
    
    if (timesheets.length === 0) return null;

    const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
    const totalMandays = totalHours / 8;

    // Group by project
    const projectBreakdown = timesheets.reduce((acc, timesheet) => {
      const existing = acc.find(p => p.projectId === timesheet.projectId);
      if (existing) {
        existing.hours += timesheet.hours;
        existing.mandays = existing.hours / 8;
      } else {
        acc.push({
          projectId: timesheet.projectId,
          projectName: timesheet.projectId, // Would need to join with projects table
          hours: timesheet.hours,
          mandays: timesheet.hours / 8,
          cost: 0 // Would need MD rate to calculate
        });
      }
      return acc;
    }, [] as Array<{ projectId: string; projectName: string; hours: number; mandays: number; cost: number }>);

    return {
      memberId,
      memberName: timesheets[0].memberId, // Would need to join with team_members table
      role: timesheets[0].role,
      totalHours,
      totalMandays,
      totalCost: 0, // Would need MD rate to calculate
      projectBreakdown
    };
  }

  async getSummaryByProject(projectId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary[]> {
    const timesheets = await this.findByProject(projectId, dateFrom, dateTo);
    
    // Group by member
    const memberGroups = timesheets.reduce((acc, timesheet) => {
      if (!acc[timesheet.memberId]) {
        acc[timesheet.memberId] = [];
      }
      acc[timesheet.memberId].push(timesheet);
      return acc;
    }, {} as Record<string, TimesheetEntry[]>);

    return Object.entries(memberGroups).map(([memberId, memberTimesheets]) => {
      const totalHours = memberTimesheets.reduce((sum, t) => sum + t.hours, 0);
      const totalMandays = totalHours / 8;

      return {
        memberId,
        memberName: memberId, // Would need to join with team_members table
        role: memberTimesheets[0].role,
        totalHours,
        totalMandays,
        totalCost: 0, // Would need MD rate to calculate
        projectBreakdown: [{
          projectId,
          projectName: projectId, // Would need to join with projects table
          hours: totalHours,
          mandays: totalMandays,
          cost: 0
        }]
      };
    });
  }

  async getSummaryByScope(scopeId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary[]> {
    const timesheets = await this.findByScope(scopeId, dateFrom, dateTo);
    
    // Group by member
    const memberGroups = timesheets.reduce((acc, timesheet) => {
      if (!acc[timesheet.memberId]) {
        acc[timesheet.memberId] = [];
      }
      acc[timesheet.memberId].push(timesheet);
      return acc;
    }, {} as Record<string, TimesheetEntry[]>);

    return Object.entries(memberGroups).map(([memberId, memberTimesheets]) => {
      const totalHours = memberTimesheets.reduce((sum, t) => sum + t.hours, 0);
      const totalMandays = totalHours / 8;

      // Group by project
      const projectBreakdown = memberTimesheets.reduce((acc, timesheet) => {
        const existing = acc.find(p => p.projectId === timesheet.projectId);
        if (existing) {
          existing.hours += timesheet.hours;
          existing.mandays = existing.hours / 8;
        } else {
          acc.push({
            projectId: timesheet.projectId,
            projectName: timesheet.projectId, // Would need to join with projects table
            hours: timesheet.hours,
            mandays: timesheet.hours / 8,
            cost: 0 // Would need MD rate to calculate
          });
        }
        return acc;
      }, [] as Array<{ projectId: string; projectName: string; hours: number; mandays: number; cost: number }>);

      return {
        memberId,
        memberName: memberId, // Would need to join with team_members table
        role: memberTimesheets[0].role,
        totalHours,
        totalMandays,
        totalCost: 0, // Would need MD rate to calculate
        projectBreakdown
      };
    });
  }

  async findByJiraIssue(issueKey: string): Promise<TimesheetEntry[]> {
    const { data: timesheets, error } = await this.supabase
      .from('timesheets')
      .select(`
        *,
        team_members!inner(name),
        projects!inner(name)
      `)
      .eq('jira_issue_key', issueKey)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to find timesheets by Jira issue: ${error.message}`);
    }

    return timesheets.map(this.mapDatabaseToDomain);
  }

  async findByJiraWorklog(worklogId: string): Promise<TimesheetEntry | null> {
    const { data: timesheet, error } = await this.supabase
      .from('timesheets')
      .select(`
        *,
        team_members!inner(name),
        projects!inner(name)
      `)
      .eq('jira_worklog_id', worklogId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find timesheet by Jira worklog: ${error.message}`);
    }

    return this.mapDatabaseToDomain(timesheet);
  }

  async createMany(data: CreateTimesheetData[]): Promise<TimesheetEntry[]> {
    if (data.length === 0) return [];

    // Get the first entry to determine member and date for cleanup
    const firstEntry = data[0];
    const dateStr = firstEntry.date.toISOString().split('T')[0];

    // First, delete existing timesheets for this member and date to avoid duplicates
    const { error: deleteError } = await this.supabase
      .from('timesheets')
      .delete()
      .eq('member_id', firstEntry.memberId)
      .eq('date', dateStr);

    if (deleteError) {
      throw new Error(`Failed to delete existing timesheets: ${deleteError.message}`);
    }

    // Now insert the new timesheets
    const timesheetData = data.map(item => ({
      member_id: item.memberId,
      project_id: item.projectId,
      scope_id: item.scopeId,
      date: item.date.toISOString().split('T')[0],
      hours: item.hours,
      role: item.role,
      description: item.description,
      jira_issue_key: item.jiraIssueKey,
      jira_worklog_id: item.jiraWorklogId,
      external_id: item.externalId
    }));

    const { data: timesheets, error } = await this.supabase
      .from('timesheets')
      .insert(timesheetData)
      .select(`
        *,
        team_members!inner(name),
        projects!inner(name)
      `);

    if (error) {
      throw new Error(`Failed to create timesheets: ${error.message}`);
    }

    return timesheets.map(this.mapDatabaseToDomain);
  }

  async updateMany(updates: Array<{ id: string; data: UpdateTimesheetData }>): Promise<TimesheetEntry[]> {
    const results: TimesheetEntry[] = [];
    
    for (const update of updates) {
      try {
        const result = await this.update(update.id, update.data);
        results.push(result);
      } catch (error) {
        console.error(`Failed to update timesheet ${update.id}:`, error);
        throw error;
      }
    }

    return results;
  }

  async deleteMany(ids: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('timesheets')
      .delete()
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to delete timesheets: ${error.message}`);
    }
  }

  async getTotalHours(filter: TimesheetFilter): Promise<number> {
    let query = this.supabase
      .from('timesheets')
      .select('hours');

    if (filter.memberId) query = query.eq('member_id', filter.memberId);
    if (filter.projectId) query = query.eq('project_id', filter.projectId);
    if (filter.scopeId) query = query.eq('scope_id', filter.scopeId);
    if (filter.role) query = query.eq('role', filter.role);
    if (filter.dateFrom) query = query.gte('date', filter.dateFrom.toISOString().split('T')[0]);
    if (filter.dateTo) query = query.lte('date', filter.dateTo.toISOString().split('T')[0]);

    const { data: timesheets, error } = await query;

    if (error) {
      throw new Error(`Failed to get total hours: ${error.message}`);
    }

    return timesheets.reduce((sum, t) => sum + Number(t.hours), 0);
  }

  async getTotalMandays(filter: TimesheetFilter): Promise<number> {
    const totalHours = await this.getTotalHours(filter);
    return totalHours / 8;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTotalCost(filter: TimesheetFilter): Promise<number> {
    // This would need to join with team_members to get MD rates
    // For now, return 0 as placeholder
    return 0;
  }

  private mapDatabaseToDomain(dbTimesheet: Record<string, unknown>): TimesheetEntry {
    return {
      id: dbTimesheet.id as string,
      memberId: dbTimesheet.member_id as string,
      projectId: dbTimesheet.project_id as string,
      scopeId: dbTimesheet.scope_id as string,
      date: new Date(dbTimesheet.date as string),
      hours: Number(dbTimesheet.hours),
      role: dbTimesheet.role as string,
      description: dbTimesheet.description as string,
      jiraIssueKey: (dbTimesheet.jira_issue_key as string | null) || undefined,
      jiraWorklogId: (dbTimesheet.jira_worklog_id as string | null) || undefined,
      externalId: (dbTimesheet.external_id as string | null) || undefined,
      createdAt: new Date(dbTimesheet.created_at as string),
      updatedAt: new Date(dbTimesheet.updated_at as string)
    };
  }
}
