'use client';
/**
 * Stránka pro seznam scopů
 * - Přístupná pouze přihlášeným uživatelům
 * - Zobrazí seznam všech scopů z Supabase
 * - Odkaz na vytvoření nového scope
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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

  const fetchScopes = useCallback(async () => {
    setFetching(true);
    const supabase = createClient();
    const [owned, shared] = await Promise.all([
      supabase.from('scopes').select('id, name, owner_id').eq('owner_id', userId),
      supabase.from('scope_editors').select('scope_id, user_id, email').or(`user_id.eq.${userId},email.eq.${user?.email}`)
    ]);
    let scopes: ScopeListItem[] = [];
    if (owned.data) scopes = owned.data.map((s: { id: string; name: string; owner_id: string }) => ({ ...s, type: 'owned' }));
    if (shared.data && shared.data.length > 0) {
      const ids = shared.data.map((e: { scope_id: string }) => e.scope_id);
      if (ids.length > 0) {
        const { data: sharedScopes } = await supabase.from('scopes').select('id, name, owner_id').in('id', ids);
        if (sharedScopes) scopes = scopes.concat(sharedScopes.map((s: { id: string; name: string; owner_id: string }) => ({ ...s, type: 'shared' })));
      }
    }
    // Odstraním duplicity podle id
    const unique = Array.from(new Map(scopes.map(s => [s.id, s])).values());
    setScopes(unique);
    setFetching(false);
  }, [userId, user]);

  useEffect(() => {
    if (!loading && userId && user) {
      fetchScopes();
    }
  }, [loading, userId, user, fetchScopes]);

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
    } catch (err: unknown) {
      let message = 'Neznámá chyba.';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        message = (err as { message: string }).message;
      } else if (typeof err === 'string') {
        message = err;
      }
      setError('Chyba při mazání scope: ' + message);
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
    } catch (err: unknown) {
      let message = 'Neznámá chyba.';
      if (err && typeof err === 'object' && 'message' in err && typeof (err as { message?: string }).message === 'string') {
        message = (err as { message: string }).message;
      } else if (typeof err === 'string') {
        message = err;
      }
      setError('Chyba při odebírání scope: ' + message);
      console.error('Odebírání scope selhalo:', err);
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Načítání…</div>;
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Vaše scopy</h1>
            <button
              className="bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-blue-700 transition"
              onClick={() => router.push('/scopes/new')}
            >
              Vytvořit nový scope
            </button>
          </div>
          {error && <div className="text-red-600 mb-4">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <AnimatePresence>
              {fetching ? (
                <div className="col-span-full text-center text-gray-500 py-8">Načítám scopy…</div>
              ) : scopes.length === 0 ? (
                <motion.div
                  className="col-span-full text-center text-gray-500 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  Zatím nemáte žádné scopy. Vytvořte si nový scope pro sledování projektů.
                </motion.div>
              ) : (
                scopes.map((scope, idx) => (
                  <motion.div
                    key={scope.id}
                    initial={{ opacity: 0, scale: 0.95, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 30 }}
                    transition={{ duration: 0.3, delay: idx * 0.07 }}
                    className="bg-white rounded-2xl shadow-xl p-8 flex flex-col min-h-[200px] justify-between hover:shadow-2xl transition-shadow"
                  >
                    <div className="flex-1">
                      <Link
                        href={`/scopes/${scope.id}`}
                        className="text-2xl font-semibold mb-2 block hover:text-blue-600 transition-colors"
                      >
                        {scope.name}
                      </Link>
                      <span className="text-base text-gray-500 block mb-6">
                        {scope.type === 'owned' ? 'Vlastní scope' : 'Sdílený scope'}
                      </span>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      {scope.type === 'owned' ? (
                        <button
                          onClick={() => handleDeleteScope(scope.id)}
                          className="text-red-600 hover:text-red-700 text-base px-4 py-2 rounded border border-red-600 hover:border-red-700 transition-colors"
                        >
                          Smazat
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemoveScope(scope.id)}
                          className="text-gray-600 hover:text-gray-700 text-base px-4 py-2 rounded border border-gray-600 hover:border-gray-700 transition-colors"
                        >
                          Odebrat
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
} 