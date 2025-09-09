/**
 * Timesheet Entry Modal for users to log their daily work hours
 * Supports multiple projects, roles, and future Jira integration
 * Uses unified Modal component for consistent styling
 */

import React, { useState, useEffect } from 'react';
import { FiClock, FiCalendar, FiFileText, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useToastFunctions } from '@/app/components/ui/Toast';
import { Modal } from '@/app/components/ui/Modal';
import { useTranslation } from '@/lib/translation';
import { parseTimeTracking, formatTimeTracking, isValidTimeTracking, TIME_TRACKING_EXAMPLES } from '@/app/utils/timeTrackingUtils';

interface TimesheetEntry {
  id?: string;
  projectId: string;
  role: string;
  hours: number;
  description: string;
  timeTrackingInput?: string; // Raw time tracking input (e.g., "1d 2h 30m")
}

interface TimesheetEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  projects: Array<{ id: string; name: string }>;
  roles: string[];
  selectedDate?: Date;
  userRole?: string; // User's default role
  onSave: (entries: TimesheetEntry[], date: Date) => Promise<void>;
}

export function TimesheetEntryModal({
  isOpen,
  onClose,
  memberName,
  projects,
  roles,
  selectedDate = new Date(),
  userRole,
  onSave
}: TimesheetEntryModalProps) {
  const { success, error } = useToastFunctions();
  const { t } = useTranslation();
  
  const [date, setDate] = useState<Date>(selectedDate);
  const [entries, setEntries] = useState<TimesheetEntry[]>([
    { projectId: '', role: '', hours: 0, description: '', timeTrackingInput: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(selectedDate);
      // Set default role if userRole is provided and exists in roles
      const defaultRole = userRole && roles.includes(userRole) ? userRole : '';
      setEntries([{ projectId: '', role: defaultRole, hours: 0, description: '', timeTrackingInput: '' }]);
    }
  }, [isOpen, selectedDate, userRole, roles]);

  const addEntry = () => {
    // Set default role for new entries too
    const defaultRole = userRole && roles.includes(userRole) ? userRole : '';
    setEntries([...entries, { projectId: '', role: defaultRole, hours: 0, description: '', timeTrackingInput: '' }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  };

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const updateTimeTracking = (index: number, timeInput: string) => {
    const newEntries = [...entries];
    newEntries[index] = { 
      ...newEntries[index], 
      timeTrackingInput: timeInput,
      hours: parseTimeTracking(timeInput)
    };
    setEntries(newEntries);
  };

  const validateEntries = (): boolean => {
    // Check if all entries have required fields
    for (const entry of entries) {
      if (!entry.projectId || !entry.role || entry.hours <= 0) {
        return false;
      }
      
      // Check for minimum hours (at least 0.1 hours = 6 minutes)
      if (entry.hours < 0.1) {
        error(t('tooFewHours'), t('tooFewHoursDescription'));
        return false;
      }
    }

    // Check if total hours don't exceed 24
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    if (totalHours > 24) {
      error('Příliš mnoho hodin', 'Celkový počet hodin za den nemůže přesáhnout 24.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEntries()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter out empty entries
      const validEntries = entries.filter(entry => 
        entry.projectId && entry.role && entry.hours > 0
      );

      await onSave(validEntries, date);
      success('Výkaz práce uložen', 'Výkaz práce byl úspěšně uložen.');
      onClose();
    } catch (err) {
      error('Chyba při ukládání', 'Nepodařilo se uložit výkaz práce.');
      console.error('Failed to save timesheet:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('workReport')}
      description={`${memberName} - ${formatDate(date)}`}
      icon={<FiClock className="w-5 h-5" />}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Selection */}
          <div className="flex items-center gap-3">
            <FiCalendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={formatDate(date)}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('workRecords')}
              </h3>
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <FiPlus className="w-4 h-4" />
                {t('addRecord')}
              </button>
            </div>

            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('project')}
                  </label>
                  <select
                    value={entry.projectId}
                    onChange={(e) => updateEntry(index, 'projectId', e.target.value)}
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
                    value={entry.role}
                    onChange={(e) => updateEntry(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">{t('selectRole')}</option>
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {role}
                      </option>
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
                    value={entry.timeTrackingInput || entry.hours.toString()}
                    onChange={(e) => updateTimeTracking(index, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('timeTrackingPlaceholder')}
                    title={t('timeTrackingTitle')}
                    required
                  />
                  {entry.timeTrackingInput && !isValidTimeTracking(entry.timeTrackingInput) && (
                    <p className="text-xs text-red-500 mt-1">
                      {t('invalidTimeFormat')}
                    </p>
                  )}
                  {entry.hours > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t('equalsHours').replace('{hours}', entry.hours.toFixed(2))}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    disabled={entries.length === 1}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Description */}
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('workDescription')}
                  </label>
                  <input
                    type="text"
                    value={entry.description}
                    onChange={(e) => updateEntry(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('whatDidYouDo')}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Hours */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {t('totalHours')}:
            </span>
            <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {entries.reduce((sum, entry) => sum + entry.hours, 0).toFixed(2)} h
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || entries.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('saving')}...
                </>
              ) : (
                <>
                  <FiFileText className="w-4 h-4" />
                  {t('saveReport')}
                </>
              )}
            </button>
          </div>
        </form>
    </Modal>
  );
}
