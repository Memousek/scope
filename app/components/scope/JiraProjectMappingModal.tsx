/**
 * JiraProjectMappingModal
 * Komponenta pro propojení JIRA projektů s lokálními projekty
 * Umožňuje mapovat JIRA projectKey na lokální project ID
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/app/components/ui/Modal';
// import { useTranslation } from '@/lib/translation'; // Unused for now
import { Project } from './types';
import { JiraService, JiraProject, JiraIssue } from '@/lib/services/jiraService';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { useToastFunctions } from '@/app/components/ui/Toast';
import { FiFolder, FiLink, FiCheck, FiX, FiRefreshCw, FiSearch } from 'react-icons/fi';

interface JiraProjectMapping {
  jiraProjectKey: string;
  jiraProjectName: string;
  jiraProjectId: string;
  localProjectId?: string;
  localProjectName?: string;
  mapped: boolean;
  mappingType: 'project' | 'epic' | 'issue';
  jiraEpicKey?: string;
  jiraIssueKey?: string;
}

interface JiraProjectMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  scopeId: string;
  onMappingComplete?: (mappings: JiraProjectMapping[]) => void;
}

export function JiraProjectMappingModal({ 
  isOpen, 
  onClose, 
  projects, 
  scopeId, 
  onMappingComplete 
}: JiraProjectMappingModalProps) {
  
  const toast = useToastFunctions();
  
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [jiraEpics, setJiraEpics] = useState<JiraIssue[]>([]);
  const [jiraIssues, setJiraIssues] = useState<JiraIssue[]>([]);
  const [mappings, setMappings] = useState<JiraProjectMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyMapped, setShowOnlyMapped] = useState(false);
  const [mappingType, setMappingType] = useState<'project' | 'epic' | 'issue'>('project');

  // Filtered mappings based on search and mapped status
  const filteredMappings = useMemo(() => {
    let filtered = mappings;
    
    // Filter by mapped status first
    if (showOnlyMapped) {
      filtered = filtered.filter(mapping => mapping.mapped);
    }
    
    // Then filter by search text
    if (searchFilter.trim()) {
      const filter = searchFilter.toLowerCase();
      filtered = filtered.filter(mapping => 
        mapping.jiraProjectName.toLowerCase().includes(filter) ||
        mapping.jiraProjectKey.toLowerCase().includes(filter) ||
        (mapping.localProjectName && mapping.localProjectName.toLowerCase().includes(filter))
      );
    }
    
    return filtered;
  }, [mappings, searchFilter, showOnlyMapped]);

  // Load JIRA projects when modal opens
  useEffect(() => {
    if (isOpen) {
      loadJiraData();
    }
  }, [isOpen, scopeId, mappingType]);

  const loadJiraData = async () => {
    switch (mappingType) {
      case 'project':
        await loadJiraProjects();
        break;
      case 'epic':
        await loadJiraEpics();
        break;
      case 'issue':
        await loadJiraIssues();
        break;
    }
  };

  const loadJiraProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get JIRA config from scope settings
      const settings = await ScopeSettingsService.get(scopeId);
      const jiraConfig = settings?.jira || {};
      
      if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
        throw new Error('JIRA není nakonfigurováno. Prosím nastavte JIRA v nastavení scope.');
      }

      const projects = await JiraService.fetchProjects({
        baseUrl: jiraConfig.baseUrl || undefined,
        email: jiraConfig.email || undefined,
        apiToken: jiraConfig.apiToken || undefined
      });
      setJiraProjects(projects);
      
      // Load existing mappings from settings
      const existingMappings: JiraProjectMapping[] = (settings?.jiraProjectMappings as JiraProjectMapping[]) || [];
      
      // Initialize mappings with existing data
      const initialMappings: JiraProjectMapping[] = projects.map(project => {
        // Find existing mapping for this project
        const existingMapping = existingMappings.find((m: JiraProjectMapping) => 
          m.jiraProjectKey === project.key && (m.mappingType === 'project' || !m.mappingType)
        );
        
        if (existingMapping) {
          // Use existing mapping
          const localProject = projects.find(p => p.id === existingMapping.localProjectId);
          return {
            jiraProjectKey: project.key,
            jiraProjectName: project.name,
            jiraProjectId: project.id,
            localProjectId: existingMapping.localProjectId,
            localProjectName: localProject?.name,
            mapped: true,
            mappingType: existingMapping.mappingType || 'project'
          };
        } else {
          // New project, no mapping yet
          return {
            jiraProjectKey: project.key,
            jiraProjectName: project.name,
            jiraProjectId: project.id,
            localProjectId: undefined,
            localProjectName: undefined,
            mapped: false,
            mappingType: 'project'
          };
        }
      });
      
      setMappings(initialMappings);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se načíst JIRA projekty';
      setError(errorMessage);
      console.error('Failed to load JIRA projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJiraEpics = async () => {
    console.log('JiraProjectMappingModal: loadJiraEpics started');
    setLoading(true);
    setError(null);
    
    try {
      // Get JIRA config from scope settings
      const settings = await ScopeSettingsService.get(scopeId);
      const jiraConfig = settings?.jira || {};
      console.log('JiraProjectMappingModal: JIRA config:', jiraConfig);
      
      if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
        throw new Error('JIRA není nakonfigurováno. Prosím nastavte JIRA v nastavení scope.');
      }

      // Fetch epics using JQL
      console.log('JiraProjectMappingModal: Fetching epics with JQL: issuetype = Epic ORDER BY key ASC');
      const epics: JiraIssue[] = await JiraService.fetchIssues(
        {
          baseUrl: jiraConfig.baseUrl || undefined,
          email: jiraConfig.email || undefined,
          apiToken: jiraConfig.apiToken || undefined
        },
        'issuetype = Epic ORDER BY key ASC',
        100
      );
      console.log('JiraProjectMappingModal: Fetched epics:', epics);
      setJiraEpics(epics);
      
      // Load existing mappings from settings
      const existingMappings: JiraProjectMapping[] = (settings?.jiraProjectMappings as JiraProjectMapping[]) || [];
      
      // Initialize mappings with existing epic data
      console.log('JiraProjectMappingModal: Processing epics, total count:', epics.length);
      const initialMappings: JiraProjectMapping[] = epics
        .filter(epic => epic.fields?.project) // Filter out epics without project info
        .map(epic => {
          const existingMapping = existingMappings.find((m: JiraProjectMapping) => 
            m.mappingType === 'epic' && m.jiraEpicKey === epic.key
          );
          
          if (existingMapping) {
            const localProject = projects.find(p => p.id === existingMapping.localProjectId);
            return {
              jiraProjectKey: epic.fields!.project!.key,
              jiraProjectName: epic.fields!.project!.name,
              jiraProjectId: epic.fields!.project!.id,
              localProjectId: existingMapping.localProjectId,
              localProjectName: localProject?.name,
              mapped: true,
              mappingType: existingMapping.mappingType || 'epic',
              jiraEpicKey: epic.key
            };
          } else {
            return {
              jiraProjectKey: epic.fields!.project!.key,
              jiraProjectName: epic.fields!.project!.name,
              jiraProjectId: epic.fields!.project!.id,
              localProjectId: undefined,
              localProjectName: undefined,
              mapped: false,
              mappingType: 'epic',
              jiraEpicKey: epic.key
            };
          }
        });
      
      console.log('JiraProjectMappingModal: Final epic mappings:', initialMappings);
      setMappings(initialMappings);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se načíst JIRA epics';
      setError(errorMessage);
      console.error('Failed to load JIRA epics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJiraIssues = async () => {
    console.log('JiraProjectMappingModal: loadJiraIssues started');
    setLoading(true);
    setError(null);
    
    try {
      // Get JIRA config from scope settings
      const settings = await ScopeSettingsService.get(scopeId);
      const jiraConfig = settings?.jira || {};
      console.log('JiraProjectMappingModal: JIRA config:', jiraConfig);
      
      if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
        throw new Error('JIRA není nakonfigurováno. Prosím nastavte JIRA v nastavení scope.');
      }

      // Fetch issues using JQL (excluding epics and sub-tasks)
      console.log('JiraProjectMappingModal: Fetching issues with JQL: issuetype != Epic ORDER BY key ASC');
      const issues: JiraIssue[] = await JiraService.fetchIssues(
        {
          baseUrl: jiraConfig.baseUrl || undefined,
          email: jiraConfig.email || undefined,
          apiToken: jiraConfig.apiToken || undefined
        },
        'issuetype != Epic ORDER BY key ASC',
        100
      );
      console.log('JiraProjectMappingModal: Fetched issues:', issues);
      setJiraIssues(issues);
      
      // Load existing mappings from settings
      const existingMappings: JiraProjectMapping[] = (settings?.jiraProjectMappings as JiraProjectMapping[]) || [];
      
      // Initialize mappings with existing issue data
      console.log('JiraProjectMappingModal: Processing issues, total count:', issues.length);
      const initialMappings: JiraProjectMapping[] = issues
        .filter(issue => issue.fields?.project) // Filter out issues without project info
        .map(issue => {
          const existingMapping = existingMappings.find((m: JiraProjectMapping) => 
            m.mappingType === 'issue' && m.jiraIssueKey === issue.key
          );
          
          if (existingMapping) {
            const localProject = projects.find(p => p.id === existingMapping.localProjectId);
            return {
              jiraProjectKey: issue.fields!.project!.key,
              jiraProjectName: issue.fields!.project!.name,
              jiraProjectId: issue.fields!.project!.id,
              localProjectId: existingMapping.localProjectId,
              localProjectName: localProject?.name,
              mapped: true,
              mappingType: existingMapping.mappingType || 'issue',
              jiraIssueKey: issue.key
            };
          } else {
            return {
              jiraProjectKey: issue.fields!.project!.key,
              jiraProjectName: issue.fields!.project!.name,
              jiraProjectId: issue.fields!.project!.id,
              localProjectId: undefined,
              localProjectName: undefined,
              mapped: false,
              mappingType: 'issue',
              jiraIssueKey: issue.key
            };
          }
        });
      
      console.log('JiraProjectMappingModal: Final issue mappings:', initialMappings);
      setMappings(initialMappings);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se načíst JIRA issues';
      setError(errorMessage);
      console.error('Failed to load JIRA issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (jiraProjectKey: string, localProjectId: string, epicKey?: string, issueKey?: string) => {
    const localProject = projects.find(p => p.id === localProjectId);
    
    setMappings(prev => prev.map(mapping => {
      // For epic mapping, match by jiraProjectKey AND jiraEpicKey
      if (epicKey && mapping.jiraProjectKey === jiraProjectKey && mapping.jiraEpicKey === epicKey) {
        return {
          ...mapping,
          localProjectId: localProjectId,
          localProjectName: localProject?.name,
          mapped: true,
          mappingType: 'epic'
        };
      }
      
      // For issue mapping, match by jiraProjectKey AND jiraIssueKey
      if (issueKey && mapping.jiraProjectKey === jiraProjectKey && mapping.jiraIssueKey === issueKey) {
        return {
          ...mapping,
          localProjectId: localProjectId,
          localProjectName: localProject?.name,
          mapped: true,
          mappingType: 'issue'
        };
      }
      
      // For project mapping, match by jiraProjectKey only (no epicKey or issueKey)
      if (!epicKey && !issueKey && mapping.jiraProjectKey === jiraProjectKey && !mapping.jiraEpicKey && !mapping.jiraIssueKey) {
        return {
          ...mapping,
          localProjectId: localProjectId,
          localProjectName: localProject?.name,
          mapped: true,
          mappingType: 'project'
        };
      }
      
      return mapping;
    }));
  };

  const removeMapping = (jiraProjectKey: string, epicKey?: string, issueKey?: string) => {
    setMappings(prev => prev.map(mapping => {
      // For epic mapping, match by jiraProjectKey AND jiraEpicKey
      if (epicKey && mapping.jiraProjectKey === jiraProjectKey && mapping.jiraEpicKey === epicKey) {
        return {
          ...mapping,
          localProjectId: undefined,
          localProjectName: undefined,
          mapped: false
        };
      }
      
      // For issue mapping, match by jiraProjectKey AND jiraIssueKey
      if (issueKey && mapping.jiraProjectKey === jiraProjectKey && mapping.jiraIssueKey === issueKey) {
        return {
          ...mapping,
          localProjectId: undefined,
          localProjectName: undefined,
          mapped: false
        };
      }
      
      // For project mapping, match by jiraProjectKey only (no epicKey or issueKey)
      if (!epicKey && !issueKey && mapping.jiraProjectKey === jiraProjectKey && !mapping.jiraEpicKey && !mapping.jiraIssueKey) {
        return {
          ...mapping,
          localProjectId: undefined,
          localProjectName: undefined,
          mapped: false
        };
      }
      
      return mapping;
    }));
  };

  const saveMappings = async () => {
    setSaving(true);
    
    try {
      const mappedProjects = mappings.filter(m => m.mapped);
      
      // Save to scope settings
      await ScopeSettingsService.upsert(scopeId, {
        jiraProjectMappings: mappedProjects
      });
      
      toast.success('Mapování uloženo', `${mappedProjects.length} JIRA projektů bylo úspěšně namapováno.`);
      onMappingComplete?.(mappedProjects);
      onClose();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se uložit mapování';
      setError(errorMessage);
      toast.error('Chyba při ukládání', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Mapování JIRA projektů"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Mapping type selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Typ mapování:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setMappingType('project')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                mappingType === 'project'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Projekty
            </button>
            <button
              onClick={() => setMappingType('epic')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                mappingType === 'epic'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Epics
            </button>
            <button
              onClick={() => setMappingType('issue')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                mappingType === 'issue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Issues
            </button>
          </div>
        </div>

        {/* Header with search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Hledat projekty..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={showOnlyMapped}
                onChange={(e) => setShowOnlyMapped(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Zobrazit pouze připojené projekty
            </label>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <FiX className="w-4 h-4" />
              <span className="font-medium">Chyba</span>
            </div>
            <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <FiRefreshCw className="w-5 h-5 animate-spin" />
              <span>Načítání JIRA projektů...</span>
            </div>
          </div>
        )}

        {/* Results counter */}
        {!loading && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {filteredMappings.length} projektů
            {showOnlyMapped && ' (pouze připojené)'}
            {searchFilter && ` vyhovujících "${searchFilter}"`}
          </div>
        )}

        {/* Projects table */}
        {!loading && filteredMappings.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {mappingType === 'project' ? 'JIRA projekt' : mappingType === 'epic' ? 'JIRA Epic' : 'JIRA Issue'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Lokální projekt
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Stav
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Akce
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMappings.map((mapping) => (
                    <tr key={`${mapping.mappingType}-${mapping.jiraProjectKey}-${mapping.jiraEpicKey || mapping.jiraIssueKey || 'default'}`} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <FiFolder className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {mappingType === 'project' ? mapping.jiraProjectName : 
                               mappingType === 'epic' ? `${mapping.jiraEpicKey} - Epic` :
                               `${mapping.jiraIssueKey} - Issue`}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {mapping.jiraProjectKey}
                            </div>
                            {mappingType !== 'project' && (
                              <div className="text-xs text-gray-400 dark:text-gray-500">
                                {mapping.jiraProjectName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {mapping.mapped ? (
                          <div className="flex items-center gap-2">
                            <FiLink className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {mapping.localProjectName}
                            </span>
                          </div>
                        ) : (
                          <select
                            value={mapping.localProjectId || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                updateMapping(mapping.jiraProjectKey, e.target.value, mapping.jiraEpicKey, mapping.jiraIssueKey);
                              }
                            }}
                            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="">Vyberte projekt...</option>
                            {projects.map(project => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {mapping.mapped ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <FiCheck className="w-3 h-3" />
                            Připojeno
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                            <FiX className="w-3 h-3" />
                            Nepřipojeno
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {mapping.mapped && (
                          <button
                            onClick={() => removeMapping(mapping.jiraProjectKey, mapping.jiraEpicKey, mapping.jiraIssueKey)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                          >
                            Zrušit mapování
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No results */}
        {!loading && filteredMappings.length === 0 && (
          <div className="text-center py-8">
            <FiFolder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-300 mb-2">
              {searchFilter || showOnlyMapped 
                ? 'Žádné projekty nevyhovují filtru' 
                : 'Žádné JIRA projekty nebyly nalezeny'
              }
            </p>
            {(searchFilter || showOnlyMapped) && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setSearchFilter('')}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Vymazat vyhledávání
                </button>
                {showOnlyMapped && (
                  <>
                    <span className="text-gray-400">•</span>
                    <button
                      onClick={() => setShowOnlyMapped(false)}
                      className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Zobrazit všechny projekty
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={saveMappings}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saving && <FiRefreshCw className="w-4 h-4 animate-spin" />}
            Uložit mapování
          </button>
        </div>
      </div>
    </Modal>
  );
}
