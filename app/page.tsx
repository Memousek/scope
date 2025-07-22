'use client';

/**
 * Hlavní stránka aplikace
 * - Moderní glass-like design s gradient pozadím
 * - Responzivní layout s pokročilými animacemi
 * - Přihlášený uživatel vidí své scopy
 * - Nepřihlášený uživatel vidí landing page s informacemi
 */

import { useEffect, useState, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
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
import { ArrowRight, Users, BarChart3, FileText, Zap, Shield, Globe } from "lucide-react";
import Link from "next/link";
import { SchemaOrgScript } from "../components/schema-org-script";
import { generateFAQSchema } from "@/lib/utils/schemaOrg";

export default function Home() {
  // Generate FAQ schema for better SEO
  const faqSchema = generateFAQSchema([
    {
      question: "Co je Scope Burndown?",
      answer: "Scope Burndown je moderní nástroj pro projektový management a sledování průběhu projektů s vizuálními přehledy a real-time spoluprácí.",
    },
    {
      question: "Jak mohu vytvořit nový scope?",
      answer: "Po přihlášení klikněte na 'Vytvořit nový scope' a definujte tým, projekty a začněte sledovat průběh práce.",
    },
    {
      question: "Mohu sdílet scope s týmem?",
      answer: "Ano, Scope Burndown umožňuje sdílet scopes s týmem a spolupracovat na projektech v reálném čase.",
    },
    {
      question: "Jaké jsou hlavní funkce aplikace?",
      answer: "Hlavní funkce zahrnují sledování průběhu projektů, vizuální přehledy, týmovou spolupráci, export dat do CSV a pokročilé analytické nástroje.",
    },
  ]);

  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [scopes, setScopes] = useState<Scope[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingScope, setDeletingScope] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { scrollY } = useScroll();

  // Parallax effects
  const y1 = useTransform(scrollY, [0, 300], [0, -50]);
  const y2 = useTransform(scrollY, [0, 300], [0, 100]);
  const opacity = useTransform(scrollY, [0, 200], [1, 0.8]);

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
      <div className="flex items-center justify-center">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div>
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
    <>
      <SchemaOrgScript data={faqSchema} id="faq-schema" />
      <div className="overflow-hidden">
      
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          style={{ y: y1 }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        />
        <motion.div 
          style={{ y: y2 }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"
        />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="text-center py-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ opacity }}
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-3xl p-12 shadow-2xl mb-16 max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-6 shadow-lg"
            >
              <span className="text-white text-3xl font-bold">S</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t("scope_burndown")}
            </h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed"
            >
              {t("track_progress_and_manage_resources")}
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                href="/auth/login"
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg inline-flex items-center gap-2"
              >
                {t("login")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              
              <Link
                href="/auth/sign-up"
                className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 hover:scale-105 shadow-lg inline-flex items-center gap-2"
              >
                {t("create_account")}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Proč Scope Burndown?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Moderní nástroj pro projektový management s pokročilými analytickými funkcemi
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t("progress_tracking")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t("visual_overview_of_projects")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent">
                {t("team_sharing")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t("collaborate_and_share")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                {t("data_export")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t("export_data_to_csv")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Rychlé nasazení
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Začněte používat během několika minut. Jednoduchá registrace a okamžitý přístup ke všem funkcím.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
              className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Bezpečnost
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Vaše data jsou v bezpečí. Moderní šifrování a bezpečnostní standardy pro ochranu vašich projektů.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              viewport={{ once: true }}
              className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {t("accessibility")}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {t("cross_device_access")}. {t("responsive_design")}.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700/30 rounded-3xl p-12 shadow-xl max-w-4xl mx-auto"
          >
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Proč si vybrat Scope Burndown?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Moderní řešení pro moderní týmy
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
                <div className="text-gray-600 dark:text-gray-400">Bezpečnost dat</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-purple-600 mb-2">24/7</div>
                <div className="text-gray-600 dark:text-gray-400">Dostupnost</div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-green-600 mb-2">0</div>
                <div className="text-gray-600 dark:text-gray-400">Konfigurace</div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 shadow-2xl max-w-4xl mx-auto">
              <h2 className="text-4xl font-bold text-white mb-6">
                Začněte ještě dnes
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Připojte se k týmům, které už používají Scope Burndown pro efektivní správu projektů.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/sign-up"
                  className="group bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-lg inline-flex items-center gap-2"
                >
                  {t("create_account")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                <Link
                  href="/auth/login"
                  className="group bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/10 transition-all duration-300 hover:scale-105 inline-flex items-center gap-2"
                >
                  {t("login")}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
    </>
  );
}
