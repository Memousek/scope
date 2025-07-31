/**
 * Modern Project History Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - ESC key support
 * - Backdrop blur pro lepší UX
 * - Card-based layout místo široké tabulky
 */

import { useState, useEffect } from 'react';
import { Project, ProjectProgress } from './types';
import { useScopeRoles } from '@/app/hooks/useScopeRoles';
import { ProjectService } from '@/app/services/projectService';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { FiClock } from 'react-icons/fi';

interface ProjectHistoryModalProps {
  project: Project;
  scopeId: string;
  onClose: () => void;
  onProjectUpdate: () => void;
}

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({ project, scopeId, onClose, onProjectUpdate }) => {
  const { t } = useTranslation();
  const { activeRoles } = useScopeRoles(scopeId);
  const [history, setHistory] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProjectProgress>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Používáme dynamické role z databáze
  const roles = activeRoles.map(role => ({
    done: `${role.key}_done`,
    mandays: `${role.key}_mandays`,
    label: role.label,
    color: role.color
  }));

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await ProjectService.loadProjectProgress(project.id);
        setHistory(data);
      } catch (error) {
        console.error('Chyba při načítání historie projektu:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [project.id]);

  const handleDeleteProgress = async (progressId: string) => {
    if (!confirm(t('confirmDeleteRecord'))) return;
    
    try {
      await ProjectService.deleteProjectProgress(progressId);
      onProjectUpdate();
      // Refresh history
      const data = await ProjectService.loadProjectProgress(project.id);
      setHistory(data);
    } catch (error) {
      console.error('Chyba při mazání záznamu:', error);
    }
  };

  // Uložení úprav
  const handleSave = async (id?: string) => {
    setError(null);
    if (!id) return;
    
    try {
      const editValues: Record<string, number> = {};

      // Validate and collect all role values
      roles.forEach(role => {
        const doneVal = Number(editValues[role.done] || 0);
        const mandaysVal = Number(editValues[role.mandays] || 0);

        if (doneVal < 0 || doneVal > 100) {
          throw new Error(`% hotovo pro ${role.label} musí být číslo 0-100.`);
        }

        if (mandaysVal < 0) {
          throw new Error(`${role.label} mandays cannot be negative.`);
        }

        editValues[role.done] = doneVal;
        editValues[role.mandays] = mandaysVal;
      });

      await ProjectService.updateProjectProgress(id, editValues);
      
      // Refresh history first
      const data = await ProjectService.loadProjectProgress(project.id);
      setHistory(data);
      
      // Then notify parent about project update
      onProjectUpdate();
      
      setEditingId(null);
      setEditValues({});
    } catch (error) {
      console.error('Chyba při ukládání úprav:', error);
      setError('Chyba při ukládání úprav.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (progress: ProjectProgress) => {
    setEditingId(progress.id || null);
    setEditValues({
      fe_done: progress.fe_done,
      be_done: progress.be_done,
      qa_done: progress.qa_done,
      pm_done: progress.pm_done,
      dpl_done: progress.dpl_done,
      fe_mandays: progress.fe_mandays,
      be_mandays: progress.be_mandays,
      qa_mandays: progress.qa_mandays,
      pm_mandays: progress.pm_mandays,
      dpl_mandays: progress.dpl_mandays
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValues({});
    setError(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getChangedRoles = (progress: ProjectProgress) => {
    return roles.filter(role => {
      const doneVal = progress[role.done as keyof ProjectProgress];
      const mandaysVal = progress[role.mandays as keyof ProjectProgress];
      return doneVal !== undefined || mandaysVal !== undefined;
    });
  };

  const groupHistoryByDate = (history: ProjectProgress[]) => {
    const groups: { [key: string]: ProjectProgress[] } = {};
    history.forEach(item => {
      const date = formatDateOnly(item.date);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={t('projectChangeHistory')}
      description={project.name}
      icon={<FiClock size={24} className="text-white" />}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('loading')}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FiClock size={48} className="mx-auto mb-3 opacity-50" />
            <p>{t('noHistory')}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupHistoryByDate(history).map(([date, items]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{date}</h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {items.length} {items.length === 1 ? t('change') : t('changes')} • {items.length} {t('edit')}
                  </span>
                </div>
                
                {items.map((progress) => (
                  <div key={progress.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                                                 <span className="text-sm text-gray-500 dark:text-gray-400">
                           {formatDate(progress.date)}
                         </span>
                      </div>
                      <div className="flex gap-2">
                        {editingId === progress.id ? (
                          <>
                                                         <button
                               onClick={() => progress.id && handleSave(progress.id)}
                              disabled={saving}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200 disabled:opacity-50"
                            >
                              {saving ? t('saving') : t('save')}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors duration-200 disabled:opacity-50"
                            >
                              {t('cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(progress)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors duration-200"
                            >
                              {t('edit')}
                            </button>
                                                         <button
                               onClick={() => progress.id && handleDeleteProgress(progress.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors duration-200"
                            >
                              {t('delete')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {getChangedRoles(progress).map((role) => {
                        const doneVal = progress[role.done as keyof ProjectProgress];
                        const mandaysVal = progress[role.mandays as keyof ProjectProgress];
                        const isEditing = editingId === progress.id;
                        
                        return (
                          <div key={role.done} className="flex items-center gap-3">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.color)}`}>
                              {role.label}
                            </div>
                            {doneVal !== undefined && (
                              <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-400">% {t('done')}: </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editValues[role.done as keyof ProjectProgress] || ''}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? null : Number(e.target.value);
                                      setEditValues(prev => ({
                                        ...prev,
                                        [role.done]: value
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                ) : (
                                  <span className="font-medium text-blue-600 dark:text-blue-400">{doneVal}%</span>
                                )}
                              </div>
                            )}
                            {mandaysVal !== undefined && (
                              <div className="text-sm">
                                <span className="text-gray-600 dark:text-gray-400">{t('estimate')} (MD): </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={editValues[role.mandays as keyof ProjectProgress] || ''}
                                    onChange={(e) => {
                                      const value = e.target.value === '' ? null : Number(e.target.value);
                                      setEditValues(prev => ({
                                        ...prev,
                                        [role.mandays]: value
                                      }));
                                    }}
                                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                ) : (
                                  <span className="font-medium text-green-600 dark:text-green-400">{mandaysVal}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </Modal>
  );
}; 