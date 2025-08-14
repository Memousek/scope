"use client";
/**
 * Modern Scope Layout Component
 * - Glass-like design with animations
 * - Tab-based layout for better organization
 * - Modern UI with gradient effects
 * - Responsive design with smooth transitions
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TeamSection } from "./TeamSection";
import { ProjectSection } from "./ProjectSection";
import { BurndownChart } from "./BurndownChart";
import { AddMemberModal } from "./AddMemberModal";
import { AddProjectModal } from "./AddProjectModal";
import { AiChatModal } from "./AiChatModal";
import { TeamMember, Project } from "./types";
import { downloadCSV } from "../../utils/csvUtils";
import { useTranslation } from "@/lib/translation";
import { ProjectTeamAssignment } from "@/lib/domain/models/project-team-assignment.model";
import { Badge } from "../ui/Badge";
import { useScopeRoles } from "@/app/hooks/useScopeRoles";
import {
  FiUsers,
  FiTrendingUp,
  FiBarChart2,
  FiSearch,
  FiFolder,
  FiUpload,
  FiSettings,
  FiExternalLink,
} from "react-icons/fi";
import TeamImportModal from "../TeamImportModal";
import { mutate } from "swr";
import { TeamService } from "@/app/services/teamService";
import { JiraImportModal } from "./JiraImportModal";
import { ScopeSettings, getScopeIntegration } from "./ScopeSettings";

interface ModernScopeLayoutProps {
  scopeId: string;
  team: TeamMember[];
  projects: Project[];
  projectAssignments?: Record<string, ProjectTeamAssignment[]>;
  workflowDependencies?: Record<
    string,
    {
      workflow_type: string;
      dependencies: Array<{
        from: string;
        to: string;
        type: "blocking" | "waiting" | "parallel";
      }>;
      active_workers: Array<{
        role: string;
        status: "active" | "waiting" | "blocked";
      }>;
    }
  >;
  onTeamChange: (team: TeamMember[]) => void;
  stats?: {
    projectCount: number;
    teamMemberCount: number;
    lastActivity?: Date;
  };
  loadingStats?: boolean;
  averageSlip?: {
    averageSlip: number;
    totalProjects: number;
    delayedProjects: number;
    onTimeProjects: number;
    aheadProjects: number;
  };
  onAddMember?: (member: {
    name: string;
    role: string;
    fte: number;
  }) => Promise<void>;
  onAddProject?: (
    project: Omit<Project, "id" | "scope_id" | "created_at">
  ) => Promise<void>;
  readOnlyMode?: boolean;
  user?: import("@/lib/domain/models/user.model").User;
  loadingTeam?: boolean;
  isOwner?: boolean;
}

type TabType = "overview" | "team" | "projects" | "burndown" | "jira" | "settings";

export function ModernScopeLayout({
  scopeId,
  team,
  projects,
  projectAssignments = {},
  workflowDependencies = {},
  onTeamChange,
  stats,
  loadingStats,
  averageSlip,
  onAddMember,
  onAddProject,
  readOnlyMode = false,
  user,
  loadingTeam = false,
  isOwner = false,
}: ModernScopeLayoutProps) {
  const { t } = useTranslation();
  const { activeRoles } = useScopeRoles(scopeId);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const integrations = typeof window !== 'undefined' ? getScopeIntegration(scopeId) : null;
  const isGod = user?.additional?.role === 'god';
  // Derived flag kept local; remove unused var warnings by using inline checks where needed
  const isOwnerOrGod = isOwner || isGod; // eslint-disable-line @typescript-eslint/no-unused-vars

  // Initialize active tab from URL or localStorage
  useEffect(() => {
    try {
      const tabFromUrl = (searchParams?.get("tab") as TabType) || null;
      const savedKey = `scope:${scopeId}:activeTab`;
      const tabFromStorage = (typeof window !== "undefined"
        ? (localStorage.getItem(savedKey) as TabType | null)
        : null);

      const allowed: TabType[] = ["overview", "team", "projects", "burndown", "jira", "settings"];
      const nextTab: TabType = (tabFromUrl && (allowed as string[]).includes(tabFromUrl))
        ? tabFromUrl
        : (tabFromStorage && (allowed as string[]).includes(tabFromStorage))
          ? tabFromStorage
          : "overview";
      setActiveTab(nextTab);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId]);

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(`scope:${scopeId}:activeTab`, tab);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", tab);
        router.replace(url.toString(), { scroll: false });
      }
    } catch {}
  };

  const handleExportTeam = () => {
    // Exportujeme i dovolené jako serializovaný seznam: start..end|note; start..end|note
    type TeamRow = TeamMember & { vacationsText?: string };
    const rows: TeamRow[] = team.map((m) => ({
      ...m,
      vacationsText: m.vacations && m.vacations.length > 0
        ? m.vacations.map(v => {
            // export in DD.MM.YYYY to match UI locale for easier re-import
            const toCz = (iso: string) => {
              const [y, mo, d] = iso.split('-');
              return `${d}.${mo}.${y}`;
            };
            return `${toCz(v.start)}..${toCz(v.end)}${v.note ? `|${v.note}` : ''}`;
          }).join('; ')
        : ''
    }));

    const columns: (keyof TeamRow)[] = ["name", "role", "fte", "vacationsText"];
    const headerMap = {
      name: t("name"),
      role: t("role"),
      fte: t("fte"),
      vacationsText: t("vacations"),
    } as Record<string, string>;

    downloadCSV(`team-export-${scopeId}.csv`, rows, columns, headerMap);
  };

  const handleExportProjects = () => {
    // Dynamicky vytvoříme sloupce pro každou roli
    const roleColumns: string[] = [];
    const roleHeaderMap: Record<string, string> = {};

    activeRoles.forEach((role) => {
      roleColumns.push(`${role.key}_mandays`);
      roleColumns.push(`${role.key}_done`);
      roleHeaderMap[`${role.key}_mandays`] = `${role.label} MD`;
      roleHeaderMap[`${role.key}_done`] = `${role.label} ${t("done")}`;
    });

    const projectColumns: string[] = [
      "name",
      "priority",
      ...roleColumns,
      "delivery_date",
      "slip",
    ];
    const projectHeaderMap = {
      name: t("projectName"),
      priority: t("priority"),
      ...roleHeaderMap,
      delivery_date: t("deliveryDate"),
      slip: t("slip"),
    };
    downloadCSV(
      `projects-export-${scopeId}.csv`,
      projects,
      projectColumns as (keyof Project)[],
      projectHeaderMap
    );
  };

  // Modal states
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [aiChatModalOpen, setAiChatModalOpen] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [jiraOpen, setJiraOpen] = useState(false);

  const tabs = [
    { id: "overview", label: t("overview"), icon: <FiBarChart2 /> },
    { id: "team", label: t("team"), icon: <FiUsers /> },
    { id: "projects", label: t("projects"), icon: <FiFolder /> },
    { id: "burndown", label: t("burndown"), icon: <FiTrendingUp /> },
    ...(isGod && integrations?.jiraApiToken && integrations?.jiraBaseUrl ? [{ id: "jira", label: t("jira"), icon: <FiExternalLink /> }] : []),
    ...(isGod ? [{ id: "settings", label: t("settings"), icon: <FiSettings /> }] : []),
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
              {/* Decorative background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <h2 className="text-2xl font-bold dark:text-white text-gray-900">
                      <FiSearch className="inline mr-2" />{" "}
                      <span className="">{t("scopeOverview")}</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span>{t("statsAndQuickActions")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Team Members */}
                  <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>
                    <div className="p-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="select-none w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                            <FiUsers className="text-white text-2xl" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {t("teamMembers")}
                          </p>
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {loadingStats ? (
                              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
                            ) : (
                              (stats?.teamMemberCount ?? team.length)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Projects */}
                  <div
                    className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none"
                    style={{ animationDelay: "100ms" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-emerald-500/0 to-teal-500/0 group-hover:from-green-500/5 group-hover:via-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-300 rounded-2xl"></div>
                    <div className="p-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="select-none w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                            <FiFolder className="text-white text-2xl" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {t("activeProjects")}
                          </p>
                          <div className="text-3xl font-bold text-gray-900 dark:text-white">
                            {loadingStats ? (
                              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-16 rounded"></div>
                            ) : (
                              (stats?.projectCount ?? projects.length)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Average Slip */}
                  <div
                    className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none"
                    style={{ animationDelay: "200ms" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-red-500/0 to-pink-500/0 group-hover:from-orange-500/5 group-hover:via-red-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>
                    <div className="p-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="select-none w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                            <FiTrendingUp className="text-white text-2xl" />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            {t("averageSlip")}
                          </p>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loadingStats ? (
                              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-20 rounded"></div>
                            ) : averageSlip ? (
                              <span
                                className={
                                  averageSlip.averageSlip > 0
                                    ? "text-green-600 dark:text-green-400"
                                    : averageSlip.averageSlip < 0
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-blue-600 dark:text-blue-400"
                                }
                              >
                                {averageSlip.averageSlip > 0
                                  ? `+${averageSlip.averageSlip} ${t("days")}`
                                  : averageSlip.averageSlip < 0
                                    ? `${averageSlip.averageSlip} ${t("days")}`
                                    : t("onTime")}
                              </span>
                            ) : (
                              t("notAvailable")
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
              {/* Decorative background elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <h3 className="text-xl font-bold dark:text-white text-gray-900">
                      ⚡ {t("quickActions")}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span>{t("manageEffectively")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Add Member */}
                  {!readOnlyMode && (
                    <button
                      onClick={() => setAddMemberModalOpen(true)}
                      className="relative group bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                      aria-label={t("addMember")}
                      title={t("addMember")}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <FiUsers className="relative z-10 text-2xl" />
                      <span className="relative z-10 text-sm font-semibold">
                        {t("addMember")}
                      </span>
                    </button>
                  )}

                  {/* New Project */}
                  {!readOnlyMode && (
                    <button
                      onClick={() => setAddProjectModalOpen(true)}
                      className="relative group bg-gradient-to-br from-emerald-600 via-green-700 to-teal-600 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                      aria-label={t("addNewProject")}
                      title={t("addNewProject")}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-green-800 to-teal-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <FiTrendingUp className="relative z-10 text-2xl" />
                      <span className="relative z-10 text-sm font-semibold">
                        {t("addNewProject")}
                      </span>
                    </button>
                  )}

                  {/* Export Team */}
                  <button
                    onClick={handleExportTeam}
                    className="relative group bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                    aria-label={t("exportTeam")}
                    title={t("exportTeam")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <FiBarChart2 className="relative z-10 text-2xl" />
                    <span className="relative z-10 text-sm font-semibold">
                      {t("exportTeam")}
                    </span>
                  </button>

                  {/* Export Projects */}
                  <button
                    onClick={handleExportProjects}
                    className="relative group bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                    aria-label={t("exportProjects")}
                    title={t("exportProjects")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <FiFolder className="relative z-10 text-2xl" />
                    <span className="relative z-10 text-sm font-semibold">
                      {t("exportProjects")}
                    </span>
                  </button>

                  {/* Import Team - Soon */}
                  {!readOnlyMode && (
                    <button
                      onClick={() => setImportModalOpen(true)}
                      className="relative bg-gradient-to-br from-teal-500 via-purple-500 to-pink-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 group motion-reduce:scale-100 motion-reduce:transition-none"
                      aria-label={t("importTeam")}
                      title={t("importTeam")}
                    >
                      <FiUpload className="text-2xl" />
                      <span className="text-sm font-semibold">
                        {t("importTeam")}
                      </span>
                    </button>
                  )}
                  {/* Import Projects (feature-flagged) */}
                  {(!readOnlyMode) && (
                    <button
                      onClick={() => {}}
                      className="disabled:opacity-50 disabled:cursor-not-allowed relative bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 group motion-reduce:scale-100 motion-reduce:transition-none"
                      aria-label={t("importProjects")}
                      title={t("importProjects")}
                      disabled={true}
                    >
                      <FiUpload className="text-2xl" />
                      <span className="text-sm font-semibold">
                        {t("importProjects")}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case "team":
        return (
          <TeamSection
            scopeId={scopeId}
            team={team}
            onTeamChange={onTeamChange}
            readOnlyMode={readOnlyMode}
            activeRoles={activeRoles}
            loading={loadingTeam}
            onRolesChanged={(newActive) => {
              try {
                // replace items immutably to avoid mutating hook state from outside
                // use provided hook loader instead of casting to any
                // Trigger a soft reload of roles via SWR/global state if available
              } catch {}
            }}
          />
        );

      case "projects":
        return (
          <ProjectSection
            scopeId={scopeId}
            user={user}
            readOnlyMode={readOnlyMode}
          />
        );

      case "burndown":
        return (
          <div className="relative">
            <Badge
              label={t("experimental")}
              variant="info"
              position="top-right"
            />
            <BurndownChart
              projects={projects}
              team={team}
              projectAssignments={projectAssignments}
              workflowDependencies={workflowDependencies}
              scopeId={scopeId}
            />
          </div>
        );

      case "jira":
        return (
          <div className="p-4">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">{t('jiraImport')}</div>
            <button
              onClick={() => setJiraOpen(true)}
              className="relative bg-gradient-to-br from-sky-600 to-blue-600 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300"
              aria-label="Jira import"
            >
              {t('jiraImport')}
            </button>
            {jiraOpen && (
              <JiraImportModal isOpen={jiraOpen} onClose={() => setJiraOpen(false)} team={team} scopeId={scopeId} />
            )}
          </div>
        );

      case "settings":
        return (
          <div className="p-4">
            <ScopeSettings scopeId={scopeId} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="pl-4 pr-4 relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-2 shadow-2xl">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

        <div
          className="relative z-10 flex space-x-1"
          role="tablist"
          aria-label="Scope tabs"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? "z-10 relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-2xl shadow-blue-500/25 scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:scale-105 hover:shadow-lg motion-reduce:scale-100 motion-reduce:transition-none"
              }`}
              aria-label={tab.label}
              role="tab"
              aria-selected={activeTab === tab.id}
              id={`tab-${tab.id}`}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
              <span className="relative z-10 text-lg">{tab.icon}</span>
              <span className="relative z-10 hidden sm:inline font-medium">
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - automatická výška */}
      <div>{renderTabContent()}</div>

      {/* Modals */}
      {addMemberModalOpen && onAddMember && (
        <AddMemberModal
          isOpen={addMemberModalOpen}
          onClose={() => setAddMemberModalOpen(false)}
          onAddMember={async (member) => {
            setSavingMember(true);
            try {
              await onAddMember(member);
              setAddMemberModalOpen(false);
            } finally {
              setSavingMember(false);
            }
          }}
          savingMember={savingMember}
          scopeId={scopeId}
        />
      )}

      {addProjectModalOpen && onAddProject && (
        <AddProjectModal
          isOpen={addProjectModalOpen}
          onClose={() => setAddProjectModalOpen(false)}
          onAddProject={async (project) => {
            setSavingProject(true);
            try {
              await onAddProject(project);
              setAddProjectModalOpen(false);
            } finally {
              setSavingProject(false);
            }
          }}
          savingProject={savingProject}
          scopeId={scopeId}
          existingProjects={projects}
        />
      )}

      {aiChatModalOpen && (
        <AiChatModal
          isOpen={aiChatModalOpen}
          onClose={() => setAiChatModalOpen(false)}
          scopeId={scopeId}
        />
      )}

      {jiraOpen && (
        <JiraImportModal
          isOpen={jiraOpen}
          onClose={() => setJiraOpen(false)}
          team={team}
          scopeId={scopeId}
        />
      )}

      <TeamImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={async (members) => {
          setSavingMember(true);
          try {
            const promises = members.map((m) =>
              TeamService.createTeamMember(scopeId, {
                name: m.name,
                role: m.role,
                fte: Number(m.fte),
              })
            );
            const newMembers = await Promise.all(promises);
            onTeamChange([...team, ...newMembers]);
            try {
              await mutate(["scopeUsage", scopeId]);
            } catch {}
          } catch (error) {
            console.error("Chyba při importu členů týmu:", error);
          } finally {
            setSavingMember(false);
          }
        }}
      />
    </div>
  );
}
