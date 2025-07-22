/**
 * Modern Project Section Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Kompletní správa projektů
 * - Moderní UI s gradient efekty
 * - Drag and drop pro změnu priority
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
      
      // Calculate new priority - always place before target
      const sortedProjects = [...projects].sort((a, b) => a.priority - b.priority);
      const draggedIndex = sortedProjects.findIndex(p => p.id === draggedProject.id);
      const targetIndex = sortedProjects.findIndex(p => p.id === targetProject.id);
      
      // Create new priority order - insert before target
      const newPriorityOrder = [...sortedProjects];
      const [draggedItem] = newPriorityOrder.splice(draggedIndex, 1);
      newPriorityOrder.splice(targetIndex, 0, draggedItem);
      
      // Update all projects with new sequential priorities
      const updatePromises = newPriorityOrder.map((project, index) => 
        updateProject(project.id, { priority: index + 1 })
      );
      
      await Promise.all(updatePromises);
      
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
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🚀 {t('projects')}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Přehled projektů v rámci scopey</span>
              </div>
            </div>
            <button
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 shadow-lg font-medium"
              onClick={() => setAddModalOpen(true)}
            >
              {t('addProject')}
            </button>
          </div>
          
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚀</div>
                <p className="text-gray-500 dark:text-gray-400 text-lg">{t('noProjects')}</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Začněte přidáním prvního projektu</p>
              </div>
            ) : (
              projects.map(project => {
                const info = calculateProjectDeliveryInfo(project, team);
                const priorityDates = calculatePriorityDates(projects, team)[project.id];
                const isExpanded = expandedProject === project.id;
                const isDragOver = dragOverProject === project.id;
                const isBeingDragged = draggedProject?.id === project.id;
                
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
                      relative bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-600/20 overflow-hidden hover:shadow-lg transition-all duration-300
                      ${isDragOver ? 'border-blue-500 border-2 bg-blue-50/50 dark:bg-blue-900/20' : ''}
                      ${isBeingDragged ? 'opacity-50 scale-95' : ''}
                      ${isDragging && !isBeingDragged ? 'cursor-grabbing' : 'cursor-grab'}
                      ${isUpdatingPriority ? 'pointer-events-none opacity-75' : ''}
                    `}
                  >
                    {/* Drop zone indicators */}
                    {isDragOver && draggedProject?.id !== project.id && (
                      <div className="absolute inset-0 bg-blue-500/5 border border-blue-500 rounded-xl flex items-center justify-center z-10">
                        <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                          Přesunout sem
                        </div>
                      </div>
                    )}
                    
                    {/* Loading overlay during priority update */}
                    {isUpdatingPriority && (
                      <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center rounded-xl">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          <span className="text-sm font-medium">Aktualizuji priority...</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Hlavní řádek */}
                    <div className="p-4 relative">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Drag handle */}
                          <div 
                            className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing transition-colors"
                            title="Přetáhněte pro změnu priority"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                          
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {project.name}
                          </h4>
                          <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            {t('priority')} {project.priority}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                                                     {/* Celkový progress */}
                           <div className="text-right">
                             <div className="text-sm text-gray-600 dark:text-gray-400">Celkový progress</div>
                             <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                               {calculateTotalProgress(project as unknown as Record<string, unknown>)}%
                             </div>
                           </div>
                          
                          {/* Termín a skluz */}
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-400">Termín</div>
                            <div className={`text-sm font-semibold ${
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                              <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(project)}
                                className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title={t('edit')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => setHistoryModalProject(project)}
                                className="p-2 text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                title={t('history')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                title={t('delete')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rozbalené detaily */}
                    {isExpanded && (
                      <div className="animate-in slide-in-from-top-2 duration-300 border-t border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="p-4 space-y-4">
                          {/* Role progress */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Progress podle rolí</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {projectRoles.map(role => {
                                const progress = getRoleProgress(project, role.key);
                                if (!progress) return null;
                                
                                                                                                  return (
                                  <div key={role.key} className="bg-white/80 dark:bg-gray-700/80 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{role.label}</span>
                                      <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {progress.done}/{progress.mandays} MD
                                      </span>
                                    </div>
                                                                         <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                       <div 
                                         className="h-2 rounded-full"
                                         style={{ 
                                           width: `${progress.percentage}%`,
                                           backgroundColor: role.color
                                         }}
                                       ></div>
                                     </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {progress.percentage}% hotovo
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          
                          {/* Progress graf */}
                          <ProjectProgressChart 
                            project={project} 
                            deliveryInfo={info}
                            priorityDates={priorityDates}
                            className="mb-4"
                          />
                          
                          {/* Termíny */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white/80 dark:bg-gray-700/80 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plánovaný termín</div>
                              <div className="text-gray-900 dark:text-gray-100">
                                {project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : 'Není nastaven'}
                              </div>
                            </div>
                            <div className="bg-white/80 dark:bg-gray-700/80 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vypočítaný termín</div>
                              <div className="text-gray-900 dark:text-gray-100">
                                {info.calculatedDeliveryDate.toLocaleDateString()}
                              </div>
                            </div>
                            {priorityDates && (
                              <div className="bg-white/80 dark:bg-gray-700/80 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Termín podle priority</div>
                                <div className="text-blue-600 dark:text-blue-400 text-sm">
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
              })
            )}
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