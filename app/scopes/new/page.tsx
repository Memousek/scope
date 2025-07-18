'use client';
/**
 * Stránka pro vytvoření nového scope
 * - Přístupná pouze přihlášeným uživatelům
 * - Umožní zadat název nového scope a uloží ho do Supabase
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContainerService } from "@/lib/container.service";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";
import { User } from "@/lib/domain/models/user.model";
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/translation';
import Link from 'next/link';

const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<null | User>(null);

  useEffect(() => {
    ContainerService.getInstance().get(UserRepository).getLoggedInUser().then((user) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  return {loading, user};
};

export default function NewScopePage() {
  const {loading, user} = useAuth();
  const router = useRouter();
  const [newScope, setNewScope] = useState({name: '', description: ''});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user === null) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const scopeRepository = ContainerService.getInstance().get(ScopeRepository);

    try {
      const scope = await scopeRepository.create({
        name: newScope.name,
        description: newScope.description,
        ownerId: user!.id,
      });

      router.push(`/scopes/${scope.id}`);
    } catch {
      setError('Nepodařilo se vytvořit scope.')
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) {
    return <div>Načítání…</div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
    <Link href="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 flex items-center gap-2 self-start p-4">
        <ArrowLeft className="w-5 h-5" />
        {t('back')}
      </Link>
    <div className="p-6 rounded-lg shadow mt-8 bg-white dark:bg-gray-800 max-w-lg mx-auto w-full">

      <h1 className="text-2xl font-bold mb-4 text-center">Nový Scope</h1>
      <form className="flex flex-col gap-4" onSubmit={handleCreate}>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Název scope</label>
          <input
            className="border rounded px-3 py-2 w-full focus:outline-blue-400"
            placeholder="Název scope"
            value={newScope.name}
            onChange={e => setNewScope(s => ({...s, name: e.target.value}))}
            required
            disabled={saving}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700">Popis (volitelné)</label>
          <textarea
            className="border rounded px-3 py-2 w-full min-h-[60px] focus:outline-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="Popis scope..."
            value={newScope.description}
            onChange={e => setNewScope(s => ({...s, description: e.target.value}))}
            disabled={saving}
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
          type="submit"
          disabled={saving || !newScope.name.trim()}
        >
          Vytvořit scope
        </button>
      </form>
    </div>
    </div>
  );
} 