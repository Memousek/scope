import {ContainerModule} from "@/lib/container.service";
import {Container} from 'inversify';
import {SupabaseScopeRepository} from "@/lib/data/repositories/supabase/scope.repository";
import {ScopeRepository} from "@/lib/domain/repositories/scope.repository";
import {UserRepository} from "@/lib/domain/repositories/user.repository";
import {SupabaseUserRepository} from "@/lib/data/repositories/supabase/user.repository";
import {TeamMemberRepository} from "@/lib/domain/repositories/team_member.repository";
import {SupabaseTeamMemberRepository} from "@/lib/data/repositories/supabase/team_member.repository";
import {ProjectRepository} from "@/lib/domain/repositories/project.repository";
import {SupabaseProjectRepository} from "@/lib/data/repositories/supabase/project.repository";
import {ProjectProgressRepository} from "@/lib/domain/repositories/project_progress.repository";
import {SupabaseProjectProgressRepository} from "@/lib/data/repositories/supabase/project_progress.repository";
import {ScopeEditorRepository} from "@/lib/domain/repositories/scope-editor.repository";
import {SupabaseScopeEditorRepository} from "@/lib/data/repositories/supabase/scope-editor.repository";

export class DataContainerModule implements ContainerModule {
    bind(container: Container): Promise<void> | void {
        container.bind(ScopeRepository).to(SupabaseScopeRepository).inSingletonScope();
        container.bind(UserRepository).to(SupabaseUserRepository).inSingletonScope();
        container.bind(TeamMemberRepository).to(SupabaseTeamMemberRepository).inSingletonScope();
        container.bind(ProjectRepository).to(SupabaseProjectRepository).inSingletonScope();
        container.bind(ProjectProgressRepository).to(SupabaseProjectProgressRepository).inSingletonScope();
        container.bind(ScopeEditorRepository).to(SupabaseScopeEditorRepository).inSingletonScope();
    }

}
