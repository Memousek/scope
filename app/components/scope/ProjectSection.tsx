import { useState } from 'react';   
import { createClient } from '@/lib/supabase/client';
import { Project, TeamMember, ProjectDeliveryInfo } from './types';
import { EditProjectModal } from './EditProjectModal';
import { ProjectBurndown } from './ProjectBurndown';
import { AddProjectModal } from './AddProjectModal';
import { ProjectHistoryModal } from './ProjectHistoryModal';

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
  const [savingProject, setSavingProject] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  // Klíč pro refresh grafu po změně projektu
  const [refreshKey, setRefreshKey] = useState(0);
  const [historyModalProject, setHistoryModalProject] = useState<Project | null>(null);

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
    setRefreshKey(k => k + 1);
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

  // --- Výpočet začátku a konce dle priority ---
  // Vrací mapu: projectId -> { priorityStartDate, priorityEndDate, blockingProjectName }
  function getPriorityStartDatesAndEnds(projects: Project[], team: TeamMember[]): Record<string, { priorityStartDate: Date; priorityEndDate: Date; blockingProjectName?: string }> {
    // Seřaď projekty podle priority (vzestupně), pak podle created_at
    const sorted = [...projects].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    const result: Record<string, { priorityStartDate: Date; priorityEndDate: Date; blockingProjectName?: string }> = {};
    const currentStart = new Date(); // Začínáme dnes
    for (let i = 0; i < sorted.length; i++) {
      const project = sorted[i];
      // Výpočet délky projektu v pracovních dnech (stejně jako v getProjectDeliveryInfo)
      const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
      const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
      const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
      const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
      const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
      const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
      const feDays = feRem / feFte;
      const beDays = beRem / beFte;
      const qaDays = qaRem / qaFte;
      const projectWorkdays = Math.ceil(Math.max(feDays, beDays)) + Math.ceil(qaDays);
      let priorityStartDate: Date;
      let blockingProjectName: string | undefined = undefined;
      if (i === 0) {
        priorityStartDate = new Date(currentStart);
      } else {
        const prev = sorted[i - 1];
        const prevEnd = result[prev.id].priorityEndDate;
        const nextStart = new Date(prevEnd);
        nextStart.setDate(nextStart.getDate() + 1);
        while (nextStart.getDay() === 0 || nextStart.getDay() === 6) {
          nextStart.setDate(nextStart.getDate() + 1);
        }
        priorityStartDate = nextStart;
        blockingProjectName = prev.name;
      }
      // Konec dle priority = start + délka projektu v pracovních dnech
      const priorityEndDate = addWorkdays(priorityStartDate, projectWorkdays);
      result[project.id] = { priorityStartDate, priorityEndDate, blockingProjectName };
    }
    return result;
  }

  // Výpočet priority start a end dat pro všechny projekty
  const priorityDates = getPriorityStartDatesAndEnds(projects, team);

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
                    const info = getProjectDeliveryInfo(project, team);
                    return (
                      <tr key={project.id} className="hover:bg-blue-50 transition">
                        <td className="px-2 py-1 sm:px-3 sm:py-2 align-middle font-medium text-gray-900 whitespace-nowrap">{project.name}</td>
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
          const info = getProjectDeliveryInfo(project, team);
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