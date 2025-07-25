import { ContainerModule } from "@/lib/container.service";
import { Container } from 'inversify';
import { SupabaseScopeRepository } from "@/lib/data/repositories/supabase/scope.repository";
import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";
import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { SupabaseUserRepository } from "@/lib/data/repositories/supabase/user.repository";
import { TeamMemberRepository } from "@/lib/domain/repositories/team-member.repository";
import { SupabaseTeamMemberRepository } from "@/lib/data/repositories/supabase/team-member.repository";
import { ProjectRepository } from "@/lib/domain/repositories/project.repository";
import { SupabaseProjectRepository } from "@/lib/data/repositories/supabase/project.repository";
import { ProjectProgressRepository } from "@/lib/domain/repositories/project-progress.repository";
import { SupabaseProjectProgressRepository } from "@/lib/data/repositories/supabase/project-progress.repository";
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";
import { SupabaseScopeEditorRepository } from "@/lib/data/repositories/supabase/scope-editor.repository";
import { GetScopeStatsService } from "@/lib/domain/services/get-scope-stats.service";
import { CalculateAverageSlipService } from "@/lib/domain/services/calculate-average-slip.service";
import { AddTeamMemberService } from "@/lib/domain/services/add-team-member.service";
import { AddProjectService } from "@/lib/domain/services/add-project.service";
import { CheckScopeOwnershipService } from "@/lib/domain/services/check-scope-ownership.service";
import { GetScopeWithAuthorService } from "@/lib/domain/services/get-scope-with-author.service";
import { GetScopeEditorsWithUsersService } from "@/lib/domain/services/get-scope-editors-with-users.service";

export class DataContainerModule implements ContainerModule {
  bind(container: Container): Promise<void> | void {
    container.bind(ScopeRepository).to(SupabaseScopeRepository).inSingletonScope();
    container.bind(UserRepository).to(SupabaseUserRepository).inSingletonScope();
    container.bind(TeamMemberRepository).to(SupabaseTeamMemberRepository).inSingletonScope();
    container.bind(ProjectRepository).to(SupabaseProjectRepository).inSingletonScope();
    container.bind(ProjectProgressRepository).to(SupabaseProjectProgressRepository).inSingletonScope();
    container.bind(ScopeEditorRepository).to(SupabaseScopeEditorRepository).inSingletonScope();
    container.bind(GetScopeStatsService).toSelf().inSingletonScope();
    container.bind(CalculateAverageSlipService).toSelf().inSingletonScope();
    container.bind(AddTeamMemberService).toSelf().inSingletonScope();
    container.bind(AddProjectService).toSelf().inSingletonScope();
    container.bind(CheckScopeOwnershipService).toSelf().inSingletonScope();
    container.bind(GetScopeWithAuthorService).toSelf().inSingletonScope();
    container.bind(GetScopeEditorsWithUsersService).toSelf().inSingletonScope();
  }

}
