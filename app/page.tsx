'use client';

/**
 * Hlavní stránka aplikace
 * - Moderní glass-like design s gradient pozadím
 * - Responzivní layout s animacemi
 * - Přihlášený uživatel vidí své scopy
 * - Nepřihlášený uživatel vidí landing page
 */

import { Header } from "@/components/header";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ScopeList } from "@/app/components/scope/ScopeList";
import {User} from "@/lib/domain/models/user.model";
import {ContainerService} from "@/lib/container.service";
import {UserRepository} from "@/lib/domain/repositories/user.repository";
import {GetAccessibleScopesService} from "@/lib/domain/services/get-accessible-scopes.service";
import {Scope} from "@/lib/domain/models/scope.model";
import {RemoveScopeService} from "@/lib/domain/services/remove-scope.service";
import {handleErrorMessage} from "@/lib/utils";
import {DeleteScopeService} from "@/lib/domain/services/delete-scope.service";
import { useTranslation } from "@/lib/translation";

export default function Home() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingScope, setDeletingScope] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userRepository = ContainerService.getInstance().get(UserRepository);
    userRepository.getLoggedInUser().then((user) => {
        setUser(user);
        setLoading(false);
    });
  }, []);

  const fetchScopes = useCallback(async () => {
    if (user === null) {
        return;
    }

    try {
      console.log('Načítám scopes pro uživatele:', user.id);
      const scopes = await ContainerService.getInstance()
          .get(GetAccessibleScopesService, { autobind: true })
          .getAccessibleScopes(user);

      console.log('Načteno scopes:', scopes.length);
      setScopes(scopes);
    } catch (err) {
      console.error('Chyba při načítání scopes:', err);
      setError('Chyba při načítání scopes: ' + handleErrorMessage(err));
    }
  }, [user]);

  useEffect(() => {
    if (user !== null) {
      fetchScopes();
    }
  }, [user, fetchScopes]);

  const handleDeleteScope = async (scopeId: string) => {
    setError(null);
    if (!confirm('Opravdu chcete tento scope nenávratně smazat včetně všech dat?')) return;

    setDeletingScope(scopeId);
    
    try {
      console.log('Mazání scope:', scopeId);
      
      await ContainerService.getInstance()
        .get(DeleteScopeService, { autobind: true } )
        .deleteScope(scopeId);

      console.log('Scope úspěšně smazán, aktualizuji seznam...');
      await fetchScopes();
      
      console.log('Seznam aktualizován');
    } catch (err: unknown) {
      const message = handleErrorMessage(err);
      setError('Chyba při mazání scope: ' + message);
      console.error('Mazání scope selhalo:', err);
    } finally {
      setDeletingScope(null);
    }
  };

  const handleRemoveScope = async (scopeId: string) => {
    setError(null);

    try {
      await ContainerService.getInstance()
          .get(RemoveScopeService, { autobind: true })
          .removeScope(user!, scopeId)

      await fetchScopes();
    } catch (err: unknown) {
      const message = handleErrorMessage(err);
      setError('Chyba při odebírání scope: ' + message);
      console.error('Odebírání scope selhalo:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Header />
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
                <button
                  onClick={() => router.push('/scopes/new')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg font-medium"
                >
                  {t("create_new_scope")}
                </button>
              </div>
            </div>
          </div>

          {/* Scopes List */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <ScopeList
              scopes={scopes}
              user={user}
              loading={loading}
              deletingScope={deletingScope}
              error={error}
              onDelete={handleDeleteScope}
              onRemove={handleRemoveScope}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="text-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-12 shadow-xl mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t("scope_burndown")}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              {t("track_progress_and_manage_resources")}
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                href="/auth/login"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg inline-block"
              >
                {t("login")}
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t("progress_tracking")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("visual_overview_of_projects")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t("team_sharing")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("collaborate_and_share")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t("data_export")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t("export_data_to_csv")}
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
