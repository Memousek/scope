'use client';
/**
 * Stránka pro seznam scopů
 * - Přístupná pouze přihlášeným uživatelům
 * - Zobrazí seznam všech scopů z Supabase
 * - Odkaz na vytvoření nového scope
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ScopeList } from "@/app/components/scope/ScopeList";
import { ContainerService } from "@/lib/container.service";
import { DeleteScopeService } from "@/lib/domain/services/delete-scope.service";
import { GetAccessibleScopesService } from "@/lib/domain/services/get-accessible-scopes.service";
import { User } from "@/lib/domain/models/user.model";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";
import { Scope } from "@/lib/domain/models/scope.model";
import { handleErrorMessage } from "@/lib/utils";
import { ConditionalHeader } from "@/components/conditional-header";

const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userRepository = ContainerService.getInstance().get(UserRepository)
    userRepository.getLoggedInUser().then((user) => {
      setUser(user);
    }).catch(() => {
      setUser(null);
    }).finally(() => {
      setLoading(false);
    })
  }, []);

  return { loading, user };
};
export default function ScopesListPage() {
  const { loading, user } = useAuth();
  const router = useRouter();
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy] = useState<'createdAt' | 'name'>('createdAt');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  const fetchScopes = useCallback(async () => {
    setFetching(true);

    const scopes = await ContainerService.getInstance()
      .get(GetAccessibleScopesService, { autobind: true })
      .getAccessibleScopes(user!);

    setScopes(scopes);
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (!loading && user) {
      fetchScopes();
    }
  }, [loading, user, fetchScopes]);

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

  if (loading || !user) {
    return (
      <>
        <ConditionalHeader />
        <div className="flex items-center justify-center">Načítání…</div>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Vaše scopy</h1>
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1 min-w-[220px] sticky top-2 z-10">
                <input
                  id="scopes-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Hledat scopy..."
                  aria-label="Hledat"
                  className="w-full bg-white/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 rounded-xl pl-10 pr-3 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
              </div>
              <button
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl text-base font-semibold hover:from-blue-700 hover:to-purple-700 transition"
                onClick={() => router.push('/scopes/new')}
              >
                Vytvořit nový scope
              </button>
            </div>
          </div>

          <ScopeList
            scopes={filteredScopes}
            user={user}
            loading={fetching}
            error={error}
            onDelete={handleDeleteScope}
            onRemove={handleRemoveScope}
          />
        </div>
      </div>
    </div>
  );
} 