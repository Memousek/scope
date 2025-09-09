/**
 * JIRA Synchronization Service
 * 
 * This service handles automatic and manual synchronization of JIRA data
 * including worklogs, user mappings, and project mappings.
 */

import { JiraService } from '../../lib/services/jiraService';
import { TimesheetService } from '../../lib/domain/services/timesheet-service';
import { ScopeSettingsService } from './scopeSettingsService';

export interface SyncResult {
  success: boolean;
  message: string;
  worklogsImported?: number;
  errors?: string[];
  timestamp: Date;
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync?: Date;
  lastResult?: SyncResult;
  nextScheduledSync?: Date;
}

export class JiraSyncService {
  private static instance: JiraSyncService;
  private syncStatus: Map<string, SyncStatus> = new Map();
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  public static getInstance(): JiraSyncService {
    if (!JiraSyncService.instance) {
      JiraSyncService.instance = new JiraSyncService();
    }
    return JiraSyncService.instance;
  }

  /**
   * Get current sync status for a scope
   */
  public getSyncStatus(scopeId: string): SyncStatus {
    return this.syncStatus.get(scopeId) || {
      isRunning: false,
      lastSync: undefined,
      lastResult: undefined,
      nextScheduledSync: undefined
    };
  }

  /**
   * Manual synchronization of JIRA data
   */
  public async syncScope(scopeId: string): Promise<SyncResult> {
    const status = this.getSyncStatus(scopeId);
    
    if (status.isRunning) {
      return {
        success: false,
        message: 'Synchronizace již probíhá',
        timestamp: new Date()
      };
    }

    // Mark as running
    this.syncStatus.set(scopeId, { ...status, isRunning: true });

    try {
      console.log(`Starting JIRA sync for scope: ${scopeId}`);
      
      // Load scope settings
      const scopeSettings = await ScopeSettingsService.get(scopeId);
      if (!scopeSettings?.jira?.apiToken || !scopeSettings?.jira?.baseUrl) {
        throw new Error('JIRA není nakonfigurováno');
      }

      const jiraConfig = {
        baseUrl: scopeSettings.jira.baseUrl || undefined,
        email: scopeSettings.jira.email || undefined,
        apiToken: scopeSettings.jira.apiToken || undefined
      };

      // Get user mappings
      const userMappings = (scopeSettings as any).jiraUserMappings || {};
      const projectMappings = (scopeSettings as any).jiraProjectMappings || {};

      if (Object.keys(userMappings).length === 0) {
        throw new Error('Nejsou namapováni žádní uživatelé');
      }

      if (Object.keys(projectMappings).length === 0) {
        throw new Error('Nejsou namapovány žádné projekty');
      }

      // Calculate date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      let worklogsImported = 0;
      const errors: string[] = [];

      // Sync worklogs for each mapped user
      for (const [teamMemberId, jiraUser] of Object.entries(userMappings)) {
        try {
          const jiraUserObj = jiraUser as any;
          const jql = `worklogAuthor = "${jiraUserObj.accountId}" AND worklogDate >= "${startDate.toISOString().split('T')[0]}" AND worklogDate <= "${endDate.toISOString().split('T')[0]}"`;
          const worklogs = await JiraService.fetchWorklogsWithConfig(
            jiraConfig,
            jql,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          );

          // Import worklogs for each project mapping
          for (const [projectId, jiraMapping] of Object.entries(projectMappings)) {
            const jiraMappingObj = jiraMapping as any;
            let projectWorklogs = worklogs.filter(w => 
              w.projectKey === jiraMappingObj.jiraProjectKey
            );

            // Filter by epic or issue if specified
            if (jiraMappingObj.mappingType === 'epic' && jiraMappingObj.jiraEpicKey) {
              // For epic mapping, we need to fetch issues in that epic first
              // This is a simplified approach - in reality, you might need to fetch epic issues
              projectWorklogs = projectWorklogs.filter(w => {
                // This would need to be enhanced to check if issue belongs to epic
                // For now, we'll import all worklogs from the project
                return true;
              });
            } else if (jiraMappingObj.mappingType === 'issue' && jiraMappingObj.jiraIssueKey) {
              // For issue mapping, only import worklogs for that specific issue
              projectWorklogs = projectWorklogs.filter(w => 
                w.issueKey === jiraMappingObj.jiraIssueKey
              );
            }

            for (const worklog of projectWorklogs) {
              try {
                const timesheetService = new TimesheetService();
                await timesheetService.createTimesheet({
                  memberId: teamMemberId,
                  projectId: projectId,
                  scopeId: scopeId,
                  date: new Date(worklog.date),
                  hours: worklog.hours,
                  role: 'developer', // Default role, can be enhanced later
                  description: this.extractWorklogDescription(worklog.comment),
                  jiraIssueKey: worklog.issueKey,
                  jiraWorklogId: worklog.worklogId || worklog.issueKey // Use actual worklogId if available
                });
                worklogsImported++;
              } catch (error) {
                errors.push(`Chyba při importu worklogu ${worklog.issueKey}: ${error}`);
              }
            }
          }
        } catch (error) {
          const jiraUserObj = jiraUser as any;
          errors.push(`Chyba při synchronizaci uživatele ${jiraUserObj.displayName}: ${error}`);
        }
      }

      const result: SyncResult = {
        success: errors.length === 0,
        message: `Synchronizace dokončena. Importováno ${worklogsImported} výkazů.`,
        worklogsImported,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date()
      };

      // Update status
      this.syncStatus.set(scopeId, {
        isRunning: false,
        lastSync: new Date(),
        lastResult: result,
        nextScheduledSync: this.calculateNextSync()
      });

      console.log(`JIRA sync completed for scope: ${scopeId}`, result);
      return result;

    } catch (error) {
      const result: SyncResult = {
        success: false,
        message: `Chyba při synchronizaci: ${error}`,
        timestamp: new Date()
      };

      // Update status
      this.syncStatus.set(scopeId, {
        isRunning: false,
        lastSync: new Date(),
        lastResult: result,
        nextScheduledSync: this.calculateNextSync()
      });

      console.error(`JIRA sync failed for scope: ${scopeId}`, error);
      return result;
    }
  }

