"use client";
/**
 * Modern Burndown Chart Component using Recharts
 * - Professional line charts with animations
 * - Interactive tooltips and hover effects
 * - Responsive design with dark mode support
 * - Built-in legends and axes
 * - Burndown chart showing remaining work over time
 */

import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Project, TeamMember } from './types';
import { calculatePriorityDatesWithAssignments, isWorkday } from '@/app/utils/dateUtils';
import { ProjectTeamAssignment } from '@/lib/domain/models/project-team-assignment.model';
import { useTranslation } from "@/lib/translation";
import { useScopeRoles } from '@/app/hooks/useScopeRoles';
import { FiBarChart2, FiTrendingUp, FiClock } from 'react-icons/fi';
import { downloadCSV } from '@/app/utils/csvUtils';

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
  const [hiddenProjects, setHiddenProjects] = useState<Set<string>>(new Set());
  const [showIdealLine, setShowIdealLine] = useState<boolean>(true);
  const chartRef = useRef<HTMLDivElement>(null);
  const [dateRangeDays, setDateRangeDays] = useState<30 | 60 | 90>(() => {
    if (typeof window === 'undefined') return 60;
    const saved = localStorage.getItem(`scope:${scopeId}:burndown:range`);
    return (saved === '30' || saved === '60' || saved === '90') ? Number(saved) as 30 | 60 | 90 : 60;
  });

  // Today reference label (closest existing tick label)
  const todayTickLabel = (() => {
    if (chartData.length === 0) return null;
    const today = new Date();
    const parseLabel = (label: string): Date | null => {
      // Parses labels like "13.08" or "13. 08" (cs-CZ day+month without year)
      const match = label.match(/(\d{2})\.?\s*(\d{2})/);
      if (!match) return null;
      const day = Number(match[1]);
      const month = Number(match[2]);
      const d = new Date(today.getFullYear(), month - 1, day);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    let bestLabel: string | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const pt of chartData) {
      if (typeof pt.date !== 'string') continue;
      const d = parseLabel(pt.date);
      if (!d) continue;
      const diff = Math.abs(d.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        bestLabel = pt.date;
      }
    }
    return bestLabel;
  })();

  // Export PNG functionality
  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    try {
      const htmlToImage = await import('html-to-image');      
      // Najdeme chart container uvnitř ref elementu
      const chartContainer = chartRef.current.querySelector('.recharts-wrapper');
      if (!chartContainer) {
        console.error('Chart container not found');
        return;
      }
      
      // Získáme skutečné rozměry chart containeru
      const rect = chartContainer.getBoundingClientRect();
      const scale = 2; // Zvýšíme kvalitu pro lepší export
      
      const dataUrl = await htmlToImage.toPng(chartContainer as HTMLElement, { 
        backgroundColor: 'transparent',
        quality: 1.0,
        width: rect.width * scale,
        height: rect.height * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }
      });
      const link = document.createElement('a');
      link.download = `burndown-chart-${scopeId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  };

  // Export CSV functionality
  const handleExportCSV = () => {
    if (chartData.length === 0) return;
    
    const columns: (keyof ChartDataPoint)[] = ['date', 'totalProgress', 'idealProgress'];
    const headerMap: Record<string, string> = {
      date: t('date'),
      totalProgress: t('totalPercentDone'),
      idealProgress: t('idealProgress'),
    };

    // Add project columns dynamically - only active projects
    const activeProjects = projects.filter(project => {
      const status = project.status || 'not_started';
      return !['completed', 'cancelled', 'archived'].includes(status);
    });
    activeProjects.forEach((project) => {
      const projectKey = `project_${project.id}` as keyof ChartDataPoint;
      columns.push(projectKey);
      headerMap[projectKey] = project.name;
    });

    downloadCSV(`burndown-data-${scopeId}.csv`, chartData, columns, headerMap);
  };

  // Generate chart data based on projects and team
  useEffect(() => {
    try {
      if (projects.length === 0 || team.length === 0) return;

      // Filter out completed, cancelled, and archived projects
      const activeProjects = projects.filter(project => {
        const status = project.status || 'not_started';
        return !['completed', 'cancelled', 'archived'].includes(status);
      });

      if (activeProjects.length === 0) {
        setChartData([]);
        return;
      }

      // Use workflow-aware calculation if dependencies are available
      const priorityDates = calculatePriorityDatesWithAssignments(
        activeProjects,
        projectAssignments,
        workflowDependencies,
        team
      );
      const data: ChartDataPoint[] = [];

      const bufferDays = 2;
      const allDates = Object.values(priorityDates).flatMap(
        ({ priorityStartDate, priorityEndDate }) => {
          const dates: Date[] = [];
          const current = new Date(priorityStartDate);
          const endWithBuffer = new Date(priorityEndDate);
          endWithBuffer.setDate(endWithBuffer.getDate() + bufferDays);
          while (current <= endWithBuffer) {
            if (isWorkday(current)) {
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

      if (uniqueDates.length === 0) {
        // Pokud nemáme žádná data, vytvoříme minimální dataset pro zobrazení
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + 14); // 2 týdny dopředu
        
        const fallbackDates = [];
        const current = new Date(today);
        let safetyCounter = 0;
        while (current <= futureDate && safetyCounter < 30) { // Omezení na 30 dní
          if (isWorkday(current)) {
            fallbackDates.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
          safetyCounter++;
        }
        
        // Generujeme data pro fallback (burndown: 100% -> 0%)
        fallbackDates.forEach((date, index) => {
          const totalDays = fallbackDates.length;
          const idealProgress = Math.max(0, ((totalDays - index - 1) / (totalDays - 1)) * 100);
          // Vyhladíme fallback data aby nedocházelo ke skokům
          const randomVariation = Math.sin(index * 0.3) * 5; // Plynulá variace
          const actualProgress = Math.max(0, Math.min(100, idealProgress + randomVariation));
          
          data.push({
            date: date.toLocaleDateString("cs-CZ", {
              day: "2-digit",
              month: "2-digit",
            }),
            totalProgress: isNaN(actualProgress) ? 0 : Math.max(0, Math.min(100, actualProgress)), // Zbývající práce pro burndown
            idealProgress: isNaN(idealProgress) ? 0 : Math.max(0, Math.min(100, idealProgress)),
          });
        });
        
        setChartData(data);
        return;
      }

      // Zajistíme správné zobrazení všech datových bodů
      const minPoints = 5;
      const maxPoints = dateRangeDays; // omezení dle UI přepínače
      
      let filteredDates = uniqueDates;
      if (uniqueDates.length > maxPoints) {
        // Použijeme inteligentní filtrování - zachováme první, poslední a rovnoměrně rozložené body
        const step = Math.max(1, Math.floor(uniqueDates.length / maxPoints));
        const filtered = [];
        
        // Vždy zachováme první a poslední bod
        filtered.push(uniqueDates[0]);
        
        // Přidáme rovnoměrně rozložené body
        for (let i = step; i < uniqueDates.length - 1; i += step) {
          filtered.push(uniqueDates[i]);
        }
        
        // Vždy zachováme poslední bod
        if (uniqueDates.length > 1) {
          filtered.push(uniqueDates[uniqueDates.length - 1]);
        }
        
        filteredDates = filtered;
      } else if (uniqueDates.length < minPoints) {
        // Pokud máme málo bodů, přidáme další dny
        const lastDate = uniqueDates[uniqueDates.length - 1];
        const additionalDates = [];
        const current = new Date(lastDate);
        let safetyCounter = 0;
        
        while (additionalDates.length < (minPoints - uniqueDates.length) && safetyCounter < 50) {
          current.setDate(current.getDate() + 1);
          if (isWorkday(current)) {
            additionalDates.push(new Date(current));
          }
          safetyCounter++;
        }
        
        filteredDates = [...uniqueDates, ...additionalDates];
      }

      let lastValidProgress = 0;

      filteredDates.forEach((date, index) => {
  const totalPoints = filteredDates.length;
  // Ideální burndown: první bod 100 %, poslední bod 0 %
  const idealProgress = totalPoints === 1 ? 100 : 100 * (1 - index / (totalPoints - 1));

  const projectProgress: { [key: string]: number } = {};
  let weightedProgressSum = 0;
  let totalWeight = 0;

        activeProjects.forEach((project) => {
          const projectStart = priorityDates[project.id]?.priorityStartDate;
          const projectEnd = priorityDates[project.id]?.priorityEndDate;
          if (!projectStart || !projectEnd) return;

          const projectEndExtended = new Date(projectEnd);
          projectEndExtended.setDate(projectEndExtended.getDate() + bufferDays);

          // Progress se počítá kumulativně - pokud projekt začal, má nějaký progress
          let projectProgressValue = 0;
          
          // Dynamicky počítáme progress pro všechny aktivní role
          let totalActual = 0;
          let totalMandays = 0;
          let roleCount = 0;

          if (activeRoles && activeRoles.length > 0) {
            activeRoles.forEach(role => {
              const doneKey = `${role.key}_done`;
              const mandaysKey = `${role.key}_mandays`;
              const actual = Number((project as unknown as Record<string, unknown>)[doneKey]) || 0;
              const mandays = Number((project as unknown as Record<string, unknown>)[mandaysKey]) || 0;
              
              totalActual += actual;
              totalMandays += mandays;
              if (mandays > 0) roleCount++;
            });
          }
          
          if (date >= projectStart) {
            // Projekt už začal nebo začíná
            const projectDuration = Math.ceil(
              (projectEnd.getTime() - projectStart.getTime()) /
                (1000 * 60 * 60 * 24)
            );
            
            if (date <= projectEndExtended) {
              // Projekt je aktivní
              const daysElapsed = Math.ceil(
                (date.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)
              );
              const timeProgress = Math.min(daysElapsed / projectDuration, 1);

              const actualProgress = roleCount > 0 ? totalActual / roleCount : 0;
              // Omezíme hodnoty na rozsah 0-100%
              projectProgressValue = Math.min(100, Math.max(0, actualProgress * 0.7 + timeProgress * 100 * 0.3));
            } else {
              // Projekt už skončil - progress je 100%
              projectProgressValue = 100;
            }
          }

          // Vyhladíme skoky pro jednotlivé projekty
          const projectKey = `project_${project.id}`;
          if (data.length > 0 && data[data.length - 1][projectKey] !== undefined) {
            const lastProjectValue = data[data.length - 1][projectKey] as number;
            const difference = Math.abs(projectProgressValue - lastProjectValue);
            if (difference > 20) {
              // Plynulý přechod pro projekt - změna max 15% za den
              projectProgressValue = lastProjectValue + Math.sign(projectProgressValue - lastProjectValue) * Math.min(15, difference);
            }
          }
          
          projectProgress[projectKey] = projectProgressValue;
          const weight = totalMandays || 1;
          weightedProgressSum += projectProgressValue * weight;
          totalWeight += weight;
        });

        const totalProgress =
          totalWeight > 0 ? weightedProgressSum / totalWeight : lastValidProgress;
        if (totalWeight > 0) lastValidProgress = totalProgress;

        // Pro burndown chart: totalProgress = zbývající práce (100% - hotovo)
        // Omezíme na rozsah 0-100% a vyhladíme skoky
        const remainingWork = Math.min(100, Math.max(0, 100 - totalProgress));
        
        // Vyhladíme skoky - pokud je rozdíl větší než 15%, použijeme plynulý přechod
        if (data.length > 0) {
          const lastRemainingWork = data[data.length - 1].totalProgress;
          const difference = Math.abs(remainingWork - lastRemainingWork);
          if (difference > 15) {
            // Plynulý přechod - změna max 8% za den
            const smoothedRemainingWork = lastRemainingWork + Math.sign(remainingWork - lastRemainingWork) * Math.min(8, difference);
            // Validujeme vyhlazená data
            const validatedSmoothedProjectProgress: Record<string, number> = {};
            Object.entries(projectProgress).forEach(([key, value]) => {
              const numValue = Number(value);
              validatedSmoothedProjectProgress[key] = isNaN(numValue) ? 0 : Math.max(0, Math.min(100, numValue));
            });

            data.push({
              date: date.toLocaleDateString("cs-CZ", {
                day: "2-digit",
                month: "2-digit",
              }),
              totalProgress: isNaN(smoothedRemainingWork) ? 0 : Math.max(0, Math.min(100, smoothedRemainingWork)),
              idealProgress: isNaN(idealProgress) ? 0 : Math.max(0, Math.min(100, idealProgress)),
              ...validatedSmoothedProjectProgress,
            });
            return;
          }
        }
        
        // Validujeme všechny hodnoty aby se zabránilo NaN
        const validatedProjectProgress: Record<string, number> = {};
        Object.entries(projectProgress).forEach(([key, value]) => {
          const numValue = Number(value);
          validatedProjectProgress[key] = isNaN(numValue) ? 0 : Math.max(0, Math.min(100, numValue));
        });

        data.push({
          date: date.toLocaleDateString("cs-CZ", {
            day: "2-digit",
            month: "2-digit",
          }),
          totalProgress: isNaN(remainingWork) ? 0 : Math.max(0, Math.min(100, remainingWork)), // Zbývající práce pro burndown
          idealProgress: isNaN(idealProgress) ? 0 : Math.max(0, Math.min(100, idealProgress)),
          ...validatedProjectProgress,
        });
      });

      // Seřadíme data podle data (od nejstaršího k nejnovějšímu)
      const sortedData = [...data].sort((a, b) => {
        const da = a.date.split('.').reverse().join('-');
        const db = b.date.split('.').reverse().join('-');
        return new Date(da).getTime() - new Date(db).getTime();
      });
      // Ořízneme na posledních N dní dle přepínače
      const sliced = sortedData.slice(-dateRangeDays);
      setChartData(sliced);
    } catch (error) {
      console.error('Error generating burndown chart data:', error);
      // Fallback na prázdná data
      setChartData([]);
    }
  }, [projects, team, projectAssignments, activeRoles, workflowDependencies, dateRangeDays]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number; dataKey: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      // Najdeme aktuální data pro výpočet rozdílu
      const currentData = chartData.find(d => d.date === label);
      const remainingWork = currentData?.totalProgress || 0;
      const idealWork = currentData?.idealProgress || 0;
      const variance = Math.round(idealWork - remainingWork);
      
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-lg max-w-xs">
          <p className="font-semibold mb-3 text-gray-900 dark:text-white">{label}</p>
          
          {/* Hlavní metriky */}
          <div className="space-y-2 mb-3">
            {payload.map((entry, index: number) => {
              const isIdeal = entry.dataKey === 'idealProgress';
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ 
                        backgroundColor: entry.color,
                        backgroundImage: isIdeal ? 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' : undefined
                      }}
                    ></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(entry.value)}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rozdíl od ideálu */}
          {variance !== 0 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {t("varianceFromIdeal")}
                </span>
                <span className={`text-sm font-medium ${
                  variance <= 0 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {variance <= 0 ? "" : "+"}{variance}%
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
        <div className="text-center py-16 animate-in fade-in duration-700">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20"></div>
            <div className="relative text-8xl flex items-center justify-center animate-bounce">
              <FiBarChart2 />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-xl font-medium mb-2">
            {t("noDataForChart")}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {t("noDataForChartDescription")}
          </p>
        </div>
      </div>
    );
  }

  // Calculate statistics - only active projects
  const activeProjects = projects.filter(project => {
    const status = project.status || 'not_started';
    return !['completed', 'cancelled', 'archived'].includes(status);
  });
  const totalProjects = activeProjects.length;

  // Zbývající práce: totalProgress už obsahuje zbývající práci
  const remainingWork = chartData.length > 0
    ? Math.round(chartData[chartData.length - 1]?.totalProgress || 100)
    : 100;
  const idealRemaining = chartData.length > 0
    ? Math.round(chartData[chartData.length - 1]?.idealProgress || 100)
    : 100;
  const progressDiff = idealRemaining - remainingWork;

  // Get project names for title - only active projects
  const projectNames = activeProjects.map((p) => p.name).join(", ");

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

  // Color generator for many projects (fallback after palette)
  const getProjectColor = (index: number) => {
    const palette = projectColors;
    if (index < palette.length) return palette[index % palette.length];
    const hue = (index * 137.508) % 360; // golden-angle spacing
    return `hsl(${hue} 65% 55%)`;
  };

  const projectLines = activeProjects.map((project, index) => ({
    key: `project_${project.id}`,
    label: project.name,
    color: getProjectColor(index),
  }));


  // Toggle project visibility
  const toggleProject = (projectKey: string) => {
    setHiddenProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectKey)) {
        newSet.delete(projectKey);
      } else {
        newSet.add(projectKey);
      }
      return newSet;
    });
  };

  // Reset all hidden projects
  const resetAllProjects = () => {
    setHiddenProjects(new Set());
    setShowIdealLine(true);
  };


  return (
    <div ref={chartRef} className="space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <h2 className="text-2xl font-bold dark:text-white text-gray-900">
                <FiBarChart2 className="inline mr-2" />{" "}
                <span className="">{t("burndownChart")}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
              <span>{t("projectProgressTracking")}</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Team Members */}
            <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>
              <div className="p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="select-none w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                      <FiBarChart2 className="text-white text-2xl" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {t("projects")}
                    </p>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {totalProjects}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-emerald-500/0 to-teal-500/0 group-hover:from-green-500/5 group-hover:via-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-300 rounded-2xl"></div>
              <div className="p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="select-none w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                      <FiTrendingUp className="text-white text-2xl" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {t("progress")}
                    </p>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {Math.round(100 - remainingWork)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Remaining Work */}
            <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-red-500/0 to-pink-500/0 group-hover:from-orange-500/5 group-hover:via-red-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>
              <div className="p-6 relative">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="select-none w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                      <FiClock className="text-white text-2xl" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                      {t("remainingWork")}
                    </p>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {remainingWork}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          {/* Chart Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <FiBarChart2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t("burndownChart")}
                  </h3>
                  {projectNames && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("projects")}: {projectNames}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Range selector */}
            <div className="flex items-center justify-end gap-2">
              {[30, 60, 90].map((r) => (
                <button
                  key={r}
                  onClick={() => { setDateRangeDays(r as 30 | 60 | 90); try { localStorage.setItem(`scope:${scopeId}:burndown:range`, String(r)); } catch {} }}
                  aria-pressed={dateRangeDays === r}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${dateRangeDays === r ? 'bg-blue-600 text-white' : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-700/80'}`}
                >
                  {r} {t('days')}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />
                {/* Today vertical reference line (only if not at the edges) */}
                {todayTickLabel && 
                 typeof todayTickLabel === 'string' &&
                 chartData.length > 2 && 
                 todayTickLabel !== chartData[0]?.date && 
                 todayTickLabel !== chartData[chartData.length - 1]?.date && (
                  <ReferenceLine 
                    x={todayTickLabel} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    ifOverflow="extendDomain" 
                    label={{ 
                      value: (t('today') as string) || 'Dnes', 
                      position: 'top', 
                      fill: '#ef4444' 
                    }} 
                  />
                )}
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={11}
                  tick={{ fill: "#6b7280" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  minTickGap={20}
                />
                <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    domain={[100, 0]} 
                    reversed={true}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: "#6b7280" }}
                  />
                <Tooltip content={<CustomTooltip />} />

                {/* Project progress */}
                {projectLines
                  .filter(project => !hiddenProjects.has(project.key))
                  .map((project) => (
                    <Line
                      key={project.key}
                      type="monotone"
                      dataKey={project.key}
                      stroke={project.color}
                      strokeWidth={1}
                      name={project.label}
                      dot={{ fill: project.color, strokeWidth: 2, r: 3 }}
                      opacity={1}
                    />
                  ))}

                {/* Celkový progress */}
                <Line
                  type="monotone"
                  dataKey="totalProgress"
                  stroke="#4ade80"
                  strokeWidth={4}
                  name={t("remainingWork")}
                  dot={{ fill: "#4ade80", strokeWidth: 2, r: 5 }}
                  opacity={1}
                />

                {/* Ideální průběh */}
                {showIdealLine && (
                  <Line
                    type="monotone"
                    dataKey="idealProgress"
                    stroke="#6b7280"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name={t("idealProgress")}
                    dot={false}
                    opacity={0.7}
                  />
                )}

              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            {/* Total Progress Line */}
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-green-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("remainingWork")}
              </span>
            </div>

            {/* Ideal Progress Line */}
            <button
              onClick={() => setShowIdealLine(!showIdealLine)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                !showIdealLine 
                  ? 'opacity-50 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title={!showIdealLine ? t("showIdealProgress") : t("hideIdealProgress")}
            >
              <div 
                className={`w-4 h-0.5 transition-all duration-200 ${
                  !showIdealLine ? 'bg-gray-400' : 'bg-gray-500'
                }`}
                style={{ 
                  backgroundImage: showIdealLine ? 'repeating-linear-gradient(to right, #6b7280 0px, #6b7280 3px, transparent 3px, transparent 6px)' : undefined 
                }}
              ></div>
              <span className={!showIdealLine ? 'line-through' : ''}>
                {t("idealProgress")}
              </span>
              {!showIdealLine && (
                <span className="text-xs text-gray-400">({t("hidden")})</span>
              )}
            </button>
            
            {/* Project Lines */}
            {projectLines.map((project) => {
              const isHidden = hiddenProjects.has(project.key);
              return (
                <button
                  key={project.key}
                  onClick={() => toggleProject(project.key)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                    isHidden 
                      ? 'opacity-50 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' 
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={isHidden ? t("showProject") : t("hideProject")}
                >
                  <div 
                    className={`w-4 h-0.5 transition-all duration-200 ${
                      isHidden ? 'bg-gray-400' : ''
                    }`}
                    style={{ backgroundColor: isHidden ? undefined : project.color }}
                  ></div>
                  <span className={isHidden ? 'line-through' : ''}>
                    {project.label}
                  </span>
                  {isHidden && (
                    <span className="text-xs text-gray-400">({t("hidden")})</span>
                  )}
                </button>
              );
            })}
          </div>


          {/* Reset button */}
          {(hiddenProjects.size > 0 || !showIdealLine) && (
            <div className="flex justify-center mt-6 mb-4 pt-4 border-t border-gray-200/30 dark:border-gray-600/30">
              <button
                onClick={resetAllProjects}
                className="px-6 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm"
                title={t("resetAllFilters")}
              >
                {t("resetAllFilters")}
              </button>
            </div>
          )}

          {/* Footer with actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>{t("remaining")}: {remainingWork}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>{t("ideal")}: {idealRemaining}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${progressDiff <= 0 ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <span
                  className={
                    progressDiff <= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {progressDiff <= 0 ? "-" : "+"}
                  {Math.abs(progressDiff)}%
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handleExportPNG}
                className="relative group/btn bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 shadow-lg text-sm font-semibold flex items-center gap-2"
              >
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
                <span className="relative z-10">{t("exportPng")}</span>
              </button>
              <button 
                onClick={handleExportCSV}
                className="relative group/btn bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25 active:scale-95 shadow-lg text-sm font-semibold flex items-center gap-2"
              >
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
                <span className="relative z-10">{t("exportCsv")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
