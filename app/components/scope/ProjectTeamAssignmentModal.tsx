/**
 * Modal for managing team member assignments to projects
 * Allows adding/removing team members from specific projects
 */

import { useState, useEffect, useCallback } from "react";
import { FiPlus, FiUser, FiUsers, FiTrash2, FiUserPlus } from "react-icons/fi";
import { TeamMember, Project } from "./types";
import { useTranslation } from "@/lib/translation";
import { useTeam } from "@/app/hooks/useTeam";
import { ContainerService } from "@/lib/container.service";
import { ManageProjectTeamAssignmentsService } from "@/lib/domain/services/manage-project-team-assignments.service";
import { Modal } from "@/app/components/ui/Modal";

interface ProjectTeamAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  scopeId: string;
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
  scopeId,
  onAssignmentsChange
}: ProjectTeamAssignmentModalProps) {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedTeamMember, setSelectedTeamMember] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [allocationFte, setAllocationFte] = useState<number>(0);
  const { t } = useTranslation();
  const { team, loadTeam } = useTeam(scopeId);

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

  // Load current assignments and team
  useEffect(() => {
    if (isOpen && project) {
      loadAssignments();
      loadTeam();
    }
  }, [isOpen, project, loadAssignments, loadTeam]);

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
      setAllocationFte(0);

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

  const handleTeamMemberSelect = (teamMemberId: string) => {
    setSelectedTeamMember(teamMemberId);
    // Automatically set role based on team member's role
    const teamMember = team.find(tm => tm.id === teamMemberId);
    if (teamMember) {
      setSelectedRole(teamMember.role);
      // Automatically set FTE based on team member's FTE
      setAllocationFte(Number(teamMember.fte.toFixed(1)));
    }
  };

  const getAvailableTeamMembers = () => {
    const assignedMemberIds = assignments.map(a => a.teamMember.id);
    return team.filter(tm => !assignedMemberIds.includes(tm.id));
  };

  const availableTeamMembers = getAvailableTeamMembers();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('project_team_assignments')}
      description={`${t('manage_team')} - ${project.name}`}
      icon={<FiUsers size={24} className="text-white" />}
    >
      <div className="space-y-6">
        {/* Current Assignments */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FiUser className="text-blue-600" size={18} />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('current_assignments')}</h3>
          </div>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiUsers size={48} className="mx-auto mb-3 opacity-50" />
              <p>{t('no_team_assignments')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {assignment.teamMember.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {assignment.teamMember.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {assignment.role} • {assignment.allocationFte.toFixed(1)} FTE
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{assignment.role}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{assignment.allocationFte.toFixed(1)} FTE</div>
                    </div>
                    <button
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      disabled={loading}
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Assignment */}
        {availableTeamMembers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FiUserPlus className="text-green-600" size={18} />
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('add_team_member')}</h3>
            </div>
            
            <div className="space-y-4">
              {/* Team Member Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('team_member')}
                </label>
                <select
                  value={selectedTeamMember}
                  onChange={(e) => handleTeamMemberSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  disabled={loading}
                >
                  <option value="">{t('select_team_member')}</option>
                  {availableTeamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role}, {member.fte.toFixed(1)} FTE)
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Display (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('role_for_this_project')}
                </label>
                <input
                  type="text"
                  value={selectedRole}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
                  disabled={loading || !selectedTeamMember}
                />
              </div>

              {/* FTE Allocation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('time_allocation')} (FTE)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={allocationFte}
                  onChange={(e) => setAllocationFte(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              onClick={handleAddAssignment}
              disabled={!selectedTeamMember || loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('adding')}
                </>
              ) : (
                <>
                  <FiPlus size={18} />
                  {t('add')}
                </>
              )}
            </button>
          </div>
        )}

        {availableTeamMembers.length === 0 && assignments.length > 0 && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p>{t('all_team_members_assigned')}</p>
          </div>
        )}
      </div>
    </Modal>
  );
} 