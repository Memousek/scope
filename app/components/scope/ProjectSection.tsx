import { useState, useEffect } from 'react';
import { Project } from './types';
import { EditProjectModal } from './EditProjectModal';
import { ProjectBurndown } from './ProjectBurndown';
import { AddProjectModal } from './AddProjectModal';
import { ProjectHistoryModal } from './ProjectHistoryModal';
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

export function ProjectSection({ scopeId, hasFE, hasBE, hasQA, hasPM, hasDPL }: ProjectSectionProps) {
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
            <button
              className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition w-full sm:w-auto mt-2 sm:mt-0"
              onClick={() => setAddModalOpen(true)}
            >
              Přidat projekt
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-[700px] w-full text-sm rounded-lg shadow border border-gray-200">
              <thead>
                <tr className="text-gray-700 font-semibold">
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-left rounded-tl-lg">Název projektu</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">Priorita</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">Odhad FE (MD)</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">% FE hotovo</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">Odhad BE (MD)</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">% BE hotovo</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">Odhad QA (MD)</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">% QA hotovo</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">Odhad PM (MD)</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">% PM hotovo</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">Odhad DPL (MD)</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-right">% DPL hotovo</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-center">Termín dodání</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-center">Spočítaný termín</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-center">Skluz</th>
                  <th className="px-2 py-1 sm:px-3 sm:py-2 text-center rounded-tr-lg">Akce</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={15} className="text-gray-400 text-center py-4">Žádné projekty</td></tr>
                ) : (
                  projects.map(project => {
                    const info = calculateProjectDeliveryInfo(project, team);
                    return (
                      <tr key={project.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{project.name}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{project.priority}</td>
                        {/* FE */}
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.fe_mandays) > 0 ? Number(project.fe_mandays) : '-'}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.fe_mandays) > 0 ? (Number(project.fe_done) || 0) + ' %' : '-'}</td>
                        {/* BE */}
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.be_mandays) > 0 ? Number(project.be_mandays) : '-'}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.be_mandays) > 0 ? (Number(project.be_done) || 0) + ' %' : '-'}</td>
                        {/* QA */}
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.qa_mandays) > 0 ? Number(project.qa_mandays) : '-'}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.qa_mandays) > 0 ? (Number(project.qa_done) || 0) + ' %' : '-'}</td>
                        {/* PM */}
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.pm_mandays) > 0 ? Number(project.pm_mandays) : '-'}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.pm_mandays) > 0 ? (Number(project.pm_done) || 0) + ' %' : '-'}</td>
                        {/* DPL */}
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.dpl_mandays) > 0 ? Number(project.dpl_mandays) : '-'}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-right">{Number(project.dpl_mandays) > 0 ? (Number(project.dpl_done) || 0) + ' %' : '-'}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-center">{project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : ''}</td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-center">{info.calculatedDeliveryDate.toLocaleDateString()}</td>
                        <td className={`px-2 py-1 sm:px-3 sm:py-2 align-middle text-center font-semibold ${info.diffWorkdays === null ? '' : info.diffWorkdays >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {info.diffWorkdays === null ? '' : info.diffWorkdays >= 0 ? `+${info.diffWorkdays} dní` : `${info.diffWorkdays} dní`}
                        </td>
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle text-center whitespace-nowrap">
                          <button className="text-blue-600 font-semibold hover:underline mr-2" onClick={() => handleOpenEditModal(project)}>Upravit</button>
                          <button className="text-blue-600 font-semibold hover:underline mr-2" onClick={() => setHistoryModalProject(project)}>Historie</button>
                          <button className="text-red-600 font-semibold hover:underline" onClick={() => handleDeleteProject(project.id)}>Smazat</button>
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

      {/* Výsledky a burndown grafy */}
      <div className="my-8">
        <h3 className="text-lg font-semibold mb-2">Burndown & termíny</h3>
        {projects.map(project => {
          const info = calculateProjectDeliveryInfo(project, team);
          return (
            <ProjectBurndown
              key={project.id + '-' + refreshKey}
              project={{ ...project, slip: info.diffWorkdays }}
              deliveryInfo={info}
              priorityStartDate={priorityDates[project.id].priorityStartDate}
              priorityEndDate={priorityDates[project.id].priorityEndDate}
              blockingProjectName={priorityDates[project.id].blockingProjectName}
              showBlockingBg={!!priorityDates[project.id].blockingProjectName}
            />
          );
        })}
      </div>

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
        />
      )}
    </>
  );
} 