  /**
   * Start automatic synchronization for a scope
   */
  public startAutoSync(scopeId: string): void {
    // Stop existing sync if running
    this.stopAutoSync(scopeId);

    // Calculate next sync time (midnight)
    const nextSync = this.calculateNextSync();
    
    // Update status
    const status = this.getSyncStatus(scopeId);
    this.syncStatus.set(scopeId, {
      ...status,
      nextScheduledSync: nextSync
    });

    // Schedule sync
    const timeUntilMidnight = nextSync.getTime() - Date.now();
    const interval = setTimeout(() => {
      this.syncScope(scopeId);
      // Schedule next sync (24 hours later)
      this.scheduleNextSync(scopeId);
    }, timeUntilMidnight);

    this.syncIntervals.set(scopeId, interval);
    console.log(`Auto sync scheduled for scope: ${scopeId} at ${nextSync}`);
  }

  /**
   * Stop automatic synchronization for a scope
   */
  public stopAutoSync(scopeId: string): void {
    const interval = this.syncIntervals.get(scopeId);
    if (interval) {
      clearTimeout(interval);
      this.syncIntervals.delete(scopeId);
    }

    // Update status
    const status = this.getSyncStatus(scopeId);
    this.syncStatus.set(scopeId, {
      ...status,
      nextScheduledSync: undefined
    });

    console.log(`Auto sync stopped for scope: ${scopeId}`);
  }

  /**
   * Schedule next sync (24 hours from now)
   */
  private scheduleNextSync(scopeId: string): void {
    const nextSync = new Date();
    nextSync.setDate(nextSync.getDate() + 1);
    nextSync.setHours(0, 0, 0, 0);

    const interval = setTimeout(() => {
      this.syncScope(scopeId);
      this.scheduleNextSync(scopeId);
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.syncIntervals.set(scopeId, interval);

    // Update status
    const status = this.getSyncStatus(scopeId);
    this.syncStatus.set(scopeId, {
      ...status,
      nextScheduledSync: nextSync
    });
  }

  /**
   * Calculate next sync time (midnight)
   */
  private calculateNextSync(): Date {
    const nextSync = new Date();
    nextSync.setDate(nextSync.getDate() + 1);
    nextSync.setHours(0, 0, 0, 0);
    return nextSync;
  }

  /**
   * Extract text from JIRA worklog comment (JSON format)
   */
  private extractWorklogDescription(comment: unknown): string {
    if (!comment) return '';
    
    if (typeof comment === 'string') {
      return comment;
    }

    if (typeof comment === 'object' && comment !== null) {
      const commentObj = comment as Record<string, unknown>;
      if (commentObj.content && Array.isArray(commentObj.content)) {
        return commentObj.content
          .map((item: unknown) => {
            if (typeof item === 'object' && item !== null) {
              const itemObj = item as Record<string, unknown>;
              if (itemObj.type === 'text') {
                return (itemObj.text as string) || '';
              }
              if (itemObj.content && Array.isArray(itemObj.content)) {
                return itemObj.content
                  .map((subItem: unknown) => {
                    if (typeof subItem === 'object' && subItem !== null) {
                      const subItemObj = subItem as Record<string, unknown>;
                      return (subItemObj.text as string) || '';
                    }
                    return '';
                  })
                  .join('');
              }
            }
            return '';
          })
          .join(' ')
          .trim();
      }
    }

    return '';
  }
}

// Export singleton instance
export const jiraSyncService = JiraSyncService.getInstance();
