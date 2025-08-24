'use client';
/**
 * Sdílená komponenta pro zobrazení dashboardu scopů
 * - Používá se na hlavní stránce i na /scopes/ stránce
 * - Obsahuje search, filtrování a akce s scopy
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ScopeList } from "@/app/components/scope/ScopeList";
import { ContainerService } from "@/lib/container.service";
import { DeleteScopeService } from "@/lib/domain/services/delete-scope.service";
import { GetAccessibleScopesService } from "@/lib/domain/services/get-accessible-scopes.service";
import { User } from "@/lib/domain/models/user.model";
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";
import { Scope } from "@/lib/domain/models/scope.model";
import { handleErrorMessage } from "@/lib/utils";
import { useTranslation } from "@/lib/translation";

interface ScopesDashboardProps {
  user: User;
  initialQuery?: string;
  searchId?: string;
}

export function ScopesDashboard({ user, initialQuery = "", searchId = "scopes-search" }: ScopesDashboardProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [sortBy] = useState<'createdAt' | 'name'>('createdAt');

  // URL query persistence for home page
  useEffect(() => {
    if (searchId === "home-search") {
      try {
        const url = new URL(window.location.href);
        if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
        window.history.replaceState({}, '', url.toString());
        localStorage.setItem('home:q', query);
      } catch {}
    }
  }, [query, searchId]);

  const fetchScopes = useCallback(async () => {
    setFetching(true);

    const scopes = await ContainerService.getInstance()
      .get(GetAccessibleScopesService, { autobind: true })
      .getAccessibleScopes(user);

    setScopes(scopes);
    setFetching(false);
  }, [user]);

  useEffect(() => {
    fetchScopes();
  }, [fetchScopes]);

  const handleDeleteScope = async (scopeId: string) => {
    setError(null);
    if (!confirm('Opravdu chcete tento scope nenávratně smazat včetně všech dat?')) return;
    const deleteScopeService = ContainerService.getInstance().get(DeleteScopeService, { autobind: true });

    try {
      await deleteScopeService.deleteScope(scopeId);
      await fetchScopes();
    } catch (err: unknown) {
      const message = handleErrorMessage(err);
      setError('Chyba při mazání scope: ' + message);
      console.error('Mazání scope selhalo:', err);
    }
  };

  // Předpočítej filtrovaný/řazený seznam (stabilní pořadí hooků)
  const filteredScopes = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? scopes.filter((s) => [s.name, s.description || ""].some((v) => v.toLowerCase().includes(q)))
      : scopes.slice();
    base.sort((a, b) => (sortBy === 'name' ? a.name.localeCompare(b.name) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    return base;
  }, [scopes, query, sortBy]);

  const handleRemoveScope = async (scopeId: string) => {
    setError(null);
    if (!user?.email) return;
    const scopeEditorRepository = ContainerService.getInstance().get(ScopeEditorRepository);
    try {
      await scopeEditorRepository.deleteByScopeId({ scopeId: scopeId });
      await fetchScopes();
    } catch (err: unknown) {
      const message = handleErrorMessage(err);
      setError('Chyba při odebírání scope: ' + message);
      console.error('Odebírání scope selhalo:', err);
    }
  };

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {t("your_scopes")}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {t("track_progress_and_manage_resources")}
                </p>
              </div>
              <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch md:items-center">
                <div className="relative flex-1 min-w-[220px] sticky top-2 z-10">
                  <input
                    id={searchId}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("search_scopes")}
                    aria-label={t("search")}
                    className="w-full bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl pl-10 pr-3 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
                </div>
                <button
                  onClick={() => router.push('/scopes/new')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg font-medium"
                >
                  {t("create_new_scope")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scopes List */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          <ScopeList
            scopes={filteredScopes}
            user={user}
            loading={fetching}
            error={error}
            onDelete={handleDeleteScope}
            onRemove={handleRemoveScope}
            highlightQuery={query}
          />
        </div>
      </div>
    </div>
  );
}