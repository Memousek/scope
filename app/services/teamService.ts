/**
 * Service layer for team-related API operations
 * Centralizes all Supabase calls for team members
 */

import { createClient } from '@/lib/supabase/client';
import { TeamMember } from '@/app/components/scope/types';
import { ContainerService } from '@/lib/container.service';
import { TeamMemberRepository } from '@/lib/domain/repositories/team-member.repository';

export interface CreateTeamMemberData {
  name: string;
  role: string;
  fte: number;
  mdRate?: number;
  costMdRate?: number;
  vacations?: Array<{ start: string; end: string; note?: string }>;
}

export class TeamService {
  /**
   * Load all team members for a scope
   */
  static async loadTeam(scopeId: string): Promise<TeamMember[]> {
    const teamMemberRepository = ContainerService.getInstance().get(TeamMemberRepository);
    const domainTeamMembers = await teamMemberRepository.findByScopeId(scopeId);
    
    // Map domain team members to component team members
    return domainTeamMembers.map(domainMember => ({
      id: domainMember.id,
      scopeId: domainMember.scopeId,
      name: domainMember.name,
      role: domainMember.role,
      fte: domainMember.fte,
      mdRate: domainMember.mdRate,
      costMdRate: domainMember.costMdRate,
      vacations: domainMember.vacations,
      createdAt: domainMember.createdAt
    }));
  }

  /**
   * Get single team member by id (includes vacations when column exists)
   */
  static async getTeamMemberById(memberId: string): Promise<TeamMember | null> {
    const teamMemberRepository = ContainerService.getInstance().get(TeamMemberRepository);
    const domainMember = await teamMemberRepository.findById(memberId);
    
    if (!domainMember) return null;
    
    return {
      id: domainMember.id,
      scopeId: domainMember.scopeId,
      name: domainMember.name,
      role: domainMember.role,
      fte: domainMember.fte,
      mdRate: domainMember.mdRate,
      costMdRate: domainMember.costMdRate,
      vacations: domainMember.vacations,
      createdAt: domainMember.createdAt
    };
  }

  /**
   * Create a new team member
   */
  static async createTeamMember(scopeId: string, memberData: CreateTeamMemberData): Promise<TeamMember> {
    const teamMemberRepository = ContainerService.getInstance().get(TeamMemberRepository);
    
    const domainMember = await teamMemberRepository.create({
      scopeId,
      name: memberData.name,
      role: memberData.role,
      fte: memberData.fte,
      mdRate: memberData.mdRate,
      costMdRate: memberData.costMdRate,
      vacations: memberData.vacations
    });
    
    return {
      id: domainMember.id,
      scopeId: domainMember.scopeId,
      name: domainMember.name,
      role: domainMember.role,
      fte: domainMember.fte,
      mdRate: domainMember.mdRate,
      costMdRate: domainMember.costMdRate,
      vacations: domainMember.vacations,
      createdAt: domainMember.createdAt
    };
  }

  /**
   * Update an existing team member
   */
  static async updateTeamMember(memberId: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const teamMemberRepository = ContainerService.getInstance().get(TeamMemberRepository);
    
    // Map component updates to domain updates
    const domainUpdates: Partial<import('../../lib/domain/models/team-member.model').TeamMember> = {};
    if (updates.name !== undefined) domainUpdates.name = updates.name;
    if (updates.role !== undefined) domainUpdates.role = updates.role;
    if (updates.fte !== undefined) domainUpdates.fte = updates.fte;
    if (updates.mdRate !== undefined) domainUpdates.mdRate = updates.mdRate;
    if (updates.costMdRate !== undefined) domainUpdates.costMdRate = updates.costMdRate;
    if (updates.vacations !== undefined) domainUpdates.vacations = updates.vacations;
    if (updates.scopeId !== undefined) domainUpdates.scopeId = updates.scopeId;

    const domainMember = await teamMemberRepository.update(memberId, domainUpdates);
    
    return {
      id: domainMember.id,
      scopeId: domainMember.scopeId,
      name: domainMember.name,
      role: domainMember.role,
      fte: domainMember.fte,
      mdRate: domainMember.mdRate,
      costMdRate: domainMember.costMdRate,
      vacations: domainMember.vacations,
      createdAt: domainMember.createdAt
    };
  }

  /**
   * Delete a team member
   */
  static async deleteTeamMember(memberId: string): Promise<boolean> {
    const teamMemberRepository = ContainerService.getInstance().get(TeamMemberRepository);
    await teamMemberRepository.delete(memberId);
    return true;
  }

  /**
   * Get team capacity by role
   */
  static getTeamCapacity(team: TeamMember[], role: string): number {
    return team
      .filter(member => member.role === role)
      .reduce((sum, member) => sum + (member.fte || 0), 0);
  }

  /**
   * Check if team has members with specific role
   */
  static hasRole(team: TeamMember[], role: string): boolean {
    return team.some(member => member.role === role);
  }

  /**
   * Get all unique roles in the team
   */
  static getUniqueRoles(team: TeamMember[]): string[] {
    return [...new Set(team.map(member => member.role))];
  }

} 