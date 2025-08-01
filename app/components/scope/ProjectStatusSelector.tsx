/**
 * Project Status Selector Component
 * Dropdown selector for changing project status
 */

import React from 'react';
import { useTranslation } from '@/lib/translation';
import { ProjectStatusBadge, ProjectStatus } from './ProjectStatusBadge';

interface ProjectStatusSelectorProps {
  value: ProjectStatus;
  onChange: (status: ProjectStatus) => void;
  className?: string;
  disabled?: boolean;
}

const statusOptions: ProjectStatus[] = [
  'not_started',
  'in_progress', 
  'paused',
  'completed',
  'cancelled',
  'archived',
  'suspended'
];

export function ProjectStatusSelector({ value, onChange, className = '', disabled = false }: ProjectStatusSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ProjectStatus)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {statusOptions.map((status) => {
          const translationKey = status === 'not_started' ? 'statusNotStarted' :
                                status === 'in_progress' ? 'statusInProgress' :
                                status === 'paused' ? 'statusPaused' :
                                status === 'completed' ? 'statusCompleted' :
                                status === 'cancelled' ? 'statusCancelled' :
                                status === 'archived' ? 'statusArchived' :
                                status === 'suspended' ? 'statusSuspended' : 'statusNotStarted';
          return (
            <option key={status} value={status}>
              {t(translationKey)}
            </option>
          );
        })}
      </select>
      
      {/* Display current status badge */}
      <div className="mt-2">
        <ProjectStatusBadge status={value} />
      </div>
    </div>
  );
} 