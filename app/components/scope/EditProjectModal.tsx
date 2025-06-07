import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project, ProjectProgress } from './types';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onProjectChange: (project: Project) => void;
  projectRoles: Array<{
    key: string;
    label: string;
    mandays: string;
    done: string;
    color: string;
  }>;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onProjectChange,
  projectRoles,
}) => {
  const [editProject, setEditProject] = useState<Project>({ ...project });
  const initialEditState = useRef<Project>({ ...project });

  const handleSaveEditProject = async () => {
    // Validace: pouze role, které už v projektu mají mandays > 0, musí mít nenulový odhad
    const projectMandays = [
      { key: 'fe_mandays', label: 'FE' },
      { key: 'be_mandays', label: 'BE' },
      { key: 'qa_mandays', label: 'QA' },
      { key: 'pm_mandays', label: 'PM' },
      { key: 'dpl_mandays', label: 'DPL' },
    ];
    const missing = projectMandays.filter(r => Number(editProject[r.key as keyof Project]) > 0 && Number(editProject[r.key as keyof Project]) === 0);
    if (missing.length > 0) {
      alert('Odhad mandays nesmí být 0 pro existující role v projektu.');
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('projects').update(editProject).eq('id', editProject.id);
    if (!error) {
      onProjectChange(editProject);
      // --- Ulož změny do project_progress pokud se změnilo % hotovo ---
      if (initialEditState.current) {
        const changed: Partial<ProjectProgress> = {};
        if (editProject.fe_done !== initialEditState.current.fe_done) changed.fe_done = Number(editProject.fe_done);
        if (editProject.be_done !== initialEditState.current.be_done) changed.be_done = Number(editProject.be_done);
        if (editProject.qa_done !== initialEditState.current.qa_done) changed.qa_done = Number(editProject.qa_done);
        if (editProject.pm_done !== initialEditState.current.pm_done) changed.pm_done = Number(editProject.pm_done);
        if (editProject.dpl_done !== initialEditState.current.dpl_done) changed.dpl_done = Number(editProject.dpl_done);
        if (Object.keys(changed).length > 0) {
          const progress: ProjectProgress = {
            project_id: editProject.id,
            date: new Date().toISOString(),
            ...changed
          };
          await supabase.from('project_progress').insert([progress]);
        }
      }
      onClose();
    } else {
      alert('Chyba při ukládání projektu.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="rounded-2xl bg-background shadow-2xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={onClose} aria-label="Zavřít">×</button>
        <h3 className="text-2xl font-bold mb-6 text-center">Upravit projekt</h3>
        <form className="flex flex-col gap-6" onSubmit={e => { e.preventDefault(); handleSaveEditProject(); }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 font-medium">Název projektu</label>
              <input className="border rounded px-3 py-2 w-full" value={editProject.name} onChange={e => setEditProject(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Priorita</label>
              <input className="border rounded px-3 py-2 w-full" type="number" min={1} value={editProject.priority} onChange={e => setEditProject(p => ({ ...p, priority: Number(e.target.value) }))} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Termín dodání</label>
              <input className="border rounded px-3 py-2 w-full" type="date" value={editProject.delivery_date || ''} onChange={e => setEditProject(p => ({ ...p, delivery_date: e.target.value }))} />
            </div>
          </div>
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {projectRoles.map(role =>
              Number(editProject[role.mandays as keyof Project]) > 0 && (
                <div className="flex flex-col gap-2" key={role.key}>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block mb-1 font-medium">Odhad {role.label} (MD)</label>
                      <input
                        className="border rounded px-3 py-2 w-full"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={Number(editProject[role.mandays as keyof Project]) || ''}
                        onChange={e => setEditProject(p => ({ ...p, [role.mandays]: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block mb-1 font-medium">% {role.label} hotovo</label>
                      <input
                        className="border rounded px-3 py-2 w-full"
                        type="number"
                        min={0}
                        max={100}
                        value={Number(editProject[role.done as keyof Project]) || ''}
                        onChange={e => setEditProject(p => ({ ...p, [role.done]: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" className="px-5 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300" onClick={onClose}>Zrušit</button>
            <button type="submit" className="px-5 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow">Uložit změny</button>
          </div>
        </form>
      </div>
    </div>
  );
}; 