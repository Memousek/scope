/**
 * Timesheet repository interface for database operations
 * Supports CRUD operations and advanced queries for timesheet management
 */

import { TimesheetEntry, CreateTimesheetData, UpdateTimesheetData, TimesheetFilter, TimesheetSummary } from '../models/timesheet';

export const TimesheetRepositorySymbol = Symbol('TimesheetRepository');

export interface TimesheetRepository {
  // Basic CRUD operations
  create(data: CreateTimesheetData): Promise<TimesheetEntry>;
  findById(id: string): Promise<TimesheetEntry | null>;
  update(id: string, data: UpdateTimesheetData): Promise<TimesheetEntry>;
  delete(id: string): Promise<void>;
  
  // Query operations
  findByFilter(filter: TimesheetFilter): Promise<TimesheetEntry[]>;
  findByMember(memberId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]>;
  findByProject(projectId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]>;
  findByScope(scopeId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetEntry[]>;
  
  // Aggregation operations
  getSummaryByMember(memberId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary | null>;
  getSummaryByProject(projectId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary[]>;
  getSummaryByScope(scopeId: string, dateFrom?: Date, dateTo?: Date): Promise<TimesheetSummary[]>;
  
  // Jira integration
  findByJiraIssue(issueKey: string): Promise<TimesheetEntry[]>;
  findByJiraWorklog(worklogId: string): Promise<TimesheetEntry | null>;
  
  // Bulk operations
  createMany(data: CreateTimesheetData[]): Promise<TimesheetEntry[]>;
  updateMany(updates: Array<{ id: string; data: UpdateTimesheetData }>): Promise<TimesheetEntry[]>;
  deleteMany(ids: string[]): Promise<void>;
  
  // Utility operations
  getTotalHours(filter: TimesheetFilter): Promise<number>;
  getTotalMandays(filter: TimesheetFilter): Promise<number>;
  getTotalCost(filter: TimesheetFilter): Promise<number>;
}
