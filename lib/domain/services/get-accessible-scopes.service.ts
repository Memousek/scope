import { ScopeRepository } from "@/lib/domain/repositories/scope.repository";
import { ScopeEditorRepository } from "@/lib/domain/repositories/scope-editor.repository";
import { Scope } from "@/lib/domain/models/scope.model";
import { injectable } from "inversify";
import { User } from "@/lib/domain/models/user.model";

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
    // Hledáme scopy kde je uživatel buď jako editor (user_id) nebo pozván (email)
    const scopeEditorsByUserId = await this.scopeEditorRepository.findByUserId(user.id);
    
    // Hledáme scopy kde je uživatel pozván podle emailu
    const scopeEditorsByEmail = await this.scopeEditorRepository.findBy({
      email: user.email,
    });

    // Extract scope IDs from both queries
    const scopeIds = [
      ...scopeEditorsByUserId.map(editor => editor.scopeId),
      ...scopeEditorsByEmail.map(editor => editor.scopeId),
    ];

    // Add scopes where user is the owner
    const ownedScopes = await this.scopeRepository.findByOwnerId(user.id);
    const ownedScopeIds = ownedScopes.map(scope => scope.id);

    // Combine all scope IDs
    const allScopeIds = [...new Set([...scopeIds, ...ownedScopeIds])];

    // Fetch all scopes by IDs
    const scopes = await this.scopeRepository.findByIds(allScopeIds);

    // Remove duplicates by converting to a Map and back to an array
    return Array.from(new Map(scopes.map(scope => [scope.id, scope])).values());
  }
}