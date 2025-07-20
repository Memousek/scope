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
}: ModernScopeLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");

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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{team.length}</p>
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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">3</p>
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
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">+5 dní</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-blue-500">📋</span>
                Poslední aktivita
              </h3>
              <div className="space-y-3">
                 <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                   <span className="text-sm text-gray-600 dark:text-gray-400">Projekt &quot;Test&quot; dokončen na 20%</span>
                   <span className="text-xs text-gray-500 ml-auto">2 hodiny zpět</span>
                 </div>
                 <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                   <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                   <span className="text-sm text-gray-600 dark:text-gray-400">Přidán nový člen týmu &quot;AAA&quot;</span>
                   <span className="text-xs text-gray-500 ml-auto">1 den zpět</span>
                 </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Aktualizován termín dodání projektu</span>
                  <span className="text-xs text-gray-500 ml-auto">3 dny zpět</span>
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
                <button className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2">
                  <span className="text-xl">👥</span>
                  <span className="text-sm font-medium">Přidat člena</span>
                </button>
                <button className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-lg hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2">
                  <span className="text-xl">🚀</span>
                  <span className="text-sm font-medium">Nový projekt</span>
                </button>
                <button className="p-4 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-lg hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2">
                  <span className="text-xl">📊</span>
                  <span className="text-sm font-medium">Export</span>
                </button>
                <button className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:scale-105 transition-all duration-200 flex flex-col items-center gap-2">
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

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>
    </div>
  );
} 