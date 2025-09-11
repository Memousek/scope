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
  mdRate?: number;
  costMdRate?: number;
  vacations?: Array<{ start: string; end: string; note?: string }>;
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
    
    // Map database data to TeamMember objects with proper field mapping
    return (data || []).map(item => this.mapToModel(item));
  }

  /**
   * Get single team member by id (includes vacations when column exists)
   */
  static async getTeamMemberById(memberId: string): Promise<TeamMember | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', memberId)
      .maybeSingle();

    if (error) {
      console.error('teamService.getTeamMemberById error', error);
      return null;
    }
    
    if (!data) return null;
    
    return this.mapToModel(data);
  }

  /**
   * Create a new team member
   */
  static async createTeamMember(scopeId: string, memberData: CreateTeamMemberData): Promise<TeamMember> {
    const supabase = createClient();
    
    // Map camelCase fields to snake_case for database
    const dbData: Record<string, unknown> = {
      scope_id: scopeId,
      name: memberData.name,
      role: memberData.role,
      fte: memberData.fte,
      vacations: memberData.vacations
    };
    
    if (memberData.mdRate !== undefined) {
      dbData.md_rate = memberData.mdRate;
    }
    
    if (memberData.costMdRate !== undefined) {
      dbData.cost_md_rate = memberData.costMdRate;
    }

    const { data, error } = await supabase
      .from('team_members')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    
    return this.mapToModel(data);
  }

  /**
   * Update an existing team member
   */
  static async updateTeamMember(memberId: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    const supabase = createClient();
    
    // Map camelCase fields to snake_case for database
    const dbUpdates: Record<string, unknown> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'mdRate') {
        dbUpdates.md_rate = value;
      } else if (key === 'costMdRate') {
        dbUpdates.cost_md_rate = value;
      } else if (key === 'scopeId') {
        dbUpdates.scope_id = value;
      } else {
        dbUpdates[key] = value;
      }
    });

    const { data, error } = await supabase
      .from('team_members')
      .update(dbUpdates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    
    return this.mapToModel(data);
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

  /**
   * Map database data to TeamMember object
   */
  private static mapToModel(data: {
    id: string;
    scope_id: string;
    name: string;
    role: string;
    fte: number;
    md_rate: number;
    cost_md_rate: number;
    vacations?: string;
    created_at: string;
    updated_at: string;
  }): TeamMember {
    return {
      id: data.id,
      scopeId: data.scope_id,
      name: data.name,
      role: data.role,
      fte: data.fte,
      mdRate: data.md_rate,
      costMdRate: data.cost_md_rate,
      vacations: data.vacations ? JSON.parse(data.vacations) : undefined,
      createdAt: new Date(data.created_at)
    };
  }
} 