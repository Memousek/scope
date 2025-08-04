/**
 * Zjednodušené modální okno pro správu workflow a aktivních pracovníků
 * Zaměřeno na workflow šablony a stav pracovníků s reálnými daty
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { Badge } from '@/app/components/ui/Badge';

import { DependencyService, DependencyItem, ActiveWorker } from '@/app/services/dependencyService';
import { FiInfo } from 'react-icons/fi';

interface RoleDependenciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectAssignments: Array<{ teamMemberId: string; role: string }>;
  onWorkflowChange?: (workflow: string) => void;
  onWorkersChange?: (workers: ActiveWorker[]) => void;
}

export const RoleDependenciesModal: React.FC<RoleDependenciesModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectAssignments,
  onWorkflowChange,
  onWorkersChange
}) => {

  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('FE-First');
  const [activeWorkers, setActiveWorkers] = useState<ActiveWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDependencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dependencies = await DependencyService.getProjectDependencies(projectId);
      setSelectedWorkflow(dependencies.workflow_type);
      setActiveWorkers(dependencies.active_workers);
    } catch (err) {
      console.error('Error loading dependencies:', err);
      setError('Nepodařilo se načíst závislosti projektu');
      setSelectedWorkflow('FE-First');
      setActiveWorkers(DependencyService.getDefaultActiveWorkers(projectAssignments));
    } finally {
      setLoading(false);
    }
  }, [projectId, projectAssignments]);

  // Load dependencies when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      loadDependencies();
    }
  }, [isOpen, projectId, loadDependencies]);

  const handleWorkflowSelect = (workflowId: string) => {
    setSelectedWorkflow(workflowId);
    const templates = DependencyService.getWorkflowTemplates();
    const selectedTemplate = templates.find((w) => w.id === workflowId);
    if (selectedTemplate) {
      // Update dependencies based on selected template
      // This would be handled by the service
    }
  };

  const handleWorkerStatusChange = (role: string, newStatus: 'active' | 'waiting' | 'blocked') => {
    setActiveWorkers(prev =>
      prev.map(worker =>
        worker.role === role
          ? { ...worker, status: newStatus }
          : worker
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const templates = DependencyService.getWorkflowTemplates();
      const selectedTemplate = templates.find((w) => w.id === selectedWorkflow);
      const dependencies: DependencyItem[] = selectedTemplate?.dependencies || [];

      await DependencyService.saveProjectDependencies({
        projectId,
        workflowType: selectedWorkflow,
        dependencies,
        activeWorkers
      });

      onWorkflowChange?.(selectedWorkflow);
      onWorkersChange?.(activeWorkers);
      onClose();
    } catch (err) {
      console.error('Error saving dependencies:', err);
      setError('Nepodařilo se uložit závislosti projektu');
    } finally {
      setSaving(false);
    }
  };

  const getStatusOptions = () => [
    { value: 'active', label: 'Aktivní' },
    { value: 'waiting', label: 'Čeká' },
    { value: 'blocked', label: 'Blokován' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Závislosti rolí"
      description="Spravujte workflow a stav pracovníků na projektu"
      icon={<FiInfo className="text-2xl" />}
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Načítání...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-8">
          {/* Workflow Selection */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vyberte workflow</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DependencyService.getWorkflowTemplates().map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => handleWorkflowSelect(workflow.id)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedWorkflow === workflow.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {workflow.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {workflow.flow}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {workflow.description}
                      </p>
                    </div>
                    {selectedWorkflow === workflow.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Custom Workflow Option */}
              <div
                onClick={() => handleWorkflowSelect('Custom')}
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${selectedWorkflow === 'Custom'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        Vlastní workflow
                      </h4>
                      <Badge label="Experimental" variant="warning" className="text-xs" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Definujte si vlastní flow
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Vytvořte si vlastní workflow podle potřeb projektu
                    </p>
                  </div>
                  {selectedWorkflow === 'Custom' && (
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Workers Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stav pracovníků na projektu</h3>
            </div>
            <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/30 shadow-lg">
              <div className="space-y-4">
                {activeWorkers.map((worker) => (
                  <div key={worker.role} className="relative group">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/80 to-gray-100/60 dark:from-gray-700/80 dark:to-gray-600/60 rounded-xl border border-gray-200/30 dark:border-gray-600/30 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center gap-4">
                        {/* Status indicator */}
                        <div className={`w-3 h-3 rounded-full ${worker.status === 'active'
                            ? 'bg-green-500 animate-pulse'
                            : worker.status === 'waiting'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}></div>

                        {/* Role icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md ${worker.status === 'active'
                            ? 'bg-gradient-to-br from-green-500 to-green-600'
                            : worker.status === 'waiting'
                              ? 'bg-gradient-to-br from-yellow-500 to-yellow-600'
                              : 'bg-gradient-to-br from-red-500 to-red-600'
                          }`}>
                          {worker.role.charAt(0)}
                        </div>

                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{worker.role}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{worker.name}</p>
                        </div>
                      </div>

                      {/* Status toggle buttons */}
                      <div className="flex items-center gap-2">
                        {getStatusOptions().map(option => (
                          <button
                            key={option.value}
                            onClick={() => handleWorkerStatusChange(worker.role, option.value as 'active' | 'waiting' | 'blocked')}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${worker.status === option.value
                                ? 'bg-gradient-to-r shadow-lg scale-105'
                                : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                              } ${option.value === 'active'
                                ? worker.status === option.value
                                  ? 'from-green-500 to-green-600 text-white'
                                  : 'text-green-700 dark:text-green-300 hover:from-green-100 hover:to-green-200'
                                : option.value === 'waiting'
                                  ? worker.status === option.value
                                    ? 'from-yellow-500 to-yellow-600 text-white'
                                    : 'text-yellow-700 dark:text-yellow-300 hover:from-yellow-100 hover:to-yellow-200'
                                  : worker.status === option.value
                                    ? 'from-red-500 to-red-600 text-white'
                                    : 'text-red-700 dark:text-red-300 hover:from-red-100 hover:to-red-200'
                              }`}
                          >
                            <span className="text-xs font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {activeWorkers.length === 0 && (
                  <div className="flex items-center justify-center">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
                    <div className="text-blue-600 dark:text-blue-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      </div>
                      <h5 className="text-lg font-medium text-blue-800 dark:text-blue-300 mb-2">Zatím nejsou připojeni žádní pracovníci k projektu</h5>
                      <p className="text-blue-700 dark:text-blue-400 text-sm">Pro připojení pracovníků k projektu je potřeba nejprve přidat pracovníky do projektu.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
        <button
          disabled={saving}
          onClick={onClose}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          Zrušit
        </button>
        <button
          disabled={saving || loading}
          onClick={handleSave}
          className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Ukládání...
            </div>
          ) : (
            'Uložit'
          )}
        </button>
      </div>
    </Modal>
  );
}; 