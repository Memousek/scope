export interface ScopeEditor {
  id: string;
  scopeId: string;
  userId?: string | null;
  email?: string | null;
  inviteToken?: string | null;
  acceptedAt?: Date | null;
  invitedAt?: Date | null;
  createdAt: Date;
}