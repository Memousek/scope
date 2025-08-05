export interface User {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  emailConfirmedAt?: Date | null;
  invitedAt?: Date | null;
  openApiKey?: string | null;
  bio?: string | null;
  timezone?: string | null;
  username?: string | null;
  role?: string;
  language?: string;
  isVerified?: boolean;
  status?: string;
  
  // eslint-disable-next-line
  settings?: Record<string, any> | null;
  additional: Record<string, any>;
}