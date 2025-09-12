/**
 * useScopeNavigation Hook
 * 
 * Shared navigation logic for scope sidebar and mobile menu.
 * Provides categories, tab management, and navigation state.
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/translation';
import {
  FiBarChart2,
  FiTrendingUp,
  FiClock,
  FiUsers,
  FiFolder,
  FiCalendar,
  FiDollarSign,
  FiExternalLink,
  FiSettings
} from 'react-icons/fi';

export type TabType = 'overview' | 'team' | 'projects' | 'burndown' | 'billing' | 'timesheets' | 'allocation' | 'jira' | 'settings';

export interface SidebarCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  tabs: {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    experimental?: boolean;
  }[];
}

export function useScopeNavigation() {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['analytics', 'team-projects'])
  );

  const categories: SidebarCategory[] = useMemo(() => [
    {
      id: 'analytics',
      label: t('analytics'),
      icon: React.createElement(FiBarChart2, { className: "w-5 h-5" }),
      tabs: [
        { id: 'overview', label: t('overview'), icon: React.createElement(FiBarChart2) },
        { id: 'burndown', label: t('burndown'), icon: React.createElement(FiTrendingUp) },
        { id: 'timesheets', label: t('timesheets'), icon: React.createElement(FiClock), experimental: true }
      ]
    },
    {
      id: 'team-projects',
      label: t('teamProjects'),
      icon: React.createElement(FiUsers, { className: "w-5 h-5" }),
      tabs: [
        { id: 'team', label: t('team'), icon: React.createElement(FiUsers) },
        { id: 'projects', label: t('projects'), icon: React.createElement(FiFolder) },
        { id: 'allocation', label: t('allocationTable'), icon: React.createElement(FiCalendar), experimental: true }
      ]
    },
    {
      id: 'finance',
      label: t('finance'),
      icon: React.createElement(FiDollarSign, { className: "w-5 h-5" }),
      tabs: [
        { id: 'billing', label: t('billing'), icon: React.createElement(FiDollarSign), experimental: true }
      ]
    },
    {
      id: 'integration-settings',
      label: t('integrationSettings'),
      icon: React.createElement(FiSettings, { className: "w-5 h-5" }),
      tabs: [
        { id: 'jira', label: t('jira'), icon: React.createElement(FiExternalLink), experimental: true },
        { id: 'settings', label: t('settings'), icon: React.createElement(FiSettings) }
      ]
    }
  ], [t]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const isTabAllowed = (tabId: TabType, allowedTabs: TabType[]) => {
    return allowedTabs.includes(tabId);
  };

  return {
    categories,
    expandedCategories,
    toggleCategory,
    isTabAllowed
  };
}
