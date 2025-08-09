'use client';
/**
 * Stránka pro vytvoření nového scope
 * - Moderní glass-like design s animacemi
 * - Responzivní layout s lepším UX
 * - Loading stavy a error handling
 * - Přístupná pouze přihlášeným uživatelům
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContainerService } from "@/lib/container.service";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";
import { User } from "@/lib/domain/models/user.model";
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/translation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ManageUserPlansService } from "@/lib/domain/services/manage-user-plans.service";

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
  const [limitError, setLimitError] = useState<string>('');
  const [limitInfo, setLimitInfo] = useState<{ used: number; max: number } | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && user === null) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const svc = ContainerService.getInstance().get(ManageUserPlansService);
      const [plan, usage] = await Promise.all([
        svc.getUserCurrentPlan(user.id),
        svc.getUsage(user.id),
      ]);
      if (plan) setLimitInfo({ used: usage.scopes, max: plan.maxScopes });
    };
    load();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setLimitError('');
    const scopeRepository = ContainerService.getInstance().get(ScopeRepository);

    try {
      // Check plan limit
      const planService = ContainerService.getInstance().get(ManageUserPlansService);
      const allowed = await planService.canCreateScope(user!.id);
      if (!allowed) {
        setLimitError('Dosáhli jste limitu počtu scopů pro váš plán.');
        return;
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[90vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link 
            href="/" 
            className="flex w-fit gap-2 items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-6 p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{t('back')}</span>
          </Link>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-xl">
                  <Plus className="w-8 h-8 text-white" />
                </div>
                <Sparkles className="w-6 h-6 text-purple-500" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Vytvořit nový scope
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Začněte sledovat průběh vašich projektů a efektivně spravovat zdroje týmu
              </p>
            </div>

            {limitInfo && (
              <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Scopy: <span className="font-semibold">{limitInfo.used}</span> z <span className="font-semibold">{limitInfo.max}</span>
                </div>
                <div className="flex-1 mx-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className={`h-full rounded-full ${limitInfo.used >= limitInfo.max ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (limitInfo.used / Math.max(1, limitInfo.max)) * 100)}%` }} />
                </div>
                <div className={`text-xs ${limitInfo.used >= limitInfo.max ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {limitInfo.used >= limitInfo.max ? 'Limit vyčerpán' : `Zbývá: ${Math.max(0, limitInfo.max - limitInfo.used)}`}
                </div>
              </div>
            )}

            {/* Form */}
            <form className="space-y-6" onSubmit={handleCreate}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Název scope *
                </label>
                <input
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="Zadejte název vašeho scope..."
                  value={newScope.name}
                  onChange={e => setNewScope(s => ({...s, name: e.target.value}))}
                  required
                  disabled={saving}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Popis (volitelné)
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 min-h-[120px] resize-none transition-all duration-200"
                  placeholder="Popište účel a cíle vašeho scope..."
                  value={newScope.description}
                  onChange={e => setNewScope(s => ({...s, description: e.target.value}))}
                  disabled={saving}
                />
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4"
                >
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </motion.div>
              )}

              {limitError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4"
                >
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm">{limitError}</p>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="pt-4"
              >
                <button
                  type="submit"
                  disabled={saving || !newScope.name.trim()}
                  className={`w-full px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg ${
                    saving || !newScope.name.trim()
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105'
                  }`}
                >
                  {saving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Vytvářím scope...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />
                      <span>Vytvořit scope</span>
                    </div>
                  )}
                </button>
              </motion.div>
            </form>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
            >
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tipy pro vytvoření scope
              </h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Zvolte jasný a popisný název</li>
                <li>• Přidejte detailní popis pro lepší orientaci týmu</li>
                <li>• Scope můžete později sdílet s kolegy</li>
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 