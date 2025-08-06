"use client";
/**
 * Stránka Scope Burndown View verze
 * - Každý scope má unikátní URL (dynamická route)
 * - UI podle zadání, data zatím mock
 * - Statické role (FE, QA, BE, PM, DPL), později editovatelné v Supabase
 * - Příprava na napojení na Supabase
 */

import { useEffect, useState, use, useCallback, useRef } from "react";

import { ModernScopeLayout } from "@/app/components/scope/ModernScopeLayout";
import { TeamMember, Project } from "@/app/components/scope/types";
import { ProjectTeamAssignment } from "@/lib/domain/models/project-team-assignment.model";
import { useAuth } from "@/lib/auth";

import { ContainerService } from "@/lib/container.service";
import { GetScopeStatsService } from "@/lib/domain/services/get-scope-stats.service";
import { CalculateAverageSlipService } from "@/lib/domain/services/calculate-average-slip.service";
import { AddTeamMemberService } from "@/lib/domain/services/add-team-member.service";
import { AddProjectService } from "@/lib/domain/services/add-project.service";

import { TeamService } from "@/app/services/teamService";
import { ProjectService } from "@/app/services/projectService";
import { ScopeService } from "@/app/services/scopeService";
import { useTranslation } from "@/lib/translation";

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

  // --- Tým ---
  const [team, setTeam] = useState<TeamMember[]>([]);

  // --- Projekty ---
  const [projects, setProjects] = useState<Project[]>([]);
  
  // --- Project Assignments ---
  const [projectAssignments, setProjectAssignments] = useState<Record<string, ProjectTeamAssignment[]>>({});
  
  // --- Workflow Dependencies ---
  const [workflowDependencies, setWorkflowDependencies] = useState<Record<string, {
    workflow_type: string;
    dependencies: Array<{ from: string; to: string; type: 'blocking' | 'waiting' | 'parallel' }>;
    active_workers: Array<{ role: string; status: 'active' | 'waiting' | 'blocked' }>;
  }>>({});

  // --- Statistiky ---
  const [stats, setStats] = useState<
    | {
        projectCount: number;
        teamMemberCount: number;
        lastActivity?: Date;
      }
    | undefined
  >(undefined);
  const [loadingStats, setLoadingStats] = useState(false);
  const [averageSlip, setAverageSlip] = useState<
    | {
        averageSlip: number;
        totalProjects: number;
        delayedProjects: number;
        onTimeProjects: number;
        aheadProjects: number;
      }
    | undefined
  >(undefined);
  const { t } = useTranslation();


  // Zjistím, které role jsou v týmu
  const teamRoles = Array.from(new Set(team.map((m) => m.role)));

  const handleAddMember = async (member: {
    name: string;
    role: string;
    fte: number;
  }) => {
    if (!userId) return;

    const addTeamMemberService = ContainerService.getInstance().get(
      AddTeamMemberService,
      { autobind: true }
    );

    try {
      await addTeamMemberService.execute(id, {
        name: member.name,
        role: member.role,
        fte: member.fte,
      });

      // Refresh team data
      await fetchTeam();
    } catch (error) {
      console.error("Chyba při přidávání člena týmu:", error);
    }
  };

  const handleAddProject = async (
    project: Omit<Project, "id" | "created_at">
  ) => {
    if (!userId) return;

    const addProjectService = ContainerService.getInstance().get(
      AddProjectService,
      { autobind: true }
    );

    try {
      // Vytvoříme dynamický objekt pro mandays a done hodnoty
      const projectData: Record<string, unknown> = {
        name: project.name,
        priority: project.priority,
        deliveryDate: project.delivery_date
          ? new Date(project.delivery_date as string)
          : undefined,
        slip: 0, // Default value
      };

      // Přidáme pole pro každou roli z týmu
      teamRoles.forEach(role => {
        const roleKey = role.toLowerCase();
        projectData[`${roleKey}Mandays`] = (project as Record<string, unknown>)[`${roleKey}_mandays`] ?? 0;
        projectData[`${roleKey}Done`] = (project as Record<string, unknown>)[`${roleKey}_done`] ?? 0;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await addProjectService.execute(id, projectData as any);

      // Refresh project data
      await fetchProjects();
    } catch (error) {
      console.error("Chyba při přidávání projektu:", error);
    }
  };

  // Načítání dat
  const fetchScope = useCallback(async () => {
    setFetching(true);
    try {
      const data = await ScopeService.loadScope(id);
      if (data) {
        setScope(data);
        setDescription(data.description || "");
      }
    } catch (error) {
      console.error("Chyba při načítání scope:", error);
    } finally {
      setFetching(false);
    }
  }, [id]);

  const fetchTeam = useCallback(async () => {
    try {
      const data = await TeamService.loadTeam(id);
      setTeam(data || []);
    } catch (error) {
      console.error("Chyba při načítání týmu:", error);
    }
  }, [id]);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await ProjectService.loadProjects(id);
      setProjects(data || []);
    } catch (error) {
      console.error("Chyba při načítání projektů:", error);
    }
  }, [id]);

  const fetchProjectAssignments = useCallback(async () => {
    try {
      const { ManageProjectTeamAssignmentsService } = await import('@/lib/domain/services/manage-project-team-assignments.service');
      const manageAssignmentsService = ContainerService.getInstance().get(
        ManageProjectTeamAssignmentsService,
        { autobind: true }
      );
      
      const assignmentsMap: Record<string, ProjectTeamAssignment[]> = {};
      const projectsData = await ProjectService.loadProjects(id);
      
      if (projectsData) {
        for (const project of projectsData) {
          const assignments = await manageAssignmentsService.getProjectAssignments(project.id);
          assignmentsMap[project.id] = assignments;
        }
      }
      
      setProjectAssignments(assignmentsMap);
    } catch (error) {
      console.error("Chyba při načítání project assignments:", error);
    }
  }, [id]);

  const fetchWorkflowDependencies = useCallback(async () => {
    try {
      const { DependencyService } = await import('@/app/services/dependencyService');
      const dependenciesMap: Record<string, {
        workflow_type: string;
        dependencies: Array<{ from: string; to: string; type: 'blocking' | 'waiting' | 'parallel' }>;
        active_workers: Array<{ role: string; status: 'active' | 'waiting' | 'blocked' }>;
      }> = {};
      const projectsData = await ProjectService.loadProjects(id);
      
      if (projectsData) {
        for (const project of projectsData) {
          try {
            const projectDeps = await DependencyService.getProjectDependencies(project.id);
            dependenciesMap[project.id] = projectDeps;
          } catch (error) {
            console.warn(`Failed to load dependencies for project ${project.id}:`, error);
            // Use default dependencies if loading fails
            dependenciesMap[project.id] = {
              workflow_type: 'FE-First',
              dependencies: [],
              active_workers: []
            };
          }
        }
      }
      
      setWorkflowDependencies(dependenciesMap);
    } catch (error) {
      console.error("Chyba při načítání workflow dependencies:", error);
    }
  }, [id]);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const getScopeStatsService = ContainerService.getInstance().get(
        GetScopeStatsService,
        { autobind: true }
      );
      const stats = await getScopeStatsService.execute(id);
      setStats({
        projectCount: stats.projectCount,
        teamMemberCount: stats.teamMemberCount,
        lastActivity: stats.lastActivity,
      });
    } catch (error) {
      console.error("Chyba při načítání statistik:", error);
    } finally {
      setLoadingStats(false);
    }
  }, [id]);

  const fetchAverageSlip = useCallback(async () => {
    try {
      const calculateAverageSlipService = ContainerService.getInstance().get(
        CalculateAverageSlipService,
        { autobind: true }
      );
      const averageSlip = await calculateAverageSlipService.execute(id);
      setAverageSlip(averageSlip);
    } catch (error) {
      console.error("Chyba při načítání průměrného skluzu:", error);
    }
  }, [id]);

  const checkOwnership = useCallback(async () => {
    if (!userId || !id) return;
    
    try {
      //setIsOwner(isOwnerResult);
    } catch (error) {
      console.error("Chyba při kontrole vlastnictví:", error);
    }
  }, [userId, id]);

  // Store functions in refs to prevent infinite loops
  const fetchFunctionsRef = useRef({
    fetchScope,
    fetchTeam,
    fetchProjects,
    fetchProjectAssignments,
    fetchWorkflowDependencies,
    fetchStats,
    fetchAverageSlip,
    checkOwnership
  });

  // Update refs when functions change
  useEffect(() => {
    fetchFunctionsRef.current = {
      fetchScope,
      fetchTeam,
      fetchProjects,
      fetchProjectAssignments,
      fetchWorkflowDependencies,
      fetchStats,
      fetchAverageSlip,
      checkOwnership
    };
  });

  // Načítání dat při mount
  useEffect(() => {
    // Data načítáme vždy, bez ohledu na přihlášení
    const {
      fetchScope,
      fetchTeam,
      fetchProjects,
      fetchProjectAssignments,
      fetchWorkflowDependencies,
      fetchStats,
      fetchAverageSlip,
      checkOwnership
    } = fetchFunctionsRef.current;
    
    fetchScope();
    fetchTeam();
    fetchProjects();
    fetchProjectAssignments();
    fetchWorkflowDependencies();
    fetchStats();
    fetchAverageSlip();
    
    // Kontrola vlastnictví pouze pro přihlášené uživatele
    if (!loading && user) {
      checkOwnership();
    }
  }, [loading, user, id]);

  // Nepřihlášení uživatelé mohou vidět stránku v read-only módu

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[90vh]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!scope) {
    return (
      <div className="flex items-center justify-center min-h-[90vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t("scopeNotFound")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t("scopeNotFoundDescription")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto px-4 py-8 relative">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 relative">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl font-bold">
                  {scope.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute top-5 right-5 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs font-bold px-2 py-1 rounded-full">
                {t("previewVersion")}
              </div>
              <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-white dark:text-gray-100">
                      {scope.name}
                    </h1>
                  </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Scope ID: {scope.id}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-start gap-2">
                <p className="text-gray-600 dark:text-gray-400">
                  {description || "Žádný popis"}
                </p>
              </div>
            </div>
          </div>

        {/* Main Content */}
        <ModernScopeLayout
          scopeId={id}
          team={team}
          projects={projects}
          projectAssignments={projectAssignments}
          workflowDependencies={workflowDependencies}
          onTeamChange={setTeam}
          stats={stats}
          loadingStats={loadingStats}
          averageSlip={averageSlip}
          onAddMember={user ? handleAddMember : undefined}
          onAddProject={user ? handleAddProject : undefined}
          readOnlyMode={true}
        />
      </div>
    </div>
  );
}
