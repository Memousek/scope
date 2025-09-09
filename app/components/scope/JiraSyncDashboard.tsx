/**
 * JiraSyncDashboard
 * Dashboard pro monitoring a správu JIRA synchronizace
 * Zobrazuje stav mapování, poslední sync, chyby a statistiky
 */

import React, { useState } from 'react';
// import { useTranslation } from '@/lib/translation'; // Unused for now
import { TeamMember, Project } from './types';
// import { JiraUser, JiraProject, JiraService } from '@/lib/services/jiraService'; // Unused for now
// import { TimesheetService } from '@/lib/domain/services/timesheet-service'; // Unused for now
// import { ScopeSettingsService } from '@/app/services/scopeSettingsService'; // Unused for now
// import { useToastFunctions } from '@/app/components/ui/Toast'; // Unused for now
import { 
  FiRefreshCw, 
  FiUsers, 
  FiFolder, 
  FiClock, 
  FiAlertTriangle,
  FiSettings,
  FiDownload,
  FiTrendingUp,
} from 'react-icons/fi';

interface SyncStats {
  totalJiraUsers: number;
  mappedUsers: number;
  unmappedUsers: number;
  totalProjects: number;
  mappedProjects: number;
  lastSyncDate?: Date;
  totalImportedHours: number;
  lastWeekHours: number;
  syncErrors: string[];
}

interface JiraSyncDashboardProps {
  scopeId: string;
  team: TeamMember[];
  projects: Project[];
  onUserMappingClick?: () => void;
  onProjectMappingClick?: () => void;
  onImportClick?: () => void;
}

