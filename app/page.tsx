'use client';

import { Header } from "@/components/header";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ScopeList, ScopeListItem } from "@/app/components/scope/ScopeList";

type ScopeListItem = { id: string; name: string; owner_id: string; type: 'owned' | 'shared' };

export default function Home() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [scopes, setScopes] = useState<ScopeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user && data.user.email ? { email: data.user.email } : null);
      setUserId(data.user?.id || null);
      setLoading(false);
    });
  }, []);

  const fetchScopes = async () => {
    if (!userId || !user) return;
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
    const unique = Array.from(new Map(scopes.map(s => [s.id, s])).values());
    setScopes(unique);
  };

  useEffect(() => {
    if (userId && user) {
      fetchScopes();
    }
  }, [userId, user]);

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Načítání...</div>;
  }

  if (user) {
    return (
      <main className="min-h-screen flex flex-col items-center">
        <div className="flex-1 w-full flex flex-col gap-20 items-center">
          <Header />
          <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Vaše scopy</h1>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                onClick={() => router.push('/scopes/new')}
              >
                Vytvořit nový scope
              </button>
            </div>
            <ScopeList
              scopes={scopes}
              loading={loading}
              error={error}
              onDelete={handleDeleteScope}
              onRemove={handleRemoveScope}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <Header />
      <div className="flex-1 w-full flex flex-col items-center">
        <section className="w-full max-w-7xl px-4 py-20 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl font-bold mb-6"
          >
            Scope Burndown
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
          >
            Sledujte průběh vašich projektů a efektivně spravujte zdroje týmu
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link
              href="/auth/login"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
            >
              Přihlásit se
            </Link>
          </motion.div>
        </section>

        <section className="w-full bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <h3 className="text-xl font-semibold mb-4">Sledování průběhu</h3>
                <p className="text-gray-600">
                  Vizuální přehled o průběhu projektů a využití zdrojů týmu
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <h3 className="text-xl font-semibold mb-4">Sdílení s týmem</h3>
                <p className="text-gray-600">
                  Spolupracujte s kolegy a sdílejte přehledy o projektech
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-lg shadow-lg"
              >
                <h3 className="text-xl font-semibold mb-4">Export dat</h3>
                <p className="text-gray-600">
                  Exportujte data do CSV pro další analýzu a reporting
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
