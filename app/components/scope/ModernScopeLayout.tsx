/**
 * Modern Scope Layout Component
 * - Glass-like design s animacemi
 * - Tab-based layout pro lepší organizaci
 * - Moderní UI s gradient efekty
 * - Responsive design s smooth transitions
 */

import { useState } from "react";
import { TeamSection } from "./TeamSection";
import { ProjectSection } from "./ProjectSection";
import { BurndownChart } from "./BurndownChart";
import { AddMemberModal } from "./AddMemberModal";
import { AddProjectModal } from "./AddProjectModal";
import { AiChatModal } from "./AiChatModal";
import { TeamMember, Project } from "./types";
import { downloadCSV } from "../../utils/csvUtils";

interface ModernScopeLayoutProps {
  scopeId: string;
  team: TeamMember[];
  projects: Project[];
  onTeamChange: (team: TeamMember[]) => void;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
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
}

type TabType = "overview" | "team" | "projects" | "burndown";

export function ModernScopeLayout({
  scopeId,
  team,
  projects,
  onTeamChange,
  hasFE,
  hasBE,
  hasQA,
  hasPM,
  hasDPL,
  stats,
  loadingStats,
  averageSlip,
  onAddMember,
  onAddProject,
  readOnlyMode = false,
}: ModernScopeLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Export functions
  const handleExportTeam = () => {
    const teamColumns: (keyof TeamMember)[] = ["name", "role", "fte"];
    const teamHeaderMap = {
      name: "Jméno",
      role: "Role",
      fte: "FTE",
    };
    downloadCSV(`team-export-${scopeId}.csv`, team, teamColumns, teamHeaderMap);
  };

  const handleExportProjects = () => {
    const projectColumns: (keyof Project)[] = [
      "name",
      "priority",
      "fe_mandays",
      "be_mandays",
      "qa_mandays",
      "pm_mandays",
      "dpl_mandays",
      "fe_done",
      "be_done",
      "qa_done",
      "pm_done",
      "dpl_done",
      "delivery_date",
      "slip",
    ];
    const projectHeaderMap = {
      name: "Název projektu",
      priority: "Priorita",
      fe_mandays: "FE mandays",
      be_mandays: "BE mandays",
      qa_mandays: "QA mandays",
      pm_mandays: "PM mandays",
      dpl_mandays: "DPL mandays",
      fe_done: "FE hotovo",
      be_done: "BE hotovo",
      qa_done: "QA hotovo",
      pm_done: "PM hotovo",
      dpl_done: "DPL hotovo",
      delivery_date: "Datum dodání",
      slip: "Skluz (dny)",
    };
    downloadCSV(
      `projects-export-${scopeId}.csv`,
      projects,
      projectColumns,
      projectHeaderMap
    );
  };

  // Modal states
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [aiChatModalOpen, setAiChatModalOpen] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [savingProject, setSavingProject] = useState(false);

  const tabs = [
    { id: "overview", label: "Přehled", icon: "📊" },
    { id: "team", label: "Tým", icon: "👥" },
    { id: "projects", label: "Projekty", icon: "🚀" },
    { id: "burndown", label: "Burndown", icon: "📈" },
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
                      🔍 <span className="">Přehled scopů</span>
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span>Statistiky a rychlé akce</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Členové týmu */}
                  <div className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>
                    <div className="p-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                            <span className="text-white text-2xl">👥</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Členové týmu
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

                  {/* Aktivní projekty */}
                  <div
                    className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-green-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none"
                    style={{ animationDelay: "100ms" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-emerald-500/0 to-teal-500/0 group-hover:from-green-500/5 group-hover:via-emerald-500/5 group-hover:to-teal-500/5 transition-all duration-300 rounded-2xl"></div>
                    <div className="p-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                            <span className="text-white text-2xl">🚀</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Aktivní projekty
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

                  {/* Průměrný skluz */}
                  <div
                    className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-orange-500/10 animate-in slide-in-from-bottom-4 duration-300 motion-reduce:scale-100 motion-reduce:transition-none"
                    style={{ animationDelay: "200ms" }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-red-500/0 to-pink-500/0 group-hover:from-orange-500/5 group-hover:via-red-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>
                    <div className="p-6 relative">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg motion-reduce:scale-100 motion-reduce:transition-none">
                            <span className="text-white text-2xl">⏰</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Průměrný skluz
                          </p>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {loadingStats ? (
                              <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-20 rounded"></div>
                            ) : averageSlip ? (
                              <span
                                className={
                                  averageSlip.averageSlip > 0
                                    ? "text-red-600 dark:text-red-400"
                                    : averageSlip.averageSlip < 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-blue-600 dark:text-blue-400"
                                }
                              >
                                {averageSlip.averageSlip > 0
                                  ? `+${averageSlip.averageSlip} dní`
                                  : averageSlip.averageSlip < 0
                                    ? `${averageSlip.averageSlip} dní`
                                    : "Na čas"}
                              </span>
                            ) : (
                              "N/A"
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
                      ⚡ Rychlé akce
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    <span>Spravujte scope efektivně</span>
                  </div>
                </div>


                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Přidat člena */}
                  {!readOnlyMode && (
                    <button
                      onClick={() => setAddMemberModalOpen(true)}
                      className="relative group bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 text-2xl">👥</span>
                      <span className="relative z-10 text-sm font-semibold">
                        Přidat člena
                      </span>
                    </button>
                  )}

                  {/* Nový projekt */}
                  {!readOnlyMode && (
                    <button
                      onClick={() => setAddProjectModalOpen(true)}
                      className="relative group bg-gradient-to-br from-emerald-600 via-green-700 to-teal-600 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-green-800 to-teal-700 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 text-2xl">🚀</span>
                      <span className="relative z-10 text-sm font-semibold">
                        Nový projekt
                      </span>
                    </button>
                  )}

                  {/* Export týmu */}
                  <button
                    onClick={handleExportTeam}
                    className="relative group bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 text-2xl">📊</span>
                    <span className="relative z-10 text-sm font-semibold">
                      Export týmu
                    </span>
                  </button>

                  {/* Export projektů */}
                  <button
                    onClick={handleExportProjects}
                    className="relative group bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-teal-500/25 active:scale-95 flex flex-col items-center gap-3 motion-reduce:scale-100 motion-reduce:transition-none"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 text-2xl">📈</span>
                    <span className="relative z-10 text-sm font-semibold">
                      Export projektů
                    </span>
                  </button>

                  {/* Import týmu - Soon */}
                  {!readOnlyMode && (
                  <button
                    onClick={() => {}}
                    className="relative cursor-not-allowed opacity-50 bg-gradient-to-br from-teal-500 via-purple-500 to-pink-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 group motion-reduce:scale-100 motion-reduce:transition-none"
                    disabled={true}
                  >
                    <div className="absolute -top-2 -left-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      Soon
                    </div>
                    <span className="text-2xl">📥</span>
                    <span className="text-sm font-semibold">Import týmu</span>
                  </button>
                  )}
                  
                  {/* Import projektů - Soon */}
                  {!readOnlyMode && (
                  <button
                    onClick={() => {}}
                    className="relative cursor-not-allowed opacity-50 bg-gradient-to-br from-red-500 via-pink-500 to-purple-500 text-white rounded-xl p-4 hover:scale-105 transition-all duration-300 flex flex-col items-center gap-3 group motion-reduce:scale-100 motion-reduce:transition-none"
                    disabled={true}
                  >
                    <div className="absolute -top-2 -left-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                      Soon
                    </div>
                    <span className="text-2xl">📥</span>
                    <span className="text-sm font-semibold">
                      Import projektů
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
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
            <TeamSection
              scopeId={scopeId}
              team={team}
              onTeamChange={onTeamChange}
              readOnlyMode={readOnlyMode}
            />
          </div>
        );

      case "projects":
        return (
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
            <ProjectSection
              scopeId={scopeId}
              hasFE={hasFE}
              hasBE={hasBE}
              hasQA={hasQA}
              hasPM={hasPM}
              hasDPL={hasDPL}
              readOnlyMode={readOnlyMode}
            />
          </div>
        );

      case "burndown":
        return (
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
            <BurndownChart projects={projects} team={team} />
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
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? "z-10 relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white shadow-2xl shadow-blue-500/25 scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:scale-105 hover:shadow-lg motion-reduce:scale-100 motion-reduce:transition-none"
              }`}
              aria-label={tab.label}
              role="tab"
              aria-selected={activeTab === tab.id}
              id={`tab-${tab.id}`}
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
          hasFE={hasFE}
          hasBE={hasBE}
          hasQA={hasQA}
          hasPM={hasPM}
          hasDPL={hasDPL}
        />
      )}

      {aiChatModalOpen && (
        <AiChatModal
          isOpen={aiChatModalOpen}
          onClose={() => setAiChatModalOpen(false)}
          scopeId={scopeId}
        />
      )}
    </div>
  );
}
