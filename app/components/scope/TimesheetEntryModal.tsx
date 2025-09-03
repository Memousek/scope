/**
 * Timesheet Entry Modal for users to log their daily work hours
 * Supports multiple projects, roles, and future Jira integration
 */

import React, { useState, useEffect } from 'react';

import { FiClock, FiCalendar, FiFileText, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useToastFunctions } from '@/app/components/ui/Toast';

interface TimesheetEntry {
  id?: string;
  projectId: string;
  role: string;
  hours: number;
  description: string;
}

interface TimesheetEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  projects: Array<{ id: string; name: string }>;
  roles: string[];
  selectedDate?: Date;
  onSave: (entries: TimesheetEntry[], date: Date) => Promise<void>;
}

export function TimesheetEntryModal({
  isOpen,
  onClose,
  memberName,
  projects,
  roles,
  selectedDate = new Date(),
  onSave
}: TimesheetEntryModalProps) {
  const { success, error } = useToastFunctions();
  
  const [date, setDate] = useState<Date>(selectedDate);
  const [entries, setEntries] = useState<TimesheetEntry[]>([
    { projectId: '', role: '', hours: 0, description: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDate(selectedDate);
      setEntries([{ projectId: '', role: '', hours: 0, description: '' }]);
    }
  }, [isOpen, selectedDate]);

  const addEntry = () => {
    setEntries([...entries, { projectId: '', role: '', hours: 0, description: '' }]);
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

  const validateEntries = (): boolean => {
    // Check if all entries have required fields
    for (const entry of entries) {
      if (!entry.projectId || !entry.role || entry.hours <= 0) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Výkaz práce
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {memberName} - {formatDate(date)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                Záznamy práce
              </h3>
              <button
                type="button"
                onClick={addEntry}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <FiPlus className="w-4 h-4" />
                Přidat záznam
              </button>
            </div>

            {entries.map((entry, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Projekt
                  </label>
                  <select
                    value={entry.projectId}
                    onChange={(e) => updateEntry(index, 'projectId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Vyber projekt</option>
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
                    Role
                  </label>
                  <select
                    value={entry.role}
                    onChange={(e) => updateEntry(index, 'role', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Vyber roli</option>
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
                    Hodiny
                  </label>
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={entry.hours}
                    onChange={(e) => updateEntry(index, 'hours', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.0"
                    required
                  />
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
                    Popis práce
                  </label>
                  <input
                    type="text"
                    value={entry.description}
                    onChange={(e) => updateEntry(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Co jste dělali?"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Hours */}
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Celkem hodin:
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
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isSubmitting || entries.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Ukládám...
                </>
              ) : (
                <>
                  <FiFileText className="w-4 h-4" />
                  Uložit výkaz
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
