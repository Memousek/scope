import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FiCopy } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from '@/lib/translation';
import { ContainerService } from '@/lib/container.service';
import { GetScopeEditorsWithUsersService, ScopeEditorWithUser } from '@/lib/domain/services/get-scope-editors-with-users.service';
import { UserAvatar } from './UserAvatar';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  isOwner: boolean;
}



export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, scopeId, isOwner }) => {
  /**
   * ShareModal umožňuje sdílení scope pomocí pozvánek a generovaných odkazů.
   * Umožňuje výběr typu odkazu (editace / pouze pro čtení) a správu editorů.
   */
  const { t } = useTranslation();
  const [editors, setEditors] = useState<ScopeEditorWithUser[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  // Nový stav pro typ odkazu
  const [selectedLinkType, setSelectedLinkType] = useState<'default' | 'edit' | 'view'>('default');

  useEffect(() => {
    if (isOpen && isOwner) {
      setEditorsLoading(true);
      const getScopeEditorsWithUsersService = ContainerService.getInstance().get(GetScopeEditorsWithUsersService, { autobind: true });
      getScopeEditorsWithUsersService.execute(scopeId)
        .then((editorsData) => {
          setEditors(editorsData);
          setEditorsLoading(false);
        })
        .catch((error) => {
          console.error('Chyba při načítání editorů:', error);
          setEditorsLoading(false);
        });
    }
  }, [isOpen, isOwner, scopeId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail) return;
    const supabase = createClient();
    // Zkontroluj, zda už není editor
    const { data: existing } = await supabase
      .from('scope_editors')
      .select('id')
      .eq('scope_id', scopeId)
      .eq('email', inviteEmail);
    if (existing && existing.length > 0) {
      setInviteError('already_has_access');
      return;
    }
    // Zjisti, jestli uživatel existuje v auth.users
    const { data: userRows } = await supabase.from('auth.users').select('id').eq('email', inviteEmail);
    let user_id = null;
    if (userRows && userRows.length > 0) {
      user_id = userRows[0].id;
    }
    const token = uuidv4();
    const insertObj: Record<string, unknown> = { scope_id: scopeId, email: inviteEmail, invite_token: token };
    if (user_id) {
      insertObj.user_id = user_id;
      insertObj.accepted_at = new Date().toISOString();
    }
    const { error } = await supabase.from('scope_editors').insert([insertObj]);
    if (error) {
      setInviteError('invite_error');
      return;
    }
    setInviteEmail('');
    // Refresh editorů
    if (isOwner) {
      setEditorsLoading(true);
      const getScopeEditorsWithUsersService = ContainerService.getInstance().get(GetScopeEditorsWithUsersService, { autobind: true });
      const editorsData = await getScopeEditorsWithUsersService.execute(scopeId);
      setEditors(editorsData);
      setEditorsLoading(false);
    }
  };

  const handleRemoveEditor = async (editorId: string) => {
    const supabase = createClient();
    await supabase.from('scope_editors').delete().eq('id', editorId);
    // Refresh editorů
    if (isOwner) {
      setEditorsLoading(true);
      const getScopeEditorsWithUsersService = ContainerService.getInstance().get(GetScopeEditorsWithUsersService, { autobind: true });
      const editorsData = await getScopeEditorsWithUsersService.execute(scopeId);
      setEditors(editorsData);
      setEditorsLoading(false);
    }
  };

  const getLastInviteToken = () => {
    if (editors && editors.length > 0) {
      // Najdi poslední pozvánku bez acceptedAt
      const pending = editors.filter(e => !e.acceptedAt);
      if (pending.length > 0) {
        // Získat token z databáze pro poslední pending editor
        const lastPending = pending[pending.length - 1];
        // Pro jednoduchost vrátíme null, token se bude generovat při vytvoření odkazu
        return null;
      }
    }
    return null;
  };

  // Funkce pro získání odkazu podle typu
  const getShareLink = () => {
    if (selectedLinkType === 'edit') {
      const token = getLastInviteToken();
      return token
        ? `${window.location.origin}/scopes/${scopeId}/accept?token=${token}`
        : `${window.location.origin}/scopes/${scopeId}/accept`;
    }
    // view only
    return `${window.location.origin}/scopes/${scopeId}/view`;
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ backdropFilter: 'blur(8px)' }}>
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh] mx-4">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={onClose} aria-label={t('close')}>
          <span className="sr-only">{t('close')}</span>
          ×
        </button>
        <h4 className="text-2xl font-bold mb-4 text-center">{t('share_scope')}</h4>
        {/* Nový select box pro výběr typu odkazu */}
        <div className="flex flex-col gap-2 mb-4">
          <label htmlFor="share-link-type" className="font-medium text-sm mb-1">{t('share_link_type')}</label>
          <select
            id="share-link-type"
            value={selectedLinkType}
            onChange={e => setSelectedLinkType(e.target.value as 'default' | 'edit' | 'view')}
            className="border rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-blue-400"
            aria-label={t('share_link_type')}
          >
            <option value="default" disabled>{t('share_link_default')}</option>
            <option value="edit">{t('share_link_edit')}</option>
            <option value="view">{t('share_link_view_only')}</option>
          </select>
          {/* Zobrazení vybraného odkazu až po výběru */}
          {selectedLinkType !== 'default' && (
            <div className="flex flex-wrap items-center gap-2 mt-2 p-2 rounded bg-white dark:bg-gray-800 border text-green-700 text-sm break-all">
              <span className="truncate max-w-[120px] font-medium">{selectedLinkType === 'edit' ? t('share_link_edit') : t('share_link_view_only')}:</span>
              <span className="truncate max-w-[220px]">{getShareLink()}</span>
              <a href={getShareLink()} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">{t('open_link_in_new_tab')}</a>
              <button
                onClick={() => navigator.clipboard.writeText(getShareLink())}
                title={t('copy')}
                className="text-blue-600 hover:text-blue-800"
                aria-label={t('copy')}
              >
                <FiCopy />
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="font-semibold mb-2">{t('invite_user_using_email')}</h4>
        </div>
        <form className="flex gap-2 mb-4" onSubmit={handleInvite}>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 min-w-[220px] focus:outline-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder={t('user_email')}
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-blue-700 transition"
            type="submit"
          >
            {t('invite')}
          </button>
        </form>
        {inviteError && <div className="text-red-600 text-sm mb-2">{t(inviteError)}</div>}
        <div className="mt-4">
          <h4 className="font-semibold mb-2">{t('invited_and_editors')}</h4>
          {editorsLoading ? (
            <div className="text-gray-400">{t('loading')}…</div>
          ) : editors.length === 0 ? (
            <div className="text-gray-400">{t('no_invited_or_editors')}</div>
          ) : (
            <ul className="divide-y">
              {editors.map(editor => (
                <li key={editor.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      user={editor.user ? {
                        fullName: editor.user.fullName,
                        email: editor.user.email,
                        avatarUrl: editor.user.avatarUrl,
                      } : {
                        email: editor.email,
                      }}
                      size="sm"
                      showName={true}
                    />
                    <div className="flex items-center gap-2">
                      {editor.acceptedAt ? (
                        <span className="text-green-600 text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                          {t('editor')}
                        </span>
                      ) : (
                        <span className="text-yellow-600 text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                          {t('invited')}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="text-red-600 text-xs hover:text-red-800 hover:underline px-2 py-1 rounded transition-colors"
                    onClick={() => handleRemoveEditor(editor.id)}
                    title={t('remove_rights')}
                  >
                    {t('remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}; 