/**
 * JiraImportModalV2
 * Nová verze JIRA import modalu s podporou nové databázové struktury
 * Automatické mapování uživatelů, projektů a rolí
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/app/components/ui/Modal';
// import { useTranslation } from '@/lib/translation'; // Unused for now
import { TeamMember, Project } from './types';
import { JiraUser, JiraProject, JiraService } from '@/lib/services/jiraService';
import { TimesheetService } from '@/lib/domain/services/timesheet-service';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { useToastFunctions } from '@/app/components/ui/Toast';
import { 
  FiDownload, 
  FiUsers, 
  FiFolder, 
  FiClock, 
  FiCheck, 
  FiAlertTriangle,
  FiRefreshCw,
  FiSettings
} from 'react-icons/fi';

interface JiraImportData {
  worklogs: unknown[];
  users: JiraUser[];
  projects: JiraProject[];
}

interface ImportPreview {
  totalWorklogs: number;
  mappedUsers: number;
  unmappedUsers: string[];
  projectMappings: Record<string, string>;
  estimatedHours: number;
  dateRange: { from: string; to: string };
}

interface JiraImportModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  team: TeamMember[];
  projects: Project[];
  scopeId: string;
  onImportComplete?: () => void;
}

export function JiraImportModalV2({ 
  isOpen, 
  onClose, 
  team, 
  projects, 
  scopeId, 
  onImportComplete 
}: JiraImportModalV2Props) {
  // const { t } = useTranslation(); // Unused for now
  const toast = useToastFunctions();
  
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [jql, setJql] = useState<string>('');
  const [projectKey, setProjectKey] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [jiraData, setJiraData] = useState<JiraImportData | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [userMappings, setUserMappings] = useState<Record<string, string>>({});
  const [projectMappings, setProjectMappings] = useState<Record<string, string>>({});
  const [mappedProjects, setMappedProjects] = useState<Array<{jiraKey: string, jiraName: string, localId: string, localName: string}>>([]);
  
  // const [showUserMapping, setShowUserMapping] = useState(false); // Unused for now

  // Load user and project mappings from scope settings
  useEffect(() => {
    if (isOpen) {
      loadMappings();
    }
  }, [isOpen, scopeId]);

  const loadMappings = async () => {
    try {
      const settings = await ScopeSettingsService.get(scopeId);
      
      // Load user mappings
      const userMappings = settings?.jiraUserMappings || [];
      const userMappingObj: Record<string, string> = {};
      if (Array.isArray(userMappings)) {
        userMappings.forEach((mapping: any) => {
          userMappingObj[mapping.jiraAccountId] = mapping.teamMemberId;
        });
      }
      setUserMappings(userMappingObj);
      
      // Load project mappings
      const projectMappings = settings?.jiraProjectMappings || [];
      const projectMappingObj: Record<string, string> = {};
      const mappedProjectsList: Array<{jiraKey: string, jiraName: string, localId: string, localName: string}> = [];
      
      if (Array.isArray(projectMappings)) {
        projectMappings.forEach((mapping: any) => {
          if (mapping.jiraProjectKey && mapping.localProjectId) {
            projectMappingObj[mapping.jiraProjectKey] = mapping.localProjectId;
            
            // Find local project name
            const localProject = projects.find(p => p.id === mapping.localProjectId);
            if (localProject) {
              mappedProjectsList.push({
                jiraKey: mapping.jiraProjectKey,
                jiraName: mapping.jiraProjectName || mapping.jiraProjectKey,
                localId: mapping.localProjectId,
                localName: localProject.name
              });
            }
          }
        });
      }
      setProjectMappings(projectMappingObj);
      setMappedProjects(mappedProjectsList);
      
    } catch (err) {
      console.warn('Failed to load mappings:', err);
    }
  };

  const previewImport = async () => {
    if (!from || !to) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get JIRA config
      const settings = await ScopeSettingsService.get(scopeId);
      const jiraConfig = settings?.jira || {};
      
      if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
        throw new Error('JIRA není nakonfigurováno. Prosím nastavte JIRA v nastavení scope.');
      }

      const baseJql = jql || (projectKey ? `project = ${projectKey}` : '');
      const data = await JiraService.fetchWorklogsWithUsers({
        baseUrl: jiraConfig.baseUrl || undefined,
        email: jiraConfig.email || undefined,
        apiToken: jiraConfig.apiToken || undefined
      }, baseJql, from, to);
      
      setJiraData(data);
      
      // Create preview
      const preview: ImportPreview = {
        totalWorklogs: data.worklogs.length,
        mappedUsers: 0,
        unmappedUsers: [],
        projectMappings: {},
        estimatedHours: 0,
        dateRange: { from, to }
      };
      
      // Analyze worklogs
      const userStats = new Map<string, { count: number; hours: number }>();
      const projectStats = new Map<string, number>();
      
      data.worklogs.forEach(worklog => {
        // User stats
        const userKey = worklog.authorAccountId;
        const current = userStats.get(userKey) || { count: 0, hours: 0 };
        current.count++;
        current.hours += worklog.hours;
        userStats.set(userKey, current);
        
        // Project stats
        const projectKey = worklog.projectKey || 'Unknown';
        projectStats.set(projectKey, (projectStats.get(projectKey) || 0) + worklog.hours);
        
        preview.estimatedHours += worklog.hours;
      });
      
      // Check user mappings
      userStats.forEach((stats, accountId) => {
        if (userMappings[accountId]) {
          preview.mappedUsers++;
        } else {
          const user = data.users.find(u => u.accountId === accountId);
          if (user) {
            preview.unmappedUsers.push(user.displayName);
          }
        }
      });
      
      // Auto-map projects (only if not already mapped)
      projectStats.forEach((hours, jiraProjectKey) => {
        // Skip if already mapped
        if (projectMappings[jiraProjectKey]) {
          preview.projectMappings[jiraProjectKey] = projectMappings[jiraProjectKey];
          return;
        }
        
        // Try to auto-map
        const localProject = projects.find(p => 
          p.name.toLowerCase().includes(jiraProjectKey.toLowerCase()) ||
          jiraProjectKey.toLowerCase().includes(p.name.toLowerCase())
        );
        
        if (localProject) {
          preview.projectMappings[jiraProjectKey] = localProject.id;
          setProjectMappings(prev => ({
            ...prev,
            [jiraProjectKey]: localProject.id
          }));
        }
      });
      
      setPreview(preview);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se načíst data z JIRA';
      setError(errorMessage);
      toast.error('Chyba při načítání', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    if (!jiraData || !preview) return;
    
    setImporting(true);
    
    try {
      const timesheetService = new TimesheetService();
      const timesheetData: any[] = [];
      
      for (const worklog of jiraData.worklogs) {
        const worklogData = worklog as any;
        const teamMemberId = userMappings[worklogData.authorAccountId];
        if (!teamMemberId) continue; // Skip unmapped users
        
        const projectId = projectMappings[worklogData.projectKey || ''] || projects[0]?.id;
        if (!projectId) continue; // Skip if no project mapping
        
        const teamMember = team.find(m => m.id === teamMemberId);
        if (!teamMember) continue;
        
        timesheetData.push({
          memberId: teamMemberId,
          projectId: projectId,
          scopeId: scopeId,
          date: new Date(worklogData.date),
          hours: worklogData.hours,
          role: teamMember.role || 'Unknown',
          description: worklogData.comment || `JIRA: ${worklogData.issueKey}`,
          jiraIssueKey: worklogData.issueKey,
          jiraWorklogId: worklogData.authorAccountId
        });
      }
      
      if (timesheetData.length > 0) {
        // Create timesheet entries one by one
        let successCount = 0;
        for (const data of timesheetData) {
          try {
            await timesheetService.createTimesheet(data);
            successCount++;
          } catch (error) {
            console.warn('Failed to create timesheet entry:', error);
            // Continue with other entries
          }
        }
        
        if (successCount > 0) {
          toast.success('Import dokončen', `${successCount} timesheet záznamů bylo úspěšně importováno z JIRA.`);
          onImportComplete?.();
          onClose();
        } else {
          toast.error('Import selhal', 'Nepodařilo se importovat žádné timesheet záznamy.');
        }
      } else {
        toast.error('Žádná data', 'Nebyla nalezena žádná data k importu. Zkontrolujte mapování uživatelů.');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se importovat data';
      toast.error('Chyba při importu', errorMessage);
    } finally {
      setImporting(false);
    }
  };

  /* const updateProjectMapping = (jiraProjectKey: string, projectId: string) => { // Unused for now
    setProjectMappings(prev => ({
      ...prev,
      [jiraProjectKey]: projectId
    }));
  }; */

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="JIRA Import" 
      description="Import worklogů z JIRA s automatickým mapováním"
    >
      <div className="space-y-6 bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-800/90 dark:via-gray-800/70 dark:to-gray-800/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-xl p-6">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Od data
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Do data
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                JIRA Projekt
              </label>
              {mappedProjects.length > 0 ? (
                <select
                  value={projectKey}
                  onChange={(e) => {
                    setProjectKey(e.target.value);
                    setJql(''); // Clear JQL when selecting project
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Vyberte projekt...</option>
                  {mappedProjects.map(project => (
                    <option key={project.jiraKey} value={project.jiraKey}>
                      {project.jiraName} ({project.jiraKey}) → {project.localName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Žádné namapované projekty. Nejdříve namapujte projekty v mapování projektů.
                  </div>
                  <button
                    onClick={() => {
                      // This will be handled by parent component
                      onClose();
                      // Trigger project mapping modal
                      window.dispatchEvent(new CustomEvent('openProjectMapping'));
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    Otevřít mapování projektů
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vlastní JQL (volitelné)
              </label>
              <input
                type="text"
                placeholder="project = KEY AND status = Done"
                value={jql}
                onChange={(e) => {
                  setJql(e.target.value);
                  if (e.target.value) setProjectKey(''); // Clear project when typing JQL
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Pokud vyplníte JQL, bude použito místo vybraného projektu
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={previewImport}
              disabled={loading || !from || !to}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <FiRefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FiDownload className="w-4 h-4" />
              )}
              Náhled importu
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <FiAlertTriangle className="w-5 h-5" />
              <span className="font-medium">Chyba:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">Náhled importu</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-blue-900 dark:text-blue-100">
                      {preview.totalWorklogs}
                    </div>
                    <div className="text-blue-700 dark:text-blue-300">Worklogů</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      {preview.mappedUsers}
                    </div>
                    <div className="text-green-700 dark:text-green-300">Mapovaných uživatelů</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FiFolder className="w-4 h-4 text-purple-600" />
                  <div>
                    <div className="font-medium text-purple-900 dark:text-purple-100">
                      {Object.keys(preview.projectMappings).length}
                    </div>
                    <div className="text-purple-700 dark:text-purple-300">Mapovaných projektů</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <FiCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-emerald-900 dark:text-emerald-100">
                      {preview.estimatedHours.toFixed(1)}h
                    </div>
                    <div className="text-emerald-700 dark:text-emerald-300">Celkem hodin</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Unmapped users warning */}
            {preview.unmappedUsers.length > 0 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
                  <FiAlertTriangle className="w-5 h-5" />
                  <span className="font-medium">Nepropojení uživatelé:</span>
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                  {preview.unmappedUsers.join(', ')}
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  Tyto uživatele nebudou importováni. Propojte je v mapování uživatelů.
                </div>
              </div>
            )}

            {/* Project mappings */}
            {Object.keys(preview.projectMappings).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">Mapování projektů:</h4>
                <div className="space-y-2">
                  {Object.entries(preview.projectMappings).map(([jiraKey, projectId]) => {
                    const project = projects.find(p => p.id === projectId);
                    return (
                      <div key={jiraKey} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {jiraKey}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          → {project?.name || 'Neznámý projekt'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Import button */}
            <div className="flex justify-end">
              <button
                onClick={executeImport}
                disabled={importing || preview.mappedUsers === 0}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {importing ? (
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FiDownload className="w-4 h-4" />
                )}
                Importovat ({preview.mappedUsers} uživatelů)
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Zrušit
          </button>
        </div>
      </div>
    </Modal>
  );
}
