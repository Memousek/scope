/**
 * Modern Project Progress Chart Component using Recharts
 * - Professional line charts with animations
 * - Interactive tooltips and hover effects
 * - Responsive design with dark mode support
 * - Built-in legends and axes
 */

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Project, ProjectDeliveryInfo } from './types';
import { PROJECT_ROLES, calculateRoleProgress } from '@/lib/utils/projectRoles';
import { getWorkdaysCount } from '@/app/utils/dateUtils';
import { Payload } from "recharts/types/component/DefaultLegendContent";

interface ProjectProgressChartProps {
  project: Project;
  deliveryInfo: ProjectDeliveryInfo;
  className?: string;
  priorityDates?: {
    priorityStartDate: Date;
    priorityEndDate: Date;
  };
}

interface ProgressData {
  date: string;
  idealProgress: number;
  actualProgress: number;
  slippage: number;
  fe: number;
  be: number;
  qa: number;
  pm: number;
  dpl: number;
}

export const ProjectProgressChart: React.FC<ProjectProgressChartProps> = ({ 
  project, 
  deliveryInfo, 
  className = '',
  priorityDates
}) => {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [activeLegend, setActiveLegend] = useState<string | null>(null); // Přidáno

  // Generování dat pro graf
  useEffect(() => {
    if (!project.delivery_date) return;

    // Použít priority dates pokud jsou dostupné, jinak created_at a delivery_date
    const startDate = priorityDates ? new Date(priorityDates.priorityStartDate) : new Date(project.created_at);
    const endDate = priorityDates ? new Date(priorityDates.priorityEndDate) : new Date(project.delivery_date);
    
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
      
      // Skluz (rozdíl mezi ideálním a aktuálním)
      const slippage = actualProgress - idealProgress;
      
      // Realistický progress pro role v čase
      const fe = Math.min(project.fe_done || 0, actualProgress * 0.8 + (project.fe_done || 0) * 0.2);
      const be = Math.min(project.be_done || 0, actualProgress * 0.7 + (project.be_done || 0) * 0.3);
      const qa = Math.min(project.qa_done || 0, actualProgress * 0.6 + (project.qa_done || 0) * 0.4);
      const pm = Math.min(project.pm_done || 0, actualProgress * 0.9 + (project.pm_done || 0) * 0.1);
      const dpl = Math.min(project.dpl_done || 0, actualProgress * 0.5 + (project.dpl_done || 0) * 0.5);
      
      data.push({
        date: currentDate.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }),
        idealProgress,
        actualProgress,
        slippage,
        fe,
        be,
        qa,
        pm,
        dpl
      });
    }
    
    // Přidat poslední bod pokud chybí
    if (data.length > 0) {
      const lastDate = new Date(endDate);
      data.push({
        date: lastDate.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }),
        idealProgress: 100,
        actualProgress: currentProgress,
        slippage: currentProgress - 100,
        fe: project.fe_done || 0,
        be: project.be_done || 0,
        qa: project.qa_done || 0,
        pm: project.pm_done || 0,
        dpl: project.dpl_done || 0
      });
    }
    
    setProgressData(data);
  }, [project, priorityDates]);

  const getCurrentProgress = (project: Project) => {
    let totalDone = 0;
    let totalMandays = 0;

          PROJECT_ROLES.forEach(role => {
        const progress = calculateRoleProgress(project as unknown as Record<string, unknown>, role.key);
        if (progress) {
          totalDone += progress.done;
          totalMandays += progress.mandays;
        }
      });

    return totalMandays > 0 ? Math.round((totalDone / totalMandays) * 100) : 0;
  };

  const getSlippageColor = (slippage: number) => {
    if (slippage >= 0) return 'text-green-600 dark:text-green-400';
    if (slippage >= -10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getSlippageIcon = (slippage: number) => {
    if (slippage >= 0) return '🚀';
    if (slippage >= -10) return '⚠️';
    return '🔴';
  };

  // Používáme centralizované role z utility
  const roles = PROJECT_ROLES
    .map(role => ({
      key: role.key,
      label: role.label,
      color: role.color,
      done: project[role.doneKey as keyof Project] || 0,
      mandays: project[role.mandaysKey as keyof Project] || 0
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
              {entry.name}: {entry.value}%
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
            📊 Progress grafy
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
            <div className={`text-lg font-semibold ${getSlippageColor(deliveryInfo.slip || 0)}`}>
              {getSlippageIcon(deliveryInfo.slip || 0)} {deliveryInfo.slip || 0} dní
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Skluz</div>
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
              dataKey="idealProgress"
              stroke="#60a5fa"
              strokeWidth={!activeLegend || activeLegend === "idealProgress" ? 2 : 1}
              strokeDasharray="5 5"
              name="Ideální progress"
              dot={false}
              opacity={
                !activeLegend || activeLegend === "idealProgress" ? 1 : 0.2
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
              dataKey="actualProgress"
              stroke="#10b981"
              strokeWidth={4}
              name="Celkový progress"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              opacity={
                !activeLegend || activeLegend === "actualProgress" ? 1 : 0.2
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailní metriky */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {deliveryInfo.deliveryDate ? deliveryInfo.deliveryDate.toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Plánovaný termín</div>
        </div>
        
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {deliveryInfo.calculatedDeliveryDate.toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Vypočítaný termín</div>
        </div>
        
        {priorityDates && (
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Termín podle priority</div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              Od: {priorityDates.priorityStartDate.toLocaleDateString()}
            </div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
              Do: {priorityDates.priorityEndDate.toLocaleDateString()}
            </div>
          </div>
        )}
        
        <div className="text-center">
          <div className={`text-lg font-semibold ${
            (() => {
              if (!deliveryInfo.deliveryDate || !deliveryInfo.calculatedDeliveryDate) return 'text-gray-800 dark:text-gray-200';
              const diff = getWorkdaysCount(deliveryInfo.calculatedDeliveryDate, deliveryInfo.deliveryDate);
              return diff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
            })()
          }`}>
            {(() => {
              if (!deliveryInfo.deliveryDate || !deliveryInfo.calculatedDeliveryDate) return 'N/A';
              const diff = getWorkdaysCount(deliveryInfo.calculatedDeliveryDate, deliveryInfo.deliveryDate);
              if (diff >= 0) {
                return `+${diff} dní`;
              } else {
                return `${diff} dní`;
              }
            })()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Rezerva/Skluz</div>
        </div>
        
        <div className="text-center">
          <div className={`text-lg font-semibold ${getSlippageColor(deliveryInfo.slip || 0)}`}>
            {deliveryInfo.slip || 0} dní
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Skluz</div>
        </div>
      </div>
    </div>
  );
};