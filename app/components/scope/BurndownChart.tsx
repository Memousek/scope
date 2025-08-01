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
import { calculatePriorityDatesWithAssignments } from '@/app/utils/dateUtils';
import { ProjectTeamAssignment } from '@/lib/domain/models/project-team-assignment.model';
import { Payload } from "recharts/types/component/DefaultLegendContent";
import { useTranslation } from "@/lib/translation";
import { Badge } from "../ui/Badge";
import { useScopeRoles } from '@/app/hooks/useScopeRoles';

interface BurndownChartProps {
  projects: Project[];
  team: TeamMember[];
  projectAssignments?: Record<string, ProjectTeamAssignment[]>;
  workflowDependencies?: Record<string, {
    workflow_type: string;
    dependencies: Array<{ from: string; to: string; type: 'blocking' | 'waiting' | 'parallel' }>;
    active_workers: Array<{ role: string; status: 'active' | 'waiting' | 'blocked' }>;
  }>;
  scopeId: string;
}

interface ChartDataPoint {
  date: string;
  totalProgress: number;
  idealProgress: number;
  [key: string]: number | string; // Pro dynamické projekty
}

export function BurndownChart({ projects, team, projectAssignments = {}, workflowDependencies = {}, scopeId }: BurndownChartProps) {
  const { t } = useTranslation();
  const { activeRoles } = useScopeRoles(scopeId);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activeLegend, setActiveLegend] = useState<string | null>(null); // Přidáno

  // Generate chart data based on projects and team
  useEffect(() => {
    if (projects.length === 0 || team.length === 0) return;

    // Use workflow-aware calculation if dependencies are available
    const priorityDates = calculatePriorityDatesWithAssignments(projects, team, projectAssignments, workflowDependencies);
    const data: ChartDataPoint[] = [];

    const bufferDays = 2;
    const allDates = Object.values(priorityDates).flatMap(
      ({ priorityStartDate, priorityEndDate }) => {
        const dates: Date[] = [];
        const current = new Date(priorityStartDate);
        const endWithBuffer = new Date(priorityEndDate);
        endWithBuffer.setDate(endWithBuffer.getDate() + bufferDays);
        while (current <= endWithBuffer) {
          if (current.getDay() !== 0 && current.getDay() !== 6) {
            dates.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
        return dates;
      }
    );

    const uniqueDates = [...new Set(allDates.map((d) => d.toDateString()))]
      .map((d) => new Date(d))
      .sort((a, b) => a.getTime() - b.getTime());

    if (uniqueDates.length === 0) return;

    const maxPoints = 20;
    const step = Math.max(1, Math.floor(uniqueDates.length / maxPoints));
    const filteredDates = uniqueDates.filter((_, index) => index % step === 0);

    let lastValidProgress = 0;

    filteredDates.forEach((date, index) => {
      const totalDays = filteredDates.length;
      const idealProgress = ((totalDays - index) / totalDays) * 100;

      const projectProgress: { [key: string]: number } = {};
      let weightedProgressSum = 0;
      let totalWeight = 0;

      projects.forEach((project) => {
        const projectStart = priorityDates[project.id]?.priorityStartDate;
        const projectEnd = priorityDates[project.id]?.priorityEndDate;
        if (!projectStart || !projectEnd) return;

        const projectEndExtended = new Date(projectEnd);
        projectEndExtended.setDate(projectEndExtended.getDate() + bufferDays);

        if (date >= projectStart && date <= projectEndExtended) {
          const projectDuration = Math.ceil(
            (projectEnd.getTime() - projectStart.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const daysElapsed = Math.ceil(
            (date.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          const timeProgress = Math.min(daysElapsed / projectDuration, 1);

          // Dynamicky počítáme progress pro všechny aktivní role
          let totalActual = 0;
          let totalMandays = 0;
          let roleCount = 0;

          activeRoles.forEach(role => {
            const doneKey = `${role.key}_done`;
            const mandaysKey = `${role.key}_mandays`;
            const actual = Number((project as Record<string, unknown>)[doneKey]) || 0;
            const mandays = Number((project as Record<string, unknown>)[mandaysKey]) || 0;
            
            totalActual += actual;
            totalMandays += mandays;
            if (mandays > 0) roleCount++;
          });

          const weight = totalMandays || 1;
          const actualProgress = roleCount > 0 ? totalActual / roleCount : 0;
          const projectProgressValue =
            actualProgress * 0.7 + timeProgress * 100 * 0.3;

          projectProgress[`project_${project.id}`] = projectProgressValue;
          weightedProgressSum += projectProgressValue * weight;
          totalWeight += weight;
        }
      });

      const totalProgress =
        totalWeight > 0 ? weightedProgressSum / totalWeight : lastValidProgress;
      if (totalWeight > 0) lastValidProgress = totalProgress;

      data.push({
        date: date.toLocaleDateString("cs-CZ", {
          day: "2-digit",
          month: "2-digit",
        }),
        totalProgress,
        idealProgress,
        ...projectProgress,
      });
    });

    setChartData(data);
  }, [projects, team, projectAssignments, activeRoles, workflowDependencies]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
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
              {entry.name}: {Math.round(entry.value)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="text-6xl mb-6">📊</div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            {t("noDataForChart")}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t("noDataForChartDescription")}
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalProjects = projects.length;

  const avgProgress =
    chartData.length > 0
      ? Math.round(chartData[chartData.length - 1]?.totalProgress || 0)
      : 0;

  const idealProgress =
    chartData.length > 0
      ? Math.round(chartData[chartData.length - 1]?.idealProgress || 0)
      : 0;

  const progressDiff = avgProgress - idealProgress;

  // Get project names for title
  const projectNames = projects.map((p) => p.name).join(", ");

  // Definice projektů a jejich barev
  const projectColors = [
    "#3b82f6",
    "#9333ea",
    "#f43f5e",  
    "#059669",
    "#f59e42",
    "#a21caf",
    "#e11d48",
    "#7c3aed",
    "#dc2626",
    "#ea580c",
    "#16a34a",
    "#0891b2",
  ];

  const projectLines = projects.map((project, index) => ({
    key: `project_${project.id}`,
    label: project.name,
    color: projectColors[index % projectColors.length],
  }));

  // Legend handlers
  const handleLegendMouseEnter = (o: Payload) => {
    setActiveLegend(o.dataKey as string);
  };
  const handleLegendMouseLeave = () => {
    setActiveLegend(null);
  };

  return (
    <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

      <div className="relative">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Burndown Chart
                </h3>
                {projectNames && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t("projects")}: {projectNames}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("projects")}: {totalProjects}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {totalProjects}
              </div>
            </div>
            <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t("progress")}
                </span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {avgProgress}%
              </div>
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="h-80 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tick={{ fill: "#6b7280" }}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: "#6b7280" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="line"
                iconSize={12}
                onMouseEnter={handleLegendMouseEnter}
                onMouseLeave={handleLegendMouseLeave}
              />

              {/* Ideální průběh (burndown) */}
              <Line
                type="monotone"
                dataKey="idealProgress"
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5 5"
                name={t("idealProgress")}
                dot={false}
                opacity={
                  !activeLegend || activeLegend === "idealProgress" ? 0.7 : 0.2
                }
              />

              {/* Project progress */}
              {projectLines.map((project) => (
                <Line
                  key={project.key}
                  type="monotone"
                  dataKey={project.key}
                  stroke={project.color}
                  strokeWidth={activeLegend === project.key ? 4 : 1}
                  name={project.label}
                  dot={{ fill: project.color, strokeWidth: 2, r: 3 }}
                  opacity={
                    !activeLegend || activeLegend === project.key ? 1 : 0.2
                  }
                />
              ))}

              {/* Celkový progress */}
              <Line
                type="monotone"
                dataKey="totalProgress"
                stroke="#4ade80"
                strokeWidth={4}
                name={t("totalPercentDone")}
                dot={{ fill: "#4ade80", strokeWidth: 2, r: 5 }}
                opacity={
                  !activeLegend || activeLegend === "totalProgress" ? 1 : 0.2
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>{t("total")}: {avgProgress}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Ideál: {idealProgress}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${progressDiff >= 0 ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span
                className={
                  progressDiff >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {progressDiff >= 0 ? "+" : ""}
                {progressDiff}%
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button disabled={true} className="disabled:opacity-50 relative group/btn bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 shadow-lg text-sm font-semibold flex items-center gap-2">
              <Badge label={t("soon")} variant="soon" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <svg
                className="relative z-10 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="relative z-10">Export PNG</span>
            </button>
            <button disabled={true} className="disabled:opacity-50 relative group/btn bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25 active:scale-95 shadow-lg text-sm font-semibold flex items-center gap-2">
              <Badge label={t("soon")} variant="soon" />
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-xl opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
              <svg
                className="relative z-10 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="relative z-10">Export CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
