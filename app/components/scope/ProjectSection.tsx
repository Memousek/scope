import { EditNoteModal } from "./EditNoteModal";
/**
 * Modern Project Section Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Kompletní správa projektů
 * - Moderní UI s gradient efekty
 * - Drag and drop pro změnu priority
 * - Skupinování projektů podle priority
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "@/lib/translation";
import { Project, ProjectDeliveryInfo, ProjectNote } from "./types";
import { useProjects } from "@/app/hooks/useProjects";
import { CreateProjectData } from "@/app/services/projectService";
import { useTeam } from "@/app/hooks/useTeam";
import { AddProjectModal } from "./AddProjectModal";
import { AddNoteModal } from "./AddNoteModal";
import { EditProjectModal } from "./EditProjectModal";
import { ProjectHistoryModal } from "./ProjectHistoryModal";
import { ProjectProgressChart } from "./ProjectProgressChart";
import { ProjectTeamAssignmentModal } from "./ProjectTeamAssignmentModal";
import { RoleDependenciesModal } from "./RoleDependenciesModal";
import {
  calculateProjectDeliveryInfoWithAssignments,
  calculateProjectDeliveryInfoWithWorkflow,
  calculatePriorityDatesWithAssignments,
  calculatePrioritySlippage,
} from "@/app/utils/dateUtils";
import { ContainerService } from "@/lib/container.service";
import { ManageProjectTeamAssignmentsService } from "@/lib/domain/services/manage-project-team-assignments.service";
import { ProjectTeamAssignment } from "@/lib/domain/models/project-team-assignment.model";
import {
  calculateRoleProgress,
  calculateTotalProgress,
} from "@/lib/utils/dynamicProjectRoles";
import { useScopeRoles } from "@/app/hooks/useScopeRoles";
import { User } from "@/lib/domain/models/user.model";
import { useSWRConfig } from "swr";

import { Badge } from "@/app/components/ui/Badge";
import { FiUsers, FiFolder, FiFilter, FiChevronDown, FiDelete, FiEdit } from "react-icons/fi";
import { ProjectStatusFilter, ProjectStatus } from "./ProjectStatusFilter";
import { ProjectStatusBadge } from "./ProjectStatusBadge";

interface ProjectSectionProps {
  scopeId: string;
  readOnlyMode?: boolean;
  user: User | undefined;
}

export function ProjectSection({
  scopeId,
  readOnlyMode = false,
  user,
}: ProjectSectionProps) {
  // SWR cache invalidation for usage after mutations
  const { mutate } = useSWRConfig();
  const [editNoteModalOpen, setEditNoteModalOpen] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState<ProjectNote | null>(null);
  // Funkce pro editaci a mazání poznámek
  const handleEditNote = (note: ProjectNote) => {
    setNoteToEdit(note);
    setEditNoteModalOpen(true);
  };

  const handleDeleteNote = async (note: ProjectNote) => {
    const { ProjectNoteService } = await import(
      "@/app/services/projectNoteService"
    );
    if (note.id) {
      await ProjectNoteService.deleteNote(note.id);
      await loadProjects();
    }
  };
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [noteProjectId, setNoteProjectId] = useState<string | null>(null);
  const { t } = useTranslation();
  const {
    projects,
    loading: projectsLoading,
    addProject,
    updateProject,
    deleteProject,
    loadProjects,
  } = useProjects(scopeId);

  const { team, loadTeam } = useTeam(scopeId);

  const { activeRoles } = useScopeRoles(scopeId);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [historyModalProject, setHistoryModalProject] =
    useState<Project | null>(null);
  const [teamAssignmentModalProject, setTeamAssignmentModalProject] =
    useState<Project | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [dependenciesModalProject, setDependenciesModalProject] =
    useState<Project | null>(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);

  // Project assignments state
  const [projectAssignments, setProjectAssignments] = useState<
    Record<string, ProjectTeamAssignment[]>
  >({});

  // Workflow dependencies state
  const [workflowDependencies, setWorkflowDependencies] = useState<
    Record<
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
    >
  >({});

  // Drag and drop state
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverProject, setDragOverProject] = useState<string | null>(null);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Load data on component mount
  useEffect(() => {
    const fetchProjectsAndNotes = async () => {
      await loadProjects();
    };
    fetchProjectsAndNotes();
  }, [loadProjects, loadTeam]);

  // Load workflow dependencies for all projects
  const loadWorkflowDependencies = useCallback(async () => {
    if (projects.length === 0) return;

    try {
      const { DependencyService } = await import(
        "@/app/services/dependencyService"
      );
      const dependencies: Record<
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
      > = {};

      for (const project of projects) {
        try {
          const projectDeps = await DependencyService.getProjectDependencies(
            project.id
          );
          dependencies[project.id] = projectDeps;
        } catch (error) {
          console.warn(
            `Failed to load dependencies for project ${project.id}:`,
            error
          );
          // Fallback na defaultní hodnoty s přiřazenými rolemi
          const assignments = projectAssignments[project.id] || [];
          const activeWorkers = assignments.map((assignment) => ({
            role: assignment.role,
            status: "waiting" as const,
          }));

          dependencies[project.id] = {
            workflow_type: "FE-First",
            dependencies: [],
            active_workers: activeWorkers,
          };
        }
      }

      setWorkflowDependencies(dependencies);
    } catch (error) {
      console.error("Chyba při načítání workflow dependencies:", error);
    }
  }, [projects, projectAssignments]);

  // Load workflow dependencies when projects or assignments change
  useEffect(() => {
    loadWorkflowDependencies();
  }, [loadWorkflowDependencies]);

  // Oprava duplicitních priorit a zajištění souvislých priorit od 1
  useEffect(() => {
    const fixPriorities = async () => {
      if (projects.length === 0) return;

      // Seřadíme projekty podle priority
      const sortedProjects = [...projects].sort(
        (a, b) => a.priority - b.priority
      );

      // Zkontrolujeme, zda jsou priority souvislé od 1
      let needsUpdate = false;
      for (let i = 0; i < sortedProjects.length; i++) {
        if (sortedProjects[i].priority !== i + 1) {
          needsUpdate = true;
          break;
        }
      }

      // Pokud priority nejsou souvislé od 1, přečíslujeme je
      if (needsUpdate) {
        const updatePromises = sortedProjects.map((project, index) => {
          const newPriority = index + 1;
          if (project.priority !== newPriority) {
            return updateProject(project.id, { priority: newPriority });
          }
          return Promise.resolve();
        });

        await Promise.all(updatePromises);
        await loadProjects();
      }
    };

    // Spustíme opravu pouze pokud neprobíhá drag and drop operace
    if (!isUpdatingPriority) {
      // Přidáme malé zpoždění pro zajištění, že se drag and drop operace dokončila
      const timeoutId = setTimeout(() => {
        fixPriorities();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [projects, updateProject, loadProjects, isUpdatingPriority]);

  const loadProjectAssignments = useCallback(async () => {
    try {
      const manageAssignmentsService = ContainerService.getInstance().get(
        ManageProjectTeamAssignmentsService,
        { autobind: true }
      );
      const assignmentsMap: Record<string, ProjectTeamAssignment[]> = {};

      for (const project of projects) {
        const assignments =
          await manageAssignmentsService.getProjectAssignments(project.id);
        assignmentsMap[project.id] = assignments;
      }

      setProjectAssignments(assignmentsMap);
    } catch (error) {
      console.error("Failed to load project assignments:", error);
    }
  }, [projects]);

  // Load project assignments when projects change
  useEffect(() => {
    if (projects.length > 0) {
      loadProjectAssignments();
    }
  }, [projects, loadProjectAssignments]);

  const handleAddProject = async (
    project: Omit<Project, "id" | "scope_id" | "created_at">
  ) => {
    try {
      // Najdeme nejvyšší dostupnou priority
      const existingPriorities = projects.map((p) => p.priority);
      const maxPriority =
        existingPriorities.length > 0 ? Math.max(...existingPriorities) : 0;
      const newPriority = maxPriority + 1;

      // Rozdělíme data na standardní a custom role
      const standardRoleKeys = ["fe", "be", "qa", "pm", "dpl"];
      const standardData: Record<string, unknown> = {};
      const customData: Record<string, number> = {};

      activeRoles.forEach((role) => {
        let cleanKey: string;

        if (standardRoleKeys.includes(role.key)) {
          // Standardní role - klíč je přímo fe, be, atd.
          cleanKey = role.key;
        } else {
          // Custom role - klíč obsahuje suffix, extrahujeme základní název
          cleanKey = role.key.replace(/_mandays$/, "").replace(/_done$/, "");
        }

        const mandaysKey = `${cleanKey}_mandays`;
        const doneKey = `${cleanKey}_done`;
        const mandaysValue =
          ((project as Record<string, unknown>)[mandaysKey] as number) || 0;
        const doneValue =
          ((project as Record<string, unknown>)[doneKey] as number) || 0;

        if (standardRoleKeys.includes(role.key)) {
          // Standardní role - přidáme do standardních sloupců
          standardData[mandaysKey] = mandaysValue;
          standardData[doneKey] = doneValue;
        } else {
          // Custom role - přidáme do custom data
          customData[mandaysKey] = mandaysValue;
          customData[doneKey] = doneValue;
        }
      });

      // Vytvoříme CreateProjectData objekt
      const projectData: CreateProjectData = {
        name: project.name as string,
        priority: newPriority,
        delivery_date: project.delivery_date as string | null,
        ...standardData,
        // Přidáme custom role data jako jednotlivé vlastnosti
        ...customData,
      };

      await addProject(projectData);
      // Refresh usage cache for this scope
      try { await mutate(["scopeUsage", scopeId]); } catch {}
      // Reload projects to get updated data
      await loadProjects();
    } catch (error) {
      console.error("Failed to add project:", error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      // Najdeme projekt, který se maže
      const projectToDelete = projects.find((p) => p.id === projectId);
      if (!projectToDelete) return;

      // Smažeme projekt
      await deleteProject(projectId);

      // Přečíslujeme priority zbývajících projektů
      const remainingProjects = projects.filter((p) => p.id !== projectId);
      const projectsToUpdate = remainingProjects
        .filter((p) => p.priority > projectToDelete.priority)
        .map((p) => ({
          ...p,
          priority: p.priority - 1,
        }));

      // Aktualizujeme priority
      for (const project of projectsToUpdate) {
        await updateProject(project.id, { priority: project.priority });
      }

      // Refresh usage cache for this scope
      try { await mutate(["scopeUsage", scopeId]); } catch {}
      // Reload projects to get updated order
      await loadProjects();
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  const handleOpenEditModal = (project: Project) => {
    setEditProject({ ...project });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditProject(null);
  };

  const handleProjectChange = async (updatedProject: Project) => {
    try {
      // Pokud je startedAt null, smaž ho z updates
      const updates = { ...updatedProject };
      if (updates.startedAt === null) {
        delete updates.startedAt;
      }
      await updateProject(updatedProject.id, updates);
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", project.id);

    // Add visual feedback
    if (dragRef.current) {
      dragRef.current.style.opacity = "0.5";
    }

    // Small delay to ensure drag state is set before visual feedback
    setTimeout(() => {
      // setIsDragging(true); // This line is removed
    }, 10);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
    setDragOverProject(null);
    // setIsDragging(false); // This line is removed

    // Remove visual feedback
    if (dragRef.current) {
      dragRef.current.style.opacity = "1";
    }

    // Ensure all drag states are cleared
    setTimeout(() => {
      setDragOverProject(null);
      // setIsDragging(false); // This line is removed
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverProject(projectId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're moving to a child element within the same project
    const relatedTarget = e.relatedTarget as Node;
    const currentTarget = e.currentTarget as Node;

    if (relatedTarget && currentTarget.contains(relatedTarget)) {
      return; // Don't clear if moving to a child element
    }

    setDragOverProject(null);
  };

  const handleDrop = async (e: React.DragEvent, targetProject: Project) => {
    e.preventDefault();

    if (!draggedProject || draggedProject.id === targetProject.id) {
      setDragOverProject(null);
      return;
    }

    try {
      setIsUpdatingPriority(true);

      // Získáme aktuální priority obou projektů
      const draggedPriority = draggedProject.priority;
      const targetPriority = targetProject.priority;

      // Pokud jsou priority stejné, nic neděláme (už je jen jeden projekt v sekci)
      if (draggedPriority === targetPriority) {
        setDragOverProject(null);
        return;
      }

      // Prohodíme priority obou projektů
      const updatePromises = [
        // Přesuneme dragged project na target priority
        updateProject(draggedProject.id, { priority: targetPriority }),
        // Přesuneme target project na dragged priority
        updateProject(targetProject.id, { priority: draggedPriority }),
      ];

      await Promise.all(updatePromises);

      // Reload projects to get updated order
      await loadProjects();
    } catch (error) {
      console.error("Failed to update project priority:", error);
    } finally {
      setIsUpdatingPriority(false);
      setDragOverProject(null);
    }
  };

  // Používáme dynamické role z hooku
  const projectRoles = useMemo(
    () =>
      activeRoles.map((role) => {
        // Získáme cleanKey (bez suffixů _mandays nebo _done)
        const cleanKey = role.key
          .replace(/_mandays$/, "")
          .replace(/_done$/, "");
        return {
          key: cleanKey,
          label: role.label,
          mandays: `${cleanKey}_mandays`,
          done: `${cleanKey}_done`,
          color: role.color,
        };
      }),
    [activeRoles]
  );

  // Optimalizace výpočtů pro každý projekt
  const projectCalculations = useMemo(() => {
    const calculations: Record<
      string,
      {
        info: ProjectDeliveryInfo;
        priorityDates:
          | {
              priorityStartDate: Date;
              priorityEndDate: Date;
              blockingProjectName?: string;
            }
          | undefined;
        totalProgress: number;
        formattedAssignments: Record<
          string,
          Array<{ teamMemberId: string; role: string; allocationFte: number }>
        >;
        prioritySlippage: number;
      }
    > = {};

    // Převést projectAssignments na správný formát pro calculatePriorityDatesWithAssignments
    const formattedAssignments: Record<
      string,
      Array<{ teamMemberId: string; role: string; allocationFte: number }>
    > = {};
    Object.entries(projectAssignments).forEach(([projectId, assignments]) => {
      formattedAssignments[projectId] = assignments.map((assignment) => ({
        teamMemberId: assignment.teamMemberId,
        role: assignment.role,
        allocationFte: assignment.allocationFte || 1,
      }));
    });

    const priorityDates = calculatePriorityDatesWithAssignments(
      projects,
      team,
      formattedAssignments,
      workflowDependencies
    );

    projects.forEach((project) => {
      // Use workflow-aware calculation if dependencies are available
      const projectDeps = workflowDependencies[project.id];
      const info = projectDeps
        ? calculateProjectDeliveryInfoWithWorkflow(
            project,
            team,
            projectAssignments[project.id] || [],
            projectDeps
          )
        : calculateProjectDeliveryInfoWithAssignments(
            project,
            team,
            projectAssignments[project.id] || []
          );

      const totalProgress = calculateTotalProgress(
        project as unknown as Record<string, unknown>,
        activeRoles
      );

      // Calculate slippage against priority deadline
      const prioritySlippage = priorityDates[project.id]?.priorityEndDate
        ? calculatePrioritySlippage(
            project,
            priorityDates[project.id].priorityEndDate,
            team,
            projectAssignments[project.id] || []
          )
        : 0;

      calculations[project.id] = {
        info,
        priorityDates: priorityDates[project.id],
        totalProgress,
        formattedAssignments,
        prioritySlippage,
      };
    });

    return calculations;
  }, [projects, team, projectAssignments, activeRoles, workflowDependencies]);

  // Skupinování projektů podle priority s filtrováním podle statusu
  const groupedProjects = useMemo(() => {
    // Filtrujeme projekty podle vybraných statusů
    let filteredProjects = projects;

    if (selectedStatuses.length > 0) {
      // Pokud jsou vybrané statusy, zobrazíme pouze projekty s těmito statusy
      filteredProjects = projects.filter((project) => {
        const projectStatus =
          (project.status as ProjectStatus) || "not_started";
        return selectedStatuses.includes(projectStatus);
      });
    } else {
      // Pokud nejsou vybrané žádné statusy, skryjeme dokončené, zrušené, přerušené a archivované projekty úplně
      filteredProjects = projects.filter((project) => {
        const projectStatus =
          (project.status as ProjectStatus) || "not_started";
        const shouldHide =
          projectStatus === "completed" ||
          projectStatus === "cancelled" ||
          projectStatus === "suspended" ||
          projectStatus === "archived";
        return !shouldHide;
      });
    }

    return filteredProjects.reduce(
      (groups, project) => {
        const priority = project.priority;
        if (!groups[priority]) {
          groups[priority] = [];
        }
        groups[priority].push(project);
        return groups;
      },
      {} as Record<number, Project[]>
    );
  }, [projects, selectedStatuses]);

  // Seřadit priority skupiny a přepočítat priority pro zobrazení
  const sortedPriorities = useMemo(() => {
    const priorities = Object.keys(groupedProjects)
      .map(Number)
      .sort((a, b) => a - b);

    // Vytvořit mapování pro přepočet priority na display priority
    const priorityMapping = new Map<number, number>();
    priorities.forEach((priority, index) => {
      priorityMapping.set(priority, index + 1);
    });

    // Vytvořit mapu priority -> displayPriority pro použití v renderování
    const displayPriorityMap: Record<number, number> = {};
    priorities.forEach((priority) => {
      displayPriorityMap[priority] = priorityMapping.get(priority) || priority;
    });

    return { priorities, displayPriorityMap };
  }, [groupedProjects]);

  const getRoleProgress = (project: Project, roleKey: string) => {
    // Najdeme roli podle cleanKey (bez suffixů)
    const role = activeRoles.find((r) => {
      const cleanKey = r.key.replace(/_mandays$/, "").replace(/_done$/, "");
      return cleanKey === roleKey;
    });
    if (!role) return null;
    return calculateRoleProgress(
      project as unknown as Record<string, unknown>,
      role
    );
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "from-red-500 to-pink-500";
      case 2:
        return "from-orange-500 to-red-500";
      case 3:
        return "from-yellow-500 to-orange-500";
      default:
        return "from-blue-500 to-purple-500";
    }
  };

  const hasTeamAssignments = (projectId: string) => {
    return (
      projectAssignments[projectId] && projectAssignments[projectId].length > 0
    );
  };

  const isRoleAssigned = (projectId: string, roleKey: string) => {
    const assignments = projectAssignments[projectId] || [];

    // Najdeme roli podle key a porovnáme s label
    const role = activeRoles.find((r) => {
      const cleanKey = r.key.replace(/_mandays$/, "").replace(/_done$/, "");
      return cleanKey === roleKey;
    });

    if (!role) {
      return false;
    }

    // Porovnáme label role s role v assignments
    const isAssigned = assignments.some(
      (assignment) => assignment.role.toLowerCase() === role.label.toLowerCase()
    );

    return isAssigned;
  };

  return (
    <>
      {!readOnlyMode && (
        <AddProjectModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAddProject={handleAddProject}
          savingProject={projectsLoading}
          scopeId={scopeId}
          existingProjects={projects}
        />
      )}

      {/* Projekty */}
      <section className="mb-8">
        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <h2 className="relative text-2xl font-bold dark:text-white text-gray-900">
                    <FiFolder className="inline mr-2" /> {t("projects")}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span>{t("projectsOverviewInScope")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`relative group px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2
                    ${
                      filterPanelOpen || selectedStatuses.length > 0
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                        : "bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90"
                    }
                  `}
                  onClick={() => setFilterPanelOpen((v) => !v)}
                  aria-pressed={filterPanelOpen}
                >
                  <FiFilter className="w-5 h-5" />
                  <span className="hidden sm:inline">{t("filter")}</span>
                  <FiChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${filterPanelOpen ? "rotate-180" : ""}`}
                  />
                  {selectedStatuses.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                      {selectedStatuses.length}
                    </span>
                  )}
                </button>
                {!readOnlyMode && (
                  <button
                    className="relative group bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95"
                    onClick={() => setAddModalOpen(true)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      {t("addProject")}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter panel (dropdown) */}
            {filterPanelOpen && (
              <div className="p-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-600/50 animate-in slide-in-from-top-4 fade-in duration-500">
                <ProjectStatusFilter
                  selectedStatuses={selectedStatuses}
                  onStatusChange={setSelectedStatuses}
                />
              </div>
            )}

            <div className="space-y-6">
              {projects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20"></div>
                    <div
                      className={`relative text-8xl flex items-center justify-center animate-bounce`}
                    >
                      <FiFolder />
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-xl font-medium mb-2">
                    {t("noProjects")}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Začněte přidáním prvního projektu
                  </p>
                </div>
              ) : (
                sortedPriorities.priorities.map((priority: number) => {
                  const projectsInGroup = groupedProjects[priority];

                  return (
                    <div key={priority} className="space-y-4">
                      {/* Priority Group Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">
                            {t("priority")} {" "}
                            {sortedPriorities.displayPriorityMap[priority] || priority}
                          </h3>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-600"></div>
                      </div>

                      {/* Projects in this priority group */}
                      <div className="space-y-4">
                        {projectsInGroup.map((project) => {
                          const calculations = projectCalculations[project.id];
                          const info = calculations.info;
                          const priorityDates = calculations.priorityDates;
                          const totalProgress = calculations.totalProgress;
                          const prioritySlippage =
                            calculations.prioritySlippage;

                          const isExpanded = expandedProject === project.id;
                          const isDragOver = dragOverProject === project.id;
                          const isBeingDragged =
                            draggedProject?.id === project.id;

                          return (
                            <div
                              key={project.id}
                              ref={isBeingDragged ? dragRef : null}
                              onDragOver={
                                !readOnlyMode ? handleDragOver : undefined
                              }
                              onDragEnter={
                                !readOnlyMode
                                  ? (e) => handleDragEnter(e, project.id)
                                  : undefined
                              }
                              onDragLeave={
                                !readOnlyMode ? handleDragLeave : undefined
                              }
                              onDrop={
                                !readOnlyMode
                                  ? (e) => handleDrop(e, project)
                                  : undefined
                              }
                              className={`
                                relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10
                                ${isDragOver ? "border-blue-500 border-2 bg-blue-50/50 dark:bg-blue-900/20 scale-105" : ""}
                                ${isBeingDragged ? "opacity-50 scale-95 " : ""}
                                ${isUpdatingPriority ? "pointer-events-none opacity-75" : ""}
                                animate-in slide-in-from-bottom-8 fade-in duration-700
                              `}
                            >
                              {/* Priority indicator */}
                              <div
                                className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${getPriorityColor(priority)}`}
                              ></div>

                              {/* Hover effect overlay */}
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl -z-10"></div>

                              {/* Drop zone indicators */}
                              {isDragOver &&
                                draggedProject?.id !== project.id && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-500 rounded-2xl flex items-center justify-center z-20">
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg">
                                      Přesunout sem
                                    </div>
                                  </div>
                                )}

                              {/* Loading overlay during priority update */}
                              {isUpdatingPriority && (
                                <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center rounded-2xl z-30">
                                  <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent"></div>
                                    <span className="text-sm font-semibold">
                                      Aktualizuji priority...
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Hlavní řádek */}
                              <div className="p-4 sm:p-6 relative">
                                {/* Desktop layout */}
                                <div className="hidden md:flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {/* Drag handle */}
                                    {!readOnlyMode && (
                                      <div
                                        draggable={true}
                                        onDragStart={(e) =>
                                          handleDragStart(e, project)
                                        }
                                        onDragEnd={handleDragEnd}
                                        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                                        title={t("dragToChangePriority")}
                                      >
                                        <svg
                                          className="w-5 h-5"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 8h16M4 16h16"
                                          />
                                        </svg>
                                      </div>
                                    )}

                                    {/* Project name and priority */}

                                    <div className="flex items-center gap-3">
                                      <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {project.name}
                                      </h4>
                                      {project.status && (
                                        <ProjectStatusBadge
                                          status={
                                            project.status as ProjectStatus
                                          }
                                        />
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-6">
                                    {/* Workflow status circle */}
                                    <div className="relative">
                                      {(() => {
                                        return (
                                          <>
                                            <svg
                                              className="w-16 h-16 transform -rotate-90"
                                              viewBox="0 0 36 36"
                                            >
                                              <path
                                                className="text-gray-200 dark:text-gray-600"
                                                fill="currentColor"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              />
                                              <path
                                                className="text-blue-500"
                                                fill="currentColor"
                                                strokeDasharray={`${totalProgress}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                              />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                {totalProgress}%
                                              </span>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>

                                    {/* Deadline and Slip */}
                                    <div className="text-right">
                                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                        {t("reserveOrSlip")}
                                      </div>
                                      <div
                                        className={`text-lg font-bold ${
                                          !hasTeamAssignments(project.id)
                                            ? "text-orange-600 dark:text-orange-400"
                                            : prioritySlippage >= 0
                                              ? "text-green-600 dark:text-green-400"
                                              : "text-red-600 dark:text-red-400"
                                        }`}
                                      >
                                        {!hasTeamAssignments(project.id)
                                          ? t("assignTeamMembers")
                                          : prioritySlippage >= 0
                                            ? `+${prioritySlippage} ${t("days")}`
                                            : `${prioritySlippage} ${t("days")}`}
                                      </div>
                                    </div>

                                    {/* Akce */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() =>
                                          setExpandedProject(
                                            isExpanded ? null : project.id
                                          )
                                        }
                                        className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl"
                                      >
                                        <svg
                                          className={`w-5 h-5 transform transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </button>

                                      <div className="flex items-center gap-1">
                                        {!readOnlyMode && (
                                          <button
                                            onClick={() =>
                                              setTeamAssignmentModalProject(
                                                project
                                              )
                                            }
                                            className="p-3 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-all duration-200 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl group"
                                            title={t("assignTeam")}
                                          >
                                            <FiUsers
                                              size={18}
                                              className="text-green-600"
                                            />
                                          </button>
                                        )}

                                        {!readOnlyMode && (
                                          <button
                                            onClick={() =>
                                              handleOpenEditModal(project)
                                            }
                                            className="p-3 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl group"
                                            title={t("edit")}
                                          >
                                            <svg
                                              className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                              />
                                            </svg>
                                          </button>
                                        )}

                                        {!readOnlyMode && (
                                          <button
                                            onClick={() =>
                                              setDependenciesModalProject(
                                                project
                                              )
                                            }
                                            className="p-3 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl group"
                                            title={t("roleDependencies")}
                                          >
                                            <svg
                                              className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                              />
                                            </svg>
                                          </button>
                                        )}

                                        {!readOnlyMode && (
                                          <button
                                            onClick={() =>
                                              setHistoryModalProject(project)
                                            }
                                            className="p-3 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl group"
                                            title={t("projectHistory")}
                                          >
                                            <svg
                                              className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                              />
                                            </svg>
                                          </button>
                                        )}

                                        {!readOnlyMode && (
                                          <button
                                            onClick={() =>
                                              handleDeleteProject(project.id)
                                            }
                                            className="p-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl group"
                                            title={t("delete")}
                                          >
                                            <svg
                                              className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                              />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Mobile layout */}
                                <div className="md:hidden space-y-4">
                                  {/* Header s názvem a akcemi */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {/* Drag handle */}
                                      {!readOnlyMode && (
                                        <div
                                          draggable={true}
                                          onDragStart={(e) =>
                                            handleDragStart(e, project)
                                          }
                                          onDragEnd={handleDragEnd}
                                          className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                                          title={t("dragToChangePriority")}
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M4 8h16M4 16h16"
                                            />
                                          </svg>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-2">
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                          {project.name}
                                        </h4>
                                        <span
                                          className={`bg-gradient-to-r ${getPriorityColor(priority)} text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg`}
                                        >
                                          {t("priority")} {project.priority}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Akce */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() =>
                                          setExpandedProject(
                                            isExpanded ? null : project.id
                                          )
                                        }
                                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                                      >
                                        <svg
                                          className={`w-4 h-4 transform transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                          />
                                        </svg>
                                      </button>

                                      {!readOnlyMode && (
                                        <button
                                          onClick={() =>
                                            setDependenciesModalProject(project)
                                          }
                                          className="p-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-all duration-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                                          title={t("roleDependencies")}
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M13 10V3L4 14h7v7l9-11h-7z"
                                            />
                                          </svg>
                                        </button>
                                      )}

                                      {!readOnlyMode && (
                                        <button
                                          onClick={() =>
                                            handleOpenEditModal(project)
                                          }
                                          className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                          title={t("edit")}
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                            />
                                          </svg>
                                        </button>
                                      )}

                                      {!readOnlyMode && (
                                        <button
                                          onClick={() =>
                                            handleDeleteProject(project.id)
                                          }
                                          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                          title={t("delete")}
                                        >
                                          <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Progress a termín */}
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* Progress circle */}
                                    <div className="flex items-center justify-center">
                                      <div className="relative">
                                        <svg
                                          className="w-12 h-12 transform -rotate-90"
                                          viewBox="0 0 36 36"
                                        >
                                          <path
                                            className="text-gray-200 dark:text-gray-600"
                                            fill="currentColor"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                          />
                                          <path
                                            className="text-blue-500"
                                            fill="currentColor"
                                            strokeDasharray={`${totalProgress}, 100`}
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                            {totalProgress}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Deadline */}
                                    <div className="text-center">
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        {t("reserveOrSlip")}
                                      </div>
                                      <div
                                        className={`text-sm font-bold ${
                                          !hasTeamAssignments(project.id)
                                            ? "text-orange-600 dark:text-orange-400"
                                            : prioritySlippage >= 0
                                              ? "text-green-600 dark:text-green-400"
                                              : "text-red-600 dark:text-red-400"
                                        }`}
                                      >
                                        {!hasTeamAssignments(project.id)
                                          ? t("assignTeamMembers")
                                          : prioritySlippage >= 0
                                            ? `+${prioritySlippage} ${t("days")}`
                                            : `${prioritySlippage} ${t("days")}`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Rozbalené detaily */}
                              {isExpanded && (
                                <div className="animate-in slide-in-from-top-4 duration-300 border-t border-gray-200/50 dark:border-gray-600/50 bg-gradient-to-br from-gray-50/50 via-white/30 to-gray-50/50 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-800/50">
                                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                    {/* Workflow and Active Workers */}
                                    {workflowDependencies[project.id] && (
                                      <div className="mb-6">
                                        <h4 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 flex items-center gap-2">
                                          <svg
                                            className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M13 10V3L4 14h7v7l9-11h-7z"
                                            />
                                          </svg>
                                          Workflow
                                        </h4>
                                        <div className="relative bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300">
                                          {/* Decorative elements */}
                                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-xl"></div>
                                          <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-lg"></div>

                                          <div className="relative z-10">
                                            <div className="flex items-center gap-3 mb-4">
                                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                                <span className="text-white text-sm font-bold">
                                                  {workflowDependencies[
                                                    project.id
                                                  ].workflow_type.charAt(0)}
                                                </span>
                                              </div>
                                              <div>
                                                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                                  {
                                                    workflowDependencies[
                                                      project.id
                                                    ].workflow_type
                                                  }
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                                  Workflow proces
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex flex-wrap gap-3 items-center">
                                            {(() => {
                                              // Seřadíme role podle workflow pořadí
                                              const workflowType =
                                                workflowDependencies[project.id]
                                                  .workflow_type;
                                              const workers = [
                                                ...workflowDependencies[
                                                  project.id
                                                ].active_workers,
                                              ];

                                              // Definujeme pořadí rolí podle workflow
                                              const workflowOrder: Record<
                                                string,
                                                string[]
                                              > = {
                                                "FE-First": [
                                                  "PM",
                                                  "FE",
                                                  "BE",
                                                  "QA",
                                                ],
                                                "BE-First": [
                                                  "PM",
                                                  "BE",
                                                  "FE",
                                                  "QA",
                                                ],
                                                "BE-FE-QA-PerformanceQA": [
                                                  "PM",
                                                  "BE",
                                                  "FE",
                                                  "QA",
                                                  "PerformanceQA",
                                                ],
                                                "Custom": [],
                                                Parallel: [
                                                  "PM",
                                                  "FE",
                                                  "BE",
                                                  "QA",
                                                ],
                                              };

                                              // Rozdělíme role na standardní a custom
                                              const standardRoles = [
                                                "PM",
                                                "FE",
                                                "BE",
                                                "QA",
                                                "PerformanceQA"
                                              ];
                                              const standardWorkers =
                                                workers.filter((worker) =>
                                                  standardRoles.some(
                                                    (role) =>
                                                      role.toLowerCase() ===
                                                      worker.role.toLowerCase()
                                                  )
                                                );
                                              const customWorkers =
                                                workers.filter(
                                                  (worker) =>
                                                    !standardRoles.some(
                                                      (role) =>
                                                        role.toLowerCase() ===
                                                        worker.role.toLowerCase()
                                                    )
                                                );

                                              // Seřadíme standardní role podle workflow pořadí
                                              const order = workflowOrder[
                                                workflowType
                                              ] || ["PM", "FE", "BE", "QA", "Custom"];
                                              standardWorkers.sort((a, b) => {
                                                const aIndex = order.findIndex(
                                                  (role) =>
                                                    role.toLowerCase() ===
                                                    a.role.toLowerCase()
                                                );
                                                const bIndex = order.findIndex(
                                                  (role) =>
                                                    role.toLowerCase() ===
                                                    b.role.toLowerCase()
                                                );
                                                return aIndex - bIndex;
                                              });

                                              // Spojíme standardní a custom role
                                              const allWorkers = [
                                                ...standardWorkers,
                                                ...customWorkers,
                                              ];
                                              const standardCount =
                                                standardWorkers.length;

                                              return allWorkers.map(
                                                (worker, index) => (
                                                  <React.Fragment key={index}>
                                                    {/* Vertikální čára před custom rolemi */}
                                                    {index === standardCount &&
                                                      customWorkers.length >
                                                        0 && (
                                                        <div className="flex items-center gap-3">
                                                          <div className="text-blue-500 dark:text-blue-400 font-bold">
                                                            ||
                                                          </div>
                                                        </div>
                                                      )}

                                                    <div
                                                      className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 hover:scale-105 ${
                                                        worker.status ===
                                                        "active"
                                                          ? "bg-gradient-to-br from-green-50/90 to-green-100/70 dark:from-green-900/20 dark:to-green-800/10 border-green-200/50 dark:border-green-600/30 shadow-lg hover:shadow-green-500/25"
                                                          : worker.status ===
                                                              "waiting"
                                                            ? "bg-gradient-to-br from-yellow-50/90 to-yellow-100/70 dark:from-yellow-900/20 dark:to-yellow-800/10 border-yellow-200/50 dark:border-yellow-600/30 shadow-lg hover:shadow-yellow-500/25"
                                                            : "bg-gradient-to-br from-red-50/90 to-red-100/70 dark:from-red-900/20 dark:to-red-800/10 border-red-200/50 dark:border-red-600/30 shadow-lg hover:shadow-red-500/25"
                                                      }`}
                                                    >
                                                      {/* Status indicator */}
                                                      <div
                                                        className={`w-3 h-3 rounded-full ${
                                                          worker.status ===
                                                          "active"
                                                            ? "bg-green-500 animate-pulse"
                                                            : worker.status ===
                                                                "waiting"
                                                              ? "bg-yellow-500"
                                                              : "bg-red-500"
                                                        }`}
                                                      ></div>
                                                      {worker.role.charAt(0) +
                                                        worker.role.charAt(1)}
                                                    </div>

                                                    {/* Šipka mezi rolemi (ale ne před custom rolemi) */}
                                                    {index <
                                                      allWorkers.length - 1 &&
                                                      !(
                                                        index ===
                                                          standardCount - 1 &&
                                                        customWorkers.length > 0
                                                      ) && (
                                                        <div className="flex items-center gap-1">
                                                          <span className="text-blue-500 dark:text-blue-400 font-bold">
                                                            →
                                                          </span>
                                                        </div>
                                                      )}
                                                  </React.Fragment>
                                                )
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Role progress */}
                                    <div>
                                      <h4 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 flex items-center gap-2">
                                        <svg
                                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                          />
                                        </svg>
                                        {t("roleAndProgress")}
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {projectRoles
                                          .filter((role) => {
                                            // Zobrazíme jen role, které mají odhad > 0
                                            const mandaysValue =
                                              ((
                                                project as unknown as Record<
                                                  string,
                                                  unknown
                                                >
                                              )[role.mandays] as number) || 0;
                                            return mandaysValue > 0;
                                          })
                                          .map((role) => {
                                            const progress = getRoleProgress(
                                              project,
                                              role.key
                                            );
                                            const isAssigned = isRoleAssigned(
                                              project.id,
                                              role.key
                                            );

                                            return (
                                              <div
                                                key={role.key}
                                                className="relative bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                              >
                                                {/* Badge pro nepřiřazené role */}
                                                {!isAssigned && (
                                                  <Badge
                                                    label={t("noTeamMember")}
                                                    variant="warning"
                                                  />
                                                )}

                                                <div className="flex items-center justify-between mb-2 sm:mb-3">
                                                  <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {role.label}
                                                  </span>
                                                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                    {progress
                                                      ? `${progress.done.toFixed(1)}/${progress.mandays.toFixed(1)} MD`
                                                      : "0/0 MD"}
                                                  </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 sm:h-3 overflow-hidden">
                                                  <div
                                                    className="h-2 sm:h-3 rounded-full transition-all duration-300 ease-out"
                                                    style={{
                                                      width: `${progress ? progress.percentage : 0}%`,
                                                      background: `linear-gradient(90deg, ${role.color}, ${role.color}dd)`,
                                                    }}
                                                  ></div>
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 font-medium">
                                                  {progress
                                                    ? `${progress.percentage}%`
                                                    : "0%"}{" "}
                                                  {t("done")}
                                                </div>
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>

                                    {/* Progress graf - skrytý na mobilu */}
                                    <div className="hidden sm:block">
                                      <ProjectProgressChart
                                        project={project}
                                        deliveryInfo={info}
                                        scopeId={scopeId}
                                        priorityDates={priorityDates}
                                        projectAssignments={
                                          projectAssignments[project.id] || []
                                        }
                                        prioritySlippage={prioritySlippage}
                                        className="mb-6"
                                      />
                                    </div>

                                    <div className="relative">
                                      {project.notes &&
                                      project.notes.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 relative">
                                          {project.notes.map((note, idx) => {
                                            const isAuthor =
                                              user &&
                                              note.author.id === user.id;
                                            const isScopeEditor =
                                              user &&
                                              user.role === "scope_editor";
                                            return (
                                              <div
                                                key={idx}
                                                className="relative bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                              >
                                                <div className="flex items-center justify-between mb-2">
                                                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                                    {note.author.fullName ||
                                                      note.author.email}
                                                  </span>
                                                  <div className="flex gap-2">
                                                    {isAuthor && (
                                                      <>
                                                        <button
                                                          className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded transition"
                                                          onClick={() =>
                                                            handleEditNote(note)
                                                          }
                                                          title="Upravit poznámku"
                                                        >
                                                          <FiEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                          className="text-red-500 hover:text-red-700 px-2 py-1 rounded transition"
                                                          onClick={() =>
                                                            handleDeleteNote(
                                                              note
                                                            )
                                                          }
                                                          title="Smazat poznámku"
                                                        >
                                                          <FiDelete className="w-4 h-4" />
                                                        </button>
                                                      </>
                                                    )}
                                                    {isScopeEditor &&
                                                      !isAuthor && (
                                                        <button
                                                          className="text-red-500 hover:text-red-700 px-2 py-1 rounded transition"
                                                          onClick={() =>
                                                            handleDeleteNote(
                                                              note
                                                            )
                                                          }
                                                          title="Smazat poznámku"
                                                        >
                                                          <FiDelete className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                  </div>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-line">
                                                  {note.text}
                                                </p>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                  {`${t("createdAt")}: ${new Date(note.createdAt).toLocaleDateString()} ${new Date(note.createdAt).toLocaleTimeString()}`}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-gray-500 dark:text-gray-400">
                                          Žádné poznámky
                                        </div>
                                      )}

                                      {!readOnlyMode && (
                                        <div className="absolute right-0 -top-10">
                                          <div className="flex justify-center">
                                            <button
                                              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-2 rounded-xl font-semibold shadow-md transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95"
                                              onClick={() => {
                                                setNoteProjectId(project.id);
                                                setAddNoteModalOpen(true);
                                              }}
                                            >
                                              <svg
                                                className="w-5 h-5 inline-block mr-2 align-middle"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                                />
                                              </svg>
                                              <span className="align-middle">
                                                {t("addNote")}
                                              </span>
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Deadlines */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                      {/* Zobrazíme plánovaný a vypočítaný termín pouze pokud je vyplněn delivery_date */}
                                      {project.delivery_date && (
                                        <>
                                          <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                                            <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                              <svg
                                                className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                />
                                              </svg>
                                              {t("plannedDeadline")}
                                            </div>
                                            <div className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                              {new Date(
                                                project.delivery_date
                                              ).toLocaleDateString()}
                                            </div>
                                          </div>
                                          <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                                            <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                              <svg
                                                className="w-3 h-3 sm:w-4 sm:h-4 text-green-500"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                              </svg>
                                              {t("calculatedDeadline")}
                                            </div>
                                            <div className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                              {info.calculatedDeliveryDate.toLocaleDateString()}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                      {priorityDates && (
                                        <div
                                          className={`bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg ${!project.delivery_date ? "sm:col-span-2 lg:col-span-3" : ""}`}
                                        >
                                          <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                            <svg
                                              className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M13 10V3L4 14h7v7l9-11h-7z"
                                              />
                                            </svg>
                                            {t("deadlineByPriority")}
                                          </div>
                                          <div className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium">
                                            <div>
                                              {t("from")}:{" "}
                                              {priorityDates?.priorityStartDate?.toLocaleDateString() ||
                                                t("notSet")}
                                            </div>
                                            <div>
                                              {t("to")}:{" "}
                                              {priorityDates?.priorityEndDate?.toLocaleDateString() ||
                                                t("notSet")}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal pro editaci poznámky */}
      {editNoteModalOpen && noteToEdit && (
        <EditNoteModal
          isOpen={editNoteModalOpen}
          onClose={() => {
            setEditNoteModalOpen(false);
            setNoteToEdit(null);
          }}
          initialText={noteToEdit.text}
          onSave={async (newText: string) => {
            const { ProjectNoteService } = await import(
              "@/app/services/projectNoteService"
            );
            if (noteToEdit.id) {
              await ProjectNoteService.updateNote(noteToEdit.id, newText);
              await loadProjects();
            } else {
              console.error("Cannot update note: id is undefined");
              console.log(noteToEdit);
            }
            setEditNoteModalOpen(false);
            setNoteToEdit(null);
          }}
        />
      )}
      {!readOnlyMode &&
        addNoteModalOpen &&
        noteProjectId &&
        (user ? (
          <AddNoteModal
            isOpen={addNoteModalOpen}
            onClose={() => {
              setAddNoteModalOpen(false);
              setNoteProjectId(null);
            }}
            currentUser={user}
            onSave={async (note) => {
              const { ProjectNoteService } = await import(
                "@/app/services/projectNoteService"
              );
              await ProjectNoteService.addNote({
                project_id: noteProjectId!,
                text: note.text,
                author_id: user.id,
                created_at: note.createdAt,
                updated_at: note.updatedAt,
              });
              // Vždy načti poznámky z backendu, aby měly id
              await loadProjects();
              setAddNoteModalOpen(false);
              setNoteProjectId(null);
            }}
          />
        ) : null)}

      {/* Modal pro editaci projektu */}
      {!readOnlyMode && editModalOpen && editProject && (
        <EditProjectModal
          isOpen={editModalOpen}
          onClose={handleCloseEditModal}
          project={editProject}
          onProjectChange={handleProjectChange}
          projectRoles={projectRoles}
        />
      )}

      {/* Modal pro historii úprav */}
      {!readOnlyMode && historyModalProject && (
        <ProjectHistoryModal
          project={historyModalProject}
          scopeId={scopeId}
          onClose={() => setHistoryModalProject(null)}
          onProjectUpdate={loadProjects}
        />
      )}

      {/* Modal pro přiřazení týmu */}
      {!readOnlyMode && teamAssignmentModalProject && (
        <ProjectTeamAssignmentModal
          isOpen={!!teamAssignmentModalProject}
          onClose={() => setTeamAssignmentModalProject(null)}
          project={teamAssignmentModalProject}
          scopeId={scopeId}
          onAssignmentsChange={loadProjectAssignments}
        />
      )}

      {/* Modal pro závislosti rolí */}
      {!readOnlyMode && dependenciesModalProject && (
        <RoleDependenciesModal
          isOpen={!!dependenciesModalProject}
          onClose={() => setDependenciesModalProject(null)}
          projectId={dependenciesModalProject.id}
          projectAssignments={
            projectAssignments[dependenciesModalProject.id]?.map(
              (assignment) => ({
                teamMemberId: assignment.teamMemberId,
                role: assignment.role,
              })
            ) || []
          }
          onWorkflowChange={() => {
            // Reload workflow dependencies after change
            const loadWorkflowDependencies = async () => {
              try {
                const { DependencyService } = await import(
                  "@/app/services/dependencyService"
                );
                const projectDeps =
                  await DependencyService.getProjectDependencies(
                    dependenciesModalProject.id
                  );
                setWorkflowDependencies((prev) => ({
                  ...prev,
                  [dependenciesModalProject.id]: projectDeps,
                }));
              } catch (error) {
                console.error("Failed to reload dependencies:", error);
              }
            };
            loadWorkflowDependencies();
          }}
          onWorkersChange={() => {
            // Reload workflow dependencies after change
            const loadWorkflowDependencies = async () => {
              try {
                const { DependencyService } = await import(
                  "@/app/services/dependencyService"
                );
                const projectDeps =
                  await DependencyService.getProjectDependencies(
                    dependenciesModalProject.id
                  );
                setWorkflowDependencies((prev) => ({
                  ...prev,
                  [dependenciesModalProject.id]: projectDeps,
                }));
              } catch (error) {
                console.error("Failed to reload dependencies:", error);
              }
            };
            loadWorkflowDependencies();
          }}
        />
      )}
    </>
  );
}
