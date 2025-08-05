/**
 * User model representing a user in the application
 * Contains user profile information, authentication data, and preferences
 */

export interface UserMetadata {
  name?: string;
  [key: string]: unknown;
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  notifications?: { 
    email?: boolean;
    push?: boolean;
  };
  [key: string]: unknown;
}

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
  
  settings?: UserSettings | null;
  additional: UserMetadata;
}