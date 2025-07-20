import { inject, injectable } from 'inversify';
import { TeamMemberRepository } from '@/lib/domain/repositories/team-member.repository';
import { TeamMember } from '@/lib/domain/models/team-member.model';

@injectable()
export class AddTeamMemberService {
  constructor(
    @inject(TeamMemberRepository) private teamMemberRepository: TeamMemberRepository
  ) {}

  async execute(scopeId: string, memberData: { name: string; role: string; fte: number }): Promise<TeamMember> {
    const teamMember: Omit<TeamMember, 'id' | 'createdAt'> = {
      scopeId,
      name: memberData.name,
      role: memberData.role,
      fte: memberData.fte
    };

    return await this.teamMemberRepository.create(teamMember);
  }
} 