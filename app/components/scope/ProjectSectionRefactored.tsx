/**
 * Refactored ProjectSection component
 * Uses custom hooks and smaller components for better separation of concerns
 */

import { useState, useEffect } from 'react';
import { Project } from './types';
import { EditProjectModal } from './EditProjectModal';
import { ProjectBurndown } from './ProjectBurndown';
import { AddProjectModal } from './AddProjectModal';
import { ProjectHistoryModal } from './ProjectHistoryModal';
import { ProjectList } from './projects/ProjectList';
import { useProjects } from '@/app/hooks/useProjects';
import { useTeam } from '@/app/hooks/useTeam';
import { calculateProjectDeliveryInfo, calculatePriorityDates } from '@/app/utils/dateUtils';

interface ProjectSectionProps {
  scopeId: string;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
}

export function ProjectSectionRefactored({ 
  scopeId, 
  hasFE, 
  hasBE, 
  hasQA, 
  hasPM, 
  hasDPL 
}: ProjectSectionProps) {
  const { 
    projects, 
    loading: projectsLoading, 
    error: projectsError,
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
  const [refreshKey, setRefreshKey] = useState(0);
  const [historyModalProject, setHistoryModalProject] = useState<Project | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadProjects();
    loadTeam();
  }, [loadProjects, loadTeam]);

  const handleAddProject = async (project: Omit<Project, 'id' | 'scope_id' | 'created_at'>) => {
    try {
      await addProject(project);
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const success = await deleteProject(projectId);
    if (success) {
      setRefreshKey(k => k + 1);
    }
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
      setRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleViewHistory = (project: Project) => {
    setHistoryModalProject(project);
  };

  const handleCloseHistoryModal = () => {
    setHistoryModalProject(null);
  };

  // Calculate priority dates for all projects
  const priorityDates = calculatePriorityDates(projects, team);

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
      <section>
        <div className="rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-xl font-semibold mb-2 sm:mb-0">Projekty</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Přidat projekt
              </button>
            </div>
          </div>

          {/* Loading state */}
          {projectsLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Načítání projektů...</p>
            </div>
          )}

          {/* Error state */}
          {projectsError && (
            <div className="text-center py-8 text-red-600">
              <p>Chyba při načítání projektů: {projectsError}</p>
            </div>
          )}

          {/* Projects list */}
          {!projectsLoading && !projectsError && (
            <ProjectList
              projects={projects}
              team={team}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteProject}
              onViewHistory={handleViewHistory}
              hasFE={hasFE}
              hasBE={hasBE}
              hasQA={hasQA}
              hasPM={hasPM}
              hasDPL={hasDPL}
            />
          )}
        </div>
      </section>

      {/* Výsledky a burndown grafy */}
      {!projectsLoading && !projectsError && projects.length > 0 && (
        <div className="my-8">
          <h3 className="text-lg font-semibold mb-2">Burndown & termíny</h3>
          {projects.map(project => {
            const deliveryInfo = calculateProjectDeliveryInfo(project, team);
            const priorityInfo = priorityDates[project.id];
            
            return (
              <ProjectBurndown
                key={project.id + '-' + refreshKey}
                project={{ ...project, slip: deliveryInfo.slip }}
                deliveryInfo={deliveryInfo}
                priorityStartDate={priorityInfo?.priorityStartDate}
                priorityEndDate={priorityInfo?.priorityEndDate}
                blockingProjectName={priorityInfo?.blockingProjectName}
                showBlockingBg={!!priorityInfo?.blockingProjectName}
              />
            );
          })}
        </div>
      )}

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
          onClose={handleCloseHistoryModal}
        />
      )}
    </>
  );
} 