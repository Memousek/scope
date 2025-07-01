/**
 * Service layer for team-related API operations
 * Centralizes all Supabase calls for team members
 */

import { createClient } from '@/lib/supabase/client';
import { TeamMember } from '@/app/components/scope/types';

export interface CreateTeamMemberData {
  name: string;
  role: string;
  fte: number;
}

export class TeamService {
  /**
   * Load all team members for a scope
   */
  static async loadTeam(scopeId: string): Promise<TeamMember[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('scope_id', scopeId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a new team member
   */
  static async createTeamMember(scopeId: string, memberData: CreateTeamMemberData): Promise<TeamMember> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .insert([{ ...memberData, scope_id: scopeId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update an existing team member
   */
  static async updateTeamMember(memberId: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a team member
   */
  static async deleteTeamMember(memberId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
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