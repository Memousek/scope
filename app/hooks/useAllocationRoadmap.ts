/**
 * useAllocationRoadmap Hook
 *
 * Synchronously derives a sequential allocation roadmap for the current scope.
 * The roadmap aggregates FTE demand, remaining mandays, estimated budget and timeline windows.
 */

import { useMemo } from 'react';
import { Project, TeamMember } from '@/app/components/scope/types';
import { addWorkdays, getWorkdaysDiff, isWorkday } from '@/app/utils/dateUtils';

export type RoadmapRiskLevel = 'on_track' | 'at_risk' | 'capacity_gap' | 'no_deadline';

export interface AllocationRoadmapItem {
  projectId: string;
  projectName: string;
  priority: number;
  remainingMandays: number;
  estimatedBudget: number;
  requiredFteForDeadline: number;
  availableTeamFte: number;
  fteGap: number;
  plannedStart: Date;
  plannedFinish: Date;
  deadline: Date | null;
  estimatedDurationWorkdays: number;
  riskLevel: RoadmapRiskLevel;
  colorClass: string;
}

export interface AllocationRoadmapSummary {
  totalTeamFte: number;
  fallbackFteUsed: boolean;
  totalRemainingMandays: number;
  totalBudget: number;
  totalDurationWorkdays: number;
  roadmapStart: Date | null;
  roadmapEnd: Date | null;
}

export interface UseAllocationRoadmapResult {
  items: AllocationRoadmapItem[];
  summary: AllocationRoadmapSummary;
  loading: boolean;
}

const COLOR_POOL = [
  'from-sky-500/20 via-sky-500/10 to-blue-600/10',
  'from-emerald-500/20 via-emerald-500/10 to-green-600/10',
  'from-purple-500/20 via-purple-500/10 to-indigo-600/10',
  'from-pink-500/20 via-pink-500/10 to-rose-600/10',
  'from-amber-500/20 via-amber-400/10 to-orange-600/10'
];

/**
 * Aggregates roadmap data for all projects in scope.
 *
 * @param projects Projects pulled for the scope
 * @param team Team roster with FTE values
 */
export const useAllocationRoadmap = (
  projects: Project[],
  team: TeamMember[]
): UseAllocationRoadmapResult => {
  const value = useMemo(() => buildRoadmap(projects, team), [projects, team]);

  return {
    items: value.items,
    summary: value.summary,
    loading: false
  };
};

