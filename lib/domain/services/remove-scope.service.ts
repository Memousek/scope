import {ScopeEditorRepository} from "@/lib/domain/repositories/scope-editor.repository";
import {injectable} from "inversify";
import {User} from "@/lib/domain/models/user.model";

@injectable()
export class RemoveScopeService {

    private readonly scopeEditorRepository: ScopeEditorRepository;

    constructor(
        scopeEditorRepository: ScopeEditorRepository,
    ) {
        this.scopeEditorRepository = scopeEditorRepository;
    }

    public async removeScope(user: User, scopeId: string): Promise<void> {
        if (user?.email === null) {
            return
        }

        await this.scopeEditorRepository.deleteByScopeId({scopeId: scopeId, userId: user.id});
    }
}