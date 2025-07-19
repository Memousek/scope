/**
 * Modern Project History Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - ESC key support
 * - Backdrop blur pro lepší UX
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project, ProjectProgress } from './types';

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

  // Definice rolí a polí
  const roles = [
    { done: 'fe_done', mandays: 'fe_mandays', label: 'FE' },
    { done: 'be_done', mandays: 'be_mandays', label: 'BE' },
    { done: 'qa_done', mandays: 'qa_mandays', label: 'QA' },
    { done: 'pm_done', mandays: 'pm_mandays', label: 'PM' },
    { done: 'dpl_done', mandays: 'dpl_mandays', label: 'DPL' },
  ];

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
    return `${day}. ${month}. ${year} ${hours}:${minutes}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ backdropFilter: 'blur(8px)' }}>
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-4xl relative overflow-y-auto max-h-[90vh] mx-4">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-3xl font-bold transition-colors duration-200" 
          onClick={onClose} 
          aria-label="Zavřít"
        >
          ×
        </button>
        
        <h3 className="text-2xl font-bold mb-2 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          📊 Historie změn projektu
        </h3>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">{project.name}</p>
        
        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-3 text-left">Datum</th>
                  <th className="px-3 py-3 text-center">% FE</th>
                  <th className="px-3 py-3 text-center">% BE</th>
                  <th className="px-3 py-3 text-center">% QA</th>
                  <th className="px-3 py-3 text-center">% PM</th>
                  <th className="px-3 py-3 text-center">% DPL</th>
                  <th className="px-3 py-3 text-center">Odhad FE (MD)</th>
                  <th className="px-3 py-3 text-center">Odhad BE (MD)</th>
                  <th className="px-3 py-3 text-center">Odhad QA (MD)</th>
                  <th className="px-3 py-3 text-center">Odhad PM (MD)</th>
                  <th className="px-3 py-3 text-center">Odhad DPL (MD)</th>
                  <th className="px-3 py-3 text-center">Akce</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-gray-400 dark:text-gray-500 text-center py-8">
                      Žádná historie změn
                    </td>
                  </tr>
                ) : (
                  history.map((progress) => (
                    <tr key={progress.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-3 align-middle text-gray-600 dark:text-gray-400">
                        {formatDate(progress.date)}
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        {editingId === progress.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={editValues.fe_done !== undefined ? String(editValues.fe_done) : (progress.fe_done !== null ? String(progress.fe_done) : '')}
                            min={0}
                            max={100}
                            onChange={e => setEditValues(v => ({ ...v, fe_done: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          />
                        ) : (
                          progress.fe_done !== null ? (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                              {progress.fe_done}%
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        {editingId === progress.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={editValues.be_done !== undefined ? String(editValues.be_done) : (progress.be_done !== null ? String(progress.be_done) : '')}
                            min={0}
                            max={100}
                            onChange={e => setEditValues(v => ({ ...v, be_done: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          />
                        ) : (
                          progress.be_done !== null ? (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs">
                              {progress.be_done}%
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        {editingId === progress.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={editValues.qa_done !== undefined ? String(editValues.qa_done) : (progress.qa_done !== null ? String(progress.qa_done) : '')}
                            min={0}
                            max={100}
                            onChange={e => setEditValues(v => ({ ...v, qa_done: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          />
                        ) : (
                          progress.qa_done !== null ? (
                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded text-xs">
                              {progress.qa_done}%
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        {editingId === progress.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={editValues.pm_done !== undefined ? String(editValues.pm_done) : (progress.pm_done !== null ? String(progress.pm_done) : '')}
                            min={0}
                            max={100}
                            onChange={e => setEditValues(v => ({ ...v, pm_done: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          />
                        ) : (
                          progress.pm_done !== null ? (
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded text-xs">
                              {progress.pm_done}%
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        {editingId === progress.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16 text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            value={editValues.dpl_done !== undefined ? String(editValues.dpl_done) : (progress.dpl_done !== null ? String(progress.dpl_done) : '')}
                            min={0}
                            max={100}
                            onChange={e => setEditValues(v => ({ ...v, dpl_done: e.target.value === '' ? undefined : Number(e.target.value) }))}
                          />
                        ) : (
                          progress.dpl_done !== null ? (
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded text-xs">
                              {progress.dpl_done}%
                            </span>
                          ) : '-'
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                        {progress.fe_mandays || '-'}
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                        {progress.be_mandays || '-'}
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                        {progress.qa_mandays || '-'}
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                        {progress.pm_mandays || '-'}
                      </td>
                      <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                        {progress.dpl_mandays || '-'}
                      </td>
                      <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                        {editingId === progress.id ? (
                          <>
                            <button 
                              className="text-green-600 dark:text-green-400 font-semibold hover:text-green-700 dark:hover:text-green-300 hover:underline transition-colors duration-200 mr-2" 
                              disabled={saving} 
                              onClick={() => progress.id && handleSave(progress.id)}
                            >
                              {saving ? 'Ukládám...' : 'Uložit'}
                            </button>
                            <button 
                              className="text-gray-600 dark:text-gray-400 font-semibold hover:text-gray-700 dark:hover:text-gray-300 hover:underline transition-colors duration-200" 
                              disabled={saving} 
                              onClick={() => { setEditingId(null); setEditValues({}); setError(null); }}
                            >
                              Zrušit
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors duration-200 mr-2" 
                              disabled={saving} 
                              onClick={() => { setEditingId(progress.id || ''); setEditValues({}); setError(null); }}
                            >
                              Upravit
                            </button>
                            <button 
                              className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors duration-200" 
                              onClick={() => progress.id && handleDeleteProgress(progress.id)}
                            >
                              Smazat
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
}; 