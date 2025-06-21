export interface Scope {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum ScopeType {
    OWNED = 'owned',
    SHARED = 'shared'
}