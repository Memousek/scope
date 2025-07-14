export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  emailConfirmedAt?: Date | null;
  invitedAt?: Date | null;

  // eslint-disable-next-line
  additional: Record<string, any>;
}