export function JiraSyncDashboard({ 
  // scopeId, // Unused for now
  // team, // Unused for now
  // projects, // Unused for now
  onUserMappingClick,
  onProjectMappingClick,
  onImportClick 
}: JiraSyncDashboardProps) {
  // const { t } = useTranslation(); // Unused for now
  // const toast = useToastFunctions(); // Unused for now
  
  // const [jiraUsers, setJiraUsers] = useState<JiraUser[]>([]); // Unused for now
  // const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]); // Unused for now
  // const [userMappings, setUserMappings] = useState<Record<string, string>>({}); // Unused for now
  const [syncStats] = useState<SyncStats>({
    totalJiraUsers: 0,
    mappedUsers: 0,
    unmappedUsers: 0,
    totalProjects: 0,
    mappedProjects: 0,
    totalImportedHours: 0,
    lastWeekHours: 0,
    syncErrors: []
  });
  
  // const [loading, setLoading] = useState(false); // Unused for now
  // const [error, setError] = useState<string | null>(null); // Unused for now

  // Load JIRA data and mappings
  // useEffect(() => {
  //   loadJiraData();
  // }, [scopeId]); // Disabled for now due to unused variables

  /* const loadJiraData = async () => { // Disabled for now due to unused variables
    setLoading(true);
    setError(null);
    
    try {
      // Validate scopeId
      if (!scopeId) {
        setError('Chybějící scopeId');
        return;
      }
      
      // Load JIRA config
      let settings;
      try {
        settings = await ScopeSettingsService.get(scopeId);
      } catch (scopeError) {
        console.error('ScopeSettingsService.get failed:', scopeError);
        setError('Nepodařilo se načíst nastavení scope. Zkontrolujte připojení k databázi.');
        return;
      }
      
      if (!settings) {
        setError('Nepodařilo se načíst nastavení scope. Zkontrolujte, zda scope existuje.');
        return;
      }
      
      const jiraConfig = settings.jira || {};
      
      if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
        setError('JIRA není nakonfigurováno. Prosím nastavte JIRA v nastavení scope.');
        return;
      }

      // Load user mappings
      const mappings = settings?.jiraUserMappings || [];
      const mappingObj: Record<string, string> = {};
      if (Array.isArray(mappings)) {
        mappings.forEach((mapping: any) => {
          mappingObj[mapping.jiraAccountId] = mapping.teamMemberId;
        });
      }
      setUserMappings(mappingObj);

      // Load JIRA users and projects
      let users, jiraProjects;
      try {
        console.log('JIRA Config being used:', {
          baseUrl: jiraConfig.baseUrl,
          email: jiraConfig.email,
          hasApiToken: !!jiraConfig.apiToken
        });
        
        [users, jiraProjects] = await Promise.all([
          JiraService.fetchUsers({
            baseUrl: jiraConfig.baseUrl || undefined,
            email: jiraConfig.email || undefined,
            apiToken: jiraConfig.apiToken || undefined
          }),
          JiraService.fetchProjects({
            baseUrl: jiraConfig.baseUrl || undefined,
            email: jiraConfig.email || undefined,
            apiToken: jiraConfig.apiToken || undefined
          })
        ]);
      } catch (jiraError) {
        console.error('JIRA API call failed:', jiraError);
        
        // Check for specific errors
        if (jiraError instanceof Error && jiraError.message.includes('error.no-permission')) {
          setError('JIRA API token nemá dostatečná oprávnění. Prosím zkontrolujte, zda má uživatel oprávnění k prohlížení uživatelů a projektů v JIRA.');
        } else if (jiraError instanceof Error && jiraError.message.includes('GDPR')) {
          setError('JIRA instance má zapnutý GDPR strict mode, který blokuje některé API endpointy. Zkuste použít jiný JIRA endpoint nebo kontaktujte administrátora JIRA.');
        } else {
          setError('Nepodařilo se načíst data z JIRA. Zkontrolujte JIRA konfiguraci a připojení.');
        }
        return;
      }
      
      setJiraUsers(users);
      setJiraProjects(jiraProjects);
      
      // Calculate sync stats
      try {
        await calculateSyncStats(users, jiraProjects, mappingObj, settings);
      } catch (statsError) {
        console.error('Failed to calculate sync stats:', statsError);
        // Don't fail the entire operation, just log the error
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se načíst JIRA data';
      setError(errorMessage);
      console.error('Failed to load JIRA data:', err);
      console.error('ScopeId:', scopeId);
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
    } finally {
      setLoading(false);
    }
  }; */

  /* const calculateSyncStats = async ( // Disabled for now due to unused variables
    users: JiraUser[], 
    jiraProjects: JiraProject[], 
    mappings: Record<string, string>,
    settings: unknown
  ) => {
    try {
      const timesheetService = new TimesheetService();
      
      // Get timesheet data for stats
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      
      const [allTimesheets, lastWeekTimesheets] = await Promise.all([
        timesheetService.getTimesheetsByScope(scopeId, startOfYear, now),
        timesheetService.getTimesheetsByScope(scopeId, lastWeek, now)
      ]);
      
      // Calculate project mappings from scope settings
      const mappedProjectKeys = new Set<string>();
      const settingsData = settings as any;
      const projectMappings = settingsData?.jiraProjectMappings || [];
      if (Array.isArray(projectMappings)) {
        projectMappings.forEach((mapping: any) => {
          if (mapping.jiraProjectKey && mapping.localProjectId) {
            mappedProjectKeys.add(mapping.jiraProjectKey);
          }
        });
      }
      
      // Calculate imported hours
      const jiraTimesheets = allTimesheets.filter(t => t.jiraIssueKey);
      const totalImportedHours = jiraTimesheets.reduce((sum, t) => sum + t.hours, 0);
      
      const jiraLastWeekTimesheets = lastWeekTimesheets.filter(t => t.jiraIssueKey);
      const lastWeekHours = jiraLastWeekTimesheets.reduce((sum, t) => sum + t.hours, 0);
      
      setSyncStats({
        totalJiraUsers: users.length,
        mappedUsers: Object.keys(mappings).length,
        unmappedUsers: users.length - Object.keys(mappings).length,
        totalProjects: jiraProjects.length,
        mappedProjects: mappedProjectKeys.size,
        totalImportedHours,
        lastWeekHours,
        syncErrors: []
      });
      
    } catch (err) {
      console.error('Failed to calculate sync stats:', err);
    }
  }; */

  // const mappedUsers = useMemo(() => {
  //   return jiraUsers.filter(user => userMappings[user.accountId]);
  // }, [jiraUsers, userMappings]);

  // const unmappedUsers = useMemo(() => {
  //   return jiraUsers.filter(user => !userMappings[user.accountId]);
  // }, [jiraUsers, userMappings]);

  // const mappedProjects = useMemo(() => {
  //   return jiraProjects.filter(jiraProject => {
  //     return projects.some(p => 
  //       p.name.toLowerCase().includes(jiraProject.key.toLowerCase()) ||
  //       jiraProject.key.toLowerCase().includes(p.name.toLowerCase())
  //     );
  //   });
  // }, [jiraProjects, projects]);

  if (false) { // loading disabled for now
    return (
      <div className="flex items-center justify-center py-12">
        <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Načítání JIRA dat...</span>
      </div>
    );
  }

  if (false) { // error disabled for now
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
          <FiAlertTriangle className="w-6 h-6" />
          <div>
            <div className="font-medium">Chyba při načítání JIRA dat</div>
            <div className="text-sm">Chyba při načítání</div>
          </div>
        </div>
        <button
          onClick={() => {/* loadJiraData() */}}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Zkusit znovu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            JIRA Synchronizace
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitoring a správa synchronizace s JIRA
          </p>
        </div>
        <button
          onClick={() => {/* loadJiraData() */}}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Obnovit
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uživatelé</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStats.mappedUsers}/{syncStats.totalJiraUsers}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {syncStats.unmappedUsers} nepropojeno
              </p>
            </div>
            <FiUsers className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Projekty</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStats.mappedProjects}/{syncStats.totalProjects}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Automaticky mapováno
              </p>
            </div>
            <FiFolder className="w-8 h-8 text-green-600" />
          </div>
        </div>

        {/* Total Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Importované hodiny</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStats.totalImportedHours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Celkem z JIRA
              </p>
            </div>
            <FiClock className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        {/* Last Week */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Poslední týden</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {syncStats.lastWeekHours.toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Nové hodiny
              </p>
            </div>
            <FiTrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Mapping */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FiSettings className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mapování uživatelů
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Propojte JIRA uživatele s členy týmu pro automatickou synchronizaci.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Propojeno:</span>
              <span className="font-medium text-green-600">{syncStats.mappedUsers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Nepropojeno:</span>
              <span className="font-medium text-red-600">{syncStats.unmappedUsers}</span>
            </div>
          </div>
          <button
            onClick={onUserMappingClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiSettings className="w-4 h-4" />
            Spravovat mapování
          </button>
        </div>

        {/* Project Mapping */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FiFolder className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mapování projektů
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Propojte JIRA projekty s lokálními projekty pro správné přiřazení worklogů.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Propojeno:</span>
              <span className="font-medium text-green-600">{syncStats.mappedProjects}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Nepropojeno:</span>
              <span className="font-medium text-red-600">{syncStats.totalProjects - syncStats.mappedProjects}</span>
            </div>
          </div>
          <button
            onClick={onProjectMappingClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FiSettings className="w-4 h-4" />
            Spravovat mapování projektů
          </button>
        </div>

        {/* Import */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <FiDownload className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Import worklogů
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Importujte worklogy z JIRA do timesheet systému.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Poslední import:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {syncStats.lastSyncDate ? syncStats.lastSyncDate.toLocaleDateString('cs-CZ') : 'Nikdy'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Celkem hodin:</span>
              <span className="font-medium text-emerald-600">{syncStats.totalImportedHours.toFixed(1)}h</span>
            </div>
          </div>
          <button
            onClick={onImportClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FiDownload className="w-4 h-4" />
            Importovat z JIRA
          </button>
        </div>
      </div>
    </div>
  );
}
