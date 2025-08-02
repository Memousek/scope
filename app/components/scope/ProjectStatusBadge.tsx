/**
 * Project Status Badge Component
 * Displays project status with appropriate colors and labels
 */

import React from 'react';
import { useTranslation } from '@/lib/translation';

export type ProjectStatus = 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'archived' | 'suspended';

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const statusConfig: Record<ProjectStatus, { color: string; translationKey: string }> = {
  not_started: { color: 'bg-gray-600', translationKey: 'statusNotStarted' },
  in_progress: { color: 'bg-blue-600', translationKey: 'statusInProgress' },
  paused: { color: 'bg-amber-600', translationKey: 'statusPaused' },
  completed: { color: 'bg-emerald-600', translationKey: 'statusCompleted' },
  cancelled: { color: 'bg-red-600', translationKey: 'statusCancelled' },
  archived: { color: 'bg-slate-700', translationKey: 'statusArchived' },
  suspended: { color: 'bg-orange-600', translationKey: 'statusSuspended' }
};

export function ProjectStatusBadge({ status, className = '' }: ProjectStatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white shadow-sm ${config.color} ${className}`}>
      {t(config.translationKey)}
    </span>
  );
} 