import { User } from "@/lib/domain/models/user.model";

export abstract class UserRepository {
  abstract getLoggedInUser(): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract updateUserProfile(userId: string, updates: { fullName?: string; avatarUrl?: string }): Promise<User | null>;
  abstract updateUserPassword(userId: string, newPassword: string): Promise<boolean>;
}