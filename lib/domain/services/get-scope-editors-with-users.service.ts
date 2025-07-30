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

    // Mapovat editory s údaji uživatelů
    return editors.map(editor => {
      // Pokud je to přihlášený uživatel, použít jeho metadata
      const isCurrentUser = editor.user_id === currentUserId;
      let userData = null;
      
      if (isCurrentUser && currentUser?.user && currentUser.user.email) {
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