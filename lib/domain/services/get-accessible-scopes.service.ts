import {ScopeRepository} from "@/lib/domain/repositories/scope.repository";
import {ScopeEditorRepository} from "@/lib/domain/repositories/scope-editor.repository";
import {Scope} from "@/lib/domain/models/scope.model";
import {injectable} from "inversify";
import {User} from "@/lib/domain/models/user.model";

@injectable()
export class GetAccessibleScopesService {

    private readonly scopeRepository: ScopeRepository;
    private readonly scopeEditorRepository: ScopeEditorRepository;

    constructor(
        scopeRepository: ScopeRepository,
        scopeEditorRepository: ScopeEditorRepository,
    ) {
        this.scopeRepository = scopeRepository;
        this.scopeEditorRepository = scopeEditorRepository;
    }

    public async getAccessibleScopes(user: User): Promise<Scope[]> {
        // Fetch all scopes the user has access to
        const scopeEditors = await this.scopeEditorRepository.findBy({
            userId: user.id,
            email: user.email,
        });

        // Extract scope IDs from the scope editors
        const scopeIds = scopeEditors.map(editor => editor.scopeId);

        const scopes = [
            ...await this.scopeRepository.findByIds(scopeIds),
            ...await this.scopeRepository.findByOwnerId(user.id),
        ];

        // Remove duplicates by converting to a Set and back to an array
        return Array.from(new Map(scopes.map(scope => [scope.id, scope])).values());
    }
}