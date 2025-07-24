import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { FiCopy, FiX, FiMail, FiUsers, FiLink, FiEdit, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
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
   * Moderní design s animacemi a lepším UX.
   */
  const { t } = useTranslation();
  const [editors, setEditors] = useState<ScopeEditorWithUser[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [selectedLinkType, setSelectedLinkType] = useState<'default' | 'edit' | 'view'>('default');
  const [copiedLink, setCopiedLink] = useState(false);

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
        // Pro jednoduchost vrátíme null, token se bude generovat při vytvoření odkazu
        return null;
      }
    }
    return null;
  };

  const getShareLink = () => {
    const baseUrl = window.location.origin;
    const token = getLastInviteToken() || uuidv4();
    return `${baseUrl}/scopes/${scopeId}/accept?token=${token}&type=${selectedLinkType}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareLink());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      console.error('Chyba při kopírování:', error);
    }
  };

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

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* Backdrop s animací */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal s animací */}
      <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden transform transition-all duration-300 scale-100">
        {/* Header s gradientem */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 relative">
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
            onClick={onClose}
            aria-label={t('close')}
          >
            <FiX size={24} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <FiUsers size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{t('share_scope')}</h2>
              <p className="text-white/80 text-sm">Sdílejte scope s týmem</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Link Type Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FiLink className="text-blue-600" size={18} />
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('share_link_type')}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedLinkType('edit')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedLinkType === 'edit'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedLinkType === 'edit' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <FiEdit size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{t('share_link_edit')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Úplný přístup</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedLinkType('view')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedLinkType === 'view'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    selectedLinkType === 'view' ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <FiEye size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{t('share_link_view_only')}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Pouze pro čtení</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Share Link Display */}
            {selectedLinkType !== 'default' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {selectedLinkType === 'edit' ? t('share_link_edit') : t('share_link_view_only')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 break-all">
                      {getShareLink()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <a 
                      href={getShareLink()} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title={t('open_link_in_new_tab')}
                    >
                      <FiLink size={16} />
                    </a>
                    <button
                      onClick={handleCopyLink}
                      className={`p-2 rounded-lg transition-colors ${
                        copiedLink 
                          ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
                          : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-blue-900/20'
                      }`}
                      title={copiedLink ? 'Zkopírováno!' : t('copy')}
                    >
                      <FiCopy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Invite Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FiMail className="text-purple-600" size={18} />
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('invite_user_using_email')}</h3>
            </div>
            
            <form onSubmit={handleInvite} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="email"
                  className="w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
                  placeholder={t('user_email')}
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <FiPlus size={16} />
                {t('invite')}
              </button>
            </form>
            
            {inviteError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-red-600 dark:text-red-400 text-sm">
                {t(inviteError)}
              </div>
            )}
          </div>

          {/* Editors Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="text-green-600" size={18} />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('invited_and_editors')}</h3>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {editors.length} {editors.length === 1 ? 'uživatel' : editors.length < 5 ? 'uživatelé' : 'uživatelů'}
              </div>
            </div>

            {editorsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-gray-500 dark:text-gray-400">{t('loading')}…</span>
              </div>
            ) : editors.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiUsers size={48} className="mx-auto mb-3 opacity-50" />
                <p>{t('no_invited_or_editors')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {editors.map(editor => (
                  <div key={editor.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200">
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
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            {t('editor')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            {t('invited')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveEditor(editor.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      title={t('remove_rights')}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}; 