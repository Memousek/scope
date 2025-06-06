'use client';
/**
 * Stránka pro seznam scopů
 * - Přístupná pouze přihlášeným uživatelům
 * - Zobrazí seznam všech scopů z Supabase
 * - Odkaz na vytvoření nového scope
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<null | { email: string }>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user && data.user.email ? { email: data.user.email } : null);
      setUserId(data.user?.id || null);
      setLoading(false);
    });
  }, []);

  return { loading, user, userId };
};

type ScopeListItem = { id: string; name: string; owner_id: string; type: 'owned' | 'shared' };

export default function ScopesListPage() {
  const { loading, user, userId } = useAuth();
  const router = useRouter();
  const [scopes, setScopes] = useState<ScopeListItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  const fetchScopes = async () => {
    setFetching(true);
    const supabase = createClient();
    const [owned, shared] = await Promise.all([
      supabase.from('scopes').select('id, name, owner_id').eq('owner_id', userId),
      supabase.from('scope_editors').select('scope_id, user_id, email').or(`user_id.eq.${userId},email.eq.${user?.email}`)
    ]);
    let scopes: ScopeListItem[] = [];
    if (owned.data) scopes = owned.data.map((s: any) => ({ ...s, type: 'owned' }));
    if (shared.data && shared.data.length > 0) {
      const ids = shared.data.map((e: { scope_id: string }) => e.scope_id);
      if (ids.length > 0) {
        const { data: sharedScopes } = await supabase.from('scopes').select('id, name, owner_id').in('id', ids);
        if (sharedScopes) scopes = scopes.concat(sharedScopes.map((s: any) => ({ ...s, type: 'shared' })));
      }
    }
    // Odstraním duplicity podle id
    const unique = Array.from(new Map(scopes.map(s => [s.id, s])).values());
    setScopes(unique);
    setFetching(false);
  };

  useEffect(() => {
    if (!loading && userId && user) {
      fetchScopes();
    }
  }, [loading, userId, user]);

  const handleDeleteScope = async (scopeId: string) => {
    setError(null);
    if (!confirm('Opravdu chcete tento scope nenávratně smazat včetně všech dat?')) return;
    const supabase = createClient();
    try {
      // Smažu navázané projekty a jejich progress
      const { data: projects, error: projErr } = await supabase.from('projects').select('id').eq('scope_id', scopeId);
      if (projErr) throw projErr;
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p: { id: string }) => p.id);
        const { error: progErr } = await supabase.from('project_progress').delete().in('project_id', projectIds);
        if (progErr) throw progErr;
        const { error: delProjErr } = await supabase.from('projects').delete().in('id', projectIds);
        if (delProjErr) throw delProjErr;
      }
      const { error: tmErr } = await supabase.from('team_members').delete().eq('scope_id', scopeId);
      if (tmErr) throw tmErr;
      const { error: edErr } = await supabase.from('scope_editors').delete().eq('scope_id', scopeId);
      if (edErr) throw edErr;
      const { error: scErr } = await supabase.from('scopes').delete().eq('id', scopeId);
      if (scErr) throw scErr;
      await fetchScopes();
    } catch (err: any) {
      setError('Chyba při mazání scope: ' + (err?.message || err?.toString() || 'Neznámá chyba.'));
      console.error('Mazání scope selhalo:', err);
    }
  };

  const handleRemoveScope = async (scopeId: string) => {
    setError(null);
    if (!userId && !user?.email) return;
    const supabase = createClient();
    try {
      const { error } = await supabase.from('scope_editors')
        .delete()
        .eq('scope_id', scopeId)
        .or(`user_id.eq.${userId},email.eq.${user?.email}`);
      if (error) throw error;
      await fetchScopes();
    } catch (err: any) {
      setError('Chyba při odebírání scope: ' + (err?.message || err?.toString() || 'Neznámá chyba.'));
      console.error('Odebírání scope selhalo:', err);
    }
  };

  if (loading || !user) {
    return <div>Načítání…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-lg shadow mt-8">
      <h1 className="text-2xl font-bold mb-4">Seznam scopů</h1>
      <div className="mb-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => router.push('/scopes/new')}
        >
          Vytvořit nový scope
        </button>
      </div>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {fetching ? (
        <div>Načítám scopy…</div>
      ) : (
        <ul>
          {scopes.length === 0 && <li className="text-gray-500">Žádné scopy</li>}
          {scopes.map(scope => (
            <li key={scope.id} className="mb-2 flex items-center gap-2">
              <a
                href={`/scopes/${scope.id}`}
                className="text-blue-600 underline hover:text-blue-800 flex-1"
              >
                {scope.name}
              </a>
              {scope.type === 'owned' ? (
                <button
                  className="text-red-600 hover:underline text-xs px-2 py-1 rounded"
                  onClick={() => handleDeleteScope(scope.id)}
                  title="Smazat scope"
                >
                  Smazat
                </button>
              ) : (
                <button
                  className="text-gray-500 hover:underline text-xs px-2 py-1 rounded"
                  onClick={() => handleRemoveScope(scope.id)}
                  title="Odebrat scope ze seznamu"
                >
                  Odebrat
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 