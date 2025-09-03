/**
 * Timesheet domain model for tracking actual work hours
 * Supports both manual entry and future Jira integration
 */

export interface TimesheetEntry {
  id: string;
  memberId: string;
  projectId: string;
  scopeId: string;
  date: Date;
  hours: number;
  role: string;
  description?: string;
  jiraIssueKey?: string;
  jiraWorklogId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTimesheetData {
  memberId: string;
  projectId: string;
  scopeId: string;
  date: Date;
  hours: number;
  role: string;
  description?: string;
  jiraIssueKey?: string;
  jiraWorklogId?: string;
}

export interface UpdateTimesheetData {
  hours?: number;
  role?: string;
  description?: string;
  jiraIssueKey?: string;
  jiraWorklogId?: string;
}

export interface TimesheetFilter {
  memberId?: string;
  projectId?: string;
  scopeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  role?: string;
}

export interface TimesheetSummary {
  memberId: string;
  memberName: string;
  role: string;
  totalHours: number;
  totalMandays: number; // hours / 8
  totalCost: number; // mandays * mdRate
  projectBreakdown: Array<{
    projectId: string;
    projectName: string;
    hours: number;
    mandays: number;
    cost: number;
  }>;
}

export interface JiraWorklogData {
  issueKey: string;
  worklogId: string;
  author: string;
  date: string;
  timeSpentSeconds: number;
  comment?: string;
  started?: string;
}

export interface JiraImportResult {
  success: boolean;
  importedCount: number;
  errors: Array<{
    issueKey: string;
    error: string;
  }>;
  warnings: Array<{
    issueKey: string;
    warning: string;
  }>;
}
