/**
 * Modern Burndown Chart Component using Recharts
 * - Professional line charts with animations
 * - Interactive tooltips and hover effects
 * - Responsive design with dark mode support
 * - Built-in legends and axes
 * - Burndown chart showing remaining work over time
 */

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Project, TeamMember } from './types';
import { calculatePriorityDates } from '@/app/utils/dateUtils';
import { useTranslation } from '@/lib/translation';

interface BurndownChartProps {
  projects: Project[];
  team: TeamMember[];
}

interface ChartDataPoint {
  date: string;
  totalProgress: number;
  idealProgress: number;
  [key: string]: number | string; // Pro dynamické projekty
}

export function BurndownChart({ projects, team }: BurndownChartProps) {
  const { t } = useTranslation();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

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

    // Omezit na maximálně 20 bodů pro kompaktnější graf
    const maxPoints = 20;
    const step = Math.max(1, Math.floor(uniqueDates.length / maxPoints));
    const filteredDates = uniqueDates.filter((_, index) => index % step === 0);

    // Generate data points for each date
    filteredDates.forEach((date, index) => {
      const totalDays = filteredDates.length;
      // Ideální průběh: od 100% na začátku do 0% na konci (burndown)
      const idealProgress = ((totalDays - index) / totalDays) * 100;

      // Calculate progress for each project
      const projectProgress: { [key: string]: number } = {};
      let totalProgress = 0;
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
          
          // Calculate total project progress from all roles
          const feActual = Number(project.fe_done) || 0;
          const beActual = Number(project.be_done) || 0;
          const qaActual = Number(project.qa_done) || 0;
          const pmActual = Number(project.pm_done) || 0;
          const dplActual = Number(project.dpl_done) || 0;
          
          // Weighted progress: 70% actual completion + 30% time-based progress
          const actualProgress = (feActual + beActual + qaActual + pmActual + dplActual) / 5;
          const projectProgressValue = (actualProgress * 0.7) + (timeProgress * 100 * 0.3);
          
          projectProgress[`project_${project.id}`] = projectProgressValue;
          totalProgress += projectProgressValue;
        }
      });

      // Average progress across active projects only
      if (activeProjects > 0) {
        totalProgress /= activeProjects;
      }

      const dataPoint: ChartDataPoint = {
        date: date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }),
        totalProgress,
        idealProgress,
        ...projectProgress
      };

      data.push(dataPoint);
    });

    setChartData(data);
  }, [projects, team]);

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

  // Get project names for title
  const projectNames = projects.map(p => p.name).join(', ');

  // Definice projektů a jejich barev
  const projectColors = [
    '#2563eb', '#059669', '#f59e42', '#a21caf', '#e11d48', 
    '#7c3aed', '#dc2626', '#ea580c', '#16a34a', '#0891b2'
  ];
  
  const projectLines = projects.map((project, index) => ({
    key: `project_${project.id}`,
    label: project.name,
    color: projectColors[index % projectColors.length]
  }));

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
          <button className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg hover:scale-105 transition-all duration-200 text-xs font-medium">
            Export CSV
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Ideální průběh (burndown) */}
            <Line
              type="monotone"
              dataKey="idealProgress"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Ideální průběh"
              dot={false}
            />
            
            {/* Project progress */}
            {projectLines.map(project => (
              <Line
                key={project.key}
                type="monotone"
                dataKey={project.key}
                stroke={project.color}
                strokeWidth={2}
                name={project.label}
                dot={false}
              />
            ))}
            
            {/* Celkový progress */}
            <Line
              type="monotone"
              dataKey="totalProgress"
              stroke="#3b82f6"
              strokeWidth={4}
              name="Celkem % hotovo"
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 