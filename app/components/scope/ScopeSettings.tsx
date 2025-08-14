"use client";
/**
 * ScopeSettings
 * Jednoduché nastavení pro scope (Jira API key + base URL) ukládané do localStorage (per scope),
 * aby bylo možné skrýt Jira funkce, dokud není vyplněno.
 * Bez úprav DB – klíče jsou citlivé, proto lokálně v prohlížeči (na přání je možné přes Supabase secrets).
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/translation';
import { ScopeSettingsService } from '@/app/services/scopeSettingsService';

interface Props { scopeId: string; }

export function getScopeIntegration(scopeId: string): { jiraBaseUrl?: string; jiraEmail?: string; jiraApiToken?: string } | null {
  // Pro jednoduché runtime čtení UI použijeme session cache; zdroj je DB (scopes.settings)
  try {
    const raw = sessionStorage.getItem(`scope:${scopeId}:integrations-cache`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function ScopeSettings({ scopeId }: Props) {
  const { t } = useTranslation();
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const cfg = await ScopeSettingsService.get(scopeId);
      if (cfg?.jira) {
        setJiraBaseUrl(cfg.jira.baseUrl || '');
        setJiraEmail(cfg.jira.email || '');
        setJiraApiToken(cfg.jira.apiToken || '');
        setDebugEnabled(Boolean(cfg.debug?.enabled));
        try { sessionStorage.setItem(`scope:${scopeId}:integrations-cache`, JSON.stringify({ jiraBaseUrl: cfg.jira.baseUrl, jiraEmail: cfg.jira.email, jiraApiToken: cfg.jira.apiToken, debugEnabled: Boolean(cfg.debug?.enabled) })); } catch {}
      }
    })();
  }, [scopeId]);

  const save = async () => {
    await ScopeSettingsService.upsert(scopeId, { jira: { baseUrl: jiraBaseUrl, email: jiraEmail, apiToken: jiraApiToken }, debug: { enabled: debugEnabled } });
    try { sessionStorage.setItem(`scope:${scopeId}:integrations-cache`, JSON.stringify({ jiraBaseUrl, jiraEmail, jiraApiToken, debugEnabled })); } catch {}
    setSaved(t('saved'));
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border">
        <div className="font-semibold mb-2">Jira</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Base URL</label>
            <input value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} placeholder="https://your-domain.atlassian.net" className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">API Token</label>
            <input type="password" value={jiraApiToken} onChange={(e) => setJiraApiToken(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input id="debugEnabled" type="checkbox" checked={debugEnabled} onChange={(e)=>setDebugEnabled(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="debugEnabled" className="text-sm">Debug mód</label>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={save} className="px-4 py-2 rounded-lg bg-blue-600 text-white">{t('save')}</button>
        </div>
        {saved && <div className="text-emerald-600 text-sm mt-2">{saved}</div>}
        {debugEnabled && (
          <pre className="mt-3 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded">{JSON.stringify({ jiraBaseUrl, jiraEmail, jiraApiToken: jiraApiToken ? '***' : '', debugEnabled }, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


