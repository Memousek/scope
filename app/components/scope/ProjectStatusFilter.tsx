/**
 * Project Status Filter Component
 * Provides filtering functionality for projects based on their status
 * Now styled as horizontal chips/tags (like team filter)
 */

import React from 'react';
import { useTranslation } from '@/lib/translation';
import { FiFilter } from 'react-icons/fi';

export type ProjectStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended';

interface ProjectStatusFilterProps {
  selectedStatuses: ProjectStatus[];
  onStatusChange: (statuses: ProjectStatus[]) => void;
  className?: string;
}

const statusConfig: Record<ProjectStatus, { label: string; color: string; translationKey: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-600', translationKey: 'statusNotStarted' },
  in_progress: { label: 'In Progress', color: 'bg-blue-600', translationKey: 'statusInProgress' },
  paused: { label: 'Paused', color: 'bg-amber-600', translationKey: 'statusPaused' },
  completed: { label: 'Completed', color: 'bg-emerald-600', translationKey: 'statusCompleted' },
  cancelled: { label: 'Cancelled', color: 'bg-red-600', translationKey: 'statusCancelled' },
  archived: { label: 'Archived', color: 'bg-slate-700', translationKey: 'statusArchived' },
  suspended: { label: 'Suspended', color: 'bg-orange-600', translationKey: 'statusSuspended' }
};

export function ProjectStatusFilter({ selectedStatuses, onStatusChange, className = '' }: ProjectStatusFilterProps) {
  const { t } = useTranslation();

  const toggleStatus = (status: ProjectStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const selectAll = () => {
    onStatusChange(Object.keys(statusConfig) as ProjectStatus[]);
  };

  const clearAll = () => {
    onStatusChange([]);
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-600 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('filterByStatus')}</span>
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-blue-600 dark:text-blue-400 hover:underline focus:outline-none">{t('selectAll')}</button>
          <button onClick={clearAll} className="text-gray-600 dark:text-gray-400 hover:underline focus:outline-none">{t('clearAll')}</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {Object.entries(statusConfig).map(([status, config]) => {
          const active = selectedStatuses.includes(status as ProjectStatus);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status as ProjectStatus)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-150 focus:outline-none shadow-sm
                ${config.color} 
                ${active ? 'ring-2 ring-blue-500 text-white border-blue-500 scale-105 shadow-lg' : 'opacity-80 hover:opacity-100 border-transparent text-white hover:shadow-md'}
              `}
              aria-pressed={active}
            >
              {t(config.translationKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
} 