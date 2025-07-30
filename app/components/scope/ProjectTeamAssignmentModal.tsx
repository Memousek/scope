/**
 * Modal for managing team member assignments to projects
 * Allows adding/removing team members from specific projects
 */

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FiX, FiPlus, FiUser, FiUsers, FiTrash2, FiUserPlus } from "react-icons/fi";
import { TeamMember, Project } from "./types";
import { useTranslation } from "@/lib/translation";
import { ContainerService } from "@/lib/container.service";
import { ManageProjectTeamAssignmentsService } from "@/lib/domain/services/manage-project-team-assignments.service";

interface ProjectTeamAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  team: TeamMember[];
  onAssignmentsChange?: () => void;
}

interface AssignmentWithDetails {
  id: string;
  teamMember: TeamMember;
  role: string;
  allocationFte: number;
}

export function ProjectTeamAssignmentModal({
  isOpen,
  onClose,
  project,
  team,
  onAssignmentsChange
}: ProjectTeamAssignmentModalProps) {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [allocationFte, setAllocationFte] = useState<number>(1);
  const { t } = useTranslation();

  const manageAssignmentsService = ContainerService.getInstance().get(
    ManageProjectTeamAssignmentsService,
    { autobind: true }
  );

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const projectAssignments = await manageAssignmentsService.getProjectAssignments(project.id);
      setAssignments(projectAssignments.map(assignment => ({
        id: assignment.id,
        teamMember: assignment.teamMember,
        role: assignment.role,
        allocationFte: assignment.allocationFte
      })));
    } catch (error) {
      console.error("Chyba při načítání přiřazení:", error);
    } finally {
      setLoading(false);
    }
  }, [manageAssignmentsService, project.id]);

  // Load current assignments
  useEffect(() => {
    if (isOpen && project) {
      loadAssignments();
    }
  }, [isOpen, project, loadAssignments]);

  // Zavření modalu pomocí Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleAddAssignment = async () => {
    if (!selectedTeamMember || !selectedRole) return;

    setLoading(true);
    try {
      await manageAssignmentsService.createAssignment({
        projectId: project.id,
        teamMemberId: selectedTeamMember,
        role: selectedRole,
        allocationFte: allocationFte // Store FTE directly
      });

      // Reset form
      setSelectedTeamMember("");
      setSelectedRole("");
      setAllocationFte(1);
      setShowAddForm(false);

      // Reload assignments
      await loadAssignments();
      
      // Notify parent
      onAssignmentsChange?.();
    } catch (error) {
      console.error("Chyba při přidávání přiřazení:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    setLoading(true);
    try {
      await manageAssignmentsService.deleteAssignment(assignmentId);
      await loadAssignments();
      onAssignmentsChange?.();
    } catch (error) {
      console.error("Chyba při odstraňování přiřazení:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get available team members (not already assigned)
  const availableTeamMembers = team.filter(member => 
    !assignments.some(assignment => assignment.teamMember.id === member.id)
  );



  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* Backdrop s animací */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal s animací */}
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all duration-300 scale-100">
        {/* Header s gradientem */}
        <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 p-6 relative">
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
            onClick={onClose}
            aria-label={t('close')}
          >
            <FiX size={24} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <FiUsers size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{t('project_team_assignments')}</h2>
              <p className="text-white/80 text-sm">{project.name}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Assignments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="text-blue-600" size={18} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('current_assignments')}</h3>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {assignments.length} {assignments.length === 1 ? t('team_member') : t('team_member')}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-500 dark:text-gray-400">{t('loading')}…</span>
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiUsers size={48} className="mx-auto mb-3 opacity-50" />
                <p>{t('no_team_assignments')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <FiUser className="text-white" size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{assignment.teamMember.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {assignment.teamMember.role} • {assignment.teamMember.fte} FTE
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{assignment.role}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{assignment.allocationFte.toFixed(1)} FTE</div>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                        disabled={loading}
                        title={t('remove')}
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Assignment Section */}
          {availableTeamMembers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FiUserPlus className="text-green-600" size={18} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('add_team_member')}</h3>
              </div>

              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  disabled={loading}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-green-500 dark:hover:border-green-400 transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <FiPlus size={20} />
                    <span className="font-medium">{t('add_assignment')}</span>
                  </div>
                </button>
              ) : (
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('team_member')}
                    </label>
                    <select
                      value={selectedTeamMember}
                      onChange={(e) => {
                        setSelectedTeamMember(e.target.value);
                        // Automatically set role based on selected team member
                        if (e.target.value) {
                          const member = team.find(m => m.id === e.target.value);
                          if (member) {
                            setSelectedRole(member.role);
                          }
                        } else {
                          setSelectedRole("");
                        }
                      }}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      disabled={loading}
                    >
                      <option value="">{t('select_team_member')}</option>
                      {availableTeamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role}, {member.fte} FTE)
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTeamMember && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('role_for_this_project')}
                        </label>
                        <div className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white">
                          {selectedRole}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('time_allocation')} (FTE)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          max="2"
                          step="0.1"
                          value={allocationFte}
                          onChange={(e) => setAllocationFte(Number(e.target.value))}
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          disabled={loading}
                        />
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddAssignment}
                      disabled={!selectedTeamMember || !selectedRole || loading}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {loading ? t('adding') : t('add')}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setSelectedTeamMember("");
                        setSelectedRole("");
                        setAllocationFte(1);
                      }}
                      disabled={loading}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {availableTeamMembers.length === 0 && assignments.length > 0 && (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              {t('all_team_members_assigned')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 