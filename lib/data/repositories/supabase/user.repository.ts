import { UserRepository } from "@/lib/domain/repositories/user.repository";
import { User } from "@/lib/domain/models/user.model";
import { createClient } from "@/lib/supabase/client";

export class SupabaseUserRepository extends UserRepository {
  async getLoggedInUser(): Promise<User | null> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return null;
    }

    return this.mapToModel(data.user);
  }

  // eslint-disable-next-line
  private mapToModel(data: any): User {
    return {
      id: data.id,
      email: data.email,
      fullName: data.user_metadata?.full_name || null,
      avatarUrl: data.user_metadata?.avatar_url || null,
      emailConfirmedAt: data.email_confirmed_at ? new Date(data.email_confirmed_at) : null,
      invitedAt: data.invited_at ? new Date(data.invited_at) : null,
      additional: data.user_metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  async updateUserProfile(userId: string, updates: { fullName?: string; avatarUrl?: string }): Promise<User | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl
      }
    });

    if (error || !data?.user) {
      return null;
    }

    return this.mapToModel(data.user);
  }

  async updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
    const supabase = createClient();
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return !error;
  }
}