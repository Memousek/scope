/**
 * Modern Add Project Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState, useEffect } from 'react';
import { Project } from './types';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { FiPlus } from 'react-icons/fi';

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
  existingProjects: Project[]; // Přidáno pro výpočet priority
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddProject, 
  savingProject, 
  hasFE, 
  hasBE, 
  hasQA, 
  hasPM, 
  hasDPL,
  existingProjects
}) => {
  const { t } = useTranslation();
  
  // Vypočítáme automaticky priority na základě existujících projektů
  const calculateNextPriority = () => {
    return existingProjects.length + 1;
  };
  
  const [newProject, setNewProject] = useState<Omit<Project, 'id' | 'scope_id' | 'created_at'>>({
    name: '',
    priority: calculateNextPriority(),
    delivery_date: null,
    fe_mandays: 0,
    be_mandays: 0,
    qa_mandays: 0,
    pm_mandays: 0,
    dpl_mandays: 0,
    fe_done: 0,
    be_done: 0,
    qa_done: 0,
    pm_done: 0,
    dpl_done: 0
  });

  // Reset priority při otevření modalu
  useEffect(() => {
    if (isOpen) {
      setNewProject(prev => ({
        ...prev,
        priority: calculateNextPriority()
      }));
    }
  }, [isOpen, existingProjects]);

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
      priority: calculateNextPriority(),
      delivery_date: null,
      fe_mandays: 0,
      be_mandays: 0,
      qa_mandays: 0,
      pm_mandays: 0,
      dpl_mandays: 0,
      fe_done: 0,
      be_done: 0,
      qa_done: 0,
      pm_done: 0,
      dpl_done: 0
    });
    onClose();
  };

  const roleConfigs = [
    { key: 'fe', label: 'FE', hasRole: hasFE, color: '#2563eb' },
    { key: 'be', label: 'BE', hasRole: hasBE, color: '#059669' },
    { key: 'qa', label: 'QA', hasRole: hasQA, color: '#f59e42' },
    { key: 'pm', label: 'PM', hasRole: hasPM, color: '#a21caf' },
    { key: 'dpl', label: 'DPL', hasRole: hasDPL, color: '#e11d48' },
  ];

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
              value={newProject.name}
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
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{t("roleAndProgress")}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleConfigs.map(config => 
              config.hasRole && (
                <div key={config.key} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: config.color }}
                    ></div>
                    <h5 className="font-medium text-gray-800 dark:text-gray-200">{config.label}</h5>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {t("estimate")} {config.label} (MD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={newProject[`${config.key}_mandays` as keyof typeof newProject] as number}
                      onChange={e => setNewProject(p => ({ 
                        ...p, 
                        [`${config.key}_mandays`]: Number(e.target.value) 
                      } as Omit<Project, 'id' | 'scope_id' | 'created_at'>))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      disabled={savingProject}
                      required
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </div>

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
            disabled={savingProject || !newProject.name.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {savingProject ? t('adding') : t('addProject')}
          </button>
        </div>
      </form>
    </Modal>
  );
}; 