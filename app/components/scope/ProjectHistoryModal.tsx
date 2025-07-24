/**
 * Modern Project History Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - ESC key support
 * - Backdrop blur pro lepší UX
 * - Card-based     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" style={{ backdropFilter: 'blur(12px)' }}>
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-6xl relative overflow-y-auto max-h-[90vh] mx-4">yout místo široké tabulky
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { Project, ProjectProgress } from './types';
import { PROJECT_ROLES } from '@/lib/utils/projectRoles';

interface ProjectHistoryModalProps {
  project: Project;
  onClose: () => void;
  onProjectUpdate: () => void;
}

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({ project, onClose, onProjectUpdate }) => {
  const [history, setHistory] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ProjectProgress>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Používáme centralizované role z utility
  const roles = PROJECT_ROLES.map(role => ({
    done: role.doneKey,
    mandays: role.mandaysKey,
    label: role.label,
    color: role.key === 'fe' ? 'blue' : 
           role.key === 'be' ? 'green' : 
           role.key === 'qa' ? 'orange' : 
           role.key === 'pm' ? 'purple' : 'red'
  }));

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('project_progress')
        .select('*')
        .eq('project_id', project.id)
        .order('date', { ascending: false });

      if (!error && data) {
        setHistory(data);
      }
      setLoading(false);
    };

    loadHistory();
  }, [project.id]);

  const handleDeleteProgress = async (progressId: string) => {
    if (!confirm('Opravdu chcete smazat tento záznam?')) return;
    
    const supabase = createClient();
    await supabase.from('project_progress').delete().eq('id', progressId);
    onProjectUpdate();
    // Refresh history
    const { data } = await supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', project.id)
      .order('date', { ascending: false });
    if (data) setHistory(data);
  };

  // Uložení úprav
  const handleSave = async (id?: string) => {
    setError(null);
    if (!id) return;
    
    // Validace: % hotovo 0-100, mandays >= 0
    for (const role of roles) {
      const doneVal = editValues[role.done as keyof ProjectProgress];
      const mandaysVal = editValues[role.mandays as keyof ProjectProgress];
      if (doneVal !== undefined && (isNaN(Number(doneVal)) || Number(doneVal) < 0 || Number(doneVal) > 100)) {
        setError(`% hotovo pro ${role.label} musí být číslo 0-100.`);
        return;
      }
      if (mandaysVal !== undefined && (isNaN(Number(mandaysVal)) || Number(mandaysVal) < 0)) {
        setError(`Odhad (MD) pro ${role.label} musí být číslo >= 0.`);
        return;
      }
    }
    
    setSaving(true);
    const supabase = createClient();
    await supabase.from('project_progress').update(editValues).eq('id', id);
    setEditingId(null);
    setEditValues({});
    setSaving(false);
    
    // Refresh history
    const { data } = await supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', project.id)
      .order('date', { ascending: false });
    if (data) setHistory(data);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  const getRoleColor = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getChangedRoles = (progress: ProjectProgress) => {
    return roles.filter(role => {
      const doneValue = progress[role.done as keyof ProjectProgress];
      const mandaysValue = progress[role.mandays as keyof ProjectProgress];
      return doneValue !== null || mandaysValue !== null;
    });
  };

  const groupHistoryByDate = (history: ProjectProgress[]) => {
    const grouped: { [key: string]: ProjectProgress[] } = {};
    
    history.forEach(progress => {
      const date = new Date(progress.date);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(progress);
    });
    
    // Seřadit změny v rámci dne podle času (nejnovější první)
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    return grouped;
  };

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" style={{ backdropFilter: 'blur(12px)', zIndex: 9999 }}>
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-4xl relative overflow-y-auto max-h-[90vh] mx-4">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-3xl font-bold transition-colors duration-200" 
          onClick={onClose} 
          aria-label="Zavřít"
        >
          ×
        </button>
        
        <h4 className="text-2xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📊 Historie změn projektu
        </h4>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">{project.name}</p>
        
        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">Žádná historie změn</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Změny se zobrazí po úpravě projektu</p>
              </div>
            ) : (
              (() => {
                const groupedHistory = groupHistoryByDate(history);
                const sortedDates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a)); // Nejnovější datum první
                
                return sortedDates.map(dateKey => {
                  const dayProgresses = groupedHistory[dateKey];
                  const totalChanges = dayProgresses.reduce((total, progress) => total + getChangedRoles(progress).length, 0);
                  
                  return (
                    <div key={dateKey} className="bg-white/80 dark:bg-gray-700/80 rounded-xl border border-gray-200 dark:border-gray-600 p-4 hover:shadow-lg transition-all duration-300">
                      {/* Hlavička dne */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            {formatDateOnly(dayProgresses[0].date)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded-full">
                            {dayProgresses.length} změn • {totalChanges} úprav
                          </div>
                        </div>
                      </div>
                      
                      {/* Změny v rámci dne */}
                      <div className="space-y-3">
                        {dayProgresses.map((progress) => {
                          const changedRoles = getChangedRoles(progress);
                          const isEditing = editingId === progress.id;
                          
                          return (
                            <div key={progress.id} className="bg-gray-50 dark:bg-gray-600/50 rounded-lg p-3 border border-gray-200 dark:border-gray-500">
                              {/* Čas změny */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatDate(progress.date)}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <button 
                                        className="text-green-600 dark:text-green-400 font-semibold hover:text-green-700 dark:hover:text-green-300 hover:underline transition-colors duration-200 text-xs" 
                                        disabled={saving} 
                                        onClick={() => progress.id && handleSave(progress.id)}
                                      >
                                        {saving ? 'Ukládám...' : 'Uložit'}
                                      </button>
                                      <button 
                                        className="text-gray-600 dark:text-gray-400 font-semibold hover:text-gray-700 dark:hover:text-gray-300 hover:underline transition-colors duration-200 text-xs" 
                                        disabled={saving} 
                                        onClick={() => { setEditingId(null); setEditValues({}); setError(null); }}
                                      >
                                        Zrušit
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-200 text-xs" 
                                        disabled={saving} 
                                        onClick={() => { setEditingId(progress.id || ''); setEditValues({}); setError(null); }}
                                      >
                                        Upravit
                                      </button>
                                      <button 
                                        className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors duration-200 text-xs" 
                                        onClick={() => progress.id && handleDeleteProgress(progress.id)}
                                      >
                                        Smazat
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {/* Změněné role */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {changedRoles.map(role => {
                                  const doneValue = progress[role.done as keyof ProjectProgress];
                                  const mandaysValue = progress[role.mandays as keyof ProjectProgress];
                                  
                                  return (
                                    <div key={role.label} className="bg-white/80 dark:bg-gray-700/80 rounded p-2 border border-gray-200 dark:border-gray-500">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-2 h-2 rounded-full bg-${role.color}-500`}></div>
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{role.label}</span>
                                      </div>
                                      
                                      {doneValue !== null && (
                                        <div className="mb-1">
                                          <div className="text-xs text-gray-500 dark:text-gray-400 text-xs">% hotovo</div>
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              className="w-full border rounded px-1 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              value={editValues[role.done as keyof ProjectProgress] !== undefined ? String(editValues[role.done as keyof ProjectProgress]) : String(doneValue)}
                                              min={0}
                                              max={100}
                                              onChange={e => setEditValues(v => ({ ...v, [role.done]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                            />
                                          ) : (
                                            <span className={`px-1 py-0.5 rounded text-xs ${getRoleColor(role.color)}`}>
                                              {doneValue}%
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      
                                      {mandaysValue !== null && (
                                        <div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 text-xs">Odhad (MD)</div>
                                          {isEditing ? (
                                            <input
                                              type="number"
                                              className="w-full border rounded px-1 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                              value={editValues[role.mandays as keyof ProjectProgress] !== undefined ? String(editValues[role.mandays as keyof ProjectProgress]) : String(mandaysValue)}
                                              min={0}
                                              step={0.1}
                                              onChange={e => setEditValues(v => ({ ...v, [role.mandays]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                            />
                                          ) : (
                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                              {mandaysValue} MD
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}
        
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
            onClick={onClose}
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}; 