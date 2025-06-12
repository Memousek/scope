import {Scope} from "@/lib/domain/models/scope.model";

export abstract class ScopeRepository {
    abstract findById(id: string): Promise<Scope | null>;
    abstract findByOwnerId(ownerId: string): Promise<Scope[]>;
    abstract create(scope: Omit<Scope, 'id' | 'createdAt' | 'updatedAt'>): Promise<Scope>;
    abstract update(id: string, scope: Partial<Scope>): Promise<Scope>;
    abstract delete(id: string): Promise<void>;
}