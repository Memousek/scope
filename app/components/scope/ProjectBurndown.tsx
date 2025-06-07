import { Project, TeamMember, ProjectDeliveryInfo } from './types';
import BurndownChart from '@/components/BurndownChart';

interface ProjectBurndownProps {
  project: Project;
  team: TeamMember[];
  deliveryInfo: ProjectDeliveryInfo;
}

export const ProjectBurndown: React.FC<ProjectBurndownProps> = ({ project, team, deliveryInfo }) => {
  // Připrav data pro graf pro každou roli a celkově
  const start = new Date(project.created_at);
  const end = deliveryInfo.calculatedDeliveryDate;
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  // Pokud je days jen jeden den, přidej ještě jeden den navíc
  if (days.length === 1) {
    const nextDay = new Date(days[0]);
    nextDay.setDate(nextDay.getDate() + 1);
    days.push(nextDay);
  }

  const projectRoles = [
    { key: 'fe', label: 'FE', mandays: 'fe_mandays', done: 'fe_done', color: '#2563eb' },
    { key: 'be', label: 'BE', mandays: 'be_mandays', done: 'be_done', color: '#059669' },
    { key: 'qa', label: 'QA', mandays: 'qa_mandays', done: 'qa_done', color: '#f59e42' },
    { key: 'pm', label: 'PM', mandays: 'pm_mandays', done: 'pm_done', color: '#a21caf' },
    { key: 'dpl', label: 'DPL', mandays: 'dpl_mandays', done: 'dpl_done', color: '#e11d48' },
  ];

  const roles = days.length < 2 ? [] : projectRoles
    .filter(role => Number(project[role.mandays as keyof Project]) > 0)
    .map(role => {
      const percentDone = Number(project[role.done as keyof Project]) || 0;
      return {
        role: role.label,
        color: role.color,
        data: days.map((date, idx) => ({
          date: `${date.getDate()}.${date.getMonth() + 1}.`,
          percentDone: idx === 0 ? 0 : percentDone,
        })),
      };
    });

  const total = days.length < 2 ? [] : days.map((date, idx) => {
    const sum = roles.reduce((acc, role) => acc + (role.data[idx]?.percentDone ?? 0), 0);
    const avg = roles.length > 0 ? sum / roles.length : 0;
    return {
      date: `${date.getDate()}.${date.getMonth() + 1}.`,
      percentDone: avg,
    };
  });

  return (
    <div className="mb-6 p-4 rounded-lg border">
      <div className="flex flex-wrap gap-4 items-center mb-2">
        <span className="font-semibold">{project.name}</span>
        <span>Spočítaný termín dodání: <b>{deliveryInfo.calculatedDeliveryDate.toLocaleDateString()}</b></span>
        {project.delivery_date && (
          <span>Termín dodání: <b>{new Date(project.delivery_date).toLocaleDateString()}</b></span>
        )}
      </div>
      {days.length < 2 ? (
        <div className="text-gray-500 italic py-8 text-center">Není dostatek dat pro zobrazení grafu</div>
      ) : (
        <BurndownChart
          roles={roles}
          total={total}
          calculatedDeliveryDate={deliveryInfo.calculatedDeliveryDate.toISOString()}
          deliveryDate={project.delivery_date}
        />
      )}
    </div>
  );
}; 