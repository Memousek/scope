"use client";
/**
 * Stránka Scope Burndown
 * - Přístupná pouze přihlášeným uživatelům (chráněná route)
 * - Každý scope má unikátní URL (dynamická route)
 * - UI podle zadání, data zatím mock
 * - Statické role (FE, QA, BE, PM, DPL), později editovatelné v Supabase
 * - Příprava na napojení na Supabase
 */

import { useEffect, useState, use, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

import { ModernScopeLayout } from "@/app/components/scope/ModernScopeLayout";
import { ShareModal } from "@/app/components/scope/ShareModal";
import { AiChatModal } from "@/app/components/scope/AiChatModal";
import { AiChatButton } from "@/app/components/scope/AiChatButton";
import { TeamMember, Project } from "@/app/components/scope/types";
import { useAuth } from "@/lib/auth";

import { ContainerService } from "@/lib/container.service";
import { GetScopeStatsService } from "@/lib/domain/services/get-scope-stats.service";
import { CalculateAverageSlipService } from "@/lib/domain/services/calculate-average-slip.service";
import { AddTeamMemberService } from "@/lib/domain/services/add-team-member.service";
import { AddProjectService } from "@/lib/domain/services/add-project.service";
import { CheckScopeOwnershipService } from "@/lib/domain/services/check-scope-ownership.service";

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



  const handleAddMember = async (member: { name: string; role: string; fte: number }) => {
    if (!userId) return;
    
    const addTeamMemberService = ContainerService.getInstance().get(AddTeamMemberService, { autobind: true });
    
    try {
      await addTeamMemberService.execute(id, {
        name: member.name,
        role: member.role,
        fte: member.fte,
      });
      
      // Refresh team data
      await fetchTeam();
    } catch (error) {
      console.error('Chyba při přidávání člena týmu:', error);
    }
  };

  const handleAddProject = async (project: Omit<Project, 'id' | 'created_at'>) => {
    if (!userId) return;
    
    const addProjectService = ContainerService.getInstance().get(AddProjectService, { autobind: true });
    
    try {
      await addProjectService.execute(id, {
        name: project.name,
        priority: project.priority,
        deliveryDate: project.delivery_date ? new Date(project.delivery_date) : undefined,
        feMandays: project.fe_mandays || 0,
        beMandays: project.be_mandays || 0,
        qaMandays: project.qa_mandays || 0,
        pmMandays: project.pm_mandays || 0,
        dplMandays: project.dpl_mandays || 0,
        feDone: project.fe_done || 0,
        beDone: project.be_done || 0,
        qaDone: project.qa_done || 0,
        pmDone: project.pm_done || 0,
        dplDone: project.dpl_done || 0,
        slip: 0, // Default value
      });
      
      // Refresh project data
      await fetchProjects();
    } catch (error) {
      console.error('Chyba při přidávání projektu:', error);
    }
  };

  // Načítání dat
  const fetchScope = useCallback(async () => {
    if (!userId) return;
    
    setFetching(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('scopes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Chyba při načítání scope:', error);
        return;
      }

      setScope(data);
      setDescription(data.description || '');
      setName(data.name || '');
    } catch (error) {
      console.error('Chyba při načítání scope:', error);
    } finally {
      setFetching(false);
    }
  }, [userId, id]);

  const fetchTeam = useCallback(async () => {
    if (!userId) return;
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('scope_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Chyba při načítání týmu:', error);
        return;
      }

      setTeam(data || []);
    } catch (error) {
      console.error('Chyba při načítání týmu:', error);
    }
  }, [userId, id]);

  const fetchProjects = useCallback(async () => {
    if (!userId) return;
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('scope_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Chyba při načítání projektů:', error);
        return;
      }

      setProjects(data || []);
    } catch (error) {
      console.error('Chyba při načítání projektů:', error);
    }
  }, [userId, id]);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    
    setLoadingStats(true);
    try {
      const getScopeStatsService = ContainerService.getInstance().get(GetScopeStatsService, { autobind: true });
      const stats = await getScopeStatsService.execute(id);
      setStats({
        projectCount: stats.projectCount,
        teamMemberCount: stats.teamMemberCount,
        lastActivity: stats.lastActivity,
      });
    } catch (error) {
      console.error('Chyba při načítání statistik:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [userId, id]);

  const fetchAverageSlip = useCallback(async () => {
    if (!userId) return;
    
    try {
      const calculateAverageSlipService = ContainerService.getInstance().get(CalculateAverageSlipService, { autobind: true });
      const averageSlip = await calculateAverageSlipService.execute(id);
      setAverageSlip(averageSlip);
    } catch (error) {
      console.error('Chyba při načítání průměrného skluzu:', error);
    }
  }, [userId, id]);

  const checkOwnership = useCallback(async () => {
    if (!userId) return;
    
    try {
      const checkScopeOwnershipService = ContainerService.getInstance().get(CheckScopeOwnershipService, { autobind: true });
      const isOwnerResult = await checkScopeOwnershipService.execute(id, userId);
      setIsOwner(isOwnerResult);
    } catch (error) {
      console.error('Chyba při kontrole vlastnictví:', error);
    }
  }, [userId, id]);

  // Načítání dat při mount
  useEffect(() => {
    if (!loading && user) {
      fetchScope();
      fetchTeam();
      fetchProjects();
      fetchStats();
      fetchAverageSlip();
      checkOwnership();
    }
  }, [loading, user, id, fetchScope, fetchTeam, fetchProjects, fetchStats, fetchAverageSlip, checkOwnership]);

  // Redirect pokud není přihlášen
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth/login';
    }
  }, [loading, user]);

  const handleSaveDescription = async () => {
    if (!userId) return;
    
    setSavingDescription(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('scopes')
        .update({ description })
        .eq('id', id);

      if (error) {
        console.error('Chyba při ukládání popisu:', error);
        return;
      }

      setEditingDescription(false);
    } catch (error) {
      console.error('Chyba při ukládání popisu:', error);
    } finally {
      setSavingDescription(false);
    }
  };

  const handleSaveName = async () => {
    if (!userId || !name.trim()) return;
    
    setSavingName(true);
    setErrorName(null);
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('scopes')
        .update({ name: name.trim() })
        .eq('id', id);

      if (error) {
        console.error('Chyba při ukládání názvu:', error);
        setErrorName('Chyba při ukládání názvu');
        return;
      }

      setEditingName(false);
      setScope(prev => prev ? { ...prev, name: name.trim() } : null);
    } catch (error) {
      console.error('Chyba při ukládání názvu:', error);
      setErrorName('Chyba při ukládání názvu');
    } finally {
      setSavingName(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!scope) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Scope nenalezen
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Požadovaný scope nebyl nalezen nebo nemáte oprávnění k jeho zobrazení.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">
                  {scope.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-3xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    >
                      {savingName ? 'Ukládám...' : '✓'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingName(false);
                        setName(scope.name);
                        setErrorName(null);
                      }}
                      className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {scope.name}
                    </h1>
                    {isOwner && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
                {errorName && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errorName}</p>
                )}
                <p className="text-gray-600 dark:text-gray-400">
                  Scope ID: {scope.id}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isOwner && (
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
                >
                  📤 Sdílet
                </button>
              )}
              <button
                onClick={() => setAiChatOpen(true)}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg opacity-50 cursor-not-allowed"
                disabled={true}
              >
                🤖 AI Chat
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            {editingDescription ? (
              <div className="flex items-start gap-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Přidejte popis scope..."
                  autoFocus
                />
                <button
                  onClick={handleSaveDescription}
                  disabled={savingDescription}
                  className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 px-3 py-1"
                >
                  {savingDescription ? 'Ukládám...' : '✓'}
                </button>
                <button
                  onClick={() => {
                    setEditingDescription(false);
                    setDescription(scope.description || '');
                  }}
                  className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 px-3 py-1"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-gray-600 dark:text-gray-400">
                  {description || 'Žádný popis'}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    ✏️
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
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
          onAddMember={handleAddMember}
          onAddProject={handleAddProject}
        />
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        scopeId={id}
        isOwner={isOwner}
      />

      <AiChatModal
        isOpen={aiChatOpen}
        onClose={() => setAiChatOpen(false)}
        scopeId={id}
      />

      <AiChatButton onClick={() => setAiChatOpen(true)} />
    </div>
  );
} 