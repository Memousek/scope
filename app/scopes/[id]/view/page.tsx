"use client";
/**
 * Veřejný read-only náhled scopu (View link)
 * - Přístupný i nepřihlášeným uživatelům
 * - Zobrazuje informace o scopu, týmu, projektech a burndown grafech
 * - Neumožňuje žádné úpravy, mazání, přidávání ani export
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

  // Zjistím, které role jsou v týmu
  const teamRoles = Array.from(new Set(team.map(m => m.role)));
  const hasFE = teamRoles.includes("FE");
  const hasBE = teamRoles.includes("BE");
  const hasQA = teamRoles.includes("QA");
  const hasPM = teamRoles.includes("PM");
  const hasDPL = teamRoles.includes("DPL");

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
    return <div className="min-h-screen flex items-center justify-center min-w-screen">{t("loading")}</div>;
  }
  if (!scope) {
    return <div className="min-h-screen flex items-center justify-center min-w-screen">{t("notFound")}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white dark:bg-gray-800 mt-10 mb-10 rounded-lg">
      <div className="flex justify-between items-center mb-8 flex-col gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{scope.name}</h1>
        </div>
        <div className="flex gap-4">
          <span className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">{t("publicView")}</span>
          <button
            onClick={handleExportTeam}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition text-sm"
          >
            {t('exportTeam')}
          </button>
          <button
            onClick={handleExportProjects}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition text-sm"
          >
            {t('exportProjects')}
          </button>
        </div>
      </div>

      {/* Popis scope */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <p className="text-gray-600 whitespace-pre-wrap">{description || t("no_description")}</p>
        </div>
      </div>

      {/* Tým (read-only) */}
      <section className="mb-6">
        <div className="rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">{t("teamMembers")}</h2>
          <div className="rounded p-2 sm:p-3">
            <div className="flex font-semibold mb-2 text-gray-700 text-xs sm:text-base">
              <div className="flex-1">{t("name")}</div>
              <div className="w-24 sm:w-32">{t("role")}</div>
              <div className="w-24 sm:w-32">{t("fte")}</div>
            </div>
            {team.length === 0 ? (
              <div className="text-gray-400">{t("noMembers")}</div>
            ) : (
              team.map(member => (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center mb-2 gap-1 sm:gap-0" key={member.id}>
                  <div className="flex-1">{member.name}</div>
                  <div className="w-24 sm:w-32">{member.role}</div>
                  <div className="w-24 sm:w-32">{member.fte}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Projekty a burndown grafy (read-only) */}
      <ProjectSectionRefactored
        scopeId={id}
        hasFE={hasFE}
        hasBE={hasBE}
        hasQA={hasQA}
        hasPM={hasPM}
        hasDPL={hasDPL}
        readOnly={true}
        team={team}
      />
    </div>
  );
} 