import { useState, Fragment } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Project, TeamMember, ProjectDeliveryInfo } from './types';
import { EditProjectModal } from './EditProjectModal';
import { ProjectBurndown } from './ProjectBurndown';
import { AddProjectModal } from './AddProjectModal';

interface ProjectSectionProps {
  scopeId: string;
  projects: Project[];
  team: TeamMember[];
  onProjectsChange: (projects: Project[]) => void;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
}

export function ProjectSection({ scopeId, projects, team, onProjectsChange, hasFE, hasBE, hasQA, hasPM, hasDPL }: ProjectSectionProps) {
  // DEBUG: výrazný log v ProjectSection
  console.log('RENDERUJE SE ProjectSection.tsx, props:', { scopeId, projects, team, onProjectsChange, hasFE, hasBE, hasQA, hasPM, hasDPL });
  const [savingProject, setSavingProject] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const projectRoles = [
    { key: 'fe', label: 'FE', mandays: 'fe_mandays', done: 'fe_done', color: '#2563eb' },
    { key: 'be', label: 'BE', mandays: 'be_mandays', done: 'be_done', color: '#059669' },
    { key: 'qa', label: 'QA', mandays: 'qa_mandays', done: 'qa_done', color: '#f59e42' },
    { key: 'pm', label: 'PM', mandays: 'pm_mandays', done: 'pm_done', color: '#a21caf' },
    { key: 'dpl', label: 'DPL', mandays: 'dpl_mandays', done: 'dpl_done', color: '#e11d48' },
  ];

  const handleAddProject = async (project: Omit<Project, 'id' | 'scope_id' | 'created_at'>) => {
    setSavingProject(true);
    const supabase = createClient();
    const { error, data } = await supabase.from('projects').insert([
      { ...project, scope_id: scopeId }
    ]).select();
    setSavingProject(false);
    if (!error && data && data[0]) {
      onProjectsChange([...projects, data[0]]);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Opravdu chcete tento projekt nenávratně smazat včetně všech dat?')) return;
    const supabase = createClient();
    // Smaž navázané progressy
    await supabase.from('project_progress').delete().eq('project_id', projectId);
    // Smaž projekt
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (!error) {
      onProjectsChange(projects.filter(pr => pr.id !== projectId));
    } else {
      alert('Chyba při mazání projektu.');
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

  const handleProjectChange = (updatedProject: Project) => {
    onProjectsChange(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  // Funkce pro výpočet termínu a skluzu (pouze pracovní dny)
  function getProjectDeliveryInfo(project: Project, team: TeamMember[]): ProjectDeliveryInfo {
    const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
    const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
    const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
    const feDays = feRem / feFte;
    const beDays = beRem / beFte;
    const qaDays = qaRem / qaFte;
    const totalWorkdays = Math.ceil(Math.max(feDays, beDays)) + Math.ceil(qaDays);
    const today = new Date();
    const calculatedDeliveryDate = addWorkdays(today, totalWorkdays);
    const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
    let diffWorkdays: number | null = null;
    if (deliveryDate) {
      const workdaysToPlanned = getWorkdaysBetween(today, deliveryDate).length - 1;
      diffWorkdays = workdaysToPlanned - totalWorkdays;
    }
    return {
      calculatedDeliveryDate,
      slip: diffWorkdays,
      diffWorkdays,
      deliveryDate,
    };
  }

  // Pomocné funkce pro práci s pracovními dny
  function addWorkdays(date: Date, workdays: number): Date {
    const result = new Date(date);
    let added = 0;
    while (added < workdays) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) { // 0 = neděle, 6 = sobota
        added++;
      }
    }
    return result;
  }

  function getWorkdaysBetween(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const d = new Date(start);
    d.setHours(0,0,0,0);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        days.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  return (
    <>
      <AddProjectModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddProject={handleAddProject}
        savingProject={savingProject}
        hasFE={hasFE}
        hasBE={hasBE}
        hasQA={hasQA}
        hasPM={hasPM}
        hasDPL={hasDPL}
      />

      {/* Projekty */}
      <section>
        <div className="rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold mb-4">Projekty</h2>
            <button
              className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition"
              onClick={() => setAddModalOpen(true)}
            >
              Přidat projekt
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm rounded-lg shadow border border-gray-200">
              <thead>
                <tr className="text-gray-700 font-semibold">
                  <th className="px-3 py-2 text-left rounded-tl-lg">Název projektu</th>
                  <th className="px-3 py-2 text-right">Priorita</th>
                  {projectRoles.map(role =>
                    projects.some(p => Number(p[role.mandays as keyof Project]) > 0) && (
                      <Fragment key={role.key}>
                        <th className="px-3 py-2 text-right">Odhad {role.label} (MD)</th>
                        <th className="px-3 py-2 text-right">% {role.label} hotovo</th>
                      </Fragment>
                    )
                  )}
                  <th className="px-3 py-2 text-center">Termín dodání</th>
                  <th className="px-3 py-2 text-center">Spočítaný termín</th>
                  <th className="px-3 py-2 text-center">Skluz</th>
                  <th className="px-3 py-2 text-center rounded-tr-lg">Akce</th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr><td colSpan={15} className="text-gray-400 text-center py-4">Žádné projekty</td></tr>
                ) : (
                  projects.map(project => {
                    const info = getProjectDeliveryInfo(project, team);
                    return (
                      <tr key={project.id} className="hover:bg-blue-50 transition">
                        <td className="px-3 py-2 align-middle font-medium text-gray-900 whitespace-nowrap">{project.name}</td>
                        <td className="px-3 py-2 align-middle text-right">{project.priority}</td>
                        {projectRoles.map(role =>
                          Number(project[role.mandays as keyof Project]) > 0 && (
                            <Fragment key={role.key}>
                              <td className="px-3 py-2 align-middle text-right">{Number(project[role.mandays as keyof Project]) || 0}</td>
                              <td className="px-3 py-2 align-middle text-right">{Number(project[role.done as keyof Project]) || 0} %</td>
                            </Fragment>
                          )
                        )}
                        <td className="px-3 py-2 align-middle text-center">{project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : ''}</td>
                        <td className="px-3 py-2 align-middle text-center">{info.calculatedDeliveryDate.toLocaleDateString()}</td>
                        <td className={`px-3 py-2 align-middle text-center font-semibold ${info.diffWorkdays === null ? '' : info.diffWorkdays >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {info.diffWorkdays === null ? '' : info.diffWorkdays >= 0 ? `+${info.diffWorkdays} dní` : `${info.diffWorkdays} dní`}
                        </td>
                        <td className="px-3 py-2 align-middle text-center whitespace-nowrap">
                          <button className="text-blue-600 font-semibold hover:underline mr-2" onClick={() => handleOpenEditModal(project)}>Upravit</button>
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
          const info = getProjectDeliveryInfo(project, team);
          return (
            <ProjectBurndown
              key={project.id}
              project={{ ...project, slip: info.diffWorkdays }}
              deliveryInfo={info}
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
    </>
  );
} 