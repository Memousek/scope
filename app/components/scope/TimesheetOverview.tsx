/**
 * Comprehensive Timesheet Overview Component
 * Features: Advanced table, calendar view, charts, filtering, export
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@/lib/translation';
import { TimesheetService } from '@/lib/domain/services/timesheet-service';
import { TimesheetEntry } from '@/lib/domain/models/timesheet';
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
  FiTrash2
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
      setTimesheets(data);
    } catch (error) {
      console.error('Failed to load timesheets:', error);
    } finally {
      setLoading(false);
    }
  }, [scopeId, filters]);

  useEffect(() => {
    loadTimesheets();
  }, [loadTimesheets]);

  // Filtered timesheets
  const filteredTimesheets = useMemo(() => {
    let filtered = timesheets;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchLower) ||
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

  // Export functions
  const exportToCSV = () => {
    const headers = ['Datum', 'Člen týmu', 'Projekt', 'Role', 'Hodiny', 'Popis'];
    const csvContent = [
      headers.join(','),
      ...filteredTimesheets.map(t => [
        new Date(t.date).toLocaleDateString('cs-CZ'),
        team.find(m => m.id === t.memberId)?.name || '',
        projects.find(p => p.id === t.projectId)?.name || '',
        t.role,
        t.hours,
        t.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timesheets_${scopeId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Calendar helpers
  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + 1);
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
    
    // Add previous month days
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
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
      return timesheetDate.toDateString() === date.toDateString();
    });
  };

  // Navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (calendarView === 'week') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(selectedDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

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
        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
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
        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-2 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
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
              {t('calendar')}
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

      {/* Content */}
      {viewMode === 'table' && (
        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
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
                        {timesheet.description || '-'}
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
            <div className="text-center py-12">
              <FiClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {t('noTimesheetsFound')}
              </p>
            </div>
          )}
          </div>
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="space-y-6">
          {/* Calendar Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateDate('prev')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <FiChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString('cs-CZ', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </h3>
              
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${
                    calendarView === 'week'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t('week')}
                </button>
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-3 py-1 rounded-md text-sm transition-all duration-200 ${
                    calendarView === 'month'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t('month')}
                </button>
              </div>
            </div>
            
            <button
              onClick={() => navigateDate('next')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <FiChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
            <div className="relative z-10">
              {calendarView === 'week' ? (
              <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
                {/* Day Headers */}
                {getWeekDays(selectedDate).map((day, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {day.toLocaleDateString('cs-CZ', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold ${
                      day.toDateString() === new Date().toDateString()
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
                
                {/* Day Content */}
                {getWeekDays(selectedDate).map((day, index) => {
                  const dayTimesheets = getTimesheetsForDate(day);
                  const totalHours = dayTimesheets.reduce((sum, t) => sum + t.hours, 0);
                  
                  return (
                    <div key={index} className="bg-white dark:bg-gray-800 min-h-[120px] p-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {totalHours > 0 && `${totalHours}h`}
                      </div>
                      <div className="space-y-1">
                        {dayTimesheets.slice(0, 3).map((timesheet) => {
                          const member = team.find(m => m.id === timesheet.memberId);
                          return (
                            <div key={timesheet.id} className="text-xs p-1 bg-blue-50 dark:bg-blue-900/20 rounded text-blue-700 dark:text-blue-400">
                              <div className="font-medium">{member?.name}</div>
                              <div>{timesheet.hours}h - {timesheet.description?.slice(0, 20)}...</div>
                            </div>
                          );
                        })}
                        {dayTimesheets.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            +{dayTimesheets.length - 3} {t('more')}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
                {/* Month Headers */}
                {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
                  <div key={day} className="bg-gray-50 dark:bg-gray-700 p-2 text-center">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {day}
                    </div>
                  </div>
                ))}
                
                {/* Month Days */}
                {getMonthDays(selectedDate).map(({ date, isCurrentMonth }, index) => {
                  const dayTimesheets = getTimesheetsForDate(date);
                  const totalHours = dayTimesheets.reduce((sum, t) => sum + t.hours, 0);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div key={index} className={`bg-white dark:bg-gray-800 min-h-[80px] p-1 ${
                      !isCurrentMonth ? 'opacity-50' : ''
                    }`}>
                      <div className={`text-xs font-medium mb-1 ${
                        isToday 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : isCurrentMonth 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {date.getDate()}
                      </div>
                      {totalHours > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {totalHours}h
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
          <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
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
          <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
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
        icon={<FiEdit className="text-white text-2xl" />}
        maxWidth="md"
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('date')}
                </label>
                <input
                  type="date"
                  name="date"
                  defaultValue={editingTimesheet.date.toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('hours')}
                </label>
                <input
                  type="number"
                  name="hours"
                  min="0"
                  max="24"
                  step="0.5"
                  defaultValue={editingTimesheet.hours}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('role')}
                </label>
                <select
                  name="role"
                  defaultValue={editingTimesheet.role}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  {Array.from(new Set(team.map(m => m.role))).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('description')}
                </label>
                <textarea
                  name="description"
                  defaultValue={editingTimesheet.description || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {t('save')}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
