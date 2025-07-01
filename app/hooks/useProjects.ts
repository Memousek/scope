/**
 * Custom hook for managing projects state and operations
 * Provides CRUD operations for projects with loading states and error handling
 */

import { useState, useCallback } from 'react';
import { Project } from '@/app/components/scope/types';
import { ProjectService, CreateProjectData } from '@/app/services/projectService';

export function useProjects(scopeId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load projects for the given scope
   */
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await ProjectService.loadProjects(scopeId);
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  /**
   * Add a new project to the scope
   */
  const addProject = useCallback(async (projectData: CreateProjectData) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await ProjectService.createProject(scopeId, projectData);
      setProjects(prev => [...prev, data]);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [scopeId]);

  /**
   * Update an existing project
   */
  const updateProject = useCallback(async (projectId: string, updates: Partial<Project>) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await ProjectService.updateProject(projectId, updates);
      setProjects(prev => prev.map(p => p.id === projectId ? data : p));
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete a project and its associated progress data
   */
  const deleteProject = useCallback(async (projectId: string) => {
    if (!confirm('Opravdu chcete tento projekt nenávratně smazat včetně všech dat?')) {
      return false;
    }

    setLoading(true);
    setError(null);
    
    try {
      await ProjectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    projects,
    loading,
    error,
    loadProjects,
    addProject,
    updateProject,
    deleteProject,
    clearError,
  };
} 