/**
 * ReportsModal
 * Základní přehled výkazů nad timesheets JSON u členů týmu.
 * - Filtry: datum od/do, projekt, člen
 * - Agregace hodin po projektu/členovi a celkem
 */

import React, { useMemo, useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { useTranslation } from '@/lib/translation';
import { TeamMember, TimesheetEntry } from './types';
import { FiBarChart2 } from 'react-icons/fi';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamMember[];
}

type Aggregation = {
  project: string;
  member: string;
  hours: number;
};

function inRange(date: string, from?: string, to?: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function ReportsModal({ isOpen, onClose, team }: ReportsModalProps) {
  const { t } = useTranslation();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [memberId, setMemberId] = useState<string>('');

  const rows = useMemo(() => {
    const result: Aggregation[] = [];
    const filteredTeam = memberId ? team.filter(m => m.id === memberId) : team;
    filteredTeam.forEach((m) => {
      (m.timesheets || []).forEach((e: TimesheetEntry) => {
        if (!inRange(e.date, from || undefined, to || undefined)) return;
        result.push({ project: e.project || '-', member: m.name, hours: e.hours });
      });
    });
    return result;
  }, [team, from, to, memberId]);

  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.project, (map.get(r.project) || 0) + r.hours));
    return Array.from(map.entries()).map(([project, hours]) => ({ project, hours }));
  }, [rows]);

  const byMember = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.member, (map.get(r.member) || 0) + r.hours));
    return Array.from(map.entries()).map(([member, hours]) => ({ member, hours }));
  }, [rows]);

  const total = useMemo(() => rows.reduce((s, r) => s + r.hours, 0), [rows]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('reports')} description={t('reportsDescription')} icon={<FiBarChart2 className="w-5 h-5" />}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{t('from')}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{t('to')}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">{t('teamMember')}</label>
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800">
              <option value="">{t('allRoles')}</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4 bg-white/70 dark:bg-gray-800/70">
            <div className="font-semibold mb-2">{t('hoursByProject')}</div>
            <ul className="space-y-1 text-sm">
              {byProject.map((r) => (
                <li key={r.project} className="flex justify-between"><span>{r.project}</span><span>{r.hours.toFixed(2)} h</span></li>
              ))}
              {byProject.length === 0 && <li className="text-gray-500">{t('noData')}</li>}
            </ul>
          </div>
          <div className="rounded-xl border p-4 bg-white/70 dark:bg-gray-800/70">
            <div className="font-semibold mb-2">{t('hoursByMember')}</div>
            <ul className="space-y-1 text-sm">
              {byMember.map((r) => (
                <li key={r.member} className="flex justify-between"><span>{r.member}</span><span>{r.hours.toFixed(2)} h</span></li>
              ))}
              {byMember.length === 0 && <li className="text-gray-500">{t('noData')}</li>}
            </ul>
          </div>
        </div>

        <div className="rounded-xl border p-4 bg-white/70 dark:bg-gray-800/70">
          <div className="font-semibold mb-2">{t('totalHours')}</div>
          <div className="text-2xl font-bold">{total.toFixed(2)} h</div>
        </div>
      </div>
    </Modal>
  );
}


