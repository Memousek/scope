import { PlanRepository } from "@/lib/domain/repositories/plan.repository";
import { Plan } from "@/lib/domain/models/plan.model";
import { injectable, inject } from "inversify";
import { ProjectRepository } from "@/lib/domain/repositories/project.repository";
import { TeamMemberRepository } from "@/lib/domain/repositories/team-member.repository";
import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";
import { createClient } from "@/lib/supabase/client";

export interface PlanUsage {
  projects: number;
  teamMembers: number;
  scopes: number;
}

@injectable()
export class ManageUserPlansService {
  constructor(
    @inject(PlanRepository) private planRepository: PlanRepository,
    @inject(ProjectRepository) private projectRepository: ProjectRepository,
    @inject(TeamMemberRepository) private teamMemberRepository: TeamMemberRepository,
    @inject(ScopeRepository) private scopeRepository: ScopeRepository
  ) {}

  /**
   * Get user's current plan (by user id)
   */
  async getUserCurrentPlan(userId: string): Promise<Plan | null> {
    return this.planRepository.getUserPlan(userId);
  }

  /**
   * Get the plan that governs a scope (the owner's plan)
   */
  async getPlanForScope(scopeId: string): Promise<Plan | null> {
    const scope = await this.scopeRepository.findById(scopeId);
    if (!scope) return null;
    return this.getUserCurrentPlan(scope.ownerId);
  }

  /**
   * Global usage across all scopes owned by the user (for maxScopes)
   */
  async getUsage(userId: string): Promise<PlanUsage> {
    const scopes = await this.scopeRepository.findByOwnerId(userId);

    const [projectsCounts, teamCounts] = await Promise.all([
      Promise.all(scopes.map((s) => this.projectRepository.findByScopeId(s.id).then((p) => p.length))).then((arr) => arr.reduce((a, b) => a + b, 0)),
      Promise.all(scopes.map((s) => this.teamMemberRepository.findByScopeId(s.id).then((t) => t.length))).then((arr) => arr.reduce((a, b) => a + b, 0)),
    ]);

    return {
      projects: projectsCounts,
      teamMembers: teamCounts,
      scopes: scopes.length,
    };
  }

  /**
   * Per-scope usage (for maxProjects/maxTeamMembers per scope)
   */
  async getScopeUsage(scopeId: string): Promise<{ projects: number; teamMembers: number }> {
    const [projects, team] = await Promise.all([
      this.projectRepository.findByScopeId(scopeId).then((p) => p.length),
      this.teamMemberRepository.findByScopeId(scopeId).then((t) => t.length),
    ]);
    return { projects, teamMembers: team };
  }

  /**
   * Update user's plan
   */
  async updateUserPlan(userId: string, planId: string, opts?: { allowSelfDowngrade?: boolean; requestedBy?: { id: string; role?: string } }): Promise<boolean> {
    const plan = await this.planRepository.findById(planId);
    if (!plan || !plan.isActive) throw new Error('Invalid or inactive plan');

    // Deny if domain-managed
    const supabase = createClient();
    const { data: meta } = await supabase
      .from('user_meta')
      .select('email')
      .eq('user_id', userId)
      .maybeSingle();
    const email = (meta as any)?.email as string | undefined;
    if (email && email.includes('@')) {
      const domain = email.split('@')[1].toLowerCase();
      const { data: assignment } = await supabase
        .from('domain_plan_assignments')
        .select('domain, is_active')
        .eq('domain', domain)
        .eq('is_active', true)
        .maybeSingle();
      if (assignment) {
        throw new Error('PlanChangeRequiresAdmin');
      }
    }

    // Basic policy: only admin/god can change plan, or self-downgrade allowed via opts
    const isGod = opts?.requestedBy?.role === 'god';
    if (!isGod && !opts?.allowSelfDowngrade) {
      // deny direct change; caller must go přes billing/admin flow
      throw new Error('PlanChangeRequiresAdmin');
    }

    return this.planRepository.updateUserPlan(userId, planId);
  }

  async getAvailablePlans(): Promise<Plan[]> {
    return this.planRepository.findActive();
  }

  /**
   * Limits – legacy (global checks) kept for backward compatibility
   */
  async canCreateProject(userId: string): Promise<boolean> {
    const [userPlan, usage] = await Promise.all([
      this.getUserCurrentPlan(userId),
      this.getUsage(userId),
    ]);
    if (!userPlan) return false;
    return usage.projects < userPlan.maxProjects;
  }

  async canAddTeamMember(userId: string): Promise<boolean> {
    const [userPlan, usage] = await Promise.all([
      this.getUserCurrentPlan(userId),
      this.getUsage(userId),
    ]);
    if (!userPlan) return false;
    return usage.teamMembers < userPlan.maxTeamMembers;
  }

  async canCreateScope(userId: string): Promise<boolean> {
    const [userPlan, usage] = await Promise.all([
      this.getUserCurrentPlan(userId),
      this.getUsage(userId),
    ]);
    if (!userPlan) return false;
    return usage.scopes < userPlan.maxScopes;
  }

  /**
   * Limits – per scope (recommended)
   * These checks use the SCOPE OWNER's plan, so editors cannot bypass limits.
   */
  async canCreateProjectInScope(scopeId: string): Promise<boolean> {
    const [plan, usage] = await Promise.all([
      this.getPlanForScope(scopeId),
      this.getScopeUsage(scopeId),
    ]);
    if (!plan) return false;
    return usage.projects < plan.maxProjects;
  }

  async canAddTeamMemberInScope(scopeId: string): Promise<boolean> {
    const [plan, usage] = await Promise.all([
      this.getPlanForScope(scopeId),
      this.getScopeUsage(scopeId),
    ]);
    if (!plan) return false;
    return usage.teamMembers < plan.maxTeamMembers;
  }

  /** Feature flags – evaluated against scope owner's plan when scopeId provided */
  async hasExportAccess(userId: string): Promise<boolean> {
    const userPlan = await this.getUserCurrentPlan(userId);
    return userPlan?.hasExport || false;
  }

  async hasExportAccessForScope(scopeId: string): Promise<boolean> {
    const plan = await this.getPlanForScope(scopeId);
    return plan?.hasExport || false;
  }

  async hasApiAccess(userId: string): Promise<boolean> {
    const userPlan = await this.getUserCurrentPlan(userId);
    return userPlan?.hasApiAccess || false;
  }

  async hasAdvancedAnalytics(userId: string): Promise<boolean> {
    const userPlan = await this.getUserCurrentPlan(userId);
    return userPlan?.hasAdvancedAnalytics || false;
  }
}
