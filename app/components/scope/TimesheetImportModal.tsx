/**
 * TimesheetImportModal
 * Importuje CSV výkazy a ukládá je jako JSON do `timesheets` u vybraného člena týmu.
 * - Mapování sloupců
 * - Náhled prvních řádků a validace
 * - Upsert dle kombinace (date, project, role, externalId)
 */

import React, { useMemo, useRef, useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { useTranslation } from '@/lib/translation';
import { TimesheetEntry, TeamMember } from './types';
import { TeamService } from '@/app/services/teamService';
import { FiFilePlus } from 'react-icons/fi';

interface TimesheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMember | null;
}

type Row = Record<string, string>;

const parseCsv = async (file: File): Promise<Row[]> => {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const cells = l.split(',');
    const row: Row = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    return row;
  });
};

export function TimesheetImportModal({ isOpen, onClose, member }: TimesheetImportModalProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapping, setMapping] = useState({
    date: 'date',
    project: 'project',
    role: 'role',
    hours: 'hours',
    note: 'note',
    externalId: 'external_id',
  });

  const headers = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseCsv(file);
      setRows(parsed);
    } catch {
      setError('CSV parse error');
    }
  };

  const buildEntries = (): TimesheetEntry[] => {
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    const result: TimesheetEntry[] = [];
    for (const r of rows) {
      const date = r[mapping.date]?.trim();
      const hoursStr = r[mapping.hours]?.trim();
      if (!date || !iso.test(date)) continue;
      const hours = Number(hoursStr);
      if (!Number.isFinite(hours) || hours <= 0) continue;
      result.push({
        date,
        project: r[mapping.project]?.trim() || undefined,
        role: r[mapping.role]?.trim() || undefined,
        hours,
        note: r[mapping.note]?.trim() || undefined,
        externalId: r[mapping.externalId]?.trim() || undefined,
      });
    }
    return result;
  };

  const upsertTimesheets = (existing: TimesheetEntry[] | undefined, incoming: TimesheetEntry[]): TimesheetEntry[] => {
    const existingMap = new Map<string, TimesheetEntry>();
    (existing || []).forEach((e) => {
      const key = `${e.date}|${e.project ?? ''}|${e.role ?? ''}|${e.externalId ?? ''}`;
      existingMap.set(key, e);
    });
    for (const e of incoming) {
      const key = `${e.date}|${e.project ?? ''}|${e.role ?? ''}|${e.externalId ?? ''}`;
      existingMap.set(key, e);
    }
    return Array.from(existingMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    try {
      const entries = buildEntries();
      const merged = upsertTimesheets(member.timesheets, entries);
      await TeamService.updateTeamMember(member.id, { timesheets: merged } as Partial<TeamMember>);
      onClose();
    } catch {
      setError('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('importTimesheets')}
      description={t('importTimesheetsDescription')}
      icon={<FiFilePlus className="w-5 h-5" />}
    >
      <div className="space-y-4">
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="block w-full" />

        {headers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(mapping).map(([k, v]) => (
              <div key={k}>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{k}</label>
                <select value={v} onChange={(e) => setMapping({ ...mapping, [k]: e.target.value })} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800">
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-lg border p-3 bg-white/60 dark:bg-gray-800/60">
            <div className="text-sm mb-2">{t('preview')} ({Math.min(rows.length, 5)} / {rows.length})</div>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(rows.slice(0, 5), null, 2)}</pre>
          </div>
        )}

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-500 text-white" onClick={onClose}>{t('cancel')}</button>
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={saving || rows.length === 0} onClick={handleSave}>{t('import')}</button>
        </div>
      </div>
    </Modal>
  );
}