const buildRoadmap = (
  projects: Project[],
  team: TeamMember[]
): { items: AllocationRoadmapItem[]; summary: AllocationRoadmapSummary } => {
  const numericTeamFte = team.reduce((sum, member) => sum + (member.fte || 0), 0);
  const baselineTeamFte = Math.max(1, roundToTwoDecimals(numericTeamFte));
  const fallbackFteUsed = baselineTeamFte === 1 && numericTeamFte === 0;
  const averageMdRate = computeAverageMdRate(team);

  const scopedProjects = (projects || [])
    .map(project => ({
      project,
      remainingMandays: computeRemainingMandays(project)
    }))
    .filter(entry => entry.remainingMandays > 0)
    .sort((a, b) => {
      if (a.project.priority !== b.project.priority) {
        return a.project.priority - b.project.priority;
      }
      const aDeadline = toDate(a.project.delivery_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDeadline = toDate(b.project.delivery_date)?.getTime() ?? Number.POSITIVE_INFINITY;
      return aDeadline - bDeadline;
    });

  if (scopedProjects.length === 0) {
    return {
      items: [],
      summary: {
        totalTeamFte: baselineTeamFte,
        fallbackFteUsed,
        totalRemainingMandays: 0,
        totalBudget: 0,
        totalDurationWorkdays: 0,
        roadmapStart: null,
        roadmapEnd: null
      }
    };
  }

  let timelineCursor = deriveInitialCursor(scopedProjects);
  const today = startOfToday();
  if (timelineCursor < today) {
    timelineCursor = today;
  }

  const items: AllocationRoadmapItem[] = scopedProjects.map((entry, index) => {
    const { project, remainingMandays } = entry;
    const startConstraint = toDate(project.start_day);
    const plannedStart = clampStartDate(
      timelineCursor,
      startConstraint ?? timelineCursor
    );

    const estimatedDurationWorkdays = Math.max(
      1,
      Math.ceil(remainingMandays / baselineTeamFte)
    );

    const plannedFinish = addWorkdays(plannedStart, estimatedDurationWorkdays);
    timelineCursor = new Date(plannedFinish);

    const deadline = toDate(project.delivery_date);
    const workdayWindow = deadline ? Math.max(1, Math.abs(getWorkdaysDiff(plannedStart, deadline) || 0)) : null;
    const requiredFteForDeadline = workdayWindow
      ? roundToTwoDecimals(remainingMandays / workdayWindow)
      : baselineTeamFte;
    const fteGap = roundToTwoDecimals(baselineTeamFte - requiredFteForDeadline);

    const riskLevel: RoadmapRiskLevel = computeRiskLevel({
      deadline,
      plannedFinish,
      requiredFteForDeadline,
      baselineTeamFte
    });

    const estimatedBudget = roundToTwoDecimals(remainingMandays * averageMdRate);

    return {
      projectId: project.id,
      projectName: project.name,
      priority: project.priority,
      remainingMandays,
      estimatedBudget,
      requiredFteForDeadline,
      availableTeamFte: baselineTeamFte,
      fteGap,
      plannedStart,
      plannedFinish,
      deadline,
      estimatedDurationWorkdays,
      riskLevel,
      colorClass: COLOR_POOL[index % COLOR_POOL.length]
    };
  });

  const totalRemainingMandays = roundToTwoDecimals(
    items.reduce((sum, item) => sum + item.remainingMandays, 0)
  );
  const totalDurationWorkdays = items.reduce(
    (sum, item) => sum + item.estimatedDurationWorkdays,
    0
  );
  const totalBudget = roundToTwoDecimals(
    items.reduce((sum, item) => sum + item.estimatedBudget, 0)
  );

  return {
    items,
    summary: {
      totalTeamFte: baselineTeamFte,
      fallbackFteUsed,
      totalRemainingMandays,
      totalBudget,
      totalDurationWorkdays,
      roadmapStart: items[0]?.plannedStart ?? null,
      roadmapEnd: items[items.length - 1]?.plannedFinish ?? null
    }
  };
};

const computeRemainingMandays = (project: Project): number => {
  const keys = Object.keys(project ?? {});
  return keys
    .filter(key => key.endsWith('_mandays'))
    .reduce((sum, key) => {
      const baseValue = Number((project as Record<string, unknown>)[key] ?? 0);
      if (!Number.isFinite(baseValue)) {
        return sum;
      }
      const roleKey = key.replace(/_mandays$/, '');
      const doneValue = Number(
        (project as Record<string, unknown>)[`${roleKey}_done`] ?? 0
      );
      const remaining = baseValue * (1 - doneValue / 100);
      return sum + Math.max(0, remaining);
    }, 0);
};

const computeAverageMdRate = (team: TeamMember[]): number => {
  const rates = team
    .map(member => Number(member.mdRate))
    .filter(rate => Number.isFinite(rate) && rate > 0);

  if (rates.length === 0) {
    return 0;
  }

  const avg = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  return roundToTwoDecimals(avg);
};

const deriveInitialCursor = (
  projects: Array<{ project: Project }>
): Date => {
  const explicitDates = projects
    .map(entry => toDate(entry.project.start_day))
    .filter((date): date is Date => Boolean(date));

  if (explicitDates.length === 0) {
    return startOfToday();
  }

  return explicitDates.reduce((earliest, current) =>
    current < earliest ? current : earliest
  );
};

const startOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const clampStartDate = (cursor: Date, constraint: Date): Date => {
  const start = new Date(Math.max(cursor.getTime(), constraint.getTime()));
  return adjustToWorkday(start);
};

const adjustToWorkday = (input: Date): Date => {
  const date = new Date(input);
  while (!isWorkday(date)) {
    date.setDate(date.getDate() + 1);
  }
  return date;
};

const computeRiskLevel = ({
  deadline,
  plannedFinish,
  requiredFteForDeadline,
  baselineTeamFte
}: {
  deadline: Date | null;
  plannedFinish: Date;
  requiredFteForDeadline: number;
  baselineTeamFte: number;
}): RoadmapRiskLevel => {
  if (!deadline) {
    return 'no_deadline';
  }
  if (plannedFinish <= deadline && requiredFteForDeadline <= baselineTeamFte) {
    return 'on_track';
  }
  if (requiredFteForDeadline > baselineTeamFte) {
    return 'capacity_gap';
  }
  return 'at_risk';
};

const toDate = (
  raw: string | number | Date | null | undefined
): Date | null => {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

