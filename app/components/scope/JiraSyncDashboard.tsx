/**
 * JiraSyncDashboard
 * Dashboard pro monitoring a správu JIRA synchronizace
 * Zobrazuje stav mapování, poslední sync, chyby a statistiky
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/translation';
import { TeamMember, Project } from './types';
import { JiraUser, JiraProject, JiraService } from '@/lib/services/jiraService';
import { TimesheetService } from '@/lib/domain/services/timesheet-service';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { useToastFunctions } from '@/app/components/ui/Toast';
import { 
  FiRefreshCw, 
  FiUsers, 
  FiFolder, 
  FiClock, 
  FiAlertTriangle,
  FiSettings,
  FiDownload,
  FiTrendingUp,
  FiPlay,
  FiPause,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
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

interface SyncStatus {
  isRunning: boolean;
  lastSync?: Date;
  lastResult?: {
    success: boolean;
    message: string;
    worklogsImported?: number;
    errors?: string[];
    timestamp: Date;
  };
  nextScheduledSync?: Date;
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
  scopeId, 
  team,
  projects,
  onUserMappingClick,
  onProjectMappingClick,
  onImportClick 
}: JiraSyncDashboardProps) {
  console.log('JiraSyncDashboard: Component mounted with scopeId:', scopeId);
  const { t } = useTranslation();
  const toast = useToastFunctions();
  
  const [jiraUsers, setJiraUsers] = useState<JiraUser[]>([]);
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [userMappings, setUserMappings] = useState<Record<string, string>>({});
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalJiraUsers: 0,
    mappedUsers: 0,
    unmappedUsers: 0,
    totalProjects: 0,
    mappedProjects: 0,
    totalImportedHours: 0,
    lastWeekHours: 0,
    syncErrors: []
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isRunning: false,
    lastSync: undefined,
    lastResult: undefined,
    nextScheduledSync: undefined
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load JIRA data and mappings
  useEffect(() => {
    console.log('JiraSyncDashboard: useEffect called with scopeId:', scopeId);
    if (scopeId) {
      loadJiraData();
      loadSyncStatus();
    }
  }, [scopeId]);

  // Load sync status
  const loadSyncStatus = async () => {
    try {
      const response = await fetch(`/api/jira/sync?scopeId=${scopeId}`);
      if (response.ok) {
        const status = await response.json();
        setSyncStatus(status);
        setAutoSyncEnabled(!!status.nextScheduledSync);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  // Manual sync
  const handleManualSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isRunning: true }));
      
      const response = await fetch('/api/jira/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeId, action: 'sync' })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Synchronizace dokončena', result.message);
        setSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          lastSync: new Date(),
          lastResult: result
        }));
        // Reload data after successful sync
        loadJiraData();
      } else {
        toast.error('Chyba při synchronizaci', result.message);
        setSyncStatus(prev => ({
          ...prev,
          isRunning: false,
          lastResult: result
        }));
      }
    } catch (error) {
      toast.error('Chyba při synchronizaci', 'Nepodařilo se synchronizovat data');
      setSyncStatus(prev => ({
        ...prev,
        isRunning: false,
        lastResult: {
          success: false,
          message: 'Chyba při synchronizaci',
          timestamp: new Date()
        }
      }));
    }
  };

  // Toggle auto sync
  const handleToggleAutoSync = async () => {
    try {
      const action = autoSyncEnabled ? 'stop-auto-sync' : 'start-auto-sync';
      
      const response = await fetch('/api/jira/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeId, action })
      });

      const result = await response.json();
      
      if (result.success) {
        setAutoSyncEnabled(!autoSyncEnabled);
        toast.success('Automatická synchronizace', result.message);
        loadSyncStatus(); // Reload status
      } else {
        toast.error('Chyba při změně automatické synchronizace', result.message);
      }
    } catch (error) {
      toast.error('Chyba při změně automatické synchronizace', 'Nepodařilo se změnit nastavení automatické synchronizace');
    }
  }; // eslint-disable-line react-hooks/exhaustive-deps

  const loadJiraData = async () => {
    console.log('JiraSyncDashboard: loadJiraData called with scopeId:', scopeId);
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
  };

  const calculateSyncStats = async (
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
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Načítání JIRA dat...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
          <FiAlertTriangle className="w-6 h-6" />
          <div>
            <div className="font-medium">Chyba při načítání JIRA dat</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
        <button
          onClick={loadJiraData}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          Zkusit znovu
        </button>
      </div>
    );
  }

  console.log('JiraSyncDashboard: Rendering dashboard with loading:', loading, 'error:', error);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <h2 className="text-2xl font-bold dark:text-white text-gray-900">
              <FiDownload className="inline mr-2" /> {t('jiraSync')}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
            <span>{t('jiraSyncDescription')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-col md:flex-row">
          <button
            onClick={loadJiraData}
            className="bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Obnovit
          </button>
          <button
            onClick={handleManualSync}
            disabled={syncStatus.isRunning}
            className="relative group bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            <span className="relative z-10 flex items-center gap-2">
              {syncStatus.isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('jiraSyncManualRunning')}
                </>
              ) : (
                <>
                  <FiDownload className="w-4 h-4" />
                  {t('jiraSyncManual')}
                </>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Users */}
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <FiUsers className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Uživatelé
                </p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {syncStats.mappedUsers}/{syncStats.totalJiraUsers}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {syncStats.unmappedUsers} nepropojeno
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/10">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <FiFolder className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Projekty
                </p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {syncStats.mappedProjects}/{syncStats.totalProjects}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Automaticky mapováno
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Total Hours */}
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FiClock className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Importované hodiny
                </p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {syncStats.totalImportedHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Celkem z JIRA
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Last Week */}
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10">
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <FiTrendingUp className="text-white text-xl" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Poslední týden
                </p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {syncStats.lastWeekHours.toFixed(1)}h
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Nové hodiny
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* User Mapping */}
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <FiSettings className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mapování uživatelů
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Propojte JIRA uživatele s členy týmu
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
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
              className="w-full relative group bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                <FiSettings className="w-4 h-4" />
                Spravovat mapování
              </span>
            </button>
          </div>
        </div>

        {/* Project Mapping */}
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/10">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <FiFolder className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Mapování projektů
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Propojte JIRA projekty s lokálními projekty
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
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
              className="w-full relative group bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                <FiFolder className="w-4 h-4" />
                Spravovat mapování projektů
              </span>
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FiDownload className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Import worklogů
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Importujte worklogy z JIRA do timesheet systému
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
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
              className="w-full relative group bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center gap-2">
                <FiDownload className="w-4 h-4" />
                Importovat z JIRA
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <FiClock className="text-white text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('jiraSyncStatus')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stav automatické synchronizace
              </p>
            </div>
          </div>
        
        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">{t('status')}:</span>
            <div className="flex items-center gap-2">
              {syncStatus.isRunning ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-blue-600 font-medium">{t('jiraSyncStatusRunning')}</span>
                </>
              ) : syncStatus.lastResult ? (
                <>
                  {syncStatus.lastResult.success ? (
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <FiXCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`font-medium ${syncStatus.lastResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {syncStatus.lastResult.success ? t('jiraSyncStatusSuccess') : t('jiraSyncStatusError')}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">{t('jiraSyncStatusNone')}</span>
              )}
            </div>
          </div>

          {/* Last Sync */}
          {syncStatus.lastSync && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('jiraSyncLastSync')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(syncStatus.lastSync).toLocaleString('cs-CZ')}
              </span>
            </div>
          )}

          {/* Next Scheduled Sync */}
          {syncStatus.nextScheduledSync && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('jiraSyncNextSync')}:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {new Date(syncStatus.nextScheduledSync).toLocaleString('cs-CZ')}
              </span>
            </div>
          )}

          {/* Last Result */}
          {syncStatus.lastResult && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">{t('jiraSyncResult')}:</span>
              <span className={`font-medium ${syncStatus.lastResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {syncStatus.lastResult.message}
              </span>
            </div>
          )}

          {/* Auto Sync Toggle */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
            <div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">{t('jiraSyncAutoSync')}:</span>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {t('jiraSyncAutoDescription')}
              </p>
            </div>
            <button
              onClick={handleToggleAutoSync}
              className={`relative group px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl active:scale-95 flex items-center gap-2 ${
                autoSyncEnabled
                  ? 'bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-white hover:shadow-red-500/25'
                  : 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white hover:shadow-green-500/25'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {autoSyncEnabled ? (
                  <>
                    <FiPause className="w-4 h-4" />
                    {t('jiraSyncAutoStop')}
                  </>
                ) : (
                  <>
                    <FiPlay className="w-4 h-4" />
                    {t('jiraSyncAutoStart')}
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
