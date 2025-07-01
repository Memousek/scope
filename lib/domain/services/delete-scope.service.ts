import { injectable } from 'inversify';
import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";
import { ProjectRepository } from "@/lib/domain/repositories/project.repository";
import { ProjectProgressRepository } from "@/lib/domain/repositories/project-progress.repository";
import { TeamMemberRepository } from "@/lib/domain/repositories/team-member.repository";
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";

@injectable()
export class DeleteScopeService {

  private readonly scopeRepository: ScopeRepository;
  private readonly scopeEditorRepository: ScopeEditorRepository;
  private readonly projectRepository: ProjectRepository;
  private readonly projectProgressRepository: ProjectProgressRepository;
  private readonly teamMemberRepository: TeamMemberRepository;

  constructor(
    scopeRepository: ScopeRepository,
    scopeEditorRepository: ScopeEditorRepository,
    projectRepository: ProjectRepository,
    projectProgressRepository: ProjectProgressRepository,
    teamMemberRepository: TeamMemberRepository,
  ) {
    this.scopeRepository = scopeRepository;
    this.scopeEditorRepository = scopeEditorRepository;
    this.projectRepository = projectRepository;
    this.projectProgressRepository = projectProgressRepository;
    this.teamMemberRepository = teamMemberRepository;
  }

  public async deleteScope(scopeId: string): Promise<void> {
    const scope = await this.scopeRepository.findById(scopeId);

    if (!scope) {
      throw new Error(`Scope with ID ${scopeId} not found`);
    }

    const projects = await this.projectRepository.findByScopeId(scopeId);

    for (const project of projects) {
      await this.projectProgressRepository.delete(project.id);
      await this.projectRepository.delete(project.id);
    }

    await this.teamMemberRepository.deleteByScopeId(scopeId);
    await this.scopeEditorRepository.deleteByScopeId({ scopeId: scopeId });
    await this.scopeRepository.delete(scopeId);
  }

}