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

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '@/lib/translation';
import { TeamMember, Project } from './types';
import { getHolidays, isHoliday } from '@/app/utils/holidays';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { ContainerService } from '@/lib/container.service';
import { ManageProjectTeamAssignmentsService, ProjectTeamAssignmentWithDetails } from '@/lib/domain/services/manage-project-team-assignments.service';
import { useToastFunctions } from '@/app/components/ui/Toast';
import { 
  FiCalendar, 
  FiUsers, 
  FiChevronLeft, 
  FiChevronRight, 
  FiPlus,
  FiEdit3,
  FiSave,
  FiTrash2
} from 'react-icons/fi';

interface AllocationTableProps {
  scopeId: string;
  team: TeamMember[];
  projects: Project[];
  readOnlyMode?: boolean;
}

type TabType = 'allocation' | 'availability';

interface DailyAllocation {
  id?: string;
  teamMemberId: string;
  projectId: string | 'external';
  role: string;
  allocationFte: number;
  date: string; // ISO date string
  externalProjectName?: string;
}

interface AllocationByMember {
  [memberId: string]: number;
}

function formatIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCalendarRange(base: Date): Date[] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  
  // Start on Monday, end on Sunday
  const startDay = (first.getDay() + 6) % 7; // 0 = Monday
  const calStart = new Date(first);
  calStart.setDate(first.getDate() - startDay);
  
  const endDay = (last.getDay() + 6) % 7;
  const calEnd = new Date(last);
  calEnd.setDate(last.getDate() + (6 - endDay));

  const days: Date[] = [];
  for (let d = new Date(calStart); d <= calEnd; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
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

function isVacationOn(member: TeamMember, dateIso: string): boolean {
  if (!Array.isArray(member.vacations)) return false;
  return member.vacations.some(r => r.start <= dateIso && dateIso <= r.end);
}

export function AllocationTable({ scopeId, team, projects, readOnlyMode = false }: AllocationTableProps) {
  const { t } = useTranslation();
  const toast = useToastFunctions();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>('allocation');
  
  // Allocation tab state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCell, setEditingCell] = useState<{memberId: string, date: string} | null>(null);
  const [newAllocation, setNewAllocation] = useState<Partial<DailyAllocation>>({
    teamMemberId: '',
    projectId: '',
    role: '',
    allocationFte: 0.1,
    externalProjectName: ''
  });
  
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

  // Load assignments
  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const service = ContainerService.getInstance().get(ManageProjectTeamAssignmentsService, { autobind: true });
      const data = await service.getScopeAssignments(scopeId);
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load assignments:', error);
      toastRef.current.error('Chyba při načítání', 'Nepodařilo se načíst alokace.');
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]); // Include loadAssignments in dependencies

  // Calculate allocation by member
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
  const days = useMemo(() => getWeekRange(monthAnchor), [monthAnchor]);
  const monthLabel = useMemo(() => 
    monthAnchor.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' }), 
    [monthAnchor]
  );
  const todayIso = useMemo(() => formatIso(new Date()), []);

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

  // Handle adding new allocation
  const handleAddAllocation = async () => {
    if (!newAllocation.teamMemberId || !newAllocation.projectId || !newAllocation.role) {
      toast.error('Chyba', 'Vyplňte všechna povinná pole.');
      return;
    }

    setLoading(true);
    try {
      const allocationData = {
        projectId: newAllocation.projectId as string,
        teamMemberId: newAllocation.teamMemberId,
        role: newAllocation.role,
        allocationFte: newAllocation.allocationFte || 0.1
      };

      const service = ContainerService.getInstance().get(ManageProjectTeamAssignmentsService, { autobind: true });
      await service.createAssignment(allocationData);
      await loadAssignments();
      
      setNewAllocation({
        teamMemberId: '',
        projectId: '',
        role: '',
        allocationFte: 0.1,
        externalProjectName: ''
      });
      setShowAddForm(false);
      setEditingCell(null);
      
      toast.success('Alokace přidána', 'Alokace byla úspěšně přidána.');
    } catch (error) {
      console.error('Failed to add allocation:', error);
      toast.error('Chyba při přidávání', 'Nepodařilo se přidat alokaci.');
    } finally {
      setLoading(false);
    }
  };

  // Handle removing allocation
  const handleRemoveAllocation = async (assignmentId: string) => {
    setLoading(true);
    try {
      const service = ContainerService.getInstance().get(ManageProjectTeamAssignmentsService, { autobind: true });
      await service.deleteAssignment(assignmentId);
      await loadAssignments();
      toast.success('Alokace odstraněna', 'Alokace byla úspěšně odstraněna.');
    } catch (error) {
      console.error('Failed to remove allocation:', error);
      toast.error('Chyba při odstraňování', 'Nepodařilo se odstranit alokaci.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cell click for editing
  const handleCellClick = (memberId: string, date: string) => {
    if (readOnlyMode) return;
    
    const member = team.find(m => m.id === memberId);
    if (!member) return;
    
    // Check if there's already an allocation for this member
    const existingAssignment = assignments.find(a => a.teamMemberId === memberId);
    
    setEditingCell({ memberId, date });
    setNewAllocation({
      teamMemberId: memberId,
      projectId: existingAssignment?.projectId || '',
      role: existingAssignment?.role || member.role,
      allocationFte: existingAssignment?.allocationFte || 0.1,
      externalProjectName: ''
    });
    setShowAddForm(true);
  };

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
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-label={t('previousWeek')}
                >
                  <FiChevronLeft />
                </button>
                <div className="font-semibold select-none min-w-[10rem] text-center">
                  {selectedDate.toLocaleDateString('cs-CZ', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800"
                  aria-label={t('nextWeek')}
                >
                  <FiChevronRight />
                </button>
              </div>
              {!readOnlyMode && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                >
                  <FiPlus className="w-4 h-4" />
                  {t('addAllocation')}
                </button>
              )}
            </div>

            {/* Allocation Table */}
            <div className="overflow-x-auto rounded-xl border bg-white/70 dark:bg-gray-700/70">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                  <tr>
                    <th className="p-1 text-left w-40 sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-r font-semibold">
                      {t('teamMember')}
                    </th>
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(selectedDate);
                      date.setDate(selectedDate.getDate() - 3 + i);
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      const isToday = date.toDateString() === new Date().toDateString();
                      return (
                        <th 
                          key={i} 
                          className={`p-1 text-center font-medium whitespace-nowrap min-w-[50px] ${
                            isWeekend ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700' : ''
                          } ${isToday ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <div className="text-xs">
                            {date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {date.toLocaleDateString('cs-CZ', { weekday: 'short' })}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => {
                    const memberAssignments = assignments.filter(a => a.teamMemberId === member.id);
                    return (
                      <tr key={member.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-1 align-middle sticky left-0 z-20 bg-white dark:bg-gray-900 border-r">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {member.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {member.role} • {member.fte.toFixed(1)} FTE
                              </div>
                            </div>
                          </div>
                        </td>
                        {Array.from({ length: 7 }, (_, i) => {
                          const date = new Date(selectedDate);
                          date.setDate(selectedDate.getDate() - 3 + i);
                          const dateIso = formatIso(date);
                          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                          const isToday = date.toDateString() === new Date().toDateString();
                          const isHolidayDay = isHoliday(date, region.country, region.subdivision ?? undefined);
                          const isVacation = isVacationOn(member, dateIso);
                          
                          // Find assignment for this member and date
                          const dayAssignment = memberAssignments.find(() => {
                            // For now, we'll show all assignments (not date-specific)
                            // In a real implementation, you'd filter by date
                            return true;
                          });

                          let cellContent = '';
                          let cellClass = 'bg-white dark:bg-gray-800';
                          
                          if (isHolidayDay) {
                            cellContent = t('holiday');
                            cellClass = 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300';
                          } else if (isVacation) {
                            cellContent = t('onVacation');
                            cellClass = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
                          } else if (dayAssignment) {
                            cellContent = dayAssignment.project?.name || t('externalProject');
                            cellClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
                          } else {
                            cellContent = '';
                            cellClass = 'bg-gray-50 dark:bg-gray-700/50';
                          }

                          return (
                            <td 
                              key={i} 
                              onClick={() => handleCellClick(member.id, dateIso)}
                              className={`p-1 text-center text-xs border-r cursor-pointer transition-all duration-200 hover:shadow-md ${
                                isWeekend ? 'bg-gray-100 dark:bg-gray-700' : ''
                              } ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : ''} ${cellClass} ${
                                !readOnlyMode && !isHolidayDay && !isVacation ? 'hover:bg-blue-100 dark:hover:bg-blue-800/30' : ''
                              }`}
                              title={!readOnlyMode && !isHolidayDay && !isVacation ? 'Klikněte pro přidání alokace' : ''}
                            >
                              <div className="truncate" title={cellContent}>
                                {cellContent}
                              </div>
                              {dayAssignment && (
                                <div className="text-[10px] text-gray-500 mt-1">
                                  {dayAssignment.allocationFte.toFixed(1)} FTE
                                </div>
                              )}
                              {!readOnlyMode && !isHolidayDay && !isVacation && !dayAssignment && (
                                <div className="text-[10px] text-gray-400 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                                  Klikněte
                                </div>
                              )}
                              {!readOnlyMode && dayAssignment && (
                                <div className="text-[10px] text-red-400 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                                  Klikněte pro úpravu
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Loading indicator for allocation tab */}
            {loading && (
              <div className="text-center text-sm opacity-70 py-4">{t('loading')}…</div>
            )}

            {/* Add Allocation Form */}
            {showAddForm && !readOnlyMode && (
              <div className="bg-white/70 dark:bg-gray-700/70 rounded-xl p-6 border border-gray-200/50 dark:border-gray-600/50">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {editingCell ? 'Upravit alokaci' : t('addNewAllocation')}
                </h3>
                {editingCell && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Člen týmu:</strong> {team.find(m => m.id === editingCell.memberId)?.name}<br/>
                      <strong>Datum:</strong> {new Date(editingCell.date).toLocaleDateString('cs-CZ')}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team Member */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('teamMember')}
                    </label>
                    <select
                      value={newAllocation.teamMemberId}
                      onChange={(e) => setNewAllocation({ ...newAllocation, teamMemberId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">{t('selectTeamMember')}</option>
                      {team.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('project')}
                    </label>
                    <select
                      value={newAllocation.projectId}
                      onChange={(e) => setNewAllocation({ ...newAllocation, projectId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="">{t('selectProject')}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                      <option value="external">{t('externalProject')}</option>
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('role')}
                    </label>
                    <input
                      type="text"
                      value={newAllocation.role}
                      onChange={(e) => setNewAllocation({ ...newAllocation, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={t('enterRole')}
                    />
                  </div>

                  {/* FTE */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('fte')}
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={newAllocation.allocationFte}
                      onChange={(e) => setNewAllocation({ ...newAllocation, allocationFte: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* External Project Name */}
                {newAllocation.projectId === 'external' && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('externalProjectName')}
                    </label>
                    <input
                      type="text"
                      value={newAllocation.externalProjectName}
                      onChange={(e) => setNewAllocation({ ...newAllocation, externalProjectName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={t('enterExternalProjectName')}
                    />
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleAddAllocation}
                    disabled={loading || !newAllocation.teamMemberId || !newAllocation.projectId || !newAllocation.role}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiSave className="w-4 h-4" />
                    {editingCell ? 'Uložit změny' : t('save')}
                  </button>
                  {editingCell && (
                    <button
                      onClick={async () => {
                        const existingAssignment = assignments.find(a => a.teamMemberId === editingCell.memberId);
                        if (existingAssignment) {
                          await handleRemoveAllocation(existingAssignment.id);
                          setShowAddForm(false);
                          setEditingCell(null);
                        }
                      }}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Smazat
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingCell(null);
                      setNewAllocation({
                        teamMemberId: '',
                        projectId: '',
                        role: '',
                        allocationFte: 0.1,
                        externalProjectName: ''
                      });
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'availability' && (
          <div className="space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
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
            <div className="overflow-x-auto rounded-xl border bg-white/70 dark:bg-gray-700/70">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
                  <tr>
                    <th className="p-1 text-left w-40 sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-r font-semibold">
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
                          className={`p-1 text-center font-medium whitespace-nowrap min-w-[50px] ${inMonth ? '' : 'opacity-40'} ${isMon ? 'border-l' : ''} ${isWeekend ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700' : ''} ${isToday ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <div className="text-xs">
                            {d.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {d.toLocaleDateString('cs-CZ', { weekday: 'short' })}
                          </div>
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
                        <td className="p-1 align-middle sticky left-0 z-20 bg-white dark:bg-gray-900 border-r">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {member.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {member.role} • {member.fte.toFixed(1)} FTE • {t('allocated')}: {memberAlloc.toFixed(1)} FTE
                              </div>
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
                              className={`p-1 text-center text-xs border-r ${isMon ? 'border-l' : ''} ${isToday ? 'bg-blue-50 dark:bg-blue-900/10' : isWeekend ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                            >
                              <div
                                className={`mx-auto w-5 h-5 rounded ${className}`}
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
