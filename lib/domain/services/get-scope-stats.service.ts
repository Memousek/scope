import { inject, injectable } from 'inversify';
import { ProjectRepository } from '@/lib/domain/repositories/project.repository';
import { TeamMemberRepository } from '@/lib/domain/repositories/team-member.repository';
import { ScopeRepository } from '@/lib/domain/repositories/scope.repository';

export interface ScopeStats {
  projectCount: number;
  teamMemberCount: number;
  lastActivity?: Date;
  scopeName: string;
  scopeDescription?: string;
}

@injectable()
export class GetScopeStatsService {
  constructor(
    @inject(ProjectRepository) private projectRepository: ProjectRepository,
    @inject(TeamMemberRepository) private teamMemberRepository: TeamMemberRepository,
    @inject(ScopeRepository) private scopeRepository: ScopeRepository
  ) {}

  async execute(scopeId: string): Promise<ScopeStats> {
    // Načíst scope pro základní informace
    const scope = await this.scopeRepository.findById(scopeId);
    if (!scope) {
      throw new Error(`Scope with id ${scopeId} not found`);
    }

    // Načíst projekty a členy týmu paralelně
    const [projects, teamMembers] = await Promise.all([
      this.projectRepository.findByScopeId(scopeId),
      this.teamMemberRepository.findByScopeId(scopeId)
    ]);

    // Určit poslední aktivitu (nejnovější projekt nebo člen týmu)
    let lastActivity: Date | undefined;
    
    if (projects.length > 0) {
      const latestProject = projects.reduce((latest, current) => 
        current.createdAt > latest.createdAt ? current : latest
      );
      lastActivity = latestProject.createdAt;
    }

    if (teamMembers.length > 0) {
      const latestMember = teamMembers.reduce((latest, current) => 
        current.createdAt > latest.createdAt ? current : latest
      );
      
      if (!lastActivity || latestMember.createdAt > lastActivity) {
        lastActivity = latestMember.createdAt;
      }
    }

    return {
      projectCount: projects.length,
      teamMemberCount: teamMembers.length,
      lastActivity,
      scopeName: scope.name,
      scopeDescription: scope.description
    };
  }
} 