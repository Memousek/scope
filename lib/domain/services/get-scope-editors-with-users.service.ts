import { injectable } from 'inversify';
import { createClient } from '@/lib/supabase/client';

export interface ScopeEditorWithUser {
  id: string;
  email: string;
  userId: string | null;
  acceptedAt?: Date;
  invitedAt?: Date;
  inviteToken?: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
    user_meta?: {
      full_name?: string;
      avatar_url?: string;
      bio?: string;
      timezone?: string;
      username?: string;
      email?: string;
      role?: string;
      language?: string;
      is_verified?: boolean;
      status?: string;
  settings?: Record<string, unknown>;
      plan_id?: string;
      ai_provider?: string;
      gemini_api_key?: string;
    }
  } | null;
}

@injectable()
export class GetScopeEditorsWithUsersService {
  async execute(scopeId: string): Promise<ScopeEditorWithUser[]> {
    const supabase = createClient();
    
    // Získat editory scope
    const { data: editors, error } = await supabase
      .from('scope_editors')
      .select('id, email, user_id, accepted_at, invited_at, invite_token')
      .eq('scope_id', scopeId);

    if (error || !editors) {
      console.error('Chyba při načítání editorů:', error);
      return [];
    }

    // Získat údaje přihlášeného uživatele pro porovnání
    const { data: currentUser } = await supabase.auth.getUser();
    const currentUserId = currentUser?.user?.id;

    // Získat user_meta pro všechny editory s user_id
    const userIds = editors.filter(e => e.user_id).map(e => e.user_id);
    let userMetaMap: Record<string, {
      full_name?: string;
      avatar_url?: string;
      bio?: string;
      timezone?: string;
      username?: string;
      email?: string;
      role?: string;
      language?: string;
      is_verified?: boolean;
      status?: string;
      settings?: Record<string, unknown>;
      plan_id?: string;
      ai_provider?: string;
      gemini_api_key?: string;
    }> = {};
    if (userIds.length > 0) {
      const { data: userMetaData } = await supabase
        .from('user_meta')
        .select('*')
        .in('user_id', userIds);
      if (userMetaData) {
        userMetaMap = userMetaData.reduce((acc, meta) => {
          acc[meta.user_id] = meta;
          return acc;
        }, {});
      }
    }

    return editors.map(editor => {
      const isCurrentUser = editor.user_id === currentUserId;
      let userData = null;
      if (editor.user_id) {
        const meta = userMetaMap[editor.user_id] || {};
        userData = {
          id: editor.user_id,
          email: editor.email,
          fullName: meta.full_name,
          avatarUrl: meta.avatar_url,
          user_meta: meta,
        };
      } else if (isCurrentUser && currentUser?.user && currentUser.user.email) {
        userData = {
          id: currentUser.user.id,
          email: currentUser.user.email,
          fullName: currentUser.user.user_metadata?.full_name,
          avatarUrl: currentUser.user.user_metadata?.avatar_url,
        };
      }
      return {
        id: editor.id,
        email: editor.email,
        userId: editor.user_id,
        acceptedAt: editor.accepted_at ? new Date(editor.accepted_at) : undefined,
        invitedAt: editor.invited_at ? new Date(editor.invited_at) : undefined,
        inviteToken: editor.invite_token,
        user: userData,
      };
    });
  }
} 