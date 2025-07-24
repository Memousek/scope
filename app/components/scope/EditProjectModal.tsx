/**
 * Modern Edit Project Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project, ProjectProgress } from './types';
import { PROJECT_ROLES } from '@/lib/utils/projectRoles';
import { ProjectService } from '@/app/services/projectService';

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
    const projectMandays = PROJECT_ROLES.map(role => ({
      key: role.mandaysKey,
      label: role.label
    }));
    const missing = projectMandays.filter(r => Number(editProject[r.key as keyof Project]) > 0 && Number(editProject[r.key as keyof Project]) === 0);
    if (missing.length > 0) {
      alert('Odhad mandays nesmí být 0 pro existující role v projektu.');
      return;
    }
    
    try {
      const updatedProject = await ProjectService.updateProject(editProject.id, editProject);
      onProjectChange(updatedProject);
      
      // --- Ulož změny do project_progress pokud se změnilo % hotovo ---
      if (initialEditState.current) {
        const changed: Partial<ProjectProgress> = {};
        if (editProject.fe_done !== initialEditState.current.fe_done) changed.fe_done = Number(editProject.fe_done);
        if (editProject.be_done !== initialEditState.current.be_done) changed.be_done = Number(editProject.be_done);
        if (editProject.qa_done !== initialEditState.current.qa_done) changed.qa_done = Number(editProject.qa_done);
        if (editProject.pm_done !== initialEditState.current.pm_done) changed.pm_done = Number(editProject.pm_done);
        if (editProject.dpl_done !== initialEditState.current.dpl_done) changed.dpl_done = Number(editProject.dpl_done);
        if (Object.keys(changed).length > 0) {
          await ProjectService.saveProjectProgress(editProject.id, changed);
        }
      }
      onClose();
    } catch (error) {
      console.error('Chyba při ukládání projektu:', error);
      alert('Chyba při ukládání projektu.');
    }
  };

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

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" style={{ backdropFilter: 'blur(12px)', zIndex: 9999 }}>
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh] mx-4">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-3xl font-bold transition-colors duration-200" 
          onClick={onClose} 
          aria-label="Zavřít"
        >
          ×
        </button>
        
        <h4 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          ✏️ Upravit projekt
        </h4>
        
        <form className="flex flex-col gap-6" onSubmit={e => { e.preventDefault(); handleSaveEditProject(); }}>
          {/* Základní informace */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Název projektu</label>
              <input 
                className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200" 
                value={editProject.name} 
                onChange={e => setEditProject(p => ({ ...p, name: e.target.value }))} 
                required 
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Priorita</label>
              <input 
                className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200" 
                type="number" 
                min={1} 
                value={editProject.priority} 
                onChange={e => setEditProject(p => ({ ...p, priority: Number(e.target.value) }))} 
                required 
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Termín dodání</label>
              <input 
                className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200" 
                type="date" 
                value={editProject.delivery_date || ''} 
                onChange={e => setEditProject(p => ({ ...p, delivery_date: e.target.value }))} 
              />
            </div>
          </div>
          
          {/* Role a progress */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Role a progress</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projectRoles.map(role =>
                Number(editProject[role.mandays as keyof Project]) > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600" key={role.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: role.color }}
                      ></div>
                      <h5 className="font-medium text-gray-800 dark:text-gray-200">{role.label}</h5>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">Odhad (MD)</label>
                        <input
                          className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={Number(editProject[role.mandays as keyof Project]) || ''}
                          onChange={e => setEditProject(p => ({ ...p, [role.mandays]: Number(e.target.value) }))}
                        />
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                          % hotovo
                          {(() => {
                            const mandays = Number(editProject[role.mandays as keyof Project]) || 0;
                            const donePercent = Number(editProject[role.done as keyof Project]) || 0;
                            const doneMandays = mandays > 0 ? (donePercent / 100) * mandays : 0;
                            return ` (${doneMandays.toFixed(1)} MD)`;
                          })()}
                        </label>
                        <input
                          className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={Number(editProject[role.done as keyof Project]) || ''}
                          onChange={e => setEditProject(p => ({ ...p, [role.done]: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
          
          {/* Tlačítka */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              type="button" 
              className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200" 
              onClick={onClose}
            >
              Zrušit
            </button>
            <button 
              type="submit" 
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
            >
              Uložit změny
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}; 