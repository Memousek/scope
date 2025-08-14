/**
 * JiraImportModal
 * Umožní natažení worklogů z Jiry podle JQL/období, mapuje je na členy a uloží jako JSON timesheets.
 */

import React, { useMemo, useState } from 'react';
import { Modal } from '@/app/components/ui/Modal';
import { useTranslation } from '@/lib/translation';
import { TeamMember, TimesheetEntry } from './types';
import { TeamService } from '@/app/services/teamService';

interface JiraImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamMember[];
  scopeId: string;
  defaultProjectKey?: string;
}

export function JiraImportModal({ isOpen, onClose, team, scopeId, defaultProjectKey }: JiraImportModalProps) {
  const { t } = useTranslation();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [projectKey, setProjectKey] = useState<string>(defaultProjectKey || '');
  const [jql, setJql] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<number>(0);
  const [debug, setDebug] = useState<boolean>(false);
  type JiraWorklog = { date: string; authorEmail?: string; issueKey: string; projectKey?: string; hours: number; comment?: string };
  type Preview = { baseJql: string; from: string; to: string; sample: JiraWorklog[] } | { error: string };
  const [lastPreview, setLastPreview] = useState<Preview | null>(null);

  const memberIndex = useMemo(() => {
    // Mapování podle jména (fallback). Ideálně doplnit accountId/email v budoucnu.
    const map = new Map<string, TeamMember>();
    team.forEach((m) => map.set(m.name.toLowerCase(), m));
    return map;
  }, [team]);

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

  const runImport = async (): Promise<void> => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    setImported(0);
    try {
      const baseJql = jql || (projectKey ? `project = ${projectKey}` : '');
      const res = await fetch('/api/jira/worklogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeId, jql: baseJql, from, to })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Jira API error');
      const worklogs = (json?.worklogs || []) as JiraWorklog[];
      if (debug) setLastPreview({ baseJql, from, to, sample: worklogs.slice(0, 5) });
      if (worklogs.length === 0) return;

      const grouped = new Map<string, TimesheetEntry[]>();
      for (const w of worklogs) {
        // Heuristika: páruj podle prefixu emailu vs. name (lowercase)
        const emailPrefix = (w.authorEmail?.split('@')[0] || '').toLowerCase();
        const candidate = emailPrefix ? team.find((m) => m.name && m.name.toLowerCase() === emailPrefix) : undefined;
        const member = candidate ?? (emailPrefix ? memberIndex.get(emailPrefix) : undefined);
        if (!member) continue;
        const arr = grouped.get(member.id) || [];
        arr.push({ date: w.date, project: w.projectKey || w.issueKey, hours: w.hours, note: w.comment, externalId: w.issueKey });
        grouped.set(member.id, arr);
      }

      let count = 0;
      for (const [memberId, entries] of grouped.entries()) {
        const m = team.find((x) => x.id === memberId);
        if (!m) continue;
        const merged = upsertTimesheets(m.timesheets, entries);
        await TeamService.updateTeamMember(memberId, { timesheets: merged } as Partial<TeamMember>);
        count += entries.length;
      }
      setImported(count);
    } catch (e) {
      setError('Import failed');
      if (debug) setLastPreview({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('jiraImport')} description={t('jiraImportDescription')}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input id="debug" type="checkbox" checked={debug} onChange={(e)=>setDebug(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="debug" className="text-sm">Debug mód</label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">{t('from')}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800" />
          </div>
          <div>
            <label className="block text-sm mb-1">{t('to')}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800" />
          </div>
          <div>
            <label className="block text-sm mb-1">JQL / {t('project')}</label>
            <input type="text" placeholder={`project = ${defaultProjectKey || 'KEY'}`} value={jql} onChange={(e) => setJql(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800" />
            <div className="text-xs text-gray-500 mt-1">{t('orProjectKey')}:</div>
            <input type="text" value={projectKey} onChange={(e) => setProjectKey(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 mt-1" />
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}
        {imported > 0 && <div className="text-emerald-600 text-sm">{t('importedRows')}: {imported}</div>}
        {debug && lastPreview && (
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-60">{JSON.stringify(lastPreview, null, 2)}</pre>
        )}

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg bg-gray-500 text-white" onClick={onClose}>{t('close')}</button>
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50" disabled={loading || (!from || !to)} onClick={runImport}>{t('import')}</button>
        </div>
      </div>
    </Modal>
  );
}


