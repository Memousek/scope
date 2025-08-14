/**
 * TeamAvailabilityModal
 * 
 * A compact, accessible calendar heatmap that visualizes each team member's day-by-day availability
 * by combining three inputs:
 * 1) Project allocations (sum of a member's assignment allocationFte across projects)
 * 2) Personal vacations (member.vacations date ranges)
 * 3) Public holidays (via app/utils/holidays.isHoliday)
 * 
 * Color semantics per day cell:
 * - Holiday: violet badge
 * - Vacation: amber
 * - Otherwise, availability = max(0, memberFte - allocatedFte)
 *   - >= 1.0 FTE available: strong green
 *   - >= 0.5 FTE available: medium green
 *   - >  0.0 FTE available: light green
 *   - <= 0.0 available (over-allocated): red
 *
 * The modal supports month navigation and a simple role filter.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { useTranslation } from '@/lib/translation';
import { TeamMember } from './types';
import { getHolidays, isHoliday } from '@/app/utils/holidays';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { ContainerService } from '@/lib/container.service';
import { ManageProjectTeamAssignmentsService, ProjectTeamAssignmentWithDetails } from '@/lib/domain/services/manage-project-team-assignments.service';
import { FiChevronLeft, FiChevronRight, FiFilter } from 'react-icons/fi';

interface TeamAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  team: TeamMember[];
  countryCode?: string; // explicit override, e.g., 'CZ'
  subdivisionCode?: string | null; // explicit override, e.g., 'PR'
}

type AllocationByMember = Record<string, number>; // teamMemberId -> allocatedFte

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getMonthInterval(base: Date): { start: Date; end: Date } {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { start: first, end: last };
}

function getCalendarRange(base: Date): Date[] {
  const { start, end } = getMonthInterval(base);
  // Start on Monday, end on Sunday -> 6 weeks grid typical
  const startDay = (start.getDay() + 6) % 7; // 0 = Monday
  const calStart = new Date(start);
  calStart.setDate(start.getDate() - startDay);
  const endDay = (end.getDay() + 6) % 7;
  const calEnd = new Date(end);
  calEnd.setDate(end.getDate() + (6 - endDay));

  const days: Date[] = [];
  for (let d = new Date(calStart); d <= calEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

function isVacationOn(member: TeamMember, dateIso: string): boolean {
  if (!Array.isArray(member.vacations)) return false;
  return member.vacations.some(r => r.start <= dateIso && dateIso <= r.end);
}

export function TeamAvailabilityModal({
  isOpen,
  onClose,
  scopeId,
  team,
  countryCode = 'CZ',
  subdivisionCode,
}: TeamAvailabilityModalProps) {
  const { t } = useTranslation();
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<ProjectTeamAssignmentWithDetails[]>([]);
  const [region, setRegion] = useState<{ country: string; subdivision: string | null }>({ country: countryCode, subdivision: subdivisionCode ?? null });

  const manageAssignmentsService = useMemo(
    () => ContainerService.getInstance().get(ManageProjectTeamAssignmentsService, { autobind: true }),
    []
  );

  // Resolve holiday region from scope settings (with props override) and warm holiday cache
  useEffect(() => {
    const run = async () => {
      try {
        if (countryCode) {
          setRegion({ country: countryCode, subdivision: subdivisionCode ?? null });
          getHolidays(countryCode, subdivisionCode ?? null);
          return;
        }
        const settings = await ScopeSettingsService.get(scopeId);
        const c = settings?.calendar?.country || 'CZ';
        const s = settings?.calendar?.subdivision ?? null;
        setRegion({ country: c, subdivision: s });
        getHolidays(c, s);
      } catch { /* ignore */ }
    };
    void run();
  }, [scopeId, countryCode, subdivisionCode]);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await manageAssignmentsService.getScopeAssignments(scopeId);
      setAssignments(data);
    } catch (e) {
      console.error('Failed to load assignments for availability modal', e);
    } finally {
      setLoading(false);
    }
  }, [manageAssignmentsService, scopeId]);

  useEffect(() => {
    if (!isOpen) return;
    void loadAssignments();
  }, [isOpen, loadAssignments]);

  const allocationByMember: AllocationByMember = useMemo(() => {
    const map: AllocationByMember = {};
    assignments.forEach(a => {
      map[a.teamMemberId] = (map[a.teamMemberId] || 0) + (Number(a.allocationFte) || 0);
    });
    return map;
  }, [assignments]);

  const days = useMemo(() => getCalendarRange(monthAnchor), [monthAnchor]);
  const monthLabel = useMemo(() => monthAnchor.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' }), [monthAnchor]);
  const uniqueRoles = useMemo(() => Array.from(new Set(team.map(m => m.role))).sort(), [team]);
  const todayIso = useMemo(() => formatIso(new Date()), []);

  const filteredTeam = useMemo(() => {
    if (!roleFilter) return team;
    return team.filter(m => m.role === roleFilter);
  }, [team, roleFilter]);

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

  const legend = (
    <div className="flex flex-wrap items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1"><i className="w-3 h-3 bg-violet-500 inline-block rounded" />{t('holiday')}</span>
      <span className="inline-flex items-center gap-1"><i className="w-3 h-3 bg-amber-400 inline-block rounded" />{t('onVacation')}</span>
      <span className="inline-flex items-center gap-1"><i className="w-3 h-3 bg-emerald-600 inline-block rounded" />≥ 1.0 FTE</span>
      <span className="inline-flex items-center gap-1"><i className="w-3 h-3 bg-emerald-500 inline-block rounded" />≥ 0.5 FTE</span>
      <span className="inline-flex items-center gap-1"><i className="w-3 h-3 bg-emerald-300 inline-block rounded" />&lt; 0.5 FTE</span>
      <span className="inline-flex items-center gap-1"><i className="w-3 h-3 bg-gray-300 dark:bg-gray-600 inline-block rounded" />{t('fullyAllocated')}</span>
      <span className="inline-flex items-center gap-1"><i className="w-3 h-3 bg-red-500 inline-block rounded" />{t('overAllocated')}</span>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('availabilityOverview')}
      description={t('availabilityOverviewDescription')}
      icon={<FiFilter className="w-5 h-5 text-white" />}
      maxWidth="6xl"
    >
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
              className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label={t('previousMonth')}
            >
              <FiChevronLeft />
            </button>
            <div className="font-semibold select-none min-w-[10rem] text-center">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
              className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
              aria-label={t('nextMonth')}
            >
              <FiChevronRight />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm opacity-80">{t('filterByRole')}</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-800"
              aria-label={t('filterByRole')}
            >
              <option value="">{t('allRoles')}</option>
              {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {legend}

        {/* Calendar grid */}
        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-[11px] md:text-xs">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
              <tr>
                <th className="p-2 text-left w-56 md:w-64 sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-r">{t('teamMember')}</th>
                {days.map((d, idx) => {
                  const inMonth = d.getMonth() === monthAnchor.getMonth();
                  const isMon = ((d.getDay() + 6) % 7) === 0;
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const iso = formatIso(d);
                  const isToday = iso === todayIso;
                  return (
                    <th key={idx} className={`p-1 text-center font-medium whitespace-nowrap ${inMonth ? '' : 'opacity-40'} ${isMon ? 'border-l' : ''} ${isWeekend ? 'text-gray-500 dark:text-gray-400' : ''} ${isToday ? 'text-blue-700 dark:text-blue-300 underline decoration-blue-500/50' : ''}`}>
                      {d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
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
                    <td className="p-2 align-middle sticky left-0 z-20 bg-white dark:bg-gray-900 border-r">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="leading-tight">
                          <div className="font-medium truncate max-w-[14rem] md:max-w-none">{member.name}</div>
                          <div className="text-[10px] opacity-70 whitespace-nowrap">{member.role} • {member.fte.toFixed(1)} FTE • {t('allocated')}: {memberAlloc.toFixed(1)} FTE</div>
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
                        <td key={idx} className={`p-1 text-center ${isMon ? 'border-l' : ''} ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : isWeekend ? 'bg-gray-50/40 dark:bg-gray-800/30' : ''}`}>
                          <div
                            className={`mx-auto w-3.5 h-3.5 md:w-4 md:h-4 rounded ${className}`}
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
                  <td colSpan={days.length + 1} className="p-6 text-center text-sm opacity-70">
                    {t('noMembers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-center text-sm opacity-70">{t('loading')}…</div>
        )}
      </div>
    </Modal>
  );
}

export default TeamAvailabilityModal;


