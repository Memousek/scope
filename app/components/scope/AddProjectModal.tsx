import { useState } from 'react';
import { Project } from './types';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: Omit<Project, 'id' | 'scope_id' | 'created_at'>) => Promise<void>;
  savingProject: boolean;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onAddProject, savingProject, hasFE, hasBE, hasQA, hasPM, hasDPL }) => {
  const [newProject, setNewProject] = useState<Omit<Project, 'id' | 'scope_id' | 'created_at'>>({
    name: '',
    priority: 1,
    fe_mandays: 0,
    be_mandays: 0,
    qa_mandays: 0,
    pm_mandays: 0,
    dpl_mandays: 0,
    delivery_date: null,
    fe_done: 0,
    be_done: 0,
    qa_done: 0,
    pm_done: 0,
    dpl_done: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    // Validace: žádný odhad nesmí být 0 (pro použité role)
    const usedMandays = [
      hasFE ? newProject.fe_mandays : 1,
      hasBE ? newProject.be_mandays : 1,
      hasQA ? newProject.qa_mandays : 1,
      hasPM ? newProject.pm_mandays : 1,
      hasDPL ? newProject.dpl_mandays : 1,
    ];
    if (usedMandays.some(v => v === 0)) {
      alert('Odhad mandays nesmí být 0.');
      return;
    }
    await onAddProject(newProject);
    setNewProject({
      name: '',
      priority: 1,
      fe_mandays: 0,
      be_mandays: 0,
      qa_mandays: 0,
      pm_mandays: 0,
      dpl_mandays: 0,
      delivery_date: null,
      fe_done: 0,
      be_done: 0,
      qa_done: 0,
      pm_done: 0,
      dpl_done: 0
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="rounded-2xl bg-background shadow-2xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={onClose} aria-label="Zavřít">×</button>
        <h3 className="text-2xl font-bold mb-6 text-center">Přidat nový projekt</h3>
        <form className="flex flex-wrap gap-4 items-end" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <label className="mb-1 font-medium text-gray-700">Název projektu</label>
            <input
              className="border rounded px-3 py-2 min-w-[180px] focus:outline-blue-400"
              placeholder="Nový projekt"
              value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              disabled={savingProject}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 font-medium text-gray-700">Priorita</label>
            <input
              className="border rounded px-3 py-2 w-16 focus:outline-blue-400"
              type="number"
              min={1}
              value={newProject.priority}
              onChange={e => setNewProject(p => ({ ...p, priority: Number(e.target.value) }))}
              disabled={savingProject}
              required
            />
          </div>
          {hasFE && (
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Odhad FE (MD)</label>
              <input
                className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                type="number"
                min={0.01}
                step={0.01}
                value={newProject.fe_mandays}
                onChange={e => setNewProject(p => ({ ...p, fe_mandays: Number(e.target.value) }))}
                disabled={savingProject}
                required
              />
            </div>
          )}
          {hasBE && (
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Odhad BE (MD)</label>
              <input
                className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                type="number"
                min={0.01}
                step={0.01}
                value={newProject.be_mandays}
                onChange={e => setNewProject(p => ({ ...p, be_mandays: Number(e.target.value) }))}
                disabled={savingProject}
                required
              />
            </div>
          )}
          {hasQA && (
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Odhad QA (MD)</label>
              <input
                className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                type="number"
                min={0.01}
                step={0.01}
                value={newProject.qa_mandays}
                onChange={e => setNewProject(p => ({ ...p, qa_mandays: Number(e.target.value) }))}
                disabled={savingProject}
                required
              />
            </div>
          )}
          {hasPM && (
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Odhady PM (MD)</label>
              <input
                className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                type="number"
                min={0.01}
                step={0.01}
                value={newProject.pm_mandays}
                onChange={e => setNewProject(p => ({ ...p, pm_mandays: Number(e.target.value) }))}
                disabled={savingProject}
                required
              />
            </div>
          )}
          {hasDPL && (
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Odhady DPL (MD)</label>
              <input
                className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                type="number"
                min={0.01}
                step={0.01}
                value={newProject.dpl_mandays}
                onChange={e => setNewProject(p => ({ ...p, dpl_mandays: Number(e.target.value) }))}
                disabled={savingProject}
                required
              />
            </div>
          )}

          <div className="flex gap-2 justify-end mt-2">
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Termín dodání</label>
              <input
                className="border rounded px-3 py-2 focus:outline-blue-400"
                type="date"
                value={newProject.delivery_date || ''}
                onChange={e => setNewProject(p => ({ ...p, delivery_date: e.target.value || null }))}
                disabled={savingProject}
                required
              />
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button type="button" className="px-5 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300" onClick={onClose}>Zrušit</button>
              <button
                className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
                type="submit"
                disabled={savingProject || !newProject.name.trim()}
              >
                Přidat projekt
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}; 