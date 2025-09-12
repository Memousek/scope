/**
 * AllocationTable Component
 * 
 * A comprehensive allocation management interface with two main tabs:
 * 1. Allocation Tab - Daily allocation management for team members across projects
 * 2. Availability Overview Tab - Monthly heatmap showing team availability
 * 
 * Features:
 * - Daily allocation editing with project selection
 * - External client/project support
 * - Monthly availability heatmap with holidays and vacations
 * - Role-based filtering
 * - Responsive design with modern UI
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/translation';
import { TeamMember, Project } from './types';
import { getHolidays, isHoliday } from '@/app/utils/holidays';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { ContainerService } from '@/lib/container.service';
import { ManageProjectTeamAssignmentsService, ProjectTeamAssignmentWithDetails } from '@/lib/domain/services/manage-project-team-assignments.service';
import { EnhancedAllocationTable } from './EnhancedAllocationTable';
import { 
  FiCalendar, 
  FiUsers, 
  FiChevronLeft, 
  FiChevronRight, 
  FiEdit3
} from 'react-icons/fi';

interface AllocationTableProps {
  scopeId: string;
  team: TeamMember[];
  projects: Project[];
  readOnlyMode?: boolean;
}

type TabType = 'allocation' | 'availability';
type ViewMode = 'daily' | 'monthly';


interface AllocationByMember {
  [memberId: string]: number;
}

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


function getWeekRange(base: Date): Date[] {
  const days: Date[] = [];
  for (let i = -3; i <= 3; i++) {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    days.push(date);
  }
  return days;
}

function getMonthRange(base: Date): Date[] {
  const days: Date[] = [];
  const year = base.getFullYear();
  const month = base.getMonth();
  
  // Get first day of month and adjust to Monday start
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
  
  // Get last day of month and adjust to Sunday end
  const lastDay = new Date(year, month + 1, 0);
  const endDate = new Date(lastDay);
  endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
  
  // Generate all days in the range
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

function isVacationOn(member: TeamMember, dateIso: string): boolean {
  if (!Array.isArray(member.vacations)) return false;
  return member.vacations.some(r => r.start <= dateIso && dateIso <= r.end);
}

export function AllocationTable({ scopeId, team, projects, readOnlyMode = false }: AllocationTableProps) {
  const { t } = useTranslation();
  
  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>('allocation');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  
  // Availability tab state
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [region, setRegion] = useState<{ country: string; subdivision: string | null }>({ 
    country: 'CZ', 
    subdivision: null 
  });
  
  const [assignments, setAssignments] = useState<ProjectTeamAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  // Load holiday region from scope settings
  useEffect(() => {
    const loadRegion = async () => {
      try {
        const settings = await ScopeSettingsService.get(scopeId);
        const c = settings?.calendar?.country || 'CZ';
        const s = settings?.calendar?.subdivision ?? null;
        setRegion({ country: c, subdivision: s });
        getHolidays(c, s);
      } catch {
        // Fallback to default
        getHolidays('CZ', null);
      }
    };
    loadRegion();
  }, [scopeId]);

  // Load assignments for availability overview
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const service = ContainerService.getInstance().get(ManageProjectTeamAssignmentsService, { autobind: true });
      const data = await service.getScopeAssignments(scopeId);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  useEffect(() => {
    if (activeTab === 'availability') {
    loadAssignments();
    }
  }, [loadAssignments, activeTab]);

  // Calculate allocation by member for availability overview
  const allocationByMember: AllocationByMember = useMemo(() => {
    const map: AllocationByMember = {};
    assignments.forEach(a => {
      map[a.teamMemberId] = (map[a.teamMemberId] || 0) + (Number(a.allocationFte) || 0);
    });
    return map;
  }, [assignments]);

  // Get unique roles for filtering
  const uniqueRoles = useMemo(() => Array.from(new Set(team.map(m => m.role))).sort(), [team]);
  
  // Filter team by role
  const filteredTeam = useMemo(() => {
    if (!roleFilter) return team;
    return team.filter(m => m.role === roleFilter);
  }, [team, roleFilter]);

  // Get calendar days for availability tab
  const days = useMemo(() => {
    return viewMode === 'monthly' ? getMonthRange(monthAnchor) : getWeekRange(monthAnchor);
  }, [monthAnchor, viewMode]);
  const monthLabel = useMemo(() => 
    monthAnchor.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' }), 
    [monthAnchor]
  );
  const todayIso = useMemo(() => formatIso(new Date()), []);
  const today = new Date();
  
  // Check if today is visible in current view
  const isTodayVisible = useMemo(() => {
    return days.some(d => formatIso(d) === todayIso);
  }, [days, todayIso]);

  // Cell color function for availability heatmap
  function cellColor(member: TeamMember, date: Date): { className: string; label: string } {
    const iso = formatIso(date);
    if (isHoliday(date, region.country, region.subdivision ?? undefined)) {
      return { className: 'bg-violet-400 dark:bg-violet-600', label: t('holiday') };
    }
    if (isVacationOn(member, iso)) {
      return { className: 'bg-amber-400 dark:bg-amber-500', label: t('onVacation') };
    }
    const memberFte = Number(member.fte || 0);
    const allocated = Number(allocationByMember[member.id] || 0);
    const available = memberFte - allocated;
    if (available >= 1) return { className: 'bg-emerald-600', label: `${t('available')} ≥ 1.0 FTE` };
    if (available >= 0.5) return { className: 'bg-emerald-500', label: `${t('available')} ≥ 0.5 FTE` };
    if (available > 0) return { className: 'bg-emerald-300', label: `${t('available')} < 0.5 FTE` };
    if (available === 0) return { className: 'bg-gray-300 dark:bg-gray-600', label: t('fullyAllocated') };
    return { className: 'bg-red-500', label: t('overAllocated') };
  }


  // Legend for availability heatmap
  const legend = (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1">
        <i className="w-3 h-3 bg-violet-500 inline-block rounded" />
        {t('holiday')}
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="w-3 h-3 bg-amber-400 inline-block rounded" />
        {t('onVacation')}
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="w-3 h-3 bg-emerald-600 inline-block rounded" />
        ≥ 1.0 FTE
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="w-3 h-3 bg-emerald-500 inline-block rounded" />
        ≥ 0.5 FTE
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="w-3 h-3 bg-emerald-300 inline-block rounded" />
        &lt; 0.5 FTE
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="w-3 h-3 bg-gray-300 dark:bg-gray-600 inline-block rounded" />
        {t('fullyAllocated')}
      </span>
      <span className="inline-flex items-center gap-1">
        <i className="w-3 h-3 bg-red-500 inline-block rounded" />
        {t('overAllocated')}
      </span>
    </div>
  );

  return (
    <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold dark:text-white text-gray-900">
              <FiCalendar className="inline mr-2" />
              {t('allocationTable')}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
              <span>{t('allocationManagement')}</span>
            </div>
          </div>
          
          {/* View Mode Switcher - only show for availability tab */}
          {activeTab === 'availability' && (
            <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-700/50 rounded-xl p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  viewMode === 'daily'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <FiCalendar className="w-4 h-4" />
                {t('dailyView')}
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  viewMode === 'monthly'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
                }`}
              >
                <FiCalendar className="w-4 h-4" />
                {t('monthlyView')}
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white/50 dark:bg-gray-700/50 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('allocation')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'allocation'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
            }`}
          >
            <FiEdit3 className="w-5 h-5" />
            <span>{t('allocation')}</span>
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'availability'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
            }`}
          >
            <FiUsers className="w-5 h-5" />
            <span>{t('availabilityOverview')}</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'allocation' && (
          <EnhancedAllocationTable
            scopeId={scopeId}
            team={team}
            projects={projects}
            readOnlyMode={readOnlyMode}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        )}

        {activeTab === 'availability' && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === 'monthly') {
                      setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1));
                    } else {
                      // For daily view, move by week
                      const newDate = new Date(monthAnchor);
                      newDate.setDate(newDate.getDate() - 7);
                      setMonthAnchor(newDate);
                    }
                  }}
                  className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-label={viewMode === 'monthly' ? t('previousMonth') : t('previousWeek')}
                >
                  <FiChevronLeft />
                </button>
                <div className="font-semibold select-none min-w-[10rem] text-center">
                  {viewMode === 'monthly' ? monthLabel : 
                   `${monthAnchor.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })} - ${new Date(monthAnchor.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}`}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === 'monthly') {
                      setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1));
                    } else {
                      // For daily view, move by week
                      const newDate = new Date(monthAnchor);
                      newDate.setDate(newDate.getDate() + 7);
                      setMonthAnchor(newDate);
                    }
                  }}
                  className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-label={viewMode === 'monthly' ? t('nextMonth') : t('nextWeek')}
                >
                  <FiChevronRight />
                </button>
                {!isTodayVisible && (
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode === 'monthly') {
                        setMonthAnchor(new Date(today.getFullYear(), today.getMonth(), 1));
                      } else {
                        // For daily view, go to current week (Monday of current week)
                        const startOfWeek = new Date(today);
                        startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                        setMonthAnchor(startOfWeek);
                      }
                    }}
                    className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                    aria-label={t('today')}
                  >
                    {t('today')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('filterByRole')}</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  aria-label={t('filterByRole')}
                >
                  <option value="">{t('allRoles')}</option>
                  {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {legend}

            {/* Calendar grid */}
            <div className={`overflow-x-auto rounded-xl border bg-white/70 dark:bg-gray-700/70 ${viewMode === 'monthly' ? 'scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200' : ''}`}>
              <table className={`text-sm ${viewMode === 'monthly' ? 'min-w-[1200px]' : 'w-full'}`}>
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                  <tr>
                    <th className={`p-1 text-left sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-r font-semibold ${viewMode === 'monthly' ? 'w-32' : 'w-40'}`}>
                      {t('teamMember')}
                    </th>
                    {days.map((d, idx) => {
                      const inMonth = d.getMonth() === monthAnchor.getMonth();
                      const isMon = ((d.getDay() + 6) % 7) === 0;
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const iso = formatIso(d);
                      const isToday = iso === todayIso;
                      return (
                        <th 
                          key={idx} 
                          className={`p-1 text-center font-medium whitespace-nowrap ${viewMode === 'monthly' ? 'min-w-[32px]' : 'min-w-[50px]'} ${inMonth ? '' : 'opacity-40'} ${isMon ? 'border-l' : ''} ${isWeekend ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700' : ''} ${isToday ? 'text-white bg-gradient-to-r from-blue-500 to-purple-500 font-bold shadow-lg' : ''}`}
                        >
                          <div className={`${viewMode === 'monthly' ? 'text-[10px]' : 'text-xs'} ${isToday ? 'relative' : ''}`}>
                            {viewMode === 'monthly' ? d.getDate() : d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
                            {isToday && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          {viewMode === 'daily' && (
                          <div className="text-[10px] text-gray-500">
                            {d.toLocaleDateString('cs-CZ', { weekday: 'short' })}
                          </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.map((member) => {
                    const memberAlloc = allocationByMember[member.id] || 0;
                    return (
                      <tr key={member.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className={`p-1 align-middle sticky left-0 z-20 bg-white dark:bg-gray-900 border-r ${viewMode === 'monthly' ? 'w-32' : 'w-40'}`}>
                          <div className={`flex items-center gap-2 ${viewMode === 'monthly' ? 'flex-col' : 'gap-3'}`}>
                            <div className={`${viewMode === 'monthly' ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold`}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className={viewMode === 'monthly' ? 'text-center' : ''}>
                              <div className={`font-medium text-gray-900 dark:text-white ${viewMode === 'monthly' ? 'text-xs' : ''}`}>
                                {viewMode === 'monthly' ? member.name.substring(0, 8) + (member.name.length > 8 ? '...' : '') : member.name}
                              </div>
                              {viewMode === 'daily' && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {member.role} • {member.fte.toFixed(1)} FTE • {t('allocated')}: {memberAlloc.toFixed(1)} FTE
                              </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {days.map((d, idx) => {
                          const { className, label } = cellColor(member, d);
                          const iso = formatIso(d);
                          const isMon = ((d.getDay() + 6) % 7) === 0;
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          const isToday = iso === todayIso;
                          return (
                            <td 
                              key={idx} 
                              className={`p-1 text-center text-xs border-r ${isMon ? 'border-l' : ''} ${isToday ? 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-400 dark:border-blue-500' : isWeekend ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                            >
                              <div
                                className={`mx-auto ${viewMode === 'monthly' ? 'w-4 h-4' : 'w-5 h-5'} rounded ${className}`}
                                title={`${member.name} • ${iso} • ${label}`}
                                aria-label={`${member.name} ${iso} ${label}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {filteredTeam.length === 0 && (
                    <tr>
                      <td colSpan={days.length + 1} className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        {t('noMembers')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
