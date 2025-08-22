/**
 * Modern Project Progress Chart Component using Recharts
 * - Professional line charts with animations
 * - Interactive tooltips and hover effects
 * - Responsive design with dark mode support
 * - Built-in legends and axes
 */

import React, { useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Project, ProjectDeliveryInfo } from './types';
import { calculateRoleProgress } from '@/lib/utils/dynamicProjectRoles';
import { Payload } from "recharts/types/component/DefaultLegendContent";
import { useTranslation } from "@/lib/translation";
import { useScopeRoles } from '@/app/hooks/useScopeRoles';
import ProjectDetailVisualizations from './ProjectDetailVisualizations';
import { FiTrendingUp, FiAlertTriangle, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';

interface ProjectProgressChartProps {
  project: Project;
  deliveryInfo: ProjectDeliveryInfo;
  scopeId: string;
  priorityDates?: {
    priorityStartDate: Date;
    priorityEndDate: Date;
  };
  projectAssignments: Array<{ teamMemberId: string; role: string }>;
  prioritySlippage?: number;
  className?: string;
}

interface ProgressData {
  date: string;
  ideal: number;
  actual: number;
  total: number;
}

const ProjectProgressChartComponent: React.FC<ProjectProgressChartProps> = ({
  project,
  scopeId,
  priorityDates,
  projectAssignments,
  prioritySlippage,
  className = ""
}) => {
  const { t } = useTranslation();
  const { activeRoles } = useScopeRoles(scopeId);
  const [progressData, setProgressData] = React.useState<ProgressData[]>([]);
  const [activeLegend, setActiveLegend] = React.useState<string | null>(null); // Přidáno

  const getCurrentProgress = useCallback((project: Project) => {
    let totalDone = 0;
    let totalMandays = 0;

    activeRoles.forEach(role => {
      const progress = calculateRoleProgress(project as unknown as Record<string, unknown>, role);
      if (progress) {
        totalDone += progress.done;
        totalMandays += progress.mandays;
      }
    });

    return totalMandays > 0 ? Math.round((totalDone / totalMandays) * 100) : 0;
  }, [activeRoles]);

  // Generování dat pro graf
  React.useEffect(() => {
    // Použít priority dates pokud jsou dostupné, jinak created_at a delivery_date
    const startDate = priorityDates ? new Date(priorityDates.priorityStartDate) : new Date(project.created_at);
    const endDate = priorityDates ? new Date(priorityDates.priorityEndDate) : (project.delivery_date ? new Date(project.delivery_date) : null);
    
    // Pokud nemáme endDate, nemůžeme generovat graf
    if (!endDate) return;
    
    // Vypočítat aktuální progress
    const currentProgress = getCurrentProgress(project);
    
    // Omezit na maximálně 10 bodů pro kompaktnější graf
    const maxPoints = 10;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const step = Math.max(1, Math.floor(days / maxPoints));
    const data: ProgressData[] = [];
    
    for (let i = 0; i <= days; i += step) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      // Ideální progress (lineární)
      const idealProgress = Math.min((i / days) * 100, 100);
      
      // Aktuální progress - simulovat vývoj v čase
      const progressRatio = Math.min(i / days, 1);
      const actualProgress = currentProgress * progressRatio;
      
      // Skluz (rozdíl mezi ideálním a aktuálním) - currently unused
      // const slippage = actualProgress - idealProgress;
      
      // Dynamický progress pro role v čase
      const roleData: Record<string, number> = {};
      activeRoles.forEach(role => {
  const doneKey = `${role.key}_done`;
  const currentDone = Number((project as unknown as Record<string, unknown>)[doneKey]) || 0;
  roleData[role.key] = Math.min(currentDone, actualProgress * 0.7 + currentDone * 0.3);
      });
      
      data.push({
        date: currentDate.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }),
        ideal: idealProgress,
        actual: actualProgress,
        total: currentProgress,
        ...roleData
      });
    }
    
    // Přidat poslední bod pokud chybí
    if (data.length > 0) {
      const lastDate = new Date(endDate);
      const finalRoleData: Record<string, number> = {};
      activeRoles.forEach(role => {
        const doneKey = `${role.key}_done`;
        finalRoleData[role.key] = Number(project[doneKey as keyof Project]) || 0;
      });
      
      data.push({
        date: lastDate.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }),
        ideal: 100,
        actual: currentProgress,
        total: currentProgress,
        ...finalRoleData
      });
    }
    
    setProgressData(data);
  }, [project, priorityDates, projectAssignments, activeRoles, getCurrentProgress]);

  const getSlippageColor = (slippage: number) => {
    if (slippage >= 0) return 'text-green-600 dark:text-green-400';
    if (slippage >= -10) return 'text-red-400 dark:text-red-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSlippageIcon = (slippage: number) => {
    if (slippage >= 0) return <FiTrendingUp />;
    if (slippage >= -10) return <FiAlertTriangle />;
    return <FiAlertCircle />;
  };

  // Používáme dynamické role z databáze
  const roles = activeRoles
    .map(role => ({
      key: role.key,
      label: role.label,
      color: role.color,
      done: (project as unknown as Record<string, unknown>)[`${role.key}_done`] as number || 0,
      mandays: (project as unknown as Record<string, unknown>)[`${role.key}_mandays`] as number || 0
    }))
    .filter(role => Number(role.mandays) > 0);

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toFixed(0)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleLegendMouseEnter = (o: Payload) => {
      setActiveLegend(o.dataKey as string);
    };
    const handleLegendMouseLeave = () => {
      setActiveLegend(null);
    };

  return (
    <div className={`bg-white/80 dark:bg-gray-700/80 rounded-xl border border-gray-200 dark:border-gray-600 p-4 ${className}`}>
      {/* Hlavička grafu */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            <FiBarChart2 className="inline mr-2" /> {t("progressChart")}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {project.name}
          </p>
        </div>
        
        {/* Statistiky */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {getCurrentProgress(project)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Aktuální</div>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center gap-2 text-lg font-semibold ${getSlippageColor(prioritySlippage || 0)}`}>
              {getSlippageIcon(prioritySlippage || 0)} {(() => {
                const v = prioritySlippage || 0;
                return v >= 0 ? `+${v} ${t("days")}` : `${v} ${t("days")}`;
              })()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t("reserveOrSlip")}</div>
          </div>
        </div>
      </div>

      {/* Graf */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={10}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={10}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
                iconSize={12}
                onMouseEnter={handleLegendMouseEnter}
                onMouseLeave={handleLegendMouseLeave}
            />
            
            {/* Ideální progress */}
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="#60a5fa"
              strokeWidth={!activeLegend || activeLegend === "ideal" ? 2 : 1}
              strokeDasharray="5 5"
              name={t("idealProgress")}
              dot={false}
              opacity={
                !activeLegend || activeLegend === "ideal" ? 1 : 0.2
              }
            />
            
            {/* Role progress */}
            {roles.map(role => (
              <Line
                key={role.key}
                type="monotone"
                dataKey={role.key}
                stroke={role.color}
                strokeWidth={activeLegend === role.key ? 4 : 1}
                name={role.label}
                dot={false}
                opacity={
                  !activeLegend || activeLegend === role.key ? 1 : 0.2
                }
              />
            ))}
            
            {/* Celkový progress */}
            <Line
              type="monotone"
              dataKey="total"
              stroke="#10b981"
              strokeWidth={4}
              name={t("totalProgress")}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              opacity={
                !activeLegend || activeLegend === "total" ? 1 : 0.2
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Dodatečné vizualizace */}
      <ProjectDetailVisualizations
        project={project}
        scopeId={scopeId}
        projectAssignments={projectAssignments}
        className="mt-6"
      />
    </div>
  );
};

export const ProjectProgressChart = React.memo(ProjectProgressChartComponent);