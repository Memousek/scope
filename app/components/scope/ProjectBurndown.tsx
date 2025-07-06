/**
 * Komponenta ProjectBurndown
 * - Načte historii progressů z Supabase pro daný projekt
 * - Pro každý den a roli najde poslední progress záznam do daného dne (včetně času)
 * - Vykreslí burndown graf a procenta hotovo podle historických hodnot
 * - Zohledňuje začátek dle priority (priorityStartDate)
 * - Zobrazuje blokující projekt v šedé oblasti
 */
import { useEffect, useState } from 'react';
import { Project } from './types';
import dynamic from 'next/dynamic';
const BurndownChart = dynamic(() => import('@/components/BurndownChart'), { ssr: false, loading: () => <div>Loading…</div> });
import { ProjectDeliveryInfo, ProjectProgress } from './types';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/translation';

interface ProjectBurndownProps {
  project: Project;
  deliveryInfo: ProjectDeliveryInfo;
  /**
   * Začátek dle priority (vypočtený start podle priority projektů)
   */
  priorityStartDate: Date;
  /**
   * Konec dle priority (vypočtený konec podle priority řetězení)
   */
  priorityEndDate: Date;
  /**
   * Název projektu, na který se čeká (blokuje start)
   */
  blockingProjectName?: string;
  showBlockingBg: boolean;
}

export function ProjectBurndown({ project, deliveryInfo, priorityStartDate, priorityEndDate, blockingProjectName, showBlockingBg }: ProjectBurndownProps) {
  const [progressHistory, setProgressHistory] = useState<ProjectProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Načti historii progressů pro tento projekt
  useEffect(() => {
    const fetchProgress = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('project_progress')
        .select('*')
        .eq('project_id', project.id)
        .order('date', { ascending: true });
      setProgressHistory(data || []);
      setLoading(false);
    };
    fetchProgress();
  }, [project.id]);

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

  // Začátek grafu
  const chartStart = showBlockingBg ? priorityStartDate : new Date(project.created_at);
  const chartEnd = priorityEndDate;
  const days: Date[] = [];
  const d = new Date(chartStart);
  while (d <= chartEnd) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  if (days.length === 1) {
    const nextDay = new Date(days[0]);
    nextDay.setDate(nextDay.getDate() + 1);
    days.push(nextDay);
  }

  // Generuj data pro graf podle historie progressů
  const totalData = days.map(date => {
    const entry: { date: string; percentDone: number; [key: string]: number | string } = {
      date: `${date.getDate()}.${date.getMonth() + 1}.`,
      percentDone: 0,
    };
    let sum = 0;
    let count = 0;
    roles.forEach(role => {
      const doneKey = `${role.value}_done` as keyof ProjectProgress;
      // Najdi všechny progress záznamy pro danou roli do konce aktuálního dne (včetně času)
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      const relevant = progressHistory.filter(h =>
        new Date(h.date) <= endOfDay && typeof h[doneKey] === 'number'
      );
      // Najdi nejnovější záznam podle času
      const last = relevant.length > 0 ? relevant.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
      const value = last ? Number(last[doneKey]) : 0;
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
  let slipText = t('slipNone');
  if (typeof slip === 'number' && !isNaN(slip)) {
    slipColor = slip < 0 ? 'text-red-600' : 'text-green-600';
    slipText = slip < 0
      ? t('slipNegative').replace('{slip}', String(slip))
      : t('slipPositive').replace('{slip}', String(slip));
  }

  return (
    <div className="mb-6 p-4 rounded-lg border">
      <div className="flex flex-wrap gap-4 items-center mb-2">
        <span className="font-semibold">{project.name}</span>
        <span>{t('calculatedDelivery')}: <b>{deliveryInfo.calculatedDeliveryDate.toLocaleDateString()}</b></span>
        {project.delivery_date && (
          <span>{t('deliveryDate')}: <b>{new Date(project.delivery_date).toLocaleDateString()}</b></span>
        )}
        <span className={slipColor}>{slipText}</span>
        <span className="text-gray-600">{t('priorityStart')}: <b>{priorityStartDate.toLocaleDateString()}</b></span>
        <span className="text-gray-600">{t('priorityEnd')}: <b>{priorityEndDate.toLocaleDateString()}</b></span>
      </div>
      {loading ? (
        <div className="text-gray-500 italic py-8 text-center min-w-screen w-full flex justify-center items-center">{t('loadingData')}</div>
      ) : (
        <BurndownChart
          roles={roles}
          totalData={totalData}
          slip={typeof slip === 'number' ? slip : 0}
          calculatedDeliveryDate={deliveryInfo.calculatedDeliveryDate}
          deliveryDate={project.delivery_date ? new Date(project.delivery_date) : deliveryInfo.calculatedDeliveryDate}
          priorityStartDate={priorityStartDate}
          createdAt={new Date(project.created_at)}
          blockingProjectName={blockingProjectName}
          showBlockingBg={showBlockingBg}
        />
      )}
    </div>
  );
} 