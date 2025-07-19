/**
 * Modern Burndown Chart Component
 * - Glass-like design s animacemi
 * - Interaktivní graf s tooltips
 * - Zobrazuje průběh projektů v čase
 * - Responsive design s smooth transitions
 * - Optimalizované pro dark mode
 */

import { useState, useEffect } from 'react';
import { Project, TeamMember } from './types';
import { calculatePriorityDates } from '@/app/utils/dateUtils';
import { useTranslation } from '@/lib/translation';

interface BurndownChartProps {
  projects: Project[];
  team: TeamMember[];
}

interface ChartDataPoint {
  date: Date;
  totalProgress: number;
  feProgress: number;
  beProgress: number;
  qaProgress: number;
  pmProgress: number;
  dplProgress: number;
  idealProgress: number;
}

export function BurndownChart({ projects, team }: BurndownChartProps) {
  const { t } = useTranslation();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<ChartDataPoint | null>(null);

  // Generate chart data based on projects and team
  useEffect(() => {
    if (projects.length === 0 || team.length === 0) return;

    const priorityDates = calculatePriorityDates(projects, team);
    const data: ChartDataPoint[] = [];

    // Get date range from all projects
    const allDates = Object.values(priorityDates).flatMap(({ priorityStartDate, priorityEndDate }) => {
      const dates: Date[] = [];
      const current = new Date(priorityStartDate);
      while (current <= priorityEndDate) {
        if (current.getDay() !== 0 && current.getDay() !== 6) { // Skip weekends
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    });

    const uniqueDates = [...new Set(allDates.map(d => d.toDateString()))]
      .map(d => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());

    if (uniqueDates.length === 0) return;

    // Generate data points for each date
    uniqueDates.forEach((date, index) => {
      const totalDays = uniqueDates.length;
      // Ideální průběh: od 100% na začátku do 0% na konci
      const idealProgress = ((totalDays - index) / totalDays) * 100;

      // Calculate actual progress for each role based on active projects
      let feProgress = 0;
      let beProgress = 0;
      let qaProgress = 0;
      let pmProgress = 0;
      let dplProgress = 0;
      let activeProjects = 0;

      projects.forEach(project => {
        const projectStart = priorityDates[project.id]?.priorityStartDate;
        const projectEnd = priorityDates[project.id]?.priorityEndDate;

        if (projectStart && projectEnd && date >= projectStart && date <= projectEnd) {
          activeProjects++;
          
          // Calculate progress based on time elapsed in project
          const projectDuration = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
          const daysElapsed = Math.ceil((date.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
          const timeProgress = Math.min(daysElapsed / projectDuration, 1);
          
          // Combine time-based progress with actual completion
          const feActual = Number(project.fe_done) || 0;
          const beActual = Number(project.be_done) || 0;
          const qaActual = Number(project.qa_done) || 0;
          const pmActual = Number(project.pm_done) || 0;
          const dplActual = Number(project.dpl_done) || 0;
          
          // Weighted progress: 70% actual completion + 30% time-based progress
          feProgress += (feActual * 0.7) + (timeProgress * 100 * 0.3);
          beProgress += (beActual * 0.7) + (timeProgress * 100 * 0.3);
          qaProgress += (qaActual * 0.7) + (timeProgress * 100 * 0.3);
          pmProgress += (pmActual * 0.7) + (timeProgress * 100 * 0.3);
          dplProgress += (dplActual * 0.7) + (timeProgress * 100 * 0.3);
        }
      });

      // Average progress across active projects only
      if (activeProjects > 0) {
        feProgress /= activeProjects;
        beProgress /= activeProjects;
        qaProgress /= activeProjects;
        pmProgress /= activeProjects;
        dplProgress /= activeProjects;
      }

      // Calculate weighted total progress based on actual work done
      const totalWorkDone = feProgress + beProgress + qaProgress + pmProgress + dplProgress;
      const totalProgress = totalWorkDone / 5; // Average of all roles

      data.push({
        date,
        totalProgress,
        feProgress,
        beProgress,
        qaProgress,
        pmProgress,
        dplProgress,
        idealProgress,
      });
    });

    setChartData(data);
  }, [projects, team]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-gray-600 dark:text-gray-400">
          {t('noDataForChart') || 'Žádná data pro graf'}
        </p>
      </div>
    );
  }

  const maxValue = 100;
  const chartHeight = 300;
  const chartWidth = Math.max(600, chartData.length * 30);

  const getY = (value: number) => chartHeight - (value / maxValue) * chartHeight;
  const getX = (index: number) => (index / (chartData.length - 1)) * chartWidth;

  const generatePath = (data: number[], color: string) => {
    if (data.length < 2) return null;

    const points = data.map((value, index) => {
      const x = getX(index);
      const y = getY(value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <path
        d={points}
        stroke={color}
        strokeWidth="3"
        fill="none"
        className="transition-all duration-300 hover:stroke-width-4"
      />
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('cs-CZ', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get project names for title
  const projectNames = projects.map(p => p.name).join(', ');

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📈 Burndown Chart
          </h3>
          {projectNames && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Projekty: {projectNames}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-all duration-200 text-xs">
            Export PNG
          </button>
          <button className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all duration-200 text-xs">
            Export CSV
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight + 60}
          className="w-full"
          viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
        >
          {/* Grid Lines */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                x1="0"
                y1={getY(value)}
                x2={chartWidth}
                y2={getY(value)}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="5,5"
                className="dark:stroke-gray-600"
              />
              <text
                x="-10"
                y={getY(value) + 4}
                className="text-xs text-gray-500 dark:text-gray-400"
                textAnchor="end"
              >
                {value}%
              </text>
            </g>
          ))}

          {/* Data Lines */}
          {generatePath(chartData.map(d => d.totalProgress), '#3b82f6')}
          {generatePath(chartData.map(d => d.feProgress), '#2563eb')}
          {generatePath(chartData.map(d => d.qaProgress), '#f59e0b')}
          {generatePath(chartData.map(d => d.pmProgress), '#a855f7')}
          {generatePath(chartData.map(d => d.idealProgress), '#9ca3af')}

          {/* Data Points */}
          {chartData.map((point, index) => (
            <g key={index}>
              <circle
                cx={getX(index)}
                cy={getY(point.totalProgress)}
                r="4"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="1"
                className="cursor-pointer hover:r-6 transition-all duration-200 dark:stroke-gray-800"
                onMouseEnter={() => setHoveredPoint(point)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}

          {/* X-axis labels */}
          {chartData.filter((_, index) => index % Math.max(1, Math.floor(chartData.length / 8)) === 0).map((point, index) => {
            const originalIndex = index * Math.max(1, Math.floor(chartData.length / 8));
            return (
              <text
                key={originalIndex}
                x={getX(originalIndex)}
                y={chartHeight + 20}
                className="text-xs text-gray-500 dark:text-gray-400"
                textAnchor="middle"
              >
                {formatDate(point.date)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend  */}
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legenda:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded shadow-sm"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Celkem % hotovo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded shadow-sm"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">FE % hotovo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded shadow-sm"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">QA % hotovo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded shadow-sm"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">PM % hotovo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 dark:bg-gray-500 rounded shadow-sm"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Ideální průběh</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div className="absolute bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-xl z-10">
          <div className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
            {formatDate(hoveredPoint.date)}
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div>Celkem: {hoveredPoint.totalProgress.toFixed(1)}%</div>
            <div>FE: {hoveredPoint.feProgress.toFixed(1)}%</div>
            <div>QA: {hoveredPoint.qaProgress.toFixed(1)}%</div>
            <div>PM: {hoveredPoint.pmProgress.toFixed(1)}%</div>
            <div>Ideální: {hoveredPoint.idealProgress.toFixed(1)}%</div>
          </div>
        </div>
      )}
    </div>
  );
} 