"use client";
/**
 * Stránka Scope Burndown
 * - Přístupná pouze přihlášeným uživatelům (chráněná route)
 * - Každý scope má unikátní URL (dynamická route)
 * - UI podle zadání, data zatím mock
 * - Statické role (FE, QA, BE, PM, DPL), později editovatelné v Supabase
 * - Příprava na napojení na Supabase
 */

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/translation";
import { ModernScopeLayout } from "@/app/components/scope/ModernScopeLayout";
import { ShareModal } from "@/app/components/scope/ShareModal";
import { AiChatModal } from "@/app/components/scope/AiChatModal";
import { AiChatButton } from "@/app/components/scope/AiChatButton";
import { TeamMember, Project } from "@/app/components/scope/types";
import { useAuth } from "@/lib/auth";
import { downloadCSV } from "@/app/utils/csvUtils";
import { ContainerService } from "@/lib/container.service";
import { GetScopeStatsService } from "@/lib/domain/services/get-scope-stats.service";
import { CalculateAverageSlipService } from "@/lib/domain/services/calculate-average-slip.service";
import { AddTeamMemberService } from "@/lib/domain/services/add-team-member.service";
import { AddProjectService } from "@/lib/domain/services/add-project.service";


export default function ScopePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { loading, user, userId } = useAuth();
  const [scope, setScope] = useState<{
    id: string;
    name: string;
    description?: string;
  } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [description, setDescription] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const { t } = useTranslation();

  // --- Tým ---
  const [team, setTeam] = useState<TeamMember[]>([]);

  // --- Projekty ---
  const [projects, setProjects] = useState<Project[]>([]);

  // --- Statistiky ---
  const [stats, setStats] = useState<{
    projectCount: number;
    teamMemberCount: number;
    lastActivity?: Date;
  } | undefined>(undefined);
  const [loadingStats, setLoadingStats] = useState(false);
  const [averageSlip, setAverageSlip] = useState<{
    averageSlip: number;
    totalProjects: number;
    delayedProjects: number;
    onTimeProjects: number;
    aheadProjects: number;
  } | undefined>(undefined);


  // --- Sdílení ---
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // --- Název ---
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [errorName, setErrorName] = useState<string | null>(null);

  // --- AI Chat ---
  const [aiChatOpen, setAiChatOpen] = useState(false);

  // Zjistím, které role jsou v týmu
  const teamRoles = Array.from(new Set(team.map((m) => m.role)));
  const hasFE = teamRoles.includes("FE");
  const hasBE = teamRoles.includes("BE");
  const hasQA = teamRoles.includes("QA");
  const hasPM = teamRoles.includes("PM");
  const hasDPL = teamRoles.includes("DPL");

  const handleExportTeam = () => {
    downloadCSV(
      "tym.csv",
      team as unknown as Record<string, unknown>[],
      ["name", "role", "fte"],
      { name: t("name"), role: t("role"), fte: t("fte") }
    );
  };

  const handleExportProjects = () => {
    downloadCSV(
      "projekty.csv",
      projects as unknown as Record<string, unknown>[],
      [
        "name",
        "priority",
        "fe_mandays",
        "be_mandays",
        "qa_mandays",
        "pm_mandays",
        "dpl_mandays",
        "delivery_date",
      ],
      {
        name: t("projectName"),
        priority: t("priority"),
        fe_mandays: t("fe_mandays"),
        be_mandays: t("be_mandays"),
        qa_mandays: t("qa_mandays"),
        pm_mandays: t("pm_mandays"),
        dpl_mandays: t("dpl_mandays"),
        delivery_date: t("deliveryDate"),
      }
    );
  };

  const handleAddMember = async (member: { name: string; role: string; fte: number }) => {
    try {
      const container = ContainerService.getInstance();
      const addMemberService = container.get(AddTeamMemberService);
      
      await addMemberService.execute(id, member);
      
      // Refresh team data
      const { data } = await createClient()
        .from("team_members")
        .select("*")
        .eq("scope_id", id)
        .order("role", { ascending: true });
      
      if (data) setTeam(data);
    } catch (error) {
      console.error("Chyba při přidávání člena:", error);
    }
  };

  const handleAddProject = async (project: Omit<Project, 'id' | 'created_at'>) => {
    try {
      const container = ContainerService.getInstance();
      const addProjectService = container.get(AddProjectService);
      
      // Převod z komponentního typu na domain typ
      const domainProject = {
        name: project.name,
        priority: project.priority,
        feMandays: project.fe_mandays || 0,
        beMandays: project.be_mandays || 0,
        qaMandays: project.qa_mandays || 0,
        pmMandays: project.pm_mandays || 0,
        dplMandays: project.dpl_mandays || 0,
        feDone: project.fe_done,
        beDone: project.be_done,
        qaDone: project.qa_done,
        pmDone: project.pm_done,
        dplDone: project.dpl_done,
        deliveryDate: project.delivery_date ? new Date(project.delivery_date) : undefined,
        slip: project.slip || undefined
      };
      
      await addProjectService.execute(id, domainProject);
      
      // Refresh projects data
      const { data } = await createClient()
        .from("projects")
        .select("*")
        .eq("scope_id", id)
        .order("priority", { ascending: true });
      
      if (data) setProjects(data);
    } catch (error) {
      console.error("Chyba při přidávání projektu:", error);
    }
  };

  // Načtení scope z Supabase podle id
  useEffect(() => {
    if (!loading && user && id) {
      setFetching(true);
      const supabase = createClient();
      supabase
        .from("scopes")
        .select("id, name, description")
        .eq("id", id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setScope(
              data as { id: string; name: string; description?: string }
            );
            setDescription(data.description || "");
            setName(data.name || "");
          }
          setFetching(false);
        });
    }
  }, [loading, user, id]);

  // Načtení členů týmu
  useEffect(() => {
    if (!loading && user && id) {
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
  }, [loading, user, id]);

  // Načtení projektů
  useEffect(() => {
    if (!loading && user && id) {
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
  }, [loading, user, id]);

  // Načtení statistik scope
  useEffect(() => {
    if (!loading && user && id) {
      setLoadingStats(true);
      const container = ContainerService.getInstance();
      const statsService = container.get(GetScopeStatsService);
      
      statsService.execute(id)
        .then((scopeStats) => {
          setStats({
            projectCount: scopeStats.projectCount,
            teamMemberCount: scopeStats.teamMemberCount,
            lastActivity: scopeStats.lastActivity
          });
        })
        .catch((error) => {
          console.error('Chyba při načítání statistik:', error);
        })
        .finally(() => {
          setLoadingStats(false);
        });
    }
  }, [loading, user, id]);

  // Načtení průměrného skluzu
  useEffect(() => {
    if (!loading && user && id) {
      const container = ContainerService.getInstance();
      const slipService = container.get(CalculateAverageSlipService);
      
      slipService.execute(id)
        .then((slipData) => {
          setAverageSlip(slipData);
        })
        .catch((error) => {
          console.error('Chyba při načítání průměrného skluzu:', error);
        });
    }
  }, [loading, user, id]);

  // Zjisti, jestli je uživatel ownerem scope
  useEffect(() => {
    if (scope && userId) {
      const supabase = createClient();
      supabase
        .from("scopes")
        .select("owner_id")
        .eq("id", scope.id)
        .single()
        .then(({ data }) => {
          if (data && userId && data.owner_id === userId) setIsOwner(true);
          else setIsOwner(false);
        });
    }
  }, [scope, userId]);

  // Funkce pro uložení popisu
  const handleSaveDescription = async () => {
    if (!scope) return;
    setSavingDescription(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("scopes")
      .update({ description })
      .eq("id", scope.id);
    setSavingDescription(false);
    if (!error) {
      setScope((s) => (s ? { ...s, description } : s));
      setEditingDescription(false);
    }
  };

  // Function for saving the scope name
  const handleSaveName = async () => {
    if (!scope) return;
    setSavingName(true);
    setErrorName(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("scopes")
      .update({ name })
      .eq("id", scope.id);
    setSavingName(false);
    if (!error) {
      setScope((s) => (s ? { ...s, name } : s));
      setEditingName(false);
    } else {
      setErrorName(error.message || "Chyba při ukládání názvu.");
      console.error("Chyba při ukládání názvu scopu:", error);
    }
  };

  if (loading || !user || fetching) {
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
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col gap-6">
              {/* Název scope */}
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {scope.name}
                </h1>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium hover:scale-105 transition-transform"
                >
                  {t("edit")}
                </button>
              </div>

              {/* Editace názvu */}
              {editingName && (
                <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-white/20">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 dark:bg-gray-700/80"
                    placeholder={t("scopeName")}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200"
                  >
                    {savingName ? t("saving") : t("save")}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setName(scope.name);
                      setErrorName(null);
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
                  >
                    {t("cancel")}
                  </button>
                </div>
              )}

              {errorName && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  {errorName}
                </div>
              )}

              {/* Popis scope */}
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {description || t("no_description")}
                  </p>
                </div>
                <button
                  onClick={() => setEditingDescription(true)}
                  className="text-blue-500 hover:text-blue-700 text-sm font-medium whitespace-nowrap hover:scale-105 transition-transform"
                >
                  {t("editDescription")}
                </button>
              </div>

              {/* Editace popisu */}
              {editingDescription && (
                <div className="flex flex-col gap-2 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-white/20">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] bg-white/80 dark:bg-gray-700/80"
                    placeholder={t("scopeDescription")}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDescription}
                      disabled={savingDescription}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all duration-200"
                    >
                      {savingDescription ? t("saving") : t("save")}
                    </button>
                    <button
                      onClick={() => {
                        setEditingDescription(false);
                        setDescription(scope.description || "");
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              )}



              {/* Tlačítka akcí */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportTeam}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  {t("exportTeam")}
                </button>
                <button
                  onClick={handleExportProjects}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  {t("exportProjects")}
                </button>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  {t("share")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
          <ModernScopeLayout
            scopeId={id}
            team={team}
            projects={projects}
            onTeamChange={setTeam}
            hasFE={hasFE}
            hasBE={hasBE}
            hasQA={hasQA}
            hasPM={hasPM}
            hasDPL={hasDPL}
            stats={stats}
            loadingStats={loadingStats}
            averageSlip={averageSlip}
            onExportTeam={handleExportTeam}
            onAddMember={handleAddMember}
            onAddProject={handleAddProject}
          />
        </div>

        {/* Modals */}
        {shareModalOpen && (
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            scopeId={id}
            isOwner={isOwner}
          />
        )}

        {/* AI Chat Components */}
        <AiChatButton onClick={() => setAiChatOpen(true)} />
        
        <AiChatModal
          isOpen={aiChatOpen}
          onClose={() => setAiChatOpen(false)}
          scopeId={id}
        />
      </div>
    </div>
  );
}