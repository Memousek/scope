"use client";
/**
 * AllocationRoadmap Component
 *
 * Visualizes the derived sequential roadmap (single-team focus) together with FTE demand.
 * Highlights capacity gaps and budget estimates per project.
 */

import React, { useMemo, useState } from 'react';
import { useTranslation } from '@/lib/translation';
import { Project, TeamMember } from './types';
import { useAllocationRoadmap } from '@/app/hooks/useAllocationRoadmap';
import {
  FiUsers,
  FiTrendingUp,
  FiClock,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo
} from 'react-icons/fi';

interface AllocationRoadmapProps {
  projects: Project[];
  team: TeamMember[];
}

const riskStyles: Record<
  import('@/app/hooks/useAllocationRoadmap').RoadmapRiskLevel,
  { labelKey: string; className: string; icon: React.ReactNode }
> = {
  on_track: {
    labelKey: 'onTime',
    className: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: <FiCheckCircle className="w-4 h-4" />
  },
  at_risk: {
    labelKey: 'delayed',
    className: 'text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300',
    icon: <FiAlertTriangle className="w-4 h-4" />
  },
  capacity_gap: {
    labelKey: 'fteGap',
    className: 'text-rose-600 bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300',
    icon: <FiAlertTriangle className="w-4 h-4" />
  },
  no_deadline: {
    labelKey: 'notSet',
    className: 'text-slate-600 bg-slate-100 dark:bg-slate-500/10 dark:text-slate-300',
    icon: <FiInfo className="w-4 h-4" />
  }
};

export const AllocationRoadmap: React.FC<AllocationRoadmapProps> = ({
  projects,
  team
}) => {
  const { t } = useTranslation();
  const { items, summary } = useAllocationRoadmap(projects, team);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1
      }),
    []
  );

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0
      }),
    []
  );

  if (!projects || projects.length === 0) {
    return null;
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjectId(prev => (prev === projectId ? null : projectId));
  };

  const handleKeyToggle = (event: React.KeyboardEvent<HTMLDivElement>, projectId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleProject(projectId);
    }
  };

  return (
    <section
      className="mb-10 rounded-2xl border border-white/20 bg-gradient-to-br from-white/80 via-white/60 to-white/40 p-6 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:from-slate-900/70 dark:via-slate-900/40 dark:to-slate-900/20"
      aria-label={t('allocationRoadmap')}
    >
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {t('allocationRoadmap')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('allocationRoadmapSubtitle', { projectCount: items.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300">
            <FiUsers className="h-4 w-4" />
            {t('teamCapacity')}: {formatter.format(summary.totalTeamFte)} FTE
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 text-purple-600 dark:bg-purple-500/20 dark:text-purple-200">
            <FiTrendingUp className="h-4 w-4" />
            {t('roadmapRemainingMandays')}: {formatter.format(summary.totalRemainingMandays)} MD
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-2 text-teal-600 dark:bg-teal-500/20 dark:text-teal-200">
            <FiClock className="h-4 w-4" />
            {t('roadmapProjectedDuration')}: {summary.totalDurationWorkdays} {t('workingDays')}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white/40 p-4 text-sm text-gray-600 dark:border-gray-600 dark:bg-slate-900/50 dark:text-gray-300">
          {t('startByAddingFirstProject')}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => {
            const risk = riskStyles[item.riskLevel];
            const isExpanded = expandedProjectId === item.projectId;

            return (
              <div
                key={item.projectId}
                className="group relative rounded-2xl border border-white/20 bg-white/70 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-2 focus-within:ring-blue-500 dark:border-gray-700/40 dark:bg-slate-900/60"
                tabIndex={0}
                role="group"
                aria-label={`${item.projectName} • ${t('projectFteNeed', { value: formatter.format(item.requiredFteForDeadline) })}`}
                onClick={() => toggleProject(item.projectId)}
                onKeyDown={event => handleKeyToggle(event, item.projectId)}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('priority')} #{item.priority}
                    </p>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {item.projectName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('allocationSequentialLabel')}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}
                  >
                    {risk.icon}
                    {t(risk.labelKey)}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-gray-200/60 bg-gray-50/60 p-4 text-sm dark:border-gray-700/60 dark:bg-slate-800/60">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('roadmapRemainingMandays')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatter.format(item.remainingMandays)} MD
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('budgetEstimate')}:{' '}
                      {item.estimatedBudget > 0 ? currencyFormatter.format(item.estimatedBudget) : t('notSet')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200/60 bg-gray-50/60 p-4 text-sm dark:border-gray-700/60 dark:bg-slate-800/60">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('projectFteNeedLabel')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatter.format(item.requiredFteForDeadline)} FTE
                    </p>
                    <p className={`text-xs ${item.fteGap >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                      {item.fteGap >= 0
                        ? t('fteReserve', { value: formatter.format(item.fteGap) })
                        : t('fteDeficit', { value: formatter.format(Math.abs(item.fteGap)) })}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200/60 bg-gray-50/60 p-4 text-sm dark:border-gray-700/60 dark:bg-slate-800/60">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('plannedWindow')}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatDate(item.plannedStart)} → {formatDate(item.plannedFinish)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('deadline')}: {formatDate(item.deadline)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.colorClass}`}
                    style={{
                      width: `${(item.estimatedDurationWorkdays / Math.max(summary.totalDurationWorkdays, 1)) * 100}%`
                    }}
                  />
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-xl border border-dashed border-gray-300/70 bg-white/60 p-4 text-sm text-gray-600 dark:border-gray-600/60 dark:bg-slate-900/40 dark:text-gray-300">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {t('allocationSequentialLabel')}
                        </p>
                        <p>
                          {t('allocationOneTeamSummary', { projectCount: items.length })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {t('roadmapProjectedDuration')}
                        </p>
                        <p>
                          {item.estimatedDurationWorkdays} {t('workingDays')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const formatDate = (date: Date | null): string => {
  if (!date) {
    return '-';
  }
  try {
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return date.toISOString().split('T')[0] ?? '-';
  }
};

