/**
 * Modern Edit Project Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState, useRef } from 'react';
import { Project, ProjectProgress } from './types';
import { PROJECT_ROLES } from '@/lib/utils/projectRoles';
import { ProjectService } from '@/app/services/projectService';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { FiEdit } from 'react-icons/fi';

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
  const { t } = useTranslation();
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
      alert(t('estimateRequired'));
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('editProject')}
      icon={<FiEdit size={24} className="text-white" />}
    >
      <div className="space-y-6">
        {/* Základní informace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('projectName')}</label>
            <input
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              value={editProject.name || ''}
              onChange={e => setEditProject(p => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('priority')}</label>
            <input
              type="number"
              min="1"
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              value={editProject.priority || 1}
              onChange={e => setEditProject(p => ({ ...p, priority: Number(e.target.value) }))}
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('deliveryDate')}</label>
            <input
              type="date"
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              value={editProject.delivery_date || ''}
              onChange={e => setEditProject(p => ({ ...p, delivery_date: e.target.value || null }))}
              required
            />
          </div>
        </div>
        
        {/* Role a progress */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('roleAndProgress')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectRoles.map(role => (
              <div key={role.key} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: role.color }}
                  ></div>
                  <h5 className="font-medium text-gray-800 dark:text-gray-200">{role.label}</h5>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t('estimate')} (MD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={editProject[role.mandays as keyof Project] as number || 0}
                      onChange={e => setEditProject(p => ({ 
                        ...p, 
                        [role.mandays]: Number(e.target.value) 
                      } as Project))}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={`${role.key}-done`} className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      % {t('done')} ({editProject[role.done as keyof Project] as number || 0} MD)
                    </label>
                    <input
                      id={`${role.key}-done`}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={editProject[role.done as keyof Project] as number || 0}
                      onChange={e => setEditProject(p => ({ 
                        ...p, 
                        [role.done]: Number(e.target.value) 
                      } as Project))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-all duration-200"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSaveEditProject}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105"
          >
            {t('saveChanges')}
          </button>
        </div>
      </div>
    </Modal>
  );
}; 