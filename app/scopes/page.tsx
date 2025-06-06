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

export default function ScopesListPage() {
  const { loading, user, userId } = useAuth();
  const router = useRouter();
  const [scopes, setScopes] = useState<{ id: string; name: string }[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && userId && user) {
      setFetching(true);
      const supabase = createClient();
      Promise.all([
        supabase.from('scopes').select('id, name').eq('owner_id', userId),
        supabase.from('scope_editors').select('scope_id, user_id, email').or(`user_id.eq.${userId},email.eq.${user.email}`)
      ]).then(async ([owned, shared]) => {
        let scopes: { id: string; name: string }[] = [];
        if (owned.data) scopes = owned.data;
        if (shared.data && shared.data.length > 0) {
          const ids = shared.data.map((e: { scope_id: string }) => e.scope_id);
          if (ids.length > 0) {
            const { data: sharedScopes } = await supabase.from('scopes').select('id, name').in('id', ids);
            if (sharedScopes) scopes = scopes.concat(sharedScopes);
          }
        }
        // Odstraním duplicity podle id
        const unique = Array.from(new Map(scopes.map(s => [s.id, s])).values());
        setScopes(unique);
        setFetching(false);
      });
    }
  }, [loading, userId, user]);

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
      {fetching ? (
        <div>Načítám scopy…</div>
      ) : (
        <ul>
          {scopes.length === 0 && <li className="text-gray-500">Žádné scopy</li>}
          {scopes.map(scope => (
            <li key={scope.id} className="mb-2">
              <a
                href={`/scopes/${scope.id}`}
                className="text-blue-600 underline hover:text-blue-800"
              >
                {scope.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 