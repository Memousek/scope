/**
 * Modern Edit Project Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState, useRef, useEffect } from 'react';
import { Project } from './types';
import { ProjectService } from '@/app/services/projectService';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { FiEdit } from 'react-icons/fi';
import { ProjectStatusSelector } from './ProjectStatusSelector';
import { ProjectStatus } from './ProjectStatusBadge';

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

  // Aktualizujeme editProject když se změní project nebo projectRoles
  useEffect(() => {
    if (project) {
      setEditProject({ ...project });
      initialEditState.current = { ...project };
    }
  }, [project]);

  const handleSaveEditProject = async () => {
    // Validace: pouze role, které už v projektu mají mandays > 0, musí mít nenulový odhad
    const projectMandays = projectRoles.map(role => ({
      key: role.mandays,
      label: role.label
    }));
  const missing = projectMandays.filter(r => Number((editProject as unknown as Record<string, unknown>)[r.key]) > 0 && Number((editProject as unknown as Record<string, unknown>)[r.key]) === 0);
    if (missing.length > 0) {
      alert(t('estimateRequired'));
      return;
    }
    
    try {
      // Rozdělíme data na standardní a custom role
      const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
      const standardData: Record<string, unknown> = {};
      const customData: Record<string, number> = {};
      
      projectRoles.forEach(role => {
  const mandaysValue = (editProject as unknown as Record<string, unknown>)[role.mandays] as number || 0;
  const doneValue = (editProject as unknown as Record<string, unknown>)[role.done] as number || 0;
        
        if (standardRoleKeys.includes(role.key)) {
          // Standardní role - přidáme do standardních sloupců
          standardData[role.mandays] = mandaysValue;
          standardData[role.done] = doneValue;
        } else {
          // Custom role - přidáme do custom data
          customData[role.mandays] = mandaysValue;
          customData[role.done] = doneValue;
        }
      });
      
      // Vytvoříme updates objekt
      const validUpdates: Partial<Project> = {
        name: editProject.name,
        delivery_date: editProject.delivery_date,
        status: editProject.status,
        ...standardData,
        // Přidáme custom role data jako custom_role_data property
        custom_role_data: customData
      };
      
      const updatedProject = await ProjectService.updateProject(editProject.id, validUpdates);
      
      // Předáme aktualizovaný projekt z databáze
      onProjectChange(updatedProject);
      
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('deliveryDate')}</label>
            <input
              type="date"
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              value={editProject.delivery_date ? new Date(editProject.delivery_date).toISOString().split('T')[0] : ''}
              onChange={e => setEditProject(p => ({ ...p, delivery_date: e.target.value || null }))}
              required
            />
          </div>
        </div>
        
        {/* Project Status */}
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('projectStatus')}</label>
          <ProjectStatusSelector
            value={editProject.status as ProjectStatus || 'not_started'}
            onChange={(status) => setEditProject(p => ({ ...p, status }))}
          />
        </div>
        
        {/* Role a progress */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t('roleAndProgress')}</h4>
          
          {projectRoles.length === 0 ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
              <div className="text-blue-600 dark:text-blue-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h5 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">
                {t('noRolesCreated')}
              </h5>
              <p className="text-blue-700 dark:text-blue-400 text-sm">
                {t('createRolesInTeam')}
              </p>
            </div>
          ) : (
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
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        value={(editProject as unknown as Record<string, unknown>)[role.mandays] as number || 0}
                        onChange={e => setEditProject(p => ({ 
                          ...p, 
                          [role.mandays]: Number(e.target.value) 
                        } as Project))}
                        onFocus={(e) => {
                          if (e.target.value === '0') {
                            e.target.value = '';
                          }
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor={`${role.key}-done`} className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        % {t('done')}
                      </label>
                      <input
                        id={`${role.key}-done`}
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        value={(editProject as unknown as Record<string, unknown>)[role.done] as number || 0}
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
          )}
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