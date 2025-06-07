import { Project } from './types';
import BurndownChart from '@/components/BurndownChart';
import { ProjectDeliveryInfo } from './types';

interface ProjectBurndownProps {
  project: Project;
  deliveryInfo: ProjectDeliveryInfo;
}

export function ProjectBurndown({ project, deliveryInfo }: ProjectBurndownProps) {
  // Připrav data pro graf pro každou roli a celkově
  const start = new Date(project.created_at);
  const end = deliveryInfo.calculatedDeliveryDate;
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  if (days.length === 1) {
    const nextDay = new Date(days[0]);
    nextDay.setDate(nextDay.getDate() + 1);
    days.push(nextDay);
  }

  // Definice rolí
  const projectRoles = [
    { key: 'fe', label: 'FE', mandays: 'fe_mandays', done: 'fe_done', color: '#2563eb' },
    { key: 'be', label: 'BE', mandays: 'be_mandays', done: 'be_done', color: '#059669' },
    { key: 'qa', label: 'QA', mandays: 'qa_mandays', done: 'qa_done', color: '#f59e42' },
    { key: 'pm', label: 'PM', mandays: 'pm_mandays', done: 'pm_done', color: '#a21caf' },
    { key: 'dpl', label: 'DPL', mandays: 'dpl_mandays', done: 'dpl_done', color: '#e11d48' },
  ];

  // Pouze role, které mají mandays > 0
  const roles = projectRoles
    .filter(role => Number(project[role.mandays as keyof Project]) > 0)
    .map(role => ({
      value: role.key,
      label: role.label,
      color: role.color,
    }));

  // Data pro graf: pro každý den a každou roli
  const totalData = days.map((date, idx) => {
    const entry: { date: string; percentDone: number; [key: string]: number | string } = {
      date: `${date.getDate()}.${date.getMonth() + 1}.`,
      percentDone: 0,
    };
    let sum = 0;
    let count = 0;
    roles.forEach(role => {
      // První den je vždy 0, pak aktuální % hotovo
      const percentDone = Number(project[`${role.value}_done` as keyof Project]) || 0;
      const value = idx === 0 ? 0 : percentDone;
      entry[role.value] = value;
      sum += value;
      count++;
    });
    entry.percentDone = count > 0 ? sum / count : 0;
    return entry;
  });

  // --- Skluz ---
  const slip = typeof project.slip === 'number' ? project.slip : (typeof deliveryInfo.slip === 'number' ? deliveryInfo.slip : undefined);
  let slipColor = '';
  let slipText = 'Skluz: -';
  if (typeof slip === 'number' && !isNaN(slip)) {
    slipColor = slip < 0 ? 'text-red-600' : 'text-green-600';
    slipText = slip < 0 ? `Skluz: ${slip} dní` : `Skluz: +${slip} dní`;
  }

  return (
    <div className="mb-6 p-4 rounded-lg border">
      <div className="flex flex-wrap gap-4 items-center mb-2">
        <span className="font-semibold">{project.name}</span>
        <span>Spočítaný termín dodání: <b>{deliveryInfo.calculatedDeliveryDate.toLocaleDateString()}</b></span>
        {project.delivery_date && (
          <span>Termín dodání: <b>{new Date(project.delivery_date).toLocaleDateString()}</b></span>
        )}
        <span className={slipColor}>{slipText}</span>
      </div>
      {days.length < 2 ? (
        <div className="text-gray-500 italic py-8 text-center">Není dostatek dat pro zobrazení grafu</div>
      ) : (
        <BurndownChart
          roles={roles}
          totalData={totalData}
          slip={typeof slip === 'number' ? slip : 0}
          calculatedDeliveryDate={deliveryInfo.calculatedDeliveryDate}
          deliveryDate={project.delivery_date ? new Date(project.delivery_date) : deliveryInfo.calculatedDeliveryDate}
        />
      )}
    </div>
  );
} 