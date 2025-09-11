"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/translation';
import { ContainerService } from '@/lib/container.service';
import { UserRepository } from '@/lib/domain/repositories/user.repository';
import { createClient } from '@/lib/supabase/client';
import { Plan } from '@/lib/domain/models/plan.model';
import { ManageUserPlansService } from '@/lib/domain/services/manage-user-plans.service';
import { DomainPlanAssignmentRepository } from '@/lib/domain/repositories/domain-plan-assignment.repository';

export default function AdminPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  interface Assignment { id?: string; domain: string; planId: string; originalDomain?: string; planName?: string }
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // user lookup states
  const [userQuery, setUserQuery] = useState<string>('');
  const [userResults, setUserResults] = useState<Array<{ userId: string; email: string; planId: string | null }>>([]);
  const [userSearching, setUserSearching] = useState<boolean>(false);

  useEffect(() => {
    const check = async () => {
      try {
        const userRepo = ContainerService.getInstance().get(UserRepository);
        const user = await userRepo.getLoggedInUser();
        if (user?.additional?.role === 'god') {
          setAllowed(true);
        } else {
          router.replace('/');
        }
      } catch {
        router.replace('/');
      }
      setAuthChecked(true);
    };
    void check();
  }, [router]);

  // Load plans and domain assignments
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        // plans
        const managePlans = ContainerService.getInstance().get(ManageUserPlansService);
        const allPlans = await managePlans.getAvailablePlans();
        setPlans(allPlans);
        // assignments
        const domainPlanAssignmentRepository = ContainerService.getInstance().get(DomainPlanAssignmentRepository);
        const assignments = await domainPlanAssignmentRepository.findAll();
        const withNames = assignments.map((r) => ({ 
          id: r.id, 
          domain: r.domain, 
          planId: r.plan_id, 
          originalDomain: r.domain, 
          planName: allPlans.find(p=>p.id===r.plan_id)?.displayName || allPlans.find(p=>p.id===r.plan_id)?.name 
        }));
        setItems(withNames);
      } finally {
        setLoading(false);
      }
    };
    if (allowed) void load();
  }, [allowed]);

  const planOptions = useMemo(() => plans.map(p => ({ id: p.id, label: p.displayName || p.name })), [plans]);

  const addRow = () => setItems(prev => [...prev, { id: crypto.randomUUID(), domain: '', planId: plans[0]?.id || '' }]);
  const removeRow = async (id: string) => {
    const current = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    if (current?.domain) {
      const domainPlanAssignmentRepository = ContainerService.getInstance().get(DomainPlanAssignmentRepository);
      await domainPlanAssignmentRepository.delete(current.domain);
    }
  };

  // Persist just one row (so Apply now nemusí čekat na Save)
  const persistRow = async (row: { domain: string; planId: string; prevDomain?: string }) => {
    const domainPlanAssignmentRepository = ContainerService.getInstance().get(DomainPlanAssignmentRepository);
    const newDomain = row.domain.trim().toLowerCase();
    if (!newDomain) return;
    await domainPlanAssignmentRepository.upsert({ domain: newDomain, plan_id: row.planId });
    if (row.prevDomain && row.prevDomain !== newDomain) {
      await domainPlanAssignmentRepository.delete(row.prevDomain);
    }
  };

  // Debounced helpers for live persist
  const schedulePersist = (rowId: string, updater: () => Assignment | null) => {
    if (debounceRef.current[rowId]) clearTimeout(debounceRef.current[rowId]);
    debounceRef.current[rowId] = setTimeout(async () => {
      const next = updater();
      if (!next) return;
      await persistRow({ domain: next.domain, planId: next.planId, prevDomain: next.originalDomain });
    }, 400);
  };

  const applyAll = async () => {
    const supabase = createClient();
    const domainPlanAssignmentRepository = ContainerService.getInstance().get(DomainPlanAssignmentRepository);
    // Nejprve upsertni aktuální konfiguraci, aby se aplikovala čerstvá data bez kliku na Save
    const payload = items
      .filter(i => i.domain.trim() && i.planId)
      .map(i => ({ domain: i.domain.trim().toLowerCase(), plan_id: i.planId }));
    if (payload.length > 0) {
      for (const item of payload) {
        await domainPlanAssignmentRepository.upsert(item);
      }
    }
    const { data, error } = await supabase.rpc('apply_all_domain_plan_assignments');
    if (!error) alert(`Updated users: ${data ?? 0}`);
  };

  const applyForDomain = async (row: { domain: string; planId: string }) => {
    const supabase = createClient();
    await persistRow(row);
    const { data, error } = await supabase.rpc('apply_plan_for_domain', { p_domain: row.domain.trim().toLowerCase() });
    if (!error) alert(`Updated users: ${data ?? 0}`);
  };

  // User lookup – lazy, only on demand
  const searchUsers = async () => {
    if (!userQuery.trim()) return;
    setUserSearching(true);
    try {
      const supabase = createClient();
      const q = userQuery.trim();
      const { data, error } = await supabase.rpc('search_users', { p_query: q, p_limit: 10 } as { p_query: string; p_limit: number });
      if (error) throw error;
      type SearchRow = { user_id: string; email: string; plan_id: string | null };
      const rows = ((data || []) as SearchRow[]).map((r) => ({
        userId: r.user_id,
        email: r.email,
        planId: r.plan_id,
      }));
      setUserResults(rows);
    } finally {
      setUserSearching(false);
    }
  };

  const updateUserPlanInline = async (userId: string, planId: string | null) => {
    const userRepository = ContainerService.getInstance().get(UserRepository);
    // Note: This would need a method in UserRepository to update plan_id
    // For now, keeping the direct Supabase call as it's a specific admin operation
    const supabase = createClient();
    await supabase.from('user_meta').update({ plan_id: planId }).eq('user_id', userId);
    setUserResults(prev => prev.map(u => u.userId === userId ? { ...u, planId } : u));
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>
      <div className="space-y-6">
        {!allowed && (
          <div className="text-sm text-gray-500">{authChecked ? t('workInProgress') : '...'}</div>
        )}

        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold dark:text-white text-gray-900">Domain → Plan assignments</h2>
              <div className="flex items-center gap-2">
                <button onClick={addRow} className="px-3 py-2 rounded-lg bg-blue-600 text-white shadow hover:brightness-110">Add</button>
                <button onClick={applyAll} className="px-3 py-2 rounded-lg bg-purple-600 text-white shadow hover:brightness-110">Apply to all users</button>
              </div>
            </div>

            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : (
              <div className="space-y-3">
                {items.map((row) => (
                  <div key={row.id} className="group relative bg-white/70 dark:bg-gray-800/70 rounded-xl border border-white/40 dark:border-gray-700/50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <input
                      value={row.domain}
                      onChange={(e)=> {
                        const v = e.target.value;
                        setItems(prev=> prev.map(it=> it.id===row.id ? { ...it, domain: v } : it));
                        schedulePersist(String(row.id), () => {
                          const next = items.find(it=> it.id===row.id);
                          return next ? { ...next } : null;
                        });
                      }}
                      placeholder="example.com"
                      className="rounded-lg border px-3 py-2 bg-white dark:bg-gray-900"
                    />
                    <select
                    value={row.planId}
                    onChange={(e)=> {
                      const planId = e.target.value;
                      setItems(prev=> prev.map(it=> it.id===row.id ? { ...it, planId } : it));
                      schedulePersist(String(row.id), () => {
                        const next = items.find(it=> it.id===row.id);
                        return next ? { ...next } : null;
                      });
                    }}
                      className="rounded-lg border px-3 py-2 bg-white dark:bg-gray-900"
                    >
                      {planOptions.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button onClick={()=> applyForDomain({ domain: row.domain, planId: row.planId })} className="px-3 py-2 rounded-lg bg-indigo-600 text-white shadow hover:brightness-110">Apply now</button>
                      <button onClick={()=> removeRow(String(row.id))} className="px-3 py-2 rounded-lg bg-red-600 text-white shadow hover:brightness-110">Remove</button>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-sm text-gray-500">No assignments yet. Click Add to create one.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User plan lookup */}
      <div className="space-y-6 mt-6">
        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold dark:text-white text-gray-900">User plan lookup</h2>
            </div>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
              <input
                value={userQuery}
                onChange={(e)=> setUserQuery(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 rounded-lg border px-3 py-2 bg-white dark:bg-gray-900"
              />
              <button onClick={searchUsers} disabled={userSearching} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
                {userSearching ? 'Searching…' : 'Find'}
              </button>
            </div>

            {userResults.length > 0 && (
              <div className="space-y-2">
                {userResults.map((u) => (
                  <div key={u.userId} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-white/70 dark:bg-gray-800/70 rounded-xl border border-white/40 dark:border-gray-700/50 p-4">
                    <div className="text-sm text-gray-800 dark:text-gray-200 break-all">{u.email}</div>
                    <select
                      value={u.planId ?? ''}
                      onChange={(e)=> updateUserPlanInline(u.userId, e.target.value || null)}
                      className="rounded-lg border px-3 py-2 bg-white dark:bg-gray-900"
                    >
                      <option value="">No plan</option>
                      {planOptions.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                    <div className="text-xs text-gray-500">User ID: {u.userId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


