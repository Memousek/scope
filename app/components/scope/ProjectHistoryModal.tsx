import React, { useEffect, useState } from 'react';
import { Project, ProjectProgress } from './types';
import { createClient } from '@/lib/supabase/client';

interface ProjectHistoryModalProps {
  project: Project;
  onClose: () => void;
  onProjectUpdate?: (updated: Project) => void;
}

/**
 * Modal pro zobrazení a úpravu historie změn projektu (project_progress)
 */
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

  // Načti historii změn
  const fetchHistory = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('project_progress')
      .select('*')
      .eq('project_id', project.id)
      .order('date', { ascending: true });
    setHistory(data || []);
    setLoading(false);
  };

  // Propsání posledních hodnot z historie do projektu
  const syncProjectWithHistory = async () => {
    if (!history.length) return;
    // Build last as a plain object
    const last: Record<string, number> = {};
    roles.forEach(role => {
      // Najdi poslední progress s hodnotou % hotovo
      const lastDone = [...history].reverse().find(h => typeof h[role.done as keyof ProjectProgress] === 'number');
      if (lastDone && typeof lastDone[role.done as keyof ProjectProgress] === 'number') {
        last[role.done] = Number(lastDone[role.done as keyof ProjectProgress]);
      }
      // Najdi poslední progress s hodnotou mandays
      const lastMandays = [...history].reverse().find(h => typeof h[role.mandays as keyof ProjectProgress] === 'number');
      if (lastMandays && typeof lastMandays[role.mandays as keyof ProjectProgress] === 'number') {
        last[role.mandays] = Number(lastMandays[role.mandays as keyof ProjectProgress]);
      }
    });
    // Aktualizuj projekt v DB
    const supabase = createClient();
    await supabase.from('projects').update(last as Partial<Project>).eq('id', project.id);
    // Zavolej callback pro refresh v hlavní tabulce
    if (onProjectUpdate) {
      onProjectUpdate({ ...project, ...last } as Project);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line
  }, [project.id]);

  useEffect(() => {
    if (!loading) syncProjectWithHistory();
    // eslint-disable-next-line
  }, [loading, history.length]);

  // Mazání záznamu
  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm('Opravdu smazat tento záznam historie?')) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('project_progress').delete().eq('id', id);
    setSaving(false);
    fetchHistory();
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
    fetchHistory();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="rounded-2xl bg-background shadow-2xl p-8 w-full max-w-4xl relative overflow-y-auto max-h-[90vh]">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={onClose} aria-label="Zavřít">×</button>
        <h3 className="text-2xl font-bold mb-6 text-center">Historie změn projektu</h3>
        <div className="mb-4 text-center font-semibold">{project.name}</div>
        {error && <div className="text-red-600 text-center mb-2">{error}</div>}
        {loading ? (
          <div className="text-gray-500 text-center py-8">Načítám historii…</div>
        ) : history.length === 0 ? (
          <div className="text-gray-400 text-center py-8">Žádné záznamy historie</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="px-2 py-1 text-left">Datum</th>
                  {roles.map(role => (
                    <th key={role.done} className="px-2 py-1 text-right">% {role.label}</th>
                  ))}
                  {roles.map(role => (
                    <th key={role.mandays} className="px-2 py-1 text-right">Odhad {role.label} (MD)</th>
                  ))}
                  <th className="px-2 py-1 text-center">Akce</th>
                </tr>
              </thead>
              <tbody>
                {history.map(row => (
                  <tr key={row.id} className="border-b hover:bg-blue-50">
                    <td className="px-2 py-1 whitespace-nowrap">
                      {new Date(row.date).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    {roles.map(role => (
                      <td key={role.done} className="px-2 py-1 text-right">
                        {editingId === row.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16 text-right"
                            value={editValues[role.done as keyof ProjectProgress] !== undefined ? String(editValues[role.done as keyof ProjectProgress]) : (row[role.done as keyof ProjectProgress] !== undefined ? String(row[role.done as keyof ProjectProgress]) : '')}
                            min={0}
                            max={100}
                            onChange={e => setEditValues(v => ({ ...v, [role.done]: e.target.value === '' ? '' : Number(e.target.value) }))}
                          />
                        ) : (
                          typeof row[role.done as keyof ProjectProgress] === 'number' ? row[role.done as keyof ProjectProgress] : ''
                        )}
                      </td>
                    ))}
                    {roles.map(role => (
                      <td key={role.mandays} className="px-2 py-1 text-right">
                        {editingId === row.id ? (
                          <input
                            type="number"
                            className="border rounded px-2 py-1 w-16 text-right"
                            value={editValues[role.mandays as keyof ProjectProgress] !== undefined ? String(editValues[role.mandays as keyof ProjectProgress]) : (row[role.mandays as keyof ProjectProgress] !== undefined ? String(row[role.mandays as keyof ProjectProgress]) : '')}
                            min={0}
                            step={0.01}
                            onChange={e => setEditValues(v => ({ ...v, [role.mandays]: e.target.value === '' ? '' : Number(e.target.value) }))}
                          />
                        ) : (
                          typeof row[role.mandays as keyof ProjectProgress] === 'number' ? row[role.mandays as keyof ProjectProgress] : ''
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {editingId === row.id ? (
                        <>
                          <button className="text-green-600 font-semibold hover:underline mr-2" disabled={saving} onClick={() => handleSave(row.id)}>Uložit</button>
                          <button className="text-gray-600 font-semibold hover:underline" disabled={saving} onClick={() => { setEditingId(null); setEditValues({}); setError(null); }}>Zrušit</button>
                        </>
                      ) : (
                        <>
                          <button className="text-blue-600 font-semibold hover:underline mr-2" disabled={saving} onClick={() => { setEditingId(row.id || ''); setEditValues({}); setError(null); }}>Upravit</button>
                          <button className="text-red-600 font-semibold hover:underline" disabled={saving} onClick={() => handleDelete(row.id)}>Smazat</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end mt-8">
          <button className="px-5 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow" onClick={onClose}>Zavřít</button>
        </div>
      </div>
    </div>
  );
}; 