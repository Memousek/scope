/**
 * Comprehensive Timesheet Overview Component
 * Features: Advanced table, calendar view, charts, filtering, export
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/lib/translation';
import { TimesheetService } from '@/lib/domain/services/timesheet-service';
import { TimesheetEntry } from '@/lib/domain/models/timesheet';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';
import { isHoliday, getHolidays } from '@/app/utils/holidays';
import { 
  FiClock, 
  FiCalendar, 
  FiBarChart, 
  FiFilter, 
  FiSearch, 
  FiDownload, 
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiTrash2,
  FiStar,
  FiUsers,
  FiTrendingUp,
  FiFolder,
  FiX,
  FiFileText
} from 'react-icons/fi';
import { Modal } from '../ui/Modal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Helper function to extract readable text from JSON description
const extractReadableText = (description: string | undefined): string => {
  if (!description) return '';
  
  try {
    // Try to parse as JSON (JIRA worklog format)
    const parsed = JSON.parse(description);
    
    // Check if it's a JIRA worklog JSON structure
    if (parsed.type === 'doc' && parsed.content && Array.isArray(parsed.content)) {
      // Extract text from JIRA's document structure
      const extractText = (content: unknown[]): string => {
        return content.map(item => {
          const itemData = item as any;
          if (itemData.type === 'paragraph' && itemData.content) {
            return itemData.content.map((textItem: any) => textItem.text || '').join('');
          }
          if (itemData.content) {
            return extractText(itemData.content);
          }
          return '';
        }).join(' ');
      };
      
      const extractedText = extractText(parsed.content);
      return extractedText.trim() || description; // Fallback to original if extraction fails
    }
    
    // If it's not a JIRA structure, return as is
    return description;
  } catch {
    // If it's not valid JSON, return as is
    return description;
  }
};

// Helper function to check if description is from JIRA
const isJiraDescription = (description: string | undefined): boolean => {
  if (!description) return false;
  
  try {
    const parsed = JSON.parse(description);
    return parsed.type === 'doc' && parsed.content && Array.isArray(parsed.content);
  } catch {
    return false;
  }
};

interface TimesheetOverviewProps {
  scopeId: string;
  team: Array<{ id: string; name: string; role: string }>;
  projects: Array<{ id: string; name: string }>;
}

type ViewMode = 'table' | 'calendar' | 'charts';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface TimesheetFilters {
  dateFrom: Date | null;
  dateTo: Date | null;
  memberIds: string[];
  projectIds: string[];
  roles: string[];
  search: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function TimesheetOverview({ scopeId, team, projects }: TimesheetOverviewProps) {
  const { t } = useTranslation();
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [filters, setFilters] = useState<TimesheetFilters>({
    dateFrom: null,
    dateTo: null,
    memberIds: [],
    projectIds: [],
    roles: [],
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'week' | 'month'>('week');
  const [editingTimesheet, setEditingTimesheet] = useState<TimesheetEntry | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [deletingTimesheet, setDeletingTimesheet] = useState<string | null>(null); // Used in future UI updates
  const [calendarConfig, setCalendarConfig] = useState<{ includeHolidays: boolean; country: string; subdivision?: string | null }>({
    includeHolidays: true,
    country: 'CZ',
    subdivision: null
  });
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Export functions
  const exportToCSV = () => {
    const csvData = filteredTimesheets.map(timesheet => {
      const member = team.find(m => m.id === timesheet.memberId);
      const project = projects.find(p => p.id === timesheet.projectId);
      return {
        'Datum': new Date(timesheet.date).toLocaleDateString('cs-CZ'),
        'Člen týmu': member?.name || '',
        'Projekt': project?.name || '',
        'Hodiny': timesheet.hours,
        'Popis': extractReadableText(timesheet.description)
      };
    });

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timesheet-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    // Simple PDF export using browser print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const content = `
        <html>
          <head>
            <title>Timesheet Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
            </style>
          </head>
          <body>
            <h1>Timesheet Report - ${scopeId}</h1>
            <table>
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Člen týmu</th>
                  <th>Projekt</th>
                  <th>Hodiny</th>
                  <th>Popis</th>
                </tr>
              </thead>
              <tbody>
                ${filteredTimesheets.map(timesheet => {
                  const member = team.find(m => m.id === timesheet.memberId);
                  const project = projects.find(p => p.id === timesheet.projectId);
                  return `
                    <tr>
                      <td>${new Date(timesheet.date).toLocaleDateString('cs-CZ')}</td>
                      <td>${member?.name || ''}</td>
                      <td>${project?.name || ''}</td>
                      <td>${timesheet.hours}</td>
                      <td>${extractReadableText(timesheet.description)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Load calendar configuration from scope settings
  useEffect(() => {
    const loadCalendarConfig = async () => {
      try {
        const cfg = await ScopeSettingsService.get(scopeId);
        if (cfg?.calendar) {
          const include = typeof cfg.calendar.includeHolidays === 'boolean' 
            ? cfg.calendar.includeHolidays 
            : (cfg.calendar.includeCzechHolidays ?? true);
          const country = cfg.calendar.country || 'CZ';
          const subdivision = cfg.calendar.subdivision || null;
          setCalendarConfig({ includeHolidays: include, country, subdivision });
        }
      } catch (error) {
        console.error('Failed to load calendar config:', error);
      }
    };
    loadCalendarConfig();
  }, [scopeId]);

  // Initialize date range
  useEffect(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    setFilters(prev => ({
      ...prev,
      dateFrom: startOfWeek,
      dateTo: endOfWeek
    }));
  }, []);

  // Load timesheets
  const loadTimesheets = useCallback(async () => {
    if (!filters.dateFrom || !filters.dateTo) return;
    
    setLoading(true);
    try {
      const timesheetService = new TimesheetService();
      const data = await timesheetService.getTimesheetsByFilter({
        scopeId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        memberId: filters.memberIds.length > 0 ? filters.memberIds[0] : undefined,
        projectId: filters.projectIds.length > 0 ? filters.projectIds[0] : undefined,
        role: filters.roles.length > 0 ? filters.roles[0] : undefined
      });
      
      // Debug: log loaded timesheets
      console.log('TimesheetOverview: Loaded timesheets', {
        count: data.length,
        timesheets: data.map(t => ({
          id: t.id,
          memberId: t.memberId,
          projectId: t.projectId,
          role: t.role,
          hours: t.hours,
          date: t.date
        })),
        team: team.map(m => ({ id: m.id, name: m.name, role: m.role })),
        projects: projects.map(p => ({ id: p.id, name: p.name }))
      });
      
      setTimesheets(data);
    } catch (error) {
      console.error('Failed to load timesheets:', error);
    } finally {
      setLoading(false);
    }
  }, [scopeId, filters, team, projects]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  // Filtered timesheets
  const filteredTimesheets = useMemo(() => {
    let filtered = timesheets;

    // Filter out very small timesheet entries (likely test data or errors) - 15mins are not allowed to be logged
    // Less than 15mins are not allowed to be logged
    filtered = filtered.filter(t => t.hours >= 0.245);

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        extractReadableText(t.description)?.toLowerCase().includes(searchLower) ||
        team.find(m => m.id === t.memberId)?.name.toLowerCase().includes(searchLower) ||
        projects.find(p => p.id === t.projectId)?.name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [timesheets, filters, team, projects]);

  // Handle edit timesheet
  const handleEditTimesheet = (timesheet: TimesheetEntry) => {
    setEditingTimesheet(timesheet);
    setEditModalOpen(true);
  };

  // Handle delete timesheet
  const handleDeleteTimesheet = async (timesheetId: string) => {
    if (!confirm(t('confirmDeleteTimesheet'))) return;
    
    setDeletingTimesheet(timesheetId);
    try {
      const timesheetService = new TimesheetService();
      await timesheetService.deleteTimesheet(timesheetId);
      await loadTimesheets(); // Reload data
    } catch (error) {
      console.error('Failed to delete timesheet:', error);
      alert(t('deleteTimesheetError'));
    } finally {
      setDeletingTimesheet(null);
    }
  };

  // Handle save edited timesheet
  const handleSaveTimesheet = async (updatedTimesheet: Partial<TimesheetEntry>) => {
    if (!editingTimesheet?.id) return;
    
    try {
      const timesheetService = new TimesheetService();
      await timesheetService.updateTimesheet(editingTimesheet.id, updatedTimesheet);
      await loadTimesheets(); // Reload data
      setEditModalOpen(false);
      setEditingTimesheet(null);
    } catch (error) {
      console.error('Failed to update timesheet:', error);
      alert(t('updateTimesheetError'));
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    const memberHours = team.map(member => {
      const hours = filteredTimesheets
        .filter(t => t.memberId === member.id)
        .reduce((sum, t) => sum + t.hours, 0);
      return { name: member.name, hours, role: member.role };
    }).filter(d => d.hours > 0);

    const projectHours = projects.map(project => {
      const hours = filteredTimesheets
        .filter(t => t.projectId === project.id)
        .reduce((sum, t) => sum + t.hours, 0);
      return { name: project.name, hours };
    }).filter(d => d.hours > 0);

    const dailyHours = filteredTimesheets.reduce((acc, t) => {
      const date = new Date(t.date).toLocaleDateString();
      acc[date] = (acc[date] || 0) + t.hours;
      return acc;
    }, {} as Record<string, number>);

    return { memberHours, projectHours, dailyHours };
  }, [filteredTimesheets, team, projects]);

  // Date range handlers
  const handleDateRangeChange = (range: DateRange) => {
    const now = new Date();
    let dateFrom: Date;
    let dateTo: Date;

    switch (range) {
      case 'today':
        dateFrom = new Date(now);
        dateTo = new Date(now);
        break;
      case 'week':
        dateFrom = new Date(now);
        dateFrom.setDate(now.getDate() - now.getDay() + 1);
        dateTo = new Date(dateFrom);
        dateTo.setDate(dateFrom.getDate() + 6);
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        dateFrom = new Date(now.getFullYear(), quarter * 3, 1);
        dateTo = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        dateFrom = new Date(now.getFullYear(), 0, 1);
        dateTo = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);

    setDateRange(range);
    setFilters(prev => ({ ...prev, dateFrom, dateTo }));
  };


  // Calendar helpers
  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    // Get first day of week based on country (0 = Sunday, 1 = Monday)
    const firstDayOfWeek = calendarConfig.country === 'US' ? 0 : 1;
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek - firstDayOfWeek;
    start.setDate(start.getDate() - diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Get first day of week based on country (0 = Sunday, 1 = Monday)
    const firstDayOfWeek = calendarConfig.country === 'US' ? 0 : 1;
    const firstDayOfMonth = firstDay.getDay();
    const diff = firstDayOfMonth - firstDayOfWeek;
    
    // Add previous month days
    for (let i = diff; i > 0; i--) {
      const day = new Date(year, month, -i + 1);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Add current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = new Date(year, month, i);
      days.push({ date: day, isCurrentMonth: true });
    }
    
    // Add next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(year, month + 1, i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    return days;
  };

  const getTimesheetsForDate = (date: Date) => {
    return filteredTimesheets.filter(t => {
      const timesheetDate = new Date(t.date);
      const dateMatch = timesheetDate.toDateString() === date.toDateString();
      
      // Apply project filter
      const projectMatch = filters.projectIds.length === 0 || filters.projectIds.includes(t.projectId);
      
      // Apply member filter
      const memberMatch = filters.memberIds.length === 0 || filters.memberIds.includes(t.memberId);
      
      // Apply search filter
      const searchMatch = (filters.search === '' && searchQuery === '') || 
        extractReadableText(t.description)?.toLowerCase().includes((filters.search || searchQuery).toLowerCase()) ||
        team.find(m => m.id === t.memberId)?.name?.toLowerCase().includes((filters.search || searchQuery).toLowerCase()) ||
        projects.find(p => p.id === t.projectId)?.name?.toLowerCase().includes((filters.search || searchQuery).toLowerCase());
      
      return dateMatch && projectMatch && memberMatch && searchMatch;
    });
  };

  // Helper functions for calendar enhancements
  const isDateHoliday = (date: Date) => {
    if (!calendarConfig.includeHolidays) return false;
    return isHoliday(date, calendarConfig.country, calendarConfig.subdivision);
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    // Most countries: Saturday (6) and Sunday (0) are weekends
    // Some Middle Eastern countries might have different weekends, but we'll use standard for now
    return day === 0 || day === 6; // Sunday or Saturday
  };

  const getDayType = (date: Date) => {
    if (isDateHoliday(date)) return 'holiday';
    if (isWeekend(date)) return 'weekend';
    return 'workday';
  };

  const getDayTypeColor = (dayType: string) => {
    switch (dayType) {
      case 'holiday': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'weekend': return 'bg-gray-100 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600';
      default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getDayTypeTextColor = (dayType: string) => {
    switch (dayType) {
      case 'holiday': return 'text-red-600 dark:text-red-400';
      case 'weekend': return 'text-gray-600 dark:text-gray-300';
      default: return 'text-gray-900 dark:text-white';
    }
  };

  // Get holiday name
  const getHolidayName = (date: Date) => {
    if (!calendarConfig.includeHolidays) return null;
    try {
      const holidays = getHolidays(calendarConfig.country, calendarConfig.subdivision);
      const holidayArray = holidays.isHoliday(date);
      const holidayName = holidayArray && holidayArray.length > 0 ? holidayArray[0].name : null;
      if (holidayName) {
        console.log(`Holiday found for ${date.toDateString()}: ${holidayName}`);
      }
      return holidayName;
    } catch (error) {
      console.error('Error getting holiday name:', error);
      return null;
    }
  };

  // Toggle expanded day
  const toggleExpandedDay = (dateString: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateString)) {
        newSet.delete(dateString);
      } else {
        newSet.add(dateString);
      }
      return newSet;
    });
  };

  // Check if current week contains today
  const isCurrentWeek = (date: Date) => {
    const today = new Date();
    const startOfWeek = new Date(date);
    // Get first day of week based on country (0 = Sunday, 1 = Monday)
    const firstDayOfWeek = calendarConfig.country === 'US' ? 0 : 1;
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek - firstDayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return today >= startOfWeek && today <= endOfWeek;
  };

  // Navigation
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (calendarView === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  }, [selectedDate, calendarView]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewMode !== 'calendar') return;
      
      // Don't trigger shortcuts when typing in inputs, selects, or textareas
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          navigateDate('prev');
          break;
        case 'ArrowRight':
          event.preventDefault();
          navigateDate('next');
          break;
        case 'w':
        case 'W':
          event.preventDefault();
          setCalendarView('week');
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          setCalendarView('month');
          break;
        case 't':
        case 'T':
          event.preventDefault();
          setSelectedDate(new Date());
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, calendarView, selectedDate, navigateDate]);

  if (loading) {
    return (
      <div className="space-y-6 relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* View Mode Skeleton */}
        <div className="flex items-center justify-center">
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Calendar Skeleton */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
      {/* Header */}
      <div className="relative">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 flex-col md:flex-row gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <h2 className="text-2xl font-bold dark:text-white text-gray-900">
                  <FiClock className="inline mr-2" /> {t('timesheetOverview')}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                <span>{t('timesheetOverviewDescription')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-col md:flex-row">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                  showFilters 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <FiFilter className="w-4 h-4" />
                {t('filters')}
              </button>
              
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-all duration-200"
              >
                <FiDownload className="w-4 h-4" />
                {t('export')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="relative p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('dateRange')}
              </label>
              <select
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value as DateRange)}
                className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all duration-200"
              >
                <option value="today">{t('today')}</option>
                <option value="week">{t('thisWeek')}</option>
                <option value="month">{t('thisMonth')}</option>
                <option value="quarter">{t('thisQuarter')}</option>
                <option value="year">{t('thisYear')}</option>
              </select>
            </div>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('dateFrom')}
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateFrom: e.target.value ? new Date(e.target.value) : null 
                    }))}
                    className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('dateTo')}
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateTo: e.target.value ? new Date(e.target.value) : null 
                    }))}
                    className="w-full px-3 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all duration-200"
                  />
                </div>
              </>
            )}

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('search')}
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-white/80 dark:bg-gray-700/80 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center justify-center">
        <div className="relative p-2">
          <div className="relative z-10 flex">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FiClock className="w-4 h-4 inline mr-2" />
              {t('table')}
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FiCalendar className="w-4 h-4 inline mr-2" />
              {t('calendarView')}
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode === 'charts'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FiBarChart className="w-4 h-4 inline mr-2" />
              {t('charts')}
            </button>
          </div>
        </div>
      </div>

      {/* Modern Filter Bar */}
      {viewMode === 'calendar' && (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          {/* Search Section */}
          <div className="mb-6">
            <div className="relative max-w-md mx-auto">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Hledat v záznamech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 text-sm bg-white dark:bg-gray-700 border-0 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Filter Section */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            {/* Project Filter */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Projekty</label>
              <div className="relative">
                <select
                  multiple
                  value={filters.projectIds}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    projectIds: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 min-w-[160px]"
                  size={Math.min(projects.length, 4)}
                >
                  <option value="">Všechny projekty</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <FiFolder className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Member Filter */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Členové</label>
              <div className="relative">
                <select
                  multiple
                  value={filters.memberIds}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    memberIds: Array.from(e.target.selectedOptions, option => option.value)
                  }))}
                  className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 min-w-[160px]"
                  size={Math.min(team.length, 4)}
                >
                  <option value="">Všichni členové</option>
                  {team.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <FiUsers className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Clear Filters */}
            {(filters.projectIds.length > 0 || filters.memberIds.length > 0 || searchQuery) && (
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs font-medium text-transparent">Actions</label>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, projectIds: [], memberIds: [] }));
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <FiX className="w-4 h-4" />
                  Vymazat
                </button>
              </div>
            )}
          </div>

          {/* Export Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <FiDownload className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <FiFileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>

          {/* Active Filters Display */}
          {(filters.projectIds.length > 0 || filters.memberIds.length > 0 || searchQuery) && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Aktivní filtry:</span>
                {filters.projectIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <FiFolder className="w-3 h-3" />
                    {filters.projectIds.length} projekt{filters.projectIds.length > 1 ? 'ů' : ''}
                  </span>
                )}
                {filters.memberIds.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <FiUsers className="w-3 h-3" />
                    {filters.memberIds.length} člen{filters.memberIds.length > 1 ? 'ů' : ''}
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <FiSearch className="w-3 h-3" />
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' && (
        <div className="relative overflow-hidden">
          <div className="relative z-10">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('member')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('project')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('hours')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTimesheets.map((timesheet) => {
                  const member = team.find(m => m.id === timesheet.memberId);
                  const project = projects.find(p => p.id === timesheet.projectId);
                  
                  // Debug: log missing mappings
                  if (!member) {
                    console.warn('TimesheetOverview: Member not found for timesheet', {
                      timesheetId: timesheet.id,
                      memberId: timesheet.memberId,
                      availableMembers: team.map(m => ({ id: m.id, name: m.name }))
                    });
                  }
                  if (!project) {
                    console.warn('TimesheetOverview: Project not found for timesheet', {
                      timesheetId: timesheet.id,
                      projectId: timesheet.projectId,
                      availableProjects: projects.map(p => ({ id: p.id, name: p.name }))
                    });
                  }
                  
                  return (
                    <tr key={timesheet.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(timesheet.date).toLocaleDateString('cs-CZ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {project?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {timesheet.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {timesheet.hours}h
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                        <div className="flex items-center gap-1">
                          {isJiraDescription(timesheet.description) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              JIRA
                            </span>
                          )}
                          <span className={isJiraDescription(timesheet.description) ? 'text-gray-600 dark:text-gray-400' : ''}>
                            {extractReadableText(timesheet.description) || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTimesheet(timesheet)}
                            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-150"
                            title={t('edit')}
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTimesheet(timesheet.id)}
                            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-150"
                            title={t('delete')}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredTimesheets.length === 0 && (
            <div className="text-center py-16 animate-in fade-in duration-700">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20"></div>
                <div className="relative text-8xl flex items-center justify-center animate-bounce">
                  <FiClock />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-xl font-medium mb-2">
                {t('noTimesheetsFound')}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Začněte přidáním prvního výkazu práce
              </p>
            </div>
          )}
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group"
              >
                <FiChevronLeft className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </button>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString('cs-CZ', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h3>
              
              <button
                onClick={() => navigateDate('next')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group"
              >
                <FiChevronRight className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </button>
              
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 shadow-sm ml-4">
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    calendarView === 'week'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t('week')}
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    calendarView === 'month'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {t('month')}
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Legend */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FiCalendar className="w-4 h-4" />
                  {t('calendarLegend')}
                </div>
                {calendarConfig.includeHolidays && (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    <FiStar className="w-3 h-3" />
                    {t('holidaysIncluded')} ({calendarConfig.country})
                  </div>
                )}
                {calendarView === 'week' && !isCurrentWeek(selectedDate) && (
                  <button
                    onClick={() => setSelectedDate(new Date())}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors duration-200"
                    title="Klávesa T"
                  >
                    <FiCalendar className="w-3 h-3" />
                    {t('today')}
                  </button>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  <span>← → navigace</span>
                  <span>W/M zobrazení</span>
                  <span>T dnes</span>
                </div>
                <button
                  onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                  className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors duration-200"
                  title="Mini kalendář"
                >
                  <FiCalendar className="w-3 h-3" />
                  {showMiniCalendar ? 'Skrýt' : 'Kalendář'}
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">{t('workday')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-600 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">{t('weekend')}</span>
                </div>
                {calendarConfig.includeHolidays && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded"></div>
                    <FiStar className="w-3 h-3 text-red-500" />
                    <span className="text-gray-600 dark:text-gray-400">{t('holidayCalendar')}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded"></div>
                  <span className="text-gray-600 dark:text-gray-400">{t('todayHighlighted')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Calendar */}
          {showMiniCalendar && (
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Rychlá navigace</h3>
                <button
                  onClick={() => setShowMiniCalendar(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {/* Day headers */}
                {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500 dark:text-gray-400">
                    {day}
                  </div>
                ))}
                {/* Calendar days */}
                {(() => {
                  const today = new Date();
                  const currentMonth = selectedDate.getMonth();
                  const currentYear = selectedDate.getFullYear();
                  const firstDay = new Date(currentYear, currentMonth, 1);
                  const startDate = new Date(firstDay);
                  startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);
                  
                  const days = [];
                  for (let i = 0; i < 42; i++) {
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    const isCurrentMonth = date.getMonth() === currentMonth;
                    const isToday = date.toDateString() === today.toDateString();
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    
                    days.push(
                      <button
                        key={i}
                        onClick={() => setSelectedDate(date)}
                        className={`p-2 text-center rounded-lg transition-colors duration-200 ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : isToday
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : isCurrentMonth
                            ? 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  }
                  return days;
                })()}
              </div>
            </div>
          )}

          {/* Calendar Grid */}
          <div className="relative overflow-hidden">
            <div className="relative z-10">
              {calendarView === 'week' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
                {/* Day Headers */}
                {getWeekDays(selectedDate).map((day, index) => {
                  const dayType = getDayType(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  
                  const holidayName = getHolidayName(day);
                  
                  return (
                    <div key={index} className={`${getDayTypeColor(dayType)} rounded-xl border-2 p-4 text-center transition-all duration-200 relative ${
                      isToday ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : 'hover:shadow-md'
                    }`}>
                      <div className={`text-sm font-medium ${getDayTypeTextColor(dayType)}`}>
                        {day.toLocaleDateString('cs-CZ', { weekday: 'short' })}
                      </div>
                      <div className={`text-xl font-bold mt-1 ${
                        isToday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : getDayTypeTextColor(dayType)
                      }`}>
                        {day.getDate()}
                      </div>
                      {dayType === 'holiday' && (
                        <div className="absolute top-2 right-2 group">
                          <FiStar className="w-3 h-3 text-red-500 cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                            {holidayName || t('holidayCalendar')}
                            <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                          </div>
                        </div>
                      )}
                      {holidayName && (
                        <div className="mt-1 text-xs text-red-600 dark:text-red-400 truncate px-1" title={holidayName}>
                          {holidayName}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Day Content */}
                {getWeekDays(selectedDate).map((day, index) => {
                  const dayTimesheets = getTimesheetsForDate(day);
                  const totalHours = dayTimesheets.reduce((sum, t) => sum + t.hours, 0);
                  const dayType = getDayType(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const dateString = day.toDateString();
                  const isExpanded = expandedDays.has(dateString);
                  const holidayName = getHolidayName(day);
                  
                  return (
                    <div key={index} className={`${getDayTypeColor(dayType)} rounded-xl border-2 min-h-[140px] p-3 transition-all duration-200 relative ${
                      isToday ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : 'hover:shadow-md'
                    }`}>
                      {/* Holiday icon - absolute positioned */}
                      {dayType === 'holiday' && (
                        <div className="absolute top-2 right-2">
                          <FiStar className="w-3 h-3 text-red-500" title={holidayName || t('holidayCalendar')} />
                        </div>
                      )}
                      
                      {/* Hours Summary */}
                      {totalHours > 0 && (
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                            <FiClock className="w-3 h-3" />
                            {totalHours}h
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <FiUsers className="w-3 h-3" />
                            {new Set(dayTimesheets.map(t => t.memberId)).size}
                          </div>
                        </div>
                      )}
                      
                      {/* Holiday name */}
                      {holidayName && (
                        <div className="mb-2 text-xs text-red-600 dark:text-red-400 font-medium truncate" title={holidayName}>
                          {holidayName}
                        </div>
                      )}
                      
                      {/* Timesheet Entries */}
                      <div className="space-y-2">
                        {dayTimesheets.slice(0, 3).map((timesheet, idx) => {
                          const member = team.find(m => m.id === timesheet.memberId);
                          const project = projects.find(p => p.id === timesheet.projectId);
                          return (
                            <div 
                              key={timesheet.id} 
                              className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800 transition-all duration-300 ease-in-out"
                              style={{
                                animationDelay: `${idx * 50}ms`
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-xs text-blue-700 dark:text-blue-300 truncate">
                                  {member?.name}
                                </div>
                                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {timesheet.hours}h
                                </div>
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                {project?.name}
                              </div>
                              {extractReadableText(timesheet.description) && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                                  {extractReadableText(timesheet.description).slice(0, 25)}...
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {/* Expanded entries with animation */}
                        {isExpanded && dayTimesheets.slice(3).map((timesheet) => {
                          const member = team.find(m => m.id === timesheet.memberId);
                          const project = projects.find(p => p.id === timesheet.projectId);
                          return (
                            <div 
                              key={timesheet.id} 
                              className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2 fade-in duration-300 ease-out"
                              style={{
                                animationDelay: `${(dayTimesheets.slice(3).indexOf(timesheet) + 3) * 50}ms`
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-xs text-blue-700 dark:text-blue-300 truncate">
                                  {member?.name}
                                </div>
                                <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {timesheet.hours}h
                                </div>
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                {project?.name}
                              </div>
                              {extractReadableText(timesheet.description) && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                                  {extractReadableText(timesheet.description).slice(0, 25)}...
                                </div>
                              )}
                            </div>
                          );
                        })}
                        
                        {dayTimesheets.length > 3 && (
                          <div className="text-center">
                            <button
                              onClick={() => toggleExpandedDay(dateString)}
                              className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 hover:scale-105"
                            >
                              <FiTrendingUp className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                              {isExpanded ? t('showLess') : `+${dayTimesheets.length - 3} ${t('more')}`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-1">
                {/* Month Headers */}
                {(() => {
                  const dayNames = calendarConfig.country === 'US' 
                    ? ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'] // Sunday first for US
                    : ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']; // Monday first for most countries
                  return dayNames.map((day) => (
                    <div key={day} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {day}
                      </div>
                    </div>
                  ));
                })()}
                
                {/* Month Days */}
                {getMonthDays(selectedDate).map(({ date, isCurrentMonth }, index) => {
                  const dayTimesheets = getTimesheetsForDate(date);
                  const totalHours = dayTimesheets.reduce((sum, t) => sum + t.hours, 0);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const dayType = getDayType(date);
                  const dateString = date.toDateString();
                  const isExpanded = expandedDays.has(dateString);
                  const holidayName = getHolidayName(date);
                  
                  return (
                    <div key={index} className={`${getDayTypeColor(dayType)} rounded-lg border min-h-[100px] p-2 transition-all duration-200 relative ${
                      !isCurrentMonth ? 'opacity-40' : 'hover:shadow-md'
                    } ${isToday ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`text-sm font-bold ${
                          isToday 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : isCurrentMonth 
                              ? getDayTypeTextColor(dayType)
                              : 'text-gray-400 dark:text-gray-600'
                        }`}>
                          {date.getDate()}
                        </div>
                        {dayType === 'holiday' && (
                          <div className="absolute top-1 right-1">
                            <FiStar className="w-3 h-3 text-red-500" title={holidayName || t('holidayCalendar')} />
                          </div>
                        )}
                      </div>
                      
                      {/* Holiday name */}
                      {holidayName && (
                        <div className="mb-1 text-xs text-red-600 dark:text-red-400 font-medium truncate" title={holidayName}>
                          {holidayName}
                        </div>
                      )}
                      
                      {totalHours > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                            <FiClock className="w-2 h-2" />
                            {totalHours}h
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <FiUsers className="w-2 h-2" />
                            {new Set(dayTimesheets.map(t => t.memberId)).size}
                          </div>
                        </div>
                      )}
                      
                      {/* Show timesheet entries */}
                      {dayTimesheets.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(isExpanded ? dayTimesheets : dayTimesheets.slice(0, 1)).map((timesheet) => {
                            const member = team.find(m => m.id === timesheet.memberId);
                            return (
                              <div key={timesheet.id} className="bg-blue-50 dark:bg-blue-900/20 rounded p-1">
                                <div className="text-xs font-medium text-blue-700 dark:text-blue-300 truncate">
                                  {member?.name}
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                  {timesheet.hours}h
                                </div>
                              </div>
                            );
                          })}
                          {dayTimesheets.length > 1 && (
                            <div className="text-center">
                              <button
                                onClick={() => toggleExpandedDay(dateString)}
                                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                              >
                                {isExpanded ? t('showLess') : `+${dayTimesheets.length - 1}`}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Member Hours Chart */}
          <div className="relative p-6">
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('hoursByMember')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.memberHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project Hours Chart */}
          <div className="relative p-6">
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('hoursByProject')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.projectHours}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="hours"
                  >
                    {chartData.projectHours.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

                    {/* Daily Hours Chart */}
          <div className="lg:col-span-2 relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('hoursOverTime')}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(chartData.dailyHours).map(([date, hours]) => ({ date, hours }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Bar dataKey="hours" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl"></div>
          <div className="relative z-10 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">{t('totalHours')}</p>
                <p className="text-2xl font-bold">
                  {filteredTimesheets.reduce((sum, t) => sum + t.hours, 0)}h
                </p>
              </div>
              <FiClock className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </div>
        
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl"></div>
          <div className="relative z-10 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">{t('totalEntries')}</p>
                <p className="text-2xl font-bold">{filteredTimesheets.length}</p>
              </div>
              <FiCalendar className="w-8 h-8 text-emerald-200" />
            </div>
          </div>
        </div>
        
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl"></div>
          <div className="relative z-10 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">{t('activeMembers')}</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredTimesheets.map(t => t.memberId)).size}
                </p>
              </div>
              <FiBarChart className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </div>
        
        <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl"></div>
          <div className="relative z-10 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">{t('activeProjects')}</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredTimesheets.map(t => t.projectId)).size}
                </p>
              </div>
              <FiBarChart className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Timesheet Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTimesheet(null);
        }}
        title={t('editTimesheet')}
        description={editingTimesheet ? `${team.find(m => m.id === editingTimesheet.memberId)?.name || 'Unknown'} - ${editingTimesheet.date.toISOString().split('T')[0]}` : ''}
        icon={<FiEdit className="w-5 h-5" />}
        maxWidth="2xl"
      >
        {editingTimesheet && (
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSaveTimesheet({
              date: new Date(formData.get('date') as string),
              hours: Number(formData.get('hours')),
              description: formData.get('description') as string,
              role: formData.get('role') as string
            });
          }}>
            <div className="space-y-6">
              {/* Date Selection */}
              <div className="flex items-center gap-3">
                <FiCalendar className="w-5 h-5 text-gray-500" />
                <input
                  type="date"
                  name="date"
                  defaultValue={editingTimesheet.date.toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Work Entry */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('workRecords')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {/* Project */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('project')}
                    </label>
                    <select
                      name="projectId"
                      defaultValue={editingTimesheet.projectId}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">{t('selectProject')}</option>
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('role')}
                    </label>
                    <select
                      name="role"
                      defaultValue={editingTimesheet.role}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">{t('selectRole')}</option>
                      {Array.from(new Set(team.map(m => m.role))).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  {/* Hours */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('hours')}
                    </label>
                    <input
                      type="text"
                      name="hours"
                      defaultValue={editingTimesheet.hours.toString()}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('timeTrackingPlaceholder')}
                      title={t('timeTrackingTitle')}
                      required
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title={t('deleteRecord')}
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Work Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('workDescription')}
                  </label>
                  <textarea
                    name="description"
                    defaultValue={extractReadableText(editingTimesheet.description) || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('workDescriptionPlaceholder')}
                  />
                </div>
              </div>

              {/* Total Hours */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('totalHours')}:
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingTimesheet.hours.toFixed(2)} h
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingTimesheet(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <FiFileText className="w-4 h-4" />
                  {t('saveTimesheet')}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
