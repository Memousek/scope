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
import { getDefaultProjectValues } from '@/lib/utils/projectRoles';

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

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddProject, 
  savingProject, 
  hasFE, 
  hasBE, 
  hasQA, 
  hasPM, 
  hasDPL 
}) => {
  const { t } = useTranslation();
  const [newProject, setNewProject] = useState<Omit<Project, 'id' | 'scope_id' | 'created_at'>>({
    name: '',
    priority: 1,
    delivery_date: null,
    fe_mandays: null,
    be_mandays: null,
    qa_mandays: null,
    pm_mandays: null,
    dpl_mandays: null,
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
      delivery_date: null,
      fe_mandays: null,
      be_mandays: null,
      qa_mandays: null,
      pm_mandays: null,
      dpl_mandays: null,
      fe_done: 0,
      be_done: 0,
      qa_done: 0,
      pm_done: 0,
      dpl_done: 0
    });
    onClose();
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

  const roleConfigs = [
    { key: 'fe', label: 'FE', hasRole: hasFE, color: '#2563eb' },
    { key: 'be', label: 'BE', hasRole: hasBE, color: '#059669' },
    { key: 'qa', label: 'QA', hasRole: hasQA, color: '#f59e42' },
    { key: 'pm', label: 'PM', hasRole: hasPM, color: '#a21caf' },
    { key: 'dpl', label: 'DPL', hasRole: hasDPL, color: '#e11d48' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ backdropFilter: 'blur(8px)' }}>
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh] mx-4">
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-3xl font-bold transition-colors duration-200" 
          onClick={onClose} 
          aria-label={t('close')}
        >
          ×
        </button>
        
        <h4 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          🚀 {t('addNewProject')}
        </h4>
        
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* Základní informace */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('priority')}</label>
              <input
                className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                type="number"
                min={1}
                value={newProject.priority}
                onChange={e => setNewProject(p => ({ ...p, priority: Number(e.target.value) }))}
                disabled={savingProject}
                required
              />
            </div>
            <div>
              <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('deliveryDate')}</label>
              <input
                className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                type="date"
                value={newProject.delivery_date || ''}
                onChange={e => setNewProject(p => ({ ...p, delivery_date: e.target.value || null }))}
                disabled={savingProject}
                required
              />
            </div>
          </div>
          
          {/* Role estimates */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Odhad mandays podle rolí</h4>
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
                      <label className="block mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t(`${config.key}Estimate`)}
                      </label>
                      <input
                        className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={newProject[`${config.key}_mandays` as keyof typeof newProject] ?? ''}
                        onChange={e => setNewProject(p => ({ ...p, [`${config.key}_mandays`]: Number(e.target.value) }))}
                        disabled={savingProject}
                        required
                      />
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
              {t('cancel')}
            </button>
            <button
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg disabled:opacity-60"
              type="submit"
              disabled={savingProject || !newProject.name.trim()}
            >
              {savingProject ? t('saving') : t('addProject')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 