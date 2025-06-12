import { TeamMember } from "@/lib/domain/models/team_member.model";

export abstract class TeamMemberRepository {
    abstract findById(id: string): Promise<TeamMember | null>;
    abstract findByScopeId(scopeId: string): Promise<TeamMember[]>;
    abstract create(teamMember: Omit<TeamMember, 'id' | 'createdAt'>): Promise<TeamMember>;
    abstract update(id: string, teamMember: Partial<TeamMember>): Promise<TeamMember>;
    abstract delete(id: string): Promise<void>;
    abstract deleteByScopeId(scopeId: string): Promise<void>;
}