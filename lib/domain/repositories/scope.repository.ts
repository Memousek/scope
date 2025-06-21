import {Scope, ScopeType} from "@/lib/domain/models/scope.model";
import {User} from "@/lib/domain/models/user.model";

export abstract class ScopeRepository {
    abstract findById(id: string): Promise<Scope | null>;
    abstract findByIds(ids: string[]): Promise<Scope[]>;
    abstract findByOwnerId(ownerId: string): Promise<Scope[]>;
    abstract create(scope: Omit<Scope, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scope>;
    abstract update(id: string, scope: Partial<Scope>): Promise<Scope>;
    abstract delete(id: string): Promise<void>;

    static getScopeType(scope: Scope, user: User): ScopeType {
        if (scope.ownerId === user.id) {
            return ScopeType.OWNED;
        }
        return ScopeType.SHARED;
    }
}