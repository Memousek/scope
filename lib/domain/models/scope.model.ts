export interface Scope {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ScopeType {
  OWNED = 'owned',
  SHARED = 'shared'
}