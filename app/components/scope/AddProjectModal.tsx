/**
 * Modern Add Project Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState, useEffect, useCallback } from 'react';
import { Project } from './types';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { FiPlus } from 'react-icons/fi';
import { useScopeRoles } from '@/app/hooks/useScopeRoles';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: Omit<Project, 'id' | 'scope_id' | 'created_at'>) => Promise<void>;
  savingProject: boolean;
  scopeId: string;
  existingProjects: Project[]; // Přidáno pro výpočet priority
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddProject, 
  savingProject, 
  scopeId,
  existingProjects
}) => {
  const { t } = useTranslation();
  const { activeRoles } = useScopeRoles(scopeId);
  
  // Vypočítáme automaticky priority na základě existujících projektů
  const calculateNextPriority = useCallback(() => {
    return existingProjects.length + 1;
  }, [existingProjects]);
  
  // Vytvoříme dynamický objekt pro mandays a done hodnoty
  const createInitialProjectData = useCallback(() => {
    const baseData = {
      name: '',
      priority: calculateNextPriority(),
      delivery_date: null,
    } as Omit<Project, 'id' | 'scope_id' | 'created_at'>;
    
    // Přidáme pole pro každou aktivní roli
    activeRoles.forEach(role => {
      // Rozlišíme mezi standardními a custom rolemi
      const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
      let cleanKey: string;
      
      if (standardRoleKeys.includes(role.key)) {
        // Standardní role - klíč je přímo fe, be, atd.
        cleanKey = role.key;
      } else {
        // Custom role - klíč obsahuje suffix, extrahujeme základní název
        cleanKey = role.key.replace(/_mandays$/, '').replace(/_done$/, '');
      }
      
      (baseData as Record<string, unknown>)[`${cleanKey}_mandays`] = 0;
      (baseData as Record<string, unknown>)[`${cleanKey}_done`] = 0;
    });
    
    return baseData;
  }, [activeRoles, calculateNextPriority]);
  
  const [newProject, setNewProject] = useState<Omit<Project, 'id' | 'scope_id' | 'created_at'>>(() => {
    // Inicializujeme až když jsou activeRoles dostupné
    if (activeRoles.length === 0) {
      return {
        name: '',
        priority: 1,
        delivery_date: null,
      } as Omit<Project, 'id' | 'scope_id' | 'created_at'>;
    }
    return createInitialProjectData();
  });

  // Reset priority při otevření modalu
  useEffect(() => {
    if (isOpen) {
      setNewProject(prev => ({
        ...prev,
        priority: calculateNextPriority()
      }));
    }
  }, [isOpen, existingProjects, calculateNextPriority]);

  // Aktualizuj newProject když se načtou activeRoles
  useEffect(() => {
    if (activeRoles.length > 0 && Object.keys(newProject).length <= 3) {
      // Resetujeme pouze pokud newProject obsahuje jen základní pole (name, priority, delivery_date)
      // To znamená, že ještě nebyly inicializovány role
      setNewProject(createInitialProjectData());
    }
  }, [activeRoles, createInitialProjectData, newProject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(newProject.name as string)?.trim()) return;
    
    // Vytvoříme kopii projektu a odstraníme role s 0 mandays
    const projectToSubmit = { ...newProject };
    
    // Odstraníme role s 0 mandays - nebudou se ukládat do databáze
    activeRoles.forEach(role => {
      // Rozlišíme mezi standardními a custom rolemi
      const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
      let cleanKey: string;
      
      if (standardRoleKeys.includes(role.key)) {
        // Standardní role - klíč je přímo fe, be, atd.
        cleanKey = role.key;
      } else {
        // Custom role - klíč obsahuje suffix, extrahujeme základní název
        cleanKey = role.key.replace(/_mandays$/, '').replace(/_done$/, '');
      }
      
      const mandaysKey = `${cleanKey}_mandays`;
      const doneKey = `${cleanKey}_done`;
      const mandaysValue = projectToSubmit[mandaysKey as keyof typeof projectToSubmit] as number;
      
      // Odstraňujeme pouze standardní role s 0 mandays
      // Custom role se neodstraňují, protože se ukládají do custom_role_data
      if (standardRoleKeys.includes(role.key) && mandaysValue === 0) {
        // Odstraníme pole s 0 mandays pouze pro standardní role
        delete (projectToSubmit as Record<string, unknown>)[mandaysKey];
        delete (projectToSubmit as Record<string, unknown>)[doneKey];
      }
    });
    
    await onAddProject(projectToSubmit);
    setNewProject(createInitialProjectData());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('addNewProject')}
      icon={<FiPlus size={24} className="text-white" />}
    >
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        {/* Základní informace */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('projectName')}</label>
            <input
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              placeholder={t('projectName')}
              value={newProject.name as string || ''}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              disabled={savingProject}
              required
            />
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('deliveryDate')}</label>
            <input
              type="date"
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              value={newProject.delivery_date || ''}
              onChange={e => setNewProject(p => ({ ...p, delivery_date: e.target.value || null }))}
            />
          </div>
        </div>
        
        {/* Role estimates */}
        {activeRoles.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t("roleAndProgress")}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRoles.map(role => (
              <div key={role.key} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: role.color }}
                  ></div>
                  <h5 className="font-medium text-gray-800 dark:text-gray-200">{role.label}</h5>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {t("estimate")} {role.label} (MD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={(() => {
                      const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
                      const cleanKey = standardRoleKeys.includes(role.key) 
                        ? role.key 
                        : role.key.replace(/_mandays$/, '').replace(/_done$/, '');
                      return (newProject[`${cleanKey}_mandays` as keyof typeof newProject] as number || 0);
                    })()}
                    onChange={e => {
                      const standardRoleKeys = ['fe', 'be', 'qa', 'pm', 'dpl'];
                      const cleanKey = standardRoleKeys.includes(role.key) 
                        ? role.key 
                        : role.key.replace(/_mandays$/, '').replace(/_done$/, '');
                      const newValue = Number(e.target.value);
                      setNewProject(p => {
                        const updated = { 
                          ...p, 
                          [`${cleanKey}_mandays`]: newValue 
                        } as Omit<Project, 'id' | 'scope_id' | 'created_at'>;
                        return updated;
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    disabled={savingProject}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={savingProject}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={savingProject || !(newProject.name as string)?.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {savingProject ? t('adding') : t('addProject')}
          </button>
        </div>
      </form>
    </Modal>
  );
}; 