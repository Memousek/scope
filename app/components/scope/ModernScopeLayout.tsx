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
  onExportTeam?: () => void;
  onExportProjects?: () => void;
  onAddMember?: (member: { name: string; role: string; fte: number }) => Promise<void>;
  onAddProject?: (project: Omit<Project, 'id' | 'scope_id' | 'created_at'>) => Promise<void>;
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
  onExportTeam,
  onAddMember,
  onAddProject,
}: ModernScopeLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">👥</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Členové týmu</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {loadingStats ? "..." : (stats?.teamMemberCount ?? team.length)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">🚀</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Aktivní projekty</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {loadingStats ? "..." : (stats?.projectCount ?? projects.length)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-sm rounded-xl p-6 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xl">⏰</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Průměrný skluz</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {loadingStats ? "..." : (
                        averageSlip ? (
                          averageSlip.averageSlip > 0 ? `+${averageSlip.averageSlip} dní` :
                          averageSlip.averageSlip < 0 ? `${averageSlip.averageSlip} dní` :
                          'Na čas'
                        ) : 'N/A'
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-purple-500">⚡</span>
                Rychlé akce
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button 
                  onClick={() => setAddMemberModalOpen(true)}
                  className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <span className="text-xl">👥</span>
                  <span className="text-sm font-medium">Přidat člena</span>
                </button>
                <button 
                  onClick={() => setAddProjectModalOpen(true)}
                  className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <span className="text-xl">🚀</span>
                  <span className="text-sm font-medium">Nový projekt</span>
                </button>
                <button 
                  onClick={() => setAiChatModalOpen(true)}
                  className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <span className="text-xl">🤖</span>
                  <span className="text-sm font-medium">AI Chat</span>
                </button>
              </div>
            </div>
          </div>
        );

      case "team":
        return (
          <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
            <TeamSection scopeId={scopeId} team={team} onTeamChange={onTeamChange} />
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
      <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl p-2">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                  : "text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 hover:scale-102"
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - automatická výška */}
      <div>
        {renderTabContent()}
      </div>

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