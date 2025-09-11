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
import { ScopeService } from '@/app/services/scopeService';
import { FiCalendar, FiSettings, FiTrash2 } from 'react-icons/fi';

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
  // Scope basic info
  const [scopeName, setScopeName] = useState<string>('');
  const [scopeDescription, setScopeDescription] = useState<string>('');
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [includeHolidays, setIncludeHolidays] = useState<boolean>(true);
  const [holidayCountry, setHolidayCountry] = useState<string>('CZ');
  const [holidaySubdivision, setHolidaySubdivision] = useState<string>('');
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Nejčastější země pro rychlý výběr (můžeme rozšířit podle potřeby)
  const countryOptions: Array<{ code: string; label: string }> = [
    { code: 'CZ', label: 'Česko (CZ)' },
    { code: 'SK', label: 'Slovensko (SK)' },
    { code: 'PL', label: 'Polsko (PL)' },
    { code: 'DE', label: 'Německo (DE)' },
    { code: 'AT', label: 'Rakousko (AT)' },
    { code: 'HU', label: 'Maďarsko (HU)' },
    { code: 'GB', label: 'Velká Británie (GB)' },
    { code: 'US', label: 'USA (US)' },
    { code: 'CA', label: 'Kanada (CA)' },
    { code: 'FR', label: 'Francie (FR)' },
    { code: 'ES', label: 'Španělsko (ES)' },
    { code: 'IT', label: 'Itálie (IT)' },
    { code: 'NL', label: 'Nizozemsko (NL)' },
    { code: 'BE', label: 'Belgie (BE)' },
    { code: 'SE', label: 'Švédsko (SE)' },
    { code: 'NO', label: 'Norsko (NO)' },
    { code: 'FI', label: 'Finsko (FI)' },
    { code: 'DK', label: 'Dánsko (DK)' },
    { code: 'PT', label: 'Portugalsko (PT)' },
  ];

  useEffect(() => {
    (async () => {
      // Load scope basic info
      try {
        const scope = await ScopeService.loadScope(scopeId);
        if (scope) {
          setScopeName(scope.name || '');
          setScopeDescription(scope.description || '');
        }
      } catch {}

      const cfg = await ScopeSettingsService.get(scopeId);
      if (cfg) {
        if (cfg.jira) {
          setJiraBaseUrl(cfg.jira.baseUrl || '');
          setJiraEmail(cfg.jira.email || '');
          setJiraApiToken(cfg.jira.apiToken || '');
        }
        setDebugEnabled(Boolean(cfg.debug?.enabled));
        const include = typeof cfg.calendar?.includeHolidays === 'boolean'
          ? cfg.calendar?.includeHolidays
          : (cfg.calendar?.includeCzechHolidays ?? true);
        setIncludeHolidays(include);
        setHolidayCountry(cfg.calendar?.country || 'CZ');
        setHolidaySubdivision(cfg.calendar?.subdivision || '');
        try { sessionStorage.setItem(`scope:${scopeId}:integrations-cache`, JSON.stringify({ jiraBaseUrl: cfg.jira?.baseUrl, jiraEmail: cfg.jira?.email, jiraApiToken: cfg.jira?.apiToken, debugEnabled: Boolean(cfg.debug?.enabled), includeHolidays: include, holidayCountry: cfg.calendar?.country || 'CZ', holidaySubdivision: cfg.calendar?.subdivision || '' })); } catch {}
      }
    })();
  }, [scopeId]);

  const save = async () => {
    setError(null);
    // Basic validation
    const nextFieldErrors: Record<string, string> = {};
    if (!scopeName.trim()) {
      nextFieldErrors.scopeName = t('required');
    }
    if (jiraBaseUrl && !/^https?:\/\//i.test(jiraBaseUrl)) {
      nextFieldErrors.jiraBaseUrl = 'URL musí začínat http(s)://';
    }
    if (holidayCountry && holidayCountry.length !== 2) {
      nextFieldErrors.holidayCountry = 'Použijte 2-písmenný ISO kód (např. CZ, DE, US)';
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    try {
      // Save basic scope info
      await ScopeService.updateScopeName(scopeId, scopeName);
      await ScopeService.updateScopeDescription(scopeId, scopeDescription);

      await ScopeSettingsService.upsert(scopeId, { jira: { baseUrl: jiraBaseUrl, email: jiraEmail, apiToken: jiraApiToken }, debug: { enabled: debugEnabled }, calendar: { includeHolidays, country: holidayCountry, subdivision: holidaySubdivision || null } });
      try { sessionStorage.setItem(`scope:${scopeId}:integrations-cache`, JSON.stringify({ jiraBaseUrl, jiraEmail, jiraApiToken, debugEnabled, includeHolidays, holidayCountry, holidaySubdivision })); } catch {}
      // Notifikuj ostatní části aplikace o změně kalendáře (pro přepočty)
      try {
        window.dispatchEvent(new CustomEvent('scope-calendar-changed', { detail: { scopeId, includeHolidays, country: holidayCountry, subdivision: holidaySubdivision || '' } }));
      } catch {}
      setSaved(t('saved'));
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      console.error('Failed to save scope settings', e);
      const message = typeof e === 'object' && e && 'message' in (e as Record<string, unknown>) ? String((e as Record<string, unknown>).message) : 'Failed to save settings';
      setError(message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Basic info Section */}
        <section className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-2xl"></div>
          </div>
          <header className="relative z-10 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-lg"><FiSettings /></div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('edit')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('addScopeDescription')}</p>
            </div>
          </header>
          <div className="relative z-10 grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('projectName')}</label>
              <input value={scopeName} onChange={(e)=>setScopeName(e.target.value)} className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 ${fieldErrors.scopeName ? 'border-red-500' : ''}`} placeholder={t('projectName')} />
              {fieldErrors.scopeName && <div className="mt-1 text-xs text-red-600">{fieldErrors.scopeName}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('description')}</label>
              <textarea value={scopeDescription} onChange={(e)=>setScopeDescription(e.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" placeholder={t('addScopeDescription')}></textarea>
            </div>
          </div>
        </section>
        <section className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
          </div>
          <header className="relative z-10 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center shadow-lg"><FiSettings /></div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('scopeSettings.jira')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('scopeSettings.jiraHint')}</p>
            </div>
          </header>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">{t('scopeSettings.baseUrl')}</label>
              <input aria-invalid={!!fieldErrors.jiraBaseUrl} aria-describedby={fieldErrors.jiraBaseUrl ? 'jira-baseurl-err' : undefined} value={jiraBaseUrl} onChange={(e) => setJiraBaseUrl(e.target.value)} placeholder="https://your-domain.atlassian.net" className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 ${fieldErrors.jiraBaseUrl ? 'border-red-500' : ''}`} />
              {fieldErrors.jiraBaseUrl && <div id="jira-baseurl-err" className="mt-1 text-xs text-red-600">{fieldErrors.jiraBaseUrl}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('scopeSettings.email')}</label>
              <input value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" placeholder="your@email.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">{t('scopeSettings.apiToken')}</label>
              <input type="password" value={jiraApiToken} onChange={(e) => setJiraApiToken(e.target.value)} className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" placeholder="********" />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('scopeSettings.apiTokenHint')}</p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-2 mt-4">
            <button onClick={() => { setJiraBaseUrl(''); setJiraEmail(''); setJiraApiToken(''); }} className="px-3 py-1.5 rounded-lg border text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2">
              <FiTrash2 className="opacity-70" /> {t('scopeSettings.clearJira')}
            </button>
          </div>
        </section>

        <section className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/10 to-teal-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-emerald-400/10 to-blue-400/10 rounded-full blur-2xl"></div>
          </div>
          <header className="relative z-10 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg"><FiCalendar /></div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('scopeSettings.calendar')}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('scopeSettings.calendarHint')}</p>
            </div>
          </header>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="flex items-center gap-2">
              <input id="includeHolidays" type="checkbox" checked={includeHolidays} onChange={(e)=>setIncludeHolidays(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="includeHolidays" className="text-sm">{t('scopeSettings.includeHolidays')}</label>
            </div>
            <div>
              <label className="block text-sm mb-1">{t('scopeSettings.country')}</label>
              <select
                value={holidayCountry}
                onChange={(e) => setHolidayCountry(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 ${fieldErrors.holidayCountry ? 'border-red-500' : ''}`}
                aria-invalid={!!fieldErrors.holidayCountry}
                aria-describedby={fieldErrors.holidayCountry ? 'holiday-country-err' : undefined}
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              {fieldErrors.holidayCountry && <div id="holiday-country-err" className="mt-1 text-xs text-red-600">{fieldErrors.holidayCountry}</div>}
            </div>
            <div>
              <label className="block text-sm mb-1">{t('scopeSettings.regionOptional')}</label>
              <input value={holidaySubdivision} onChange={(e)=>setHolidaySubdivision(e.target.value)} placeholder="např. CA/ON/NY…" className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900" />
            </div>
          </div>
        </section>
      </div>

      <section className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-6 shadow-2xl">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-pink-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
        </div>
        <header className="relative z-10 mb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg">
            <FiSettings className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('scopeSettings.advanced')}</h3>
        </header>
        <div className="relative z-10 flex items-center gap-2">
          <input id="debugEnabled" type="checkbox" checked={debugEnabled} onChange={(e)=>setDebugEnabled(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <label htmlFor="debugEnabled" className="text-sm">{t('scopeSettings.debugMode')}</label>
        </div>
        {saved && <div className="relative z-10 text-emerald-600 text-sm mt-3">{saved}</div>}
        {error && <div className="relative z-10 text-red-600 text-sm mt-3">{error}</div>}
        {debugEnabled && (
          <pre className="relative z-10 mt-3 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto">{JSON.stringify({ jiraBaseUrl, jiraEmail, jiraApiToken: jiraApiToken ? '***' : '', debugEnabled, includeHolidays, holidayCountry, holidaySubdivision }, null, 2)}</pre>
        )}
      </section>

      <div className="flex justify-end">
        <button onClick={save} className="relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white px-5 py-2.5 rounded-xl hover:scale-[1.02] transition-all duration-300 shadow-lg text-sm font-semibold">
          {t('save')}
        </button>
      </div>
    </div>
  );
}


