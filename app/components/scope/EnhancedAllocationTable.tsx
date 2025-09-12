/**
 * Enhanced Allocation Table Component
 * 
 * A comprehensive daily allocation planning interface that allows:
 * - Daily allocation planning with project selection
 * - External client/project support
 * - Vacation and holiday tracking
 * - Color-coded project assignments
 * - Responsive design with modern glass-like UI
 * 
 * Uses the planned_allocations table for future planning
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from '@/lib/translation';
import { TeamMember, Project } from './types';
import { getHolidays, isHoliday } from '@/app/utils/holidays';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { PlannedAllocationService } from '@/lib/domain/services/planned-allocation.service';
import { useToastFunctions } from '@/app/components/ui/Toast';
import { Modal } from '@/app/components/ui/Modal';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight, 
  FiPlus,
  FiTrash2,
  FiSave
} from 'react-icons/fi';

interface AllocationTableProps {
  scopeId: string;
  team: TeamMember[];
  projects: Project[];
  readOnlyMode?: boolean;
  viewMode?: 'daily' | 'monthly';
  onViewModeChange?: (mode: 'daily' | 'monthly') => void;
}

interface DailyAllocation {
  id?: string;
  teamMemberId: string;
  projectId: string | null;
  role: string;
  allocationFte: number;
  date: string; // ISO date string
  externalProjectName?: string;
  description?: string;
}

interface ProjectColor {
  [projectId: string]: string;
}

// Color palette for projects
const PROJECT_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
];

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

function isVacationOn(member: TeamMember, dateIso: string): boolean {
  if (!Array.isArray(member.vacations)) return false;
  return member.vacations.some(r => r.start <= dateIso && dateIso <= r.end);
}

// Helper function to get date range between two dates
function getDateRange(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
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

// Helper function to check if a cell is in the drag range
function isInDragRange(
  memberId: string, 
  date: string, 
  dragStart: { memberId: string; date: string } | null,
  dragEnd: { memberId: string; date: string } | null
): boolean {
  if (!dragStart || !dragEnd) return false;
  
  // Only highlight cells for the same team member
  if (memberId !== dragStart.memberId) return false;
  
  const startDate = dragStart.date;
  const endDate = dragEnd.date;
  
  // Ensure start is before end
  const actualStart = startDate <= endDate ? startDate : endDate;
  const actualEnd = startDate <= endDate ? endDate : startDate;
  
  return date >= actualStart && date <= actualEnd;
}

export function EnhancedAllocationTable({ scopeId, team, projects, readOnlyMode = false, viewMode = 'daily', onViewModeChange }: AllocationTableProps) {
  const { t } = useTranslation();
  const toast = useToastFunctions();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  
  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<DailyAllocation | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dragStart, setDragStart] = useState<{ memberId: string; date: string } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ memberId: string; date: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedAllocations, setSelectedAllocations] = useState<string[]>([]);
  const [newAllocation, setNewAllocation] = useState<Partial<DailyAllocation>>({
    teamMemberId: '',
    projectId: null,
    role: '',
    allocationFte: 1.0,
    externalProjectName: '',
    description: ''
  });
  const [endDate, setEndDate] = useState<string>('');
  
  const [region, setRegion] = useState<{ country: string; subdivision: string | null }>({ 
    country: 'CZ', 
    subdivision: null 
  });
  
  const [allocations, setAllocations] = useState<DailyAllocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Generate project colors
  const projectColors: ProjectColor = useMemo(() => {
    const colors: ProjectColor = {};
    projects.forEach((project, index) => {
      colors[project.id] = PROJECT_COLORS[index % PROJECT_COLORS.length];
    });
    colors['null'] = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    return colors;
  }, [projects]);

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

  // Load allocations
  const loadAllocations = useCallback(async () => {
    setLoading(true);
    try {
      const plannedAllocationService = new PlannedAllocationService();
      const startDate = new Date(selectedDate);
      startDate.setDate(selectedDate.getDate() - 3);
      const endDate = new Date(selectedDate);
      endDate.setDate(selectedDate.getDate() + 3);
      
      const plannedAllocations = await plannedAllocationService.getByDateRange(scopeId, startDate, endDate);
      
      // Convert planned allocations to daily allocations
      const allocationsData: DailyAllocation[] = plannedAllocations.map(pa => ({
        id: pa.id,
        teamMemberId: pa.teamMemberId,
        projectId: pa.projectId,
        role: pa.role,
        allocationFte: pa.allocationFte,
        date: pa.date.toISOString().split('T')[0],
        externalProjectName: pa.externalProjectName,
        description: pa.description
      }));
      
      setAllocations(allocationsData);
    } catch (error) {
      console.error('Failed to load planned allocations:', error);
      toastRef.current.error('Chyba při načítání', 'Nepodařilo se načíst plánované alokace.');
    } finally {
      setLoading(false);
    }
  }, [scopeId, selectedDate]);

  // Global mouse up handler to end drag selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStart && dragEnd) {
        // Create date range
        const startDate = dragStart.date;
        const endDate = dragEnd.date;
        const actualStart = startDate <= endDate ? startDate : endDate;
        const actualEnd = startDate <= endDate ? endDate : startDate;
        
        const dateRange = getDateRange(actualStart, actualEnd);
        setSelectedDates(dateRange);
        
        // Reset drag state
        setDragStart(null);
        setDragEnd(null);
        setIsDragging(false);
        
        // Open form for new allocation
        const member = team.find(m => m.id === dragStart.memberId);
        if (member) {
          setEditingAllocation(null);
          setNewAllocation({
            teamMemberId: dragStart.memberId,
            projectId: null,
            role: member.role,
            allocationFte: 1.0,
            externalProjectName: '',
            description: ''
          });
          setShowAddForm(true);
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging, dragStart, dragEnd, team]);

  useEffect(() => {
    loadAllocations();
  }, [loadAllocations]);

  // Get calendar days for the week
  const days = useMemo(() => {
    return viewMode === 'monthly' ? getMonthRange(selectedDate) : getWeekRange(selectedDate);
  }, [selectedDate, viewMode]);
  
  // Today date as useMemo to avoid re-creation on every render
  const today = useMemo(() => new Date(), []);
  
  // Check if today is visible in current view
  const isTodayVisible = useMemo(() => {
    return days.some(d => d.toDateString() === today.toDateString());
  }, [days, today]);

  // Handle adding/updating allocation
  const handleSaveAllocation = async () => {
    if (!newAllocation.teamMemberId || !newAllocation.role) {
      toast.error('Chyba', 'Vyplňte všechna povinná pole.');
      return;
    }

    setLoading(true);
    try {
      const plannedAllocationService = new PlannedAllocationService();
      
      if (editingAllocation) {
        // Update existing allocation
        await plannedAllocationService.update(editingAllocation.id!, {
          projectId: newAllocation.projectId,
          allocationFte: newAllocation.allocationFte || 1.0,
          role: newAllocation.role,
          externalProjectName: newAllocation.externalProjectName,
          description: newAllocation.description
        });
        toast.success('Alokace aktualizována', 'Plánovaná alokace byla úspěšně aktualizována.');
      } else if (selectedDates.length > 0) {
        // Create multiple allocations for selected dates
        const baseAllocation = {
          scopeId: scopeId,
          teamMemberId: newAllocation.teamMemberId,
          projectId: newAllocation.projectId === 'external' ? null : (newAllocation.projectId || null),
          allocationFte: newAllocation.allocationFte || 1.0,
          role: newAllocation.role,
          externalProjectName: newAllocation.externalProjectName,
          description: newAllocation.description
        };
        
        const dates = selectedDates.map(dateStr => new Date(dateStr));
        const results = await plannedAllocationService.createForDateRange(baseAllocation, dates);
        
        toast.success('Alokace přidány', `Plánované alokace byly úspěšně přidány pro ${results.length} dnů.`);
      } else if (endDate && newAllocation.date) {
        // Create allocations for date range
        const dateRange = getDateRange(newAllocation.date, endDate);
        
        const baseAllocation = {
          scopeId: scopeId,
          teamMemberId: newAllocation.teamMemberId,
          projectId: newAllocation.projectId === 'external' ? null : (newAllocation.projectId || null),
          allocationFte: newAllocation.allocationFte || 1.0,
          role: newAllocation.role,
          externalProjectName: newAllocation.externalProjectName,
          description: newAllocation.description
        };
        
        const dates = dateRange.map(dateStr => new Date(dateStr));
        const results = await plannedAllocationService.createForDateRange(baseAllocation, dates);
        
        toast.success('Alokace přidány', `Plánované alokace byly úspěšně přidány pro ${results.length} dnů.`);
      } else {
        // Create single allocation
        const allocationData = {
          scopeId: scopeId,
          teamMemberId: newAllocation.teamMemberId,
          projectId: newAllocation.projectId === 'external' ? null : (newAllocation.projectId || null),
          date: new Date(newAllocation.date || selectedDate),
          allocationFte: newAllocation.allocationFte || 1.0,
          role: newAllocation.role,
          externalProjectName: newAllocation.externalProjectName,
          description: newAllocation.description
        };
        
        await plannedAllocationService.create(allocationData);
        toast.success('Alokace přidána', 'Plánovaná alokace byla úspěšně přidána.');
      }
      
      await loadAllocations();
      
      // Reset form and drag state
      setNewAllocation({
        teamMemberId: '',
        projectId: null,
        role: '',
        allocationFte: 1.0,
        externalProjectName: '',
        description: ''
      });
      setEndDate('');
      setShowAddForm(false);
      setEditingAllocation(null);
      resetDragState();
      
    } catch (error) {
      console.error('Failed to save planned allocation:', error);
      toast.error('Chyba při ukládání', 'Nepodařilo se uložit plánovanou alokaci.');
    } finally {
      setLoading(false);
    }
  };

  // Handle removing allocation
  const handleRemoveAllocation = async (allocationId: string) => {
    setLoading(true);
    try {
      const plannedAllocationService = new PlannedAllocationService();
      await plannedAllocationService.delete(allocationId);
      await loadAllocations();
      toast.success('Alokace odstraněna', 'Plánovaná alokace byla úspěšně odstraněna.');
    } catch (error) {
      console.error('Failed to remove planned allocation:', error);
      toast.error('Chyba při odstraňování', 'Nepodařilo se odstranit plánovanou alokaci.');
    } finally {
      setLoading(false);
    }
  };

  // Handle cell click for editing
  const handleCellClick = (memberId: string, date: string) => {
    if (readOnlyMode) return;
    
    const member = team.find(m => m.id === memberId);
    if (!member) return;
    
    // Check if there's an existing allocation
    const existingAllocation = allocations.find(a => 
      a.teamMemberId === memberId && a.date === date
    );
    
    if (isDeleteMode && existingAllocation) {
      // Delete mode - toggle allocation selection
      setSelectedAllocations(prev => {
        const isSelected = prev.includes(existingAllocation.id!);
        if (isSelected) {
          return prev.filter(id => id !== existingAllocation.id);
        } else {
          return [...prev, existingAllocation.id!];
        }
      });
    } else if (existingAllocation) {
      // Edit existing allocation
      setEditingAllocation(existingAllocation);
      setNewAllocation({
        teamMemberId: existingAllocation.teamMemberId,
        projectId: existingAllocation.projectId,
        role: existingAllocation.role,
        allocationFte: existingAllocation.allocationFte,
        date: existingAllocation.date,
        externalProjectName: existingAllocation.externalProjectName,
        description: existingAllocation.description
      });
      setShowAddForm(true);
    } else if (isDragging && dragStart && dragStart.memberId === memberId) {
      // Second click - end drag selection
      setDragEnd({ memberId, date });
      setIsDragging(false);
      
      // Create date range
      const startDate = dragStart.date;
      const endDate = date;
      const actualStart = startDate <= endDate ? startDate : endDate;
      const actualEnd = startDate <= endDate ? endDate : startDate;
      
      const dateRange = getDateRange(actualStart, actualEnd);
      setSelectedDates(dateRange);
      
      // Reset drag state
      setDragStart(null);
      setDragEnd(null);
      
      // Open form for new allocation
      setEditingAllocation(null);
      setNewAllocation({
        teamMemberId: memberId,
        projectId: null,
        role: member.role,
        allocationFte: 1.0,
        externalProjectName: '',
        description: ''
      });
      setShowAddForm(true);
    } else if (!isDeleteMode) {
      // First click - start drag selection (only if not in delete mode)
      setDragStart({ memberId, date });
      setDragEnd({ memberId, date });
      setIsDragging(true);
    }
  };

  // Handle mouse enter for drag selection
  const handleCellMouseEnter = (memberId: string, date: string) => {
    if (isDragging && dragStart && dragStart.memberId === memberId) {
      setDragEnd({ memberId, date });
    }
  };

  // Handle mouse leave - don't end drag, just continue tracking
  const handleCellMouseLeave = () => {
    // Don't end drag on mouse leave - let it continue until mouse up
  };

  // Handle mouse up to finish drag selection
  const handleCellMouseUp = (memberId: string, date: string) => {
    if (isDragging && dragStart && dragStart.memberId === memberId) {
      setDragEnd({ memberId, date });
      // Global mouse up handler will take care of the rest
    }
  };

  // Reset drag state
  const resetDragState = () => {
    setDragStart(null);
    setDragEnd(null);
    setIsDragging(false);
    setSelectedDates([]);
  };

  // Toggle delete mode
  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedAllocations([]);
    resetDragState();
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedAllocations.length === 0) {
      toast.error('Chyba', 'Vyberte alespoň jednu alokaci k smazání.');
      return;
    }

    setLoading(true);
    try {
      const plannedAllocationService = new PlannedAllocationService();
      
      // Delete all selected allocations
      for (const allocationId of selectedAllocations) {
        await plannedAllocationService.delete(allocationId);
      }
      
      toast.success('Alokace smazány', `Úspěšně smazáno ${selectedAllocations.length} alokací.`);
      
      await loadAllocations();
      setSelectedAllocations([]);
      setIsDeleteMode(false);
      
    } catch (error) {
      console.error('Failed to delete allocations:', error);
      toast.error('Chyba při mazání', 'Nepodařilo se smazat vybrané alokace.');
    } finally {
      setLoading(false);
    }
  };

  // Get allocation for specific member and date
  const getAllocationForDate = (memberId: string, date: string) => {
    return allocations.find(a => a.teamMemberId === memberId && a.date === date);
  };

  // Get project name for allocation
  const getProjectName = (allocation: DailyAllocation) => {
    if (!allocation.projectId) {
      return allocation.externalProjectName || 'Externí projekt';
    }
    const project = projects.find(p => p.id === allocation.projectId);
    return project?.name || 'Neznámý projekt';
  };

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
          
          {/* View Mode Switcher */}
          <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-700/50 rounded-xl p-1">
            <button
              onClick={() => onViewModeChange?.('daily')}
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
              onClick={() => onViewModeChange?.('monthly')}
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
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'monthly') {
                  setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
                } else {
                  setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000));
                }
              }}
              className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label={viewMode === 'monthly' ? t('previousMonth') : t('previousWeek')}
            >
              <FiChevronLeft />
            </button>
            <div className="font-semibold select-none min-w-[10rem] text-center">
              {viewMode === 'monthly' ? 
                selectedDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }) :
                selectedDate.toLocaleDateString('cs-CZ', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                })
              }
            </div>
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'monthly') {
                  setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
                } else {
                  setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000));
                }
              }}
              className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label={viewMode === 'monthly' ? t('nextMonth') : t('nextWeek')}
            >
              <FiChevronRight />
            </button>
            {!isTodayVisible && (
              <button
                type="button"
                onClick={() => {
                  if (viewMode === 'monthly') {
                    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), 1));
                  } else {
                    // For daily view, go to current week
                    const startOfWeek = new Date(today);
                    startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
                    setSelectedDate(startOfWeek);
                  }
                }}
                className="px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                aria-label={t('today')}
              >
                {t('today')}
              </button>
            )}
          </div>
          {!readOnlyMode && (
            <div className="flex items-center gap-2">
              {!isDeleteMode && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditingAllocation(null);
                    setNewAllocation({
                      teamMemberId: '',
                      projectId: null,
                      role: '',
                      allocationFte: 1.0,
                      externalProjectName: '',
                      description: ''
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
                >
                  <FiPlus className="w-4 h-4" />
                  {t('addAllocation')}
                </button>
              )}
              
              <button
                onClick={toggleDeleteMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isDeleteMode 
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' 
                    : 'bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50'
                }`}
              >
                <FiTrash2 className="w-4 h-4" />
                {isDeleteMode ? t('cancelDelete') : t('deleteAllocations')}
              </button>
              
              {isDeleteMode && selectedAllocations.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200"
                >
                  <FiTrash2 className="w-4 h-4" />
                  {t('deleteSelectedAllocations', { count: selectedAllocations.length })}
                </button>
              )}
              
              {isDragging && (
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  {t('dragToSelectRange')}
                </div>
              )}
              
              {selectedDates.length > 0 && !isDragging && !isDeleteMode && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  {t('selectedRange', { count: selectedDates.length })}
                </div>
              )}
              
              {isDeleteMode && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {t('clickToSelectForDeletion')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Allocation Table */}
        <div className={`overflow-x-auto rounded-xl border bg-white/70 dark:bg-gray-700/70 ${viewMode === 'monthly' ? 'scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200' : ''}`}>
          <table className={`text-sm ${viewMode === 'monthly' ? 'min-w-[1200px]' : 'w-full'}`}>
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
              <tr>
                <th className={`p-3 text-left sticky left-0 z-30 bg-gray-50 dark:bg-gray-800 border-r font-semibold ${viewMode === 'monthly' ? 'w-32' : 'w-48'}`}>
                  {t('teamMember')}
                </th>
                {days.map((date, i) => {
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <th 
                      key={i} 
                      className={`p-2 text-center font-medium whitespace-nowrap ${viewMode === 'monthly' ? 'min-w-[32px]' : 'min-w-[80px]'} ${
                        isWeekend ? 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700' : ''
                      } ${isToday ? 'text-white bg-gradient-to-r from-blue-500 to-purple-500 font-bold shadow-lg' : ''}`}
                    >
                      <div className={`${viewMode === 'monthly' ? 'text-[10px]' : 'text-xs'} ${isToday ? 'relative' : ''}`}>
                        {viewMode === 'monthly' ? date.getDate() : date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' })}
                        {isToday && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      {viewMode === 'daily' && (
                        <div className="text-[10px] text-gray-500">
                          {date.toLocaleDateString('cs-CZ', { weekday: 'short' })}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {team.map((member) => (
                <tr key={member.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className={`p-3 align-middle sticky left-0 z-20 bg-white dark:bg-gray-900 border-r ${viewMode === 'monthly' ? 'w-32' : 'w-48'}`}>
                    <div className={`flex items-center gap-2 ${viewMode === 'monthly' ? 'flex-col' : 'gap-3'}`}>
                      <div className={`${viewMode === 'monthly' ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold`}>
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={viewMode === 'monthly' ? 'text-center' : ''}>
                        <div className={`font-medium text-gray-900 dark:text-white ${viewMode === 'monthly' ? 'text-xs' : ''}`}>
                          {viewMode === 'monthly' ? member.name.substring(0, 8) + (member.name.length > 8 ? '...' : '') : member.name}
                        </div>
                        {viewMode === 'daily' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {member.role} • {member.fte.toFixed(1)} FTE
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {days.map((date, i) => {
                    const dateIso = formatIso(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isHolidayDay = isHoliday(date, region.country, region.subdivision ?? undefined);
                    const isVacation = isVacationOn(member, dateIso);
                    const allocation = getAllocationForDate(member.id, dateIso);
                    
                    let cellContent = '';
                    let cellClass = 'bg-white dark:bg-gray-800';
                    let cellTitle = '';
                    
                    if (isHolidayDay) {
                      cellContent = t('holiday');
                      cellClass = 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300';
                      cellTitle = 'Státní svátek';
                    } else if (isVacation) {
                      cellContent = t('onVacation');
                      cellClass = 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
                      cellTitle = 'Dovolená';
                    } else if (allocation) {
                      const projectName = getProjectName(allocation);
                      cellContent = projectName;
                      const projectKey = allocation.projectId || 'null';
                      cellClass = projectColors[projectKey] || 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
                    } else {
                      cellContent = '';
                      cellClass = 'bg-gray-50 dark:bg-gray-700/50';
                    }

                    const isSelected = selectedDates.includes(dateIso);
                    const isInDrag = isInDragRange(member.id, dateIso, dragStart, dragEnd);
                    const isSelectable = !readOnlyMode && !isHolidayDay && !isVacation;
                    const isAllocationSelected = allocation && selectedAllocations.includes(allocation.id!);
                    
                    // Set title after isAllocationSelected is defined
                    if (allocation) {
                      const projectName = getProjectName(allocation);
                      cellTitle = isDeleteMode ? 
                        t('clickToSelectForDeletionTooltip', {
                          action: isAllocationSelected ? t('deselectForDeletion') : t('selectForDeletion'),
                          project: projectName,
                          fte: allocation.allocationFte.toFixed(1),
                          role: allocation.role
                        }) :
                        `${projectName} • ${allocation.allocationFte.toFixed(1)} FTE • ${allocation.role}`;
                    } else {
                      cellTitle = !readOnlyMode ? 
                        (isDeleteMode ? t('noAllocationToDelete') : t('clickToAddAllocation')) : '';
                    }
                    
                    // Determine cell styling
                    let cellStyle = cellClass;
                    if (isAllocationSelected) {
                      cellStyle = 'bg-red-200 dark:bg-red-800/50 border-2 border-red-500';
                    } else if (isSelected) {
                      cellStyle = 'bg-green-200 dark:bg-green-800/50 border-2 border-green-500';
                    } else if (isInDrag && isDragging) {
                      cellStyle = 'bg-blue-200 dark:bg-blue-800/50 border-2 border-blue-400';
                    }
                    
                    return (
                      <td 
                        key={i} 
                        onClick={() => handleCellClick(member.id, dateIso)}
                        onMouseEnter={() => handleCellMouseEnter(member.id, dateIso)}
                        onMouseLeave={handleCellMouseLeave}
                        onMouseUp={() => handleCellMouseUp(member.id, dateIso)}
                        className={`${viewMode === 'monthly' ? 'p-1' : 'p-2'} text-center text-xs border-r cursor-pointer transition-all duration-200 hover:shadow-md ${
                          isWeekend ? 'bg-gray-100 dark:bg-gray-700' : ''
                        } ${isToday ? 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-400 dark:border-blue-500' : ''} ${cellStyle} ${
                          isSelectable && !isDeleteMode ? 'hover:bg-blue-100 dark:hover:bg-blue-800/30' : ''
                        }`}
                        title={cellTitle}
                      >
                        <div className={`truncate font-medium ${viewMode === 'monthly' ? 'text-[10px]' : ''}`} title={cellContent}>
                          {viewMode === 'monthly' && cellContent.length > 8 ? cellContent.substring(0, 8) + '...' : cellContent}
                        </div>
                        {allocation && viewMode === 'daily' && (
                          <div className="text-[10px] text-gray-500 mt-1">
                            {allocation.allocationFte.toFixed(1)} FTE
                          </div>
                        )}
                        {!readOnlyMode && !isHolidayDay && !isVacation && !allocation && viewMode === 'daily' && (
                          <div className="text-[10px] text-gray-400 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                            Klikněte
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="text-center text-sm opacity-70 py-4">{t('loading')}…</div>
        )}

        {/* Add/Edit Allocation Form */}
        <Modal
          isOpen={showAddForm && !readOnlyMode}
          onClose={() => {
            setShowAddForm(false);
            setEditingAllocation(null);
            setNewAllocation({
              teamMemberId: '',
              projectId: null,
              role: '',
              allocationFte: 1.0,
              externalProjectName: '',
              description: ''
            });
            setEndDate('');
            resetDragState();
          }}
          title={editingAllocation ? t('editAllocation') : 
                 selectedDates.length > 0 ? t('addAllocationForDays', { count: selectedDates.length }) : 
                 t('addNewAllocation')}
          icon={<FiCalendar className="w-6 h-6" />}
          maxWidth="2xl"
        >
              
              {/* Show selected dates for range selection */}
              {selectedDates.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">
                    {t('allocationRange', { count: selectedDates.length })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                      {new Date(selectedDates[0]).toLocaleDateString('cs-CZ')}
                    </span>
                    {selectedDates.length > 2 && (
                      <span className="px-2 py-1 text-green-600 dark:text-green-400 text-xs">
                        ... {selectedDates.length - 2} dnů ...
                      </span>
                    )}
                    {selectedDates.length > 1 && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                        {new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString('cs-CZ')}
                      </span>
                    )}
                  </div>
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
                    onChange={(e) => {
                      const selectedMember = team.find(m => m.id === e.target.value);
                      setNewAllocation({ 
                        ...newAllocation, 
                        teamMemberId: e.target.value,
                        role: selectedMember?.role || newAllocation.role
                      });
                    }}
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
                      value={newAllocation.projectId || ''}
                      onChange={(e) => setNewAllocation({ ...newAllocation, projectId: e.target.value || null })}
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
                    FTE (Full-time equivalent)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={newAllocation.allocationFte}
                    onChange={(e) => setNewAllocation({ ...newAllocation, allocationFte: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Date - only show for single allocation */}
                {selectedDates.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('fromDate')}
                    </label>
                    <input
                      type="date"
                      value={newAllocation.date}
                      onChange={(e) => setNewAllocation({ ...newAllocation, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                )}
                
                {/* End Date - only show for single allocation */}
                {selectedDates.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('toDate')}
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder={t('toDateDescription')}
                    />
                    {endDate && newAllocation.date && (
                      <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                        {t('willCreateAllocations', { count: getDateRange(newAllocation.date, endDate).length })}
                      </div>
                    )}
                  </div>
                )}
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

              {/* Description */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Popis
                </label>
                <textarea
                  value={newAllocation.description}
                  onChange={(e) => setNewAllocation({ ...newAllocation, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Volitelný popis alokace..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveAllocation}
                  disabled={loading || !newAllocation.teamMemberId || !newAllocation.role}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSave className="w-4 h-4" />
                  {editingAllocation ? t('saveChanges') : 
                   (endDate && newAllocation.date ? t('saveForDays', { count: getDateRange(newAllocation.date, endDate).length }) : t('save'))}
                </button>
                {editingAllocation && (
                  <button
                    onClick={async () => {
                      await handleRemoveAllocation(editingAllocation.id!);
                      setShowAddForm(false);
                      setEditingAllocation(null);
                    }}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    {t('delete')}
                  </button>
                )}
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingAllocation(null);
                      setNewAllocation({
                        teamMemberId: '',
                        projectId: null,
                        role: '',
                        allocationFte: 1.0,
                        externalProjectName: '',
                        description: ''
                      });
                      setEndDate('');
                      resetDragState();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    {t('cancel')}
                  </button>
              </div>
        </Modal>
      </div>
    </div>
  );
}
