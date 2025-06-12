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
import { ScopeList } from "@/app/components/scope/ScopeList";
import {ContainerService} from "@/lib/container.service";
import {DeleteScopeService} from "@/lib/domain/services/delete-scope.service";

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
    const deleteScopeService = ContainerService.getInstance().get(DeleteScopeService, {autobind: true});

    try {
      await deleteScopeService.deleteScope(scopeId);
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
    <main className="min-h-screen flex flex-col items-center bg-gray-50 dark:bg-gray-900">
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
          <ScopeList
            scopes={scopes}
            loading={fetching}
            error={error}
            onDelete={handleDeleteScope}
            onRemove={handleRemoveScope}
          />
        </div>
      </div>
    </main>
  );
} 