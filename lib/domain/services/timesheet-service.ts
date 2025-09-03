/**
 * Timesheet service for managing work hours and billing calculations
 * Integrates with billing system to provide real cost calculations
 */

import { createClient } from '@/lib/supabase/client';
import { SupabaseTimesheetRepository } from '@/lib/data/repositories/supabase-timesheet-repository';
import { 
  TimesheetEntry, 
  CreateTimesheetData, 
  UpdateTimesheetData, 
  TimesheetFilter, 
  TimesheetSummary,
  JiraWorklogData,
  JiraImportResult
} from '../models/timesheet';


export class TimesheetService {
  private timesheetRepository: SupabaseTimesheetRepository;

  constructor() {
    const supabase = createClient();
    this.timesheetRepository = new SupabaseTimesheetRepository(supabase);
  }

  // Basic CRUD operations
  async createTimesheet(data: CreateTimesheetData): Promise<TimesheetEntry> {
    // Validate hours (0-24)
    if (data.hours < 0 || data.hours > 24) {
      throw new Error('Hours must be between 0 and 24');
    }

    // Check for duplicate entry (same member, project, date, role)
    const existing = await this.timesheetRepository.findByFilter({
      memberId: data.memberId,
      projectId: data.projectId,
      scopeId: data.scopeId,
      dateFrom: data.date,
      dateTo: data.date,
      role: data.role
    });

    if (existing.length > 0) {
      throw new Error('Timesheet entry already exists for this member, project, date, and role');
    }

    return this.timesheetRepository.create(data);
  }

  async updateTimesheet(id: string, data: UpdateTimesheetData): Promise<TimesheetEntry> {
    if (data.hours !== undefined && (data.hours < 0 || data.hours > 24)) {
      throw new Error('Hours must be between 0 and 24');
    }

    return this.timesheetRepository.update(id, data);
  }

  async deleteTimesheet(id: string): Promise<void> {
    return this.timesheetRepository.delete(id);
  }

  // Query operations
  async getTimesheetsByFilter(filter: TimesheetFilter): Promise<TimesheetEntry[]> {
    return this.timesheetRepository.findByFilter(filter);
  }

  async getTimesheetsByMember(memberId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]> {
    return this.timesheetRepository.findByMember(memberId, dateFrom, dateTo);
  }

  async getTimesheetsByProject(projectId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]> {
    return this.timesheetRepository.findByProject(projectId, dateFrom, dateTo);
  }

  async getTimesheetsByScope(scopeId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]> {
    return this.timesheetRepository.findByScope(scopeId, dateFrom, dateTo);
  }

  // Summary operations with cost calculations
  async getMemberSummary(memberId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary | null> {
    return this.timesheetRepository.getSummaryByMember(memberId, dateFrom, dateTo);
  }

  async getProjectSummary(projectId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary[]> {
    return this.timesheetRepository.getSummaryByProject(projectId, dateFrom, dateTo);
  }

  async getScopeSummary(scopeId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary[]> {
    return this.timesheetRepository.getSummaryByScope(scopeId, dateFrom, dateTo);
  }

  // Billing integration - calculate real costs from timesheets
  async calculateRealCosts(
    scopeId: string, 
    dateFrom?: Date, 
    dateTo?: Date
  ): Promise<Array<{
    memberId: string;
    memberName: string;
    role: string;
    projectId: string;
    projectName: string;
    hours: number;
    mandays: number;
    mdRate: number;
    cost: number;
  }>> {
    const timesheets = await this.getTimesheetsByScope(scopeId, dateFrom, dateTo);
    
    // Group by member and project
    const costBreakdown = timesheets.reduce((acc, timesheet) => {
      const key = `${timesheet.memberId}-${timesheet.projectId}`;
      
      if (!acc[key]) {
        acc[key] = {
          memberId: timesheet.memberId,
          memberName: timesheet.memberId, // Would need to join with team_members
          role: timesheet.role,
          projectId: timesheet.projectId,
          projectName: timesheet.projectId, // Would need to join with projects
          hours: 0,
          mandays: 0,
          mdRate: 0, // Would need to get from team_members
          cost: 0
        };
      }
      
      acc[key].hours += timesheet.hours;
      acc[key].mandays = acc[key].hours / 8;
      
      return acc;
    }, {} as Record<string, {
      memberId: string;
      memberName: string;
      role: string;
      projectId: string;
      projectName: string;
      hours: number;
      mandays: number;
      mdRate: number;
      cost: number;
    }>);

    // Convert to array and calculate costs (when MD rates are available)
    return Object.values(costBreakdown);
  }

  // Jira integration
  async importFromJira(
    scopeId: string,
    jiraData: JiraWorklogData[],
    memberMapping: Record<string, string> // Jira username -> member ID
  ): Promise<JiraImportResult> {
    const result: JiraImportResult = {
      success: true,
      importedCount: 0,
      errors: [],
      warnings: []
    };

    const timesheetData: CreateTimesheetData[] = [];

    for (const worklog of jiraData) {
      try {
        // Find member ID from mapping
        const memberId = memberMapping[worklog.author];
        if (!memberId) {
          result.warnings.push({
            issueKey: worklog.issueKey,
            warning: `No member mapping found for Jira user: ${worklog.author}`
          });
          continue;
        }

        // Convert seconds to hours
        const hours = worklog.timeSpentSeconds / 3600;
        
        // Parse date
        const date = new Date(worklog.started || worklog.date);

        // Create timesheet entry
        timesheetData.push({
          memberId,
          projectId: worklog.issueKey, // Would need to map Jira issue to project
          scopeId,
          date,
          hours,
          role: 'Unknown', // Would need to determine from Jira data
          description: worklog.comment,
          jiraIssueKey: worklog.issueKey,
          jiraWorklogId: worklog.worklogId
        });

        result.importedCount++;
      } catch (error) {
        result.errors.push({
          issueKey: worklog.issueKey,
          error: `Failed to process worklog: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        result.success = false;
      }
    }

    // Bulk insert if we have data
    if (timesheetData.length > 0) {
      try {
        await this.timesheetRepository.createMany(timesheetData);
      } catch (error) {
        result.success = false;
        result.errors.push({
          issueKey: 'BULK_INSERT',
          error: `Failed to insert timesheets: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return result;
  }

  // Utility methods
  async getTotalHours(filter: TimesheetFilter): Promise<number> {
    return this.timesheetRepository.getTotalHours(filter);
  }

  async getTotalMandays(filter: TimesheetFilter): Promise<number> {
    return this.timesheetRepository.getTotalMandays(filter);
  }

  async getTotalCost(filter: TimesheetFilter): Promise<number> {
    return this.timesheetRepository.getTotalCost(filter);
  }

  // Bulk operations
  async createManyTimesheets(data: CreateTimesheetData[]): Promise<TimesheetEntry[]> {
    // Validate all entries
    for (const entry of data) {
      if (entry.hours < 0 || entry.hours > 24) {
        throw new Error(`Invalid hours for entry: ${entry.memberId} on ${entry.date}`);
      }
    }

    return this.timesheetRepository.createMany(data);
  }

  async updateManyTimesheets(updates: Array<{ id: string; data: UpdateTimesheetData }>): Promise<TimesheetEntry[]> {
    return this.timesheetRepository.updateMany(updates);
  }

  async deleteManyTimesheets(ids: string[]): Promise<void> {
    return this.timesheetRepository.deleteMany(ids);
  }
}
