/**
 * Modern Project Section Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Kompletní správa projektů
 * - Moderní UI s gradient efekty
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/translation';
import { useProjects } from '@/app/hooks/useProjects';
import { useTeam } from '@/app/hooks/useTeam';
import { Project } from './types';
import { AddProjectModal } from './AddProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ProjectHistoryModal } from './ProjectHistoryModal';
import { calculateProjectDeliveryInfo } from '@/app/utils/dateUtils';

interface ProjectSectionProps {
  scopeId: string;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
}

export function ProjectSection({ scopeId, hasFE, hasBE, hasQA, hasPM, hasDPL }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { 
    projects, 
    loading: projectsLoading, 
    addProject, 
    updateProject, 
    deleteProject,
    loadProjects 
  } = useProjects(scopeId);
  
  const { 
    team, 
    loadTeam 
  } = useTeam(scopeId);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [historyModalProject, setHistoryModalProject] = useState<Project | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadProjects();
    loadTeam();
  }, [loadProjects, loadTeam]);

  const handleAddProject = async (project: Omit<Project, 'id' | 'scope_id' | 'created_at'>) => {
    try {
      await addProject(project);
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditProject({ ...project });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditProject(null);
  };

  const handleProjectChange = async (updatedProject: Project) => {
    try {
      await updateProject(updatedProject.id, updatedProject);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  // Define project roles for EditProjectModal
  const projectRoles = [
    { key: 'fe', label: 'FE', mandays: 'fe_mandays', done: 'fe_done', color: '#2563eb' },
    { key: 'be', label: 'BE', mandays: 'be_mandays', done: 'be_done', color: '#059669' },
    { key: 'qa', label: 'QA', mandays: 'qa_mandays', done: 'qa_done', color: '#f59e42' },
    { key: 'pm', label: 'PM', mandays: 'pm_mandays', done: 'pm_done', color: '#a21caf' },
    { key: 'dpl', label: 'DPL', mandays: 'dpl_mandays', done: 'dpl_done', color: '#e11d48' },
  ];

  return (
    <>
      <AddProjectModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddProject={handleAddProject}
        savingProject={projectsLoading}
        hasFE={hasFE}
        hasBE={hasBE}
        hasQA={hasQA}
        hasPM={hasPM}
        hasDPL={hasDPL}
      />

      {/* Projekty */}
      <section className="mb-8">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🚀 {t('projects')}
            </h2>
            <button
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 shadow-lg font-medium"
              onClick={() => setAddModalOpen(true)}
            >
              {t('addProject')}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-3 text-left">{t('projectName')}</th>
                  <th className="px-3 py-3 text-right">{t('priority')}</th>
                  <th className="px-3 py-3 text-right">{t('fe_mandays')}</th>
                  <th className="px-3 py-3 text-right">% FE {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('be_mandays')}</th>
                  <th className="px-3 py-3 text-right">% BE {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('qa_mandays')}</th>
                  <th className="px-3 py-3 text-right">% QA {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('pm_mandays')}</th>
                  <th className="px-3 py-3 text-right">% PM {t('done')}</th>
                  <th className="px-3 py-3 text-right">{t('dpl_mandays')}</th>
                  <th className="px-3 py-3 text-right">% DPL {t('done')}</th>
                  <th className="px-3 py-3 text-center">{t('deliveryDate')}</th>
                  <th className="px-3 py-3 text-center">{t('calculatedDelivery')}</th>
                  <th className="px-3 py-3 text-center">{t('delay')}</th>
                  <th className="px-3 py-3 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-gray-400 dark:text-gray-500 text-center py-8">
                      {t('noProjects')}
                    </td>
                  </tr>
                ) : (
                  projects.map(project => {
                    const info = calculateProjectDeliveryInfo(project, team);
                    return (
                      <tr key={project.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-3 py-3 align-middle font-medium text-gray-900 dark:text-gray-100">
                          {project.name}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs">
                            {project.priority}
                          </span>
                        </td>
                        {/* FE */}
                        <td className="px-3 py-3 align-middle text-right text-gray-600 dark:text-gray-400">
                          {Number(project.fe_mandays) > 0 ? Number(project.fe_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.fe_mandays) > 0 ? (
                            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                              {(Number(project.fe_done) || 0)}%
                            </span>
                          ) : '-'}
                        </td>
                        {/* BE */}
                        <td className="px-3 py-3 align-middle text-right text-gray-600 dark:text-gray-400">
                          {Number(project.be_mandays) > 0 ? Number(project.be_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.be_mandays) > 0 ? (
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs">
                              {(Number(project.be_done) || 0)}%
                            </span>
                          ) : '-'}
                        </td>
                        {/* QA */}
                        <td className="px-3 py-3 align-middle text-right text-gray-600 dark:text-gray-400">
                          {Number(project.qa_mandays) > 0 ? Number(project.qa_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.qa_mandays) > 0 ? (
                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-1 rounded text-xs">
                              {(Number(project.qa_done) || 0)}%
                            </span>
                          ) : '-'}
                        </td>
                        {/* PM */}
                        <td className="px-3 py-3 align-middle text-right text-gray-600 dark:text-gray-400">
                          {Number(project.pm_mandays) > 0 ? Number(project.pm_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.pm_mandays) > 0 ? (
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 px-2 py-1 rounded text-xs">
                              {(Number(project.pm_done) || 0)}%
                            </span>
                          ) : '-'}
                        </td>
                        {/* DPL */}
                        <td className="px-3 py-3 align-middle text-right text-gray-600 dark:text-gray-400">
                          {Number(project.dpl_mandays) > 0 ? Number(project.dpl_mandays) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-right">
                          {Number(project.dpl_mandays) > 0 ? (
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-1 rounded text-xs">
                              {(Number(project.dpl_done) || 0)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                          {project.delivery_date ? new Date(project.delivery_date).toISOString().slice(0, 10) : ''}
                        </td>
                        <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                          {info.calculatedDeliveryDate.toLocaleDateString()}
                        </td>
                        <td className={`px-3 py-3 align-middle text-center font-semibold ${
                          info.diffWorkdays === null ? '' : 
                          info.diffWorkdays >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {info.diffWorkdays === null ? '' : 
                           info.diffWorkdays >= 0 ? `+${info.diffWorkdays} ${t('days')}` : 
                           `${info.diffWorkdays} ${t('days')}`}
                        </td>
                        <td className="px-3 py-3 align-middle text-center whitespace-nowrap">
                          <button 
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 hover:underline mr-2 transition-colors duration-200" 
                            onClick={() => handleOpenEditModal(project)}
                          >
                            {t('edit')}
                          </button>
                          <button 
                            className="text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 hover:underline mr-2 transition-colors duration-200" 
                            onClick={() => setHistoryModalProject(project)}
                          >
                            {t('history')}
                          </button>
                          <button 
                            className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors duration-200" 
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            {t('delete')}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal pro editaci projektu */}
      {editModalOpen && editProject && (
        <EditProjectModal
          isOpen={editModalOpen}
          onClose={handleCloseEditModal}
          project={editProject}
          onProjectChange={handleProjectChange}
          projectRoles={projectRoles}
        />
      )}

      {/* Modal pro historii úprav */}
      {historyModalProject && (
        <ProjectHistoryModal
          project={historyModalProject}
          onClose={() => setHistoryModalProject(null)}
          onProjectUpdate={loadProjects}
        />
      )}
    </>
  );
} 