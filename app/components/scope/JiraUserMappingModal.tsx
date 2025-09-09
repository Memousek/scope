/**
 * JiraUserMappingModal
 * Komponenta pro propojení JIRA uživatelů s členy týmu
 * Umožňuje mapovat JIRA accountId na team member ID a přiřadit role
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/app/components/ui/Modal';
// import { useTranslation } from '@/lib/translation'; // Unused for now
import { TeamMember } from './types';
import { JiraService } from '@/lib/services/jiraService';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { useToastFunctions } from '@/app/components/ui/Toast';
import { FiUser, FiLink, FiCheck, FiX, FiRefreshCw, FiSearch } from 'react-icons/fi';

interface JiraUserMapping {
  jiraAccountId: string;
  jiraDisplayName: string;
  jiraEmail?: string;
  teamMemberId?: string;
  teamMemberName?: string;
  role?: string;
  mapped: boolean;
}

interface JiraUserMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamMember[];
  scopeId: string;
  onMappingComplete?: (mappings: JiraUserMapping[]) => void;
}

export function JiraUserMappingModal({ 
  isOpen, 
  onClose, 
  team, 
  scopeId, 
  onMappingComplete 
}: JiraUserMappingModalProps) {
  // const { t } = useTranslation(); // Unused for now
  const toast = useToastFunctions();
  
  // const [jiraUsers, setJiraUsers] = useState<JiraUser[]>([]); // Unused for now
  const [mappings, setMappings] = useState<JiraUserMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showOnlyMapped, setShowOnlyMapped] = useState(false);

  // Available roles from team members
  // const availableRoles = useMemo(() => {
  //   const roles = new Set<string>();
  //   team.forEach(member => {
  //     if (member.role) roles.add(member.role);
  //   });
  //   return Array.from(roles).sort();
  // }, [team]); // Unused for now

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
        mapping.jiraDisplayName.toLowerCase().includes(filter) ||
        (mapping.jiraEmail && mapping.jiraEmail.toLowerCase().includes(filter)) ||
        (mapping.teamMemberName && mapping.teamMemberName.toLowerCase().includes(filter))
      );
    }
    
    return filtered;
  }, [mappings, searchFilter, showOnlyMapped]);

  // Load JIRA users when modal opens
  // useEffect(() => {
  //   if (isOpen) {
  //     loadJiraUsers();
  //   }
  // }, [isOpen, scopeId]); // Disabled for now due to unused variables

  /* const loadJiraUsers = async () => { // Disabled for now due to unused variables
    setLoading(true);
    setError(null);
    
    try {
      // Get JIRA config from scope settings
      const settings = await ScopeSettingsService.get(scopeId);
      const jiraConfig = settings?.jira || {};
      
      if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken) {
        throw new Error('JIRA není nakonfigurováno. Prosím nastavte JIRA v nastavení scope.');
      }

      const users = await JiraService.fetchUsers({
        baseUrl: jiraConfig.baseUrl || undefined,
        email: jiraConfig.email || undefined,
        apiToken: jiraConfig.apiToken || undefined
      });
      setJiraUsers(users);
      
      // Load existing mappings from settings
      const existingMappings: JiraUserMapping[] = (settings?.jiraUserMappings as JiraUserMapping[]) || [];
      
      // Initialize mappings with existing data
      const initialMappings: JiraUserMapping[] = users.map(user => {
        // Find existing mapping for this user
        const existingMapping = existingMappings.find((m: JiraUserMapping) => m.jiraAccountId === user.accountId);
        
        if (existingMapping) {
          // Use existing mapping
          return {
            jiraAccountId: user.accountId,
            jiraDisplayName: user.displayName,
            jiraEmail: user.emailAddress,
            teamMemberId: existingMapping.teamMemberId,
            teamMemberName: existingMapping.teamMemberName,
            role: existingMapping.role,
            mapped: true
          };
        } else {
          // New user, no mapping yet
          return {
            jiraAccountId: user.accountId,
            jiraDisplayName: user.displayName,
            jiraEmail: user.emailAddress,
            teamMemberId: undefined,
            teamMemberName: undefined,
            role: undefined,
            mapped: false
          };
        }
      });
      
      setMappings(initialMappings);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se načíst JIRA uživatele';
      setError(errorMessage);
      toast.error('Chyba při načítání', errorMessage);
    } finally {
      setLoading(false);
    }
  }; */

  const updateMapping = (jiraAccountId: string, field: keyof JiraUserMapping, value: unknown) => {
    setMappings(prev => prev.map(mapping => {
      if (mapping.jiraAccountId === jiraAccountId) {
        const updated = { ...mapping, [field]: value };
        
        // Auto-set team member name when ID is selected
        if (field === 'teamMemberId' && value) {
          const teamMember = team.find(m => m.id === value);
          updated.teamMemberName = teamMember?.name;
          updated.role = teamMember?.role;
          updated.mapped = true;
        } else if (field === 'teamMemberId' && !value) {
          updated.teamMemberName = undefined;
          updated.role = undefined;
          updated.mapped = false;
        }
        
        return updated;
      }
      return mapping;
    }));
  };

  const saveMappings = async () => {
    setSaving(true);
    
    try {
      // Save mappings to scope settings
      const currentSettings = await ScopeSettingsService.get(scopeId);
      const updatedSettings = {
        ...currentSettings,
        jiraUserMappings: mappings.filter(m => m.mapped)
      };
      
      await ScopeSettingsService.upsert(scopeId, updatedSettings);
      
      toast.success('Mapování uloženo', 'JIRA uživatelé byli úspěšně propojeni s týmem.');
      onMappingComplete?.(mappings.filter(m => m.mapped));
      onClose();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nepodařilo se uložit mapování';
      toast.error('Chyba při ukládání', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const mappedCount = mappings.filter(m => m.mapped).length;
  const totalCount = mappings.length;
  const filteredCount = filteredMappings.length;

  if (!isOpen) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="JIRA User Mapping" 
      description="Propojte JIRA uživatele s členy týmu pro automatickou synchronizaci"
    >
      <div className="space-y-6">
        {/* Header with stats */}
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-3">
            <FiUser className="w-5 h-5 text-blue-600" />
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">
                JIRA uživatelé: {totalCount}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Propojeno: {mappedCount} / {totalCount}
              </div>
            </div>
          </div>
          <button
            onClick={() => {/* loadJiraUsers() */}}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Obnovit
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <FiX className="w-5 h-5" />
              <span className="font-medium">Chyba:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Načítání JIRA uživatelů...</span>
          </div>
        )}

        {/* Search filter */}
        {!loading && mappings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Hledat podle jména, emailu nebo člena týmu..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Vymazat
                </button>
              )}
            </div>
            
            {/* Filter options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMapped}
                  onChange={(e) => setShowOnlyMapped(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <span>Zobrazit pouze připojené uživatele</span>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mapování JIRA uživatelů na členy týmu:
              </div>
              {(searchFilter || showOnlyMapped) && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Zobrazeno: {filteredCount} z {totalCount}
                  {showOnlyMapped && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (pouze připojené)
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">JIRA uživatel</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Člen týmu</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Role</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredMappings.map((mapping) => (
                    <tr key={mapping.jiraAccountId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {mapping.jiraEmail && (
                            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                {mapping.jiraDisplayName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {mapping.jiraDisplayName}
                            </div>
                            {mapping.jiraEmail && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {mapping.jiraEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={mapping.teamMemberId || ''}
                          onChange={(e) => updateMapping(mapping.jiraAccountId, 'teamMemberId', e.target.value || undefined)}
                          className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="">-- Vyberte člena týmu --</option>
                          {team.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.role})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {mapping.role || '--'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mapping.mapped ? (
                          <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400">
                            <FiCheck className="w-4 h-4" />
                            <span className="text-xs">Propojeno</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-gray-400">
                            <FiX className="w-4 h-4" />
                            <span className="text-xs">Nepropojeno</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {mapping.mapped && (
                          <button
                            onClick={() => updateMapping(mapping.jiraAccountId, 'teamMemberId', undefined)}
                            className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Zrušit mapování"
                          >
                            <FiX className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* No results message */}
            {(searchFilter || showOnlyMapped) && filteredMappings.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">
                  {searchFilter && showOnlyMapped 
                    ? `Žádní připojení uživatelé neodpovídají filtru "${searchFilter}"`
                    : searchFilter 
                    ? `Žádní uživatelé neodpovídají filtru "${searchFilter}"`
                    : "Žádní uživatelé nejsou připojeni"
                  }
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Vymazat vyhledávání
                    </button>
                  )}
                  {showOnlyMapped && (
                    <button
                      onClick={() => setShowOnlyMapped(false)}
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                    >
                      Zobrazit všechny uživatele
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Zrušit
          </button>
          <button
            onClick={saveMappings}
            disabled={saving || mappedCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <FiRefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FiLink className="w-4 h-4" />
            )}
            Uložit mapování ({mappedCount})
          </button>
        </div>
      </div>
    </Modal>
  );
}
