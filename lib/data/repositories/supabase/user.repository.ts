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

      // Načtení user_meta dat
      const userId = data.user.id;
      const { data: metaData } = await supabase
        .from('user_meta')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Spojení dat do modelu
      return this.mapToModel(data.user, metaData);
  }

  async findByEmail(email: string): Promise<User | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_meta')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    // Get auth user data
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user || authData.user.id !== data.user_id) {
      return null;
    }

    return this.mapToModel(authData.user, data);
  }

  // eslint-disable-next-line
  private mapToModel(data: any, metaData?: any): User {
    return {
      id: data.id,
      email: data.email,
      fullName: data.user_metadata?.full_name || null,
      avatarUrl: data.user_metadata?.avatar_url || null,
      emailConfirmedAt: data.email_confirmed_at ? new Date(data.email_confirmed_at) : null,
      invitedAt: data.invited_at ? new Date(data.invited_at) : null,
      role: metaData?.role || null, // Map role from user_meta
      language: metaData?.language || null,
      bio: metaData?.bio || null,
      timezone: metaData?.timezone || null,
      username: metaData?.username || null,
      isVerified: metaData?.is_verified || false,
      status: metaData?.status || null,
      openApiKey: metaData?.open_api_key || null,
      geminiApiKey: metaData?.gemini_api_key || null,
      aiProvider: metaData?.ai_provider || null,
      settings: metaData?.settings || null,
      additional: {
        ...data.user_metadata,
        ...(metaData || {})
      },
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