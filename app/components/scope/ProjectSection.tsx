/**
 * Modern Project Section Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Kompletní správa projektů
 * - Moderní UI s gradient efekty
 * - Drag and drop pro změnu priority
 * - Skupinování projektů podle priority
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/translation';
import { useProjects } from '@/app/hooks/useProjects';
import { useTeam } from '@/app/hooks/useTeam';
import { Project } from './types';
import { AddProjectModal } from './AddProjectModal';
import { EditProjectModal } from './EditProjectModal';
import { ProjectHistoryModal } from './ProjectHistoryModal';
import { ProjectProgressChart } from './ProjectProgressChart';
import { calculateProjectDeliveryInfo, calculatePriorityDates } from '@/app/utils/dateUtils';
import { PROJECT_ROLES, calculateRoleProgress, calculateTotalProgress } from '@/lib/utils/projectRoles';

interface ProjectSectionProps {
  scopeId: string;
  hasFE: boolean;
  hasBE: boolean;
  hasQA: boolean;
  hasPM: boolean;
  hasDPL: boolean;
}

export function ProjectSection({ scopeId, hasFE, hasBE, hasQA, hasPM, hasDPL }: ProjectSectionProps) {
  const { t } = useTranslation();
  const { 
    projects, 
    loading: projectsLoading, 
    addProject, 
    updateProject, 
    deleteProject,
    loadProjects 
  } = useProjects(scopeId);
  
  const { 
    team, 
    loadTeam 
  } = useTeam(scopeId);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [historyModalProject, setHistoryModalProject] = useState<Project | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  
  // Drag and drop state
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverProject, setDragOverProject] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Load data on component mount
  useEffect(() => {
    loadProjects();
    loadTeam();
  }, [loadProjects, loadTeam]);

  const handleAddProject = async (project: Omit<Project, 'id' | 'scope_id' | 'created_at'>) => {
    try {
      await addProject(project);
    } catch (error) {
      console.error('Failed to add project:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
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
      await updateProject(updatedProject.id, updatedProject);
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', project.id);
    
    // Add visual feedback
    if (dragRef.current) {
      dragRef.current.style.opacity = '0.5';
    }
    
    // Small delay to ensure drag state is set before visual feedback
    setTimeout(() => {
      setIsDragging(true);
    }, 10);
  };

  const handleDragEnd = () => {
    setDraggedProject(null);
    setDragOverProject(null);
    setIsDragging(false);
    
    // Remove visual feedback
    if (dragRef.current) {
      dragRef.current.style.opacity = '1';
    }
    
    // Ensure all drag states are cleared
    setTimeout(() => {
      setDragOverProject(null);
      setIsDragging(false);
    }, 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
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
      
      // Get current priority groups
      const currentGroups = projects.reduce((groups, project) => {
        const priority = project.priority;
        if (!groups[priority]) {
          groups[priority] = [];
        }
        groups[priority].push(project);
        return groups;
      }, {} as Record<number, Project[]>);
      
      // Find which group the dragged project should move to
      const targetPriority = targetProject.priority;
      const draggedPriority = draggedProject.priority;
      
      // If moving to same priority group, just reorder within the group
      if (draggedPriority === targetPriority) {
        const groupProjects = currentGroups[targetPriority];
        const draggedIndex = groupProjects.findIndex(p => p.id === draggedProject.id);
        const targetIndex = groupProjects.findIndex(p => p.id === targetProject.id);
        
        // Reorder within the group
        const reorderedGroup = [...groupProjects];
        const [draggedItem] = reorderedGroup.splice(draggedIndex, 1);
        reorderedGroup.splice(targetIndex, 0, draggedItem);
        
                 // Update all projects in this group with their new order
         const updatePromises = reorderedGroup.map((project) => 
           updateProject(project.id, { priority: targetPriority })
         );
        
        await Promise.all(updatePromises);
      } else {
        // Moving to different priority group
        // Remove from old group and add to new group
        const oldGroup = currentGroups[draggedPriority] || [];
        const newGroup = currentGroups[targetPriority] || [];
        
        // Remove dragged project from old group
        const updatedOldGroup = oldGroup.filter(p => p.id !== draggedProject.id);
        
        // Add to new group at the position of target project
        const targetIndex = newGroup.findIndex(p => p.id === targetProject.id);
        const updatedNewGroup = [...newGroup];
        updatedNewGroup.splice(targetIndex, 0, draggedProject);
        
        // Update all projects
        const updatePromises = [
          // Update dragged project with new priority
          updateProject(draggedProject.id, { priority: targetPriority }),
          // Update other projects in old group (if any)
          ...updatedOldGroup.map(project => 
            updateProject(project.id, { priority: draggedPriority })
          ),
          // Update other projects in new group
          ...updatedNewGroup.filter(p => p.id !== draggedProject.id).map(project => 
            updateProject(project.id, { priority: targetPriority })
          )
        ];
        
        await Promise.all(updatePromises);
      }
      
      // Reload projects to get updated order
      await loadProjects();
      
    } catch (error) {
      console.error('Failed to update project priority:', error);
    } finally {
      setIsUpdatingPriority(false);
      setDragOverProject(null);
    }
  };

  // Používáme centralizované role z utility
  const projectRoles = PROJECT_ROLES.map(role => ({
    key: role.key,
    label: role.label,
    mandays: role.mandaysKey,
    done: role.doneKey,
    color: role.color
  }));

  const getRoleProgress = (project: Project, roleKey: string) => {
    return calculateRoleProgress(project as unknown as Record<string, unknown>, roleKey);
  };

  // Skupinování projektů podle priority
  const groupedProjects = projects.reduce((groups, project) => {
    const priority = project.priority;
    if (!groups[priority]) {
      groups[priority] = [];
    }
    groups[priority].push(project);
    return groups;
  }, {} as Record<number, Project[]>);

  // Seřadit priority skupiny
  const sortedPriorities = Object.keys(groupedProjects)
    .map(Number)
    .sort((a, b) => a - b);

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'from-red-500 to-pink-500';
      case 2: return 'from-orange-500 to-red-500';
      case 3: return 'from-yellow-500 to-orange-500';
      default: return 'from-blue-500 to-purple-500';
    }
  };

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 1: return '🔥';
      case 2: return '⚡';
      case 3: return '💡';
      default: return '📋';
    }
  };

  return (
    <>
      <AddProjectModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddProject={handleAddProject}
        savingProject={projectsLoading}
        hasFE={hasFE}
        hasBE={hasBE}
        hasQA={hasQA}
        hasPM={hasPM}
        hasDPL={hasDPL}
      />

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
                  <h2 className="relative text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    🚀 {t('projects')}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span>Přehled projektů v rámci scopey</span>
                </div>
              </div>
              <button
                className="relative group bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95"
                onClick={() => setAddModalOpen(true)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t('addProject')}
                </span>
              </button>
            </div>
            
            <div className="space-y-6">
              {projects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20"></div>
                    <div className="relative text-8xl">🚀</div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-xl font-medium mb-2">{t('noProjects')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Začněte přidáním prvního projektu</p>
                </div>
              ) : (
                sortedPriorities.map((priority) => {
                  const projectsInGroup = groupedProjects[priority];
                  
                  return (
                    <div key={priority} className="space-y-4">
                      {/* Priority Group Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getPriorityIcon(priority)}</span>
                          <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Priorita {priority}
                          </h3>
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-600"></div>
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {projectsInGroup.length} {projectsInGroup.length === 1 ? 'projekt' : projectsInGroup.length < 5 ? 'projekty' : 'projektů'}
                        </span>
                      </div>
                      
                      {/* Projects in this priority group */}
                      <div className="space-y-4">
                        {projectsInGroup.map((project) => {
                          const info = calculateProjectDeliveryInfo(project, team);
                          const priorityDates = calculatePriorityDates(projects, team)[project.id];
                          const isExpanded = expandedProject === project.id;
                          const isDragOver = dragOverProject === project.id;
                          const isBeingDragged = draggedProject?.id === project.id;
                          const totalProgress = calculateTotalProgress(project as unknown as Record<string, unknown>);
                          
                          return (
                            <div 
                              key={project.id} 
                              ref={isBeingDragged ? dragRef : null}
                              draggable
                              onDragStart={(e) => handleDragStart(e, project)}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDragEnter={(e) => handleDragEnter(e, project.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, project)}
                              className={`
                                relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10
                                ${isDragOver ? 'border-blue-500 border-2 bg-blue-50/50 dark:bg-blue-900/20 scale-105' : ''}
                                ${isBeingDragged ? 'opacity-50 scale-95 rotate-2' : ''}
                                ${isDragging && !isBeingDragged ? 'cursor-grabbing' : 'cursor-grab'}
                                ${isUpdatingPriority ? 'pointer-events-none opacity-75' : ''}
                                animate-in slide-in-from-bottom-8 fade-in duration-700
                              `}
                            >
                              {/* Priority indicator */}
                              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${getPriorityColor(priority)}`}></div>
                              
                              {/* Hover effect overlay */}
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500 rounded-2xl"></div>
                              
                              {/* Drop zone indicators */}
                              {isDragOver && draggedProject?.id !== project.id && (
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
                                    <span className="text-sm font-semibold">Aktualizuji priority...</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Hlavní řádek */}
                              <div className="p-4 sm:p-6 relative">
                                {/* Desktop layout */}
                                <div className="hidden md:flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    {/* Drag handle */}
                                    <div 
                                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                                      title="Přetáhněte pro změnu priority"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                      </svg>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                        {project.name}
                                      </h4>
                                      <span className={`bg-gradient-to-r ${getPriorityColor(priority)} text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg`}>
                                        {t('priority')} {project.priority}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6">
                                    {/* Progress circle */}
                                    <div className="relative">
                                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
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
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{totalProgress}%</span>
                                      </div>
                                    </div>
                                    
                                    {/* Termín a skluz */}
                                    <div className="text-right">
                                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Termín</div>
                                      <div className={`text-lg font-bold ${
                                        info.diffWorkdays && info.diffWorkdays >= 0 
                                          ? 'text-green-600 dark:text-green-400' 
                                          : 'text-red-600 dark:text-red-400'
                                      }`}>
                                        {info.diffWorkdays === null ? 'N/A' : 
                                         info.diffWorkdays >= 0 ? `+${info.diffWorkdays} dní` : 
                                         `${info.diffWorkdays} dní`}
                                      </div>
                                    </div>
                                    
                                    {/* Akce */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                        className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl"
                                      >
                                        <svg className={`w-5 h-5 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                      
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleOpenEditModal(project)}
                                          className="p-3 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl group"
                                          title={t('edit')}
                                        >
                                          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                        </button>
                                        
                                        <button
                                          onClick={() => setHistoryModalProject(project)}
                                          className="p-3 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl group"
                                          title={t('history')}
                                        >
                                          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                        </button>
                                        
                                        <button
                                          onClick={() => handleDeleteProject(project.id)}
                                          className="p-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl group"
                                          title={t('delete')}
                                        >
                                          <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
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
                                      <div 
                                        className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                                        title="Přetáhněte pro změnu priority"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                        </svg>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                          {project.name}
                                        </h4>
                                        <span className={`bg-gradient-to-r ${getPriorityColor(priority)} text-white px-2 py-1 rounded-full text-xs font-semibold shadow-lg`}>
                                          {t('priority')} {project.priority}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {/* Akce */}
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                                      >
                                        <svg className={`w-4 h-4 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </button>
                                      
                                      <button
                                        onClick={() => handleOpenEditModal(project)}
                                        className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                                        title={t('edit')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      
                                      <button
                                        onClick={() => handleDeleteProject(project.id)}
                                        className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                        title={t('delete')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Progress a termín */}
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* Progress circle */}
                                    <div className="flex items-center justify-center">
                                      <div className="relative">
                                        <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
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
                                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{totalProgress}%</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Termín */}
                                    <div className="text-center">
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Termín</div>
                                      <div className={`text-sm font-bold ${
                                        info.diffWorkdays && info.diffWorkdays >= 0 
                                          ? 'text-green-600 dark:text-green-400' 
                                          : 'text-red-600 dark:text-red-400'
                                      }`}>
                                        {info.diffWorkdays === null ? 'N/A' : 
                                         info.diffWorkdays >= 0 ? `+${info.diffWorkdays} dní` : 
                                         `${info.diffWorkdays} dní`}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Rozbalené detaily */}
                              {isExpanded && (
                                <div className="animate-in slide-in-from-top-4 duration-500 border-t border-gray-200/50 dark:border-gray-600/50 bg-gradient-to-br from-gray-50/50 via-white/30 to-gray-50/50 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-800/50">
                                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                    {/* Role progress */}
                                    <div>
                                      <h4 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 sm:mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                        Progress podle rolí
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                        {projectRoles.map(role => {
                                          const progress = getRoleProgress(project, role.key);
                                          if (!progress) return null;
                                          
                                          return (
                                            <div key={role.key} className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                                              <div className="flex items-center justify-between mb-2 sm:mb-3">
                                                <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">{role.label}</span>
                                                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                  {progress.done}/{progress.mandays} MD
                                                </span>
                                              </div>
                                              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 sm:h-3 overflow-hidden">
                                                <div 
                                                  className="h-2 sm:h-3 rounded-full transition-all duration-500 ease-out"
                                                  style={{ 
                                                    width: `${progress.percentage}%`,
                                                    background: `linear-gradient(90deg, ${role.color}, ${role.color}dd)`
                                                  }}
                                                ></div>
                                              </div>
                                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 font-medium">
                                                {progress.percentage}% hotovo
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
                                        priorityDates={priorityDates}
                                        className="mb-6"
                                      />
                                    </div>
                                    
                                    {/* Termíny */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                      <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                                        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          Plánovaný termín
                                        </div>
                                        <div className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                          {project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : 'Není nastaven'}
                                        </div>
                                      </div>
                                      <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                                        <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Vypočítaný termín
                                        </div>
                                        <div className="text-gray-900 dark:text-gray-100 font-medium text-sm">
                                          {info.calculatedDeliveryDate.toLocaleDateString()}
                                        </div>
                                      </div>
                                      {priorityDates && (
                                        <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                                          <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Termín podle priority
                                          </div>
                                          <div className="text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-medium">
                                            <div>Od: {priorityDates.priorityStartDate.toLocaleDateString()}</div>
                                            <div>Do: {priorityDates.priorityEndDate.toLocaleDateString()}</div>
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

      {/* Modal pro editaci projektu */}
      {editModalOpen && editProject && (
        <EditProjectModal
          isOpen={editModalOpen}
          onClose={handleCloseEditModal}
          project={editProject}
          onProjectChange={handleProjectChange}
          projectRoles={projectRoles}
        />
      )}

      {/* Modal pro historii úprav */}
      {historyModalProject && (
        <ProjectHistoryModal
          project={historyModalProject}
          onClose={() => setHistoryModalProject(null)}
          onProjectUpdate={loadProjects}
        />
      )}
    </>
  );
} 