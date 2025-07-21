"use client";
/**
 * Veřejný read-only náhled scopu (View link)
 * - Přístupný i nepřihlášeným uživatelům
 * - Zobrazuje informace o scopu, týmu, projektech a burndown grafech
 * - Neumožňuje žádné úpravy, mazání, přidávání ani export
 * - Moderní glass-like design s dark mode podporou
 */
import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProjectSectionRefactored } from "@/app/components/scope/ProjectSectionRefactored";
import { TeamMember, Project } from "@/app/components/scope/types";
import { useTranslation } from "@/lib/translation";
import { downloadCSV } from "@/app/utils/csvUtils";

export default function ScopeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useTranslation();
  const [scope, setScope] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [description, setDescription] = useState("");
  // --- Tým ---
  const [team, setTeam] = useState<TeamMember[]>([]);
  // --- Projekty ---
  const [projects, setProjects] = useState<Project[]>([]);

  // Načtení scope z Supabase podle id
  useEffect(() => {
    if (id) {
      setFetching(true);
      const supabase = createClient();
      supabase
        .from("scopes")
        .select("id, name, description")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setScope(data as { id: string; name: string; description?: string });
            setDescription(data.description || "");
          }
          setFetching(false);
        });
    }
  }, [id]);

  // Načtení členů týmu
  useEffect(() => {
    if (id) {
      const supabase = createClient();
      supabase
        .from("team_members")
        .select("*")
        .eq("scope_id", id)
        .order("role", { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) setTeam(data);
        });
    }
  }, [id]);

  // Načtení projektů
  useEffect(() => {
    if (id) {
      const supabase = createClient();
      supabase
        .from("projects")
        .select("*")
        .eq("scope_id", id)
        .order("priority", { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) setProjects(data);
        });
    }
  }, [id]);

  const handleExportTeam = () => {
    downloadCSV('tym.csv', team as unknown as Record<string, unknown>[], ['name', 'role', 'fte'], { name: t('name'), role: t('role'), fte: t('fte') });
  };

  const handleExportProjects = () => {
    downloadCSV('projekty.csv', projects as unknown as Record<string, unknown>[], ['name', 'priority', 'fe_mandays', 'be_mandays', 'qa_mandays', 'pm_mandays', 'dpl_mandays', 'delivery_date'], {
      name: t('projectName'), priority: t('priority'), fe_mandays: t('fe_mandays'), be_mandays: t('be_mandays'), qa_mandays: t('qa_mandays'), pm_mandays: t('pm_mandays'), dpl_mandays: t('dpl_mandays'), delivery_date: t('deliveryDate')
    });
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center min-w-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">{t("loading")}</p>
        </div>
      </div>
    );
  }
  
  if (!scope) {
    return (
      <div className="min-h-screen flex items-center justify-center min-w-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 shadow-xl">
          <span className="text-4xl mb-4 block text-center">😕</span>
          <p className="text-center text-gray-600 dark:text-gray-400">{t("notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col gap-6">
              {/* Název scope */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {scope.name}
                  </h1>
                  <span className="bg-gradient-to-r from-emerald-600 to-green-700 text-white px-3 py-1 rounded-full text-xs font-medium">
                    {t("publicView")}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportTeam}
                    className="bg-gradient-to-r from-emerald-600 to-green-700 text-white px-4 py-2 rounded-xl hover:from-emerald-700 hover:to-green-800 transition-all duration-200 hover:scale-105 shadow-lg text-sm font-medium"
                  >
                    {t('exportTeam')}
                  </button>
                  <button
                    onClick={handleExportProjects}
                    className="bg-gradient-to-r from-emerald-600 to-green-700 text-white px-4 py-2 rounded-xl hover:from-emerald-700 hover:to-green-800 transition-all duration-200 hover:scale-105 shadow-lg text-sm font-medium"
                  >
                    {t('exportProjects')}
                  </button>
                </div>
              </div>

              {/* Popis scope */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {description || t("no_description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          {/* Tým (read-only) */}
          <section className="mb-8">
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/20 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  👥 {t("teamMembers")}
                </h2>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                  {t('readOnly') || 'Pouze pro čtení'}
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-3 text-left">{t("name")}</th>
                      <th className="px-3 py-3 text-center">{t("role")}</th>
                      <th className="px-3 py-3 text-center">{t("fte")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-gray-400 dark:text-gray-500 text-center py-8">
                          {t("noMembers")}
                        </td>
                      </tr>
                    ) : (
                      team.map(member => (
                        <tr key={member.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-3 py-3 align-middle font-medium text-gray-900 dark:text-gray-100">
                            {member.name}
                          </td>
                          <td className="px-3 py-3 align-middle text-center">
                            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs">
                              {member.role}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-middle text-center text-gray-600 dark:text-gray-400">
                            {member.fte}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Projekty a burndown grafy (read-only) */}
          <ProjectSectionRefactored
            scopeId={id}
            readOnly={true}
            team={team}
          />
        </div>
      </div>
    </div>
  );
} 