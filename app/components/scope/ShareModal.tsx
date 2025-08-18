import { useEffect, useState, useCallback } from 'react';
import { FiCopy, FiMail, FiUsers, FiLink, FiEdit, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from '@/lib/translation';
import { ContainerService } from '@/lib/container.service';
import { GetScopeEditorsWithUsersService, ScopeEditorWithUser } from '@/lib/domain/services/get-scope-editors-with-users.service';
import { ScopeEditorService } from '@/app/services/scopeEditorService';
import { Modal } from '@/app/components/ui/Modal';
import Image from 'next/image';
import { useToastFunctions } from '@/app/components/ui/Toast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  isOwner: boolean;
  isEditor?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, scopeId, isOwner, isEditor = false }) => {
  /**
   * ShareModal umožňuje sdílení scope pomocí pozvánek a generovaných odkazů.
   * Moderní design s animacemi a lepším UX.
   */
  const { t } = useTranslation();
  const toast = useToastFunctions();
  const [editors, setEditors] = useState<ScopeEditorWithUser[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [selectedLinkType, setSelectedLinkType] = useState<'default' | 'accept' | 'view'>('default');
  const [copiedLink, setCopiedLink] = useState(false);
  const [currentLink, setCurrentLink] = useState<string>('');
  const [linkLoading, setLinkLoading] = useState(false);

  // Editor může sdílet pouze v view módu
  const canShare = isOwner || isEditor;
  const canInvite = isOwner; // Pouze vlastník může pozvat nové editory

  // Filtrovat pouze skutečné editory (s přiřazenými uživateli nebo přijaté pozvánky)
  const filteredEditors = editors.filter(editor => editor.user || editor.acceptedAt);

  // Helper pro získání jména a avataru z user_meta
  const getUserMeta = (editor: ScopeEditorWithUser) => {
    const meta = editor.user?.user_meta || {};
    return {
      fullName: meta.full_name || editor.user?.fullName || editor.email?.split('@')[0] || 'Unknown User',
      avatarUrl: meta.avatar_url || editor.user?.avatarUrl || '',
    };
  };

  const loadEditors = useCallback(async () => {
    if (!isOpen || !canShare) return;
    
    setEditorsLoading(true);
    try {
      const getScopeEditorsWithUsersService = ContainerService.getInstance().get(GetScopeEditorsWithUsersService, { autobind: true });
      const editorsData = await getScopeEditorsWithUsersService.execute(scopeId);
      setEditors(editorsData);
    } catch (error) {
      console.error('Chyba při načítání editorů:', error);
    } finally {
      setEditorsLoading(false);
    }
  }, [isOpen, canShare, scopeId]);

  useEffect(() => {
    loadEditors();
  }, [loadEditors]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteEmail) return;
    
    try {
      await ScopeEditorService.inviteEditor({
        scopeId,
        email: inviteEmail
      });
      
      setInviteEmail('');
      await loadEditors(); // Refresh editorů
      toast.success('Pozvánka odeslána', `Pozvánka byla úspěšně odeslána na ${inviteEmail}.`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'EDITOR_ALREADY_EXISTS') {
          setInviteError('already_has_access');
          toast.error('Uživatel již má přístup', 'Tento uživatel již má přístup k scope.');
        } else if (error.message === 'CANNOT_INVITE_OWNER') {
          setInviteError('cannot_invite_owner');
          toast.error('Nelze pozvat vlastníka', 'Vlastníka scope nelze pozvat jako editora.');
        } else {
          setInviteError('invite_error');
          toast.error('Chyba při pozvání', 'Nepodařilo se odeslat pozvánku. Zkuste to prosím znovu.');
        }
      } else {
        setInviteError('invite_error');
        toast.error('Chyba při pozvání', 'Nepodařilo se odeslat pozvánku. Zkuste to prosím znovu.');
      }
    }
  };

  const handleRemoveEditor = async (editorId: string) => {
    try {
      const editorToRemove = editors.find(e => e.id === editorId);
      await ScopeEditorService.removeEditor(editorId);
      await loadEditors(); // Refresh editorů
      toast.success('Editor odebrán', `${editorToRemove?.email || 'Editor'} byl úspěšně odebrán ze scope.`);
    } catch (error) {
      console.error('Chyba při odstraňování editora:', error);
      toast.error('Chyba při odebírání', 'Nepodařilo se odebrat editora. Zkuste to prosím znovu.');
    }
  };



  const generateShareLink = useCallback(async () => {
    if (selectedLinkType === 'default') return;
    
    setLinkLoading(true);
    try {
      const token = await ScopeEditorService.createInviteLink({ scopeId });
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/scopes/${scopeId}/${selectedLinkType === 'accept' ? 'accept' : 'view'}?token=${token}`;
      setCurrentLink(shareUrl);
    } catch (error) {
      console.error('Chyba při generování odkazu:', error);
    } finally {
      setLinkLoading(false);
    }
  }, [scopeId, selectedLinkType]);

  const handleCopyLink = async () => {
    if (!currentLink) return;
    
    try {
      await navigator.clipboard.writeText(currentLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Odkaz zkopírován', 'Odkaz byl úspěšně zkopírován do schránky.');
    } catch (error) {
      console.error('Chyba při kopírování odkazu:', error);
      toast.error('Chyba při kopírování', 'Nepodařilo se zkopírovat odkaz. Zkuste to prosím znovu.');
    }
  };

  // Generuj odkaz při změně typu
  useEffect(() => {
    if (selectedLinkType !== 'default') {
      generateShareLink();
    } else {
      setCurrentLink('');
    }
  }, [selectedLinkType, generateShareLink]);

  // Nastav výchozí typ odkazu
  useEffect(() => {
    if (isOpen) {
      setSelectedLinkType('default');
    }
  }, [isOpen]);

  // Refresh editorů po vytvoření nového odkazu
  useEffect(() => {
    if (currentLink && isOwner) {
      const refreshEditors = async () => {
        setEditorsLoading(true);
        const getScopeEditorsWithUsersService = ContainerService.getInstance().get(GetScopeEditorsWithUsersService, { autobind: true });
        const editorsData = await getScopeEditorsWithUsersService.execute(scopeId);
        setEditors(editorsData);
        setEditorsLoading(false);
      };
      refreshEditors();
    }
  }, [currentLink, isOwner, scopeId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('share_scope')}
      description={t('shareScopeDescription')}
      icon={<FiUsers size={24} className="text-white" />}
    >
      <div className="space-y-6">
        {/* Link Type Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FiLink className="text-blue-600" size={18} />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('share_link_type')}</h3>
          </div>
          
          <div className="grid gap-3 grid-cols-2">
            <button
              onClick={() => setSelectedLinkType('accept')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedLinkType === 'accept'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <FiEdit size={20} />
                <div className="text-left">
                  <div className="font-semibold">{t('share_link_edit')}</div>
                  <div className="text-sm opacity-75">{t('fullAccess')}</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedLinkType('view')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedLinkType === 'view'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <FiEye size={20} />
                <div className="text-left">
                  <div className="font-semibold">{t('share_link_view_only')}</div>
                  <div className="text-sm opacity-75">{t('readOnly')}</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Generated Link Section */}
        {selectedLinkType !== 'default' && (
          <div className="space-y-3 relative">
              {linkLoading && (
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  {t('generating')}
                </div>
            </div>
            )}
            
            {currentLink ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <FiCopy size={16} />
                  {copiedLink ? t('copied') : t('copy')}
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FiLink size={48} className="mx-auto mb-3 opacity-50" />
                <p>{t('click_generate_to_create_link')}</p>
              </div>
            )}
          </div>
        )}

        {/* Invite Section */}
        {canInvite && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FiMail className="text-green-600" size={18} />
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('invite_user_using_email')}</h3>
            </div>
            
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t('user_email')}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  disabled={editorsLoading}
                />
                <button
                  type="submit"
                  disabled={!inviteEmail || editorsLoading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiPlus size={16} />
                  {t('invite')}
                </button>
              </div>
              
              {inviteError && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  {t(inviteError)}
                </div>
              )}
            </form>
          </div>
        )}

        {/* Current Editors Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiUsers className="text-purple-600" size={18} />
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('invited_and_editors')}</h3>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredEditors.length} {filteredEditors.length === 1 ? t('user') : t('users')}
            </div>
          </div>
          
          {editorsLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredEditors.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiUsers size={48} className="mx-auto mb-3 opacity-50" />
              <p>{t('no_invited_or_editors')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEditors.map((editor) => (
                <div
                  key={editor.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    {getUserMeta(editor).avatarUrl ? (
                      <Image 
                        src={getUserMeta(editor).avatarUrl} 
                        alt={getUserMeta(editor).fullName} 
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold border-2 border-gray-200 dark:border-gray-600">
                        {getUserMeta(editor).fullName
                          ? getUserMeta(editor).fullName.split(' ').map((word: string) => word.charAt(0)).join('').toUpperCase().slice(0, 2)
                          : editor.email?.charAt(0).toUpperCase() || '?'
                        }
                      </div>
                    )}
                    {/* Name */}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {getUserMeta(editor).fullName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                    {canInvite && editor.id !== 'owner' && (
                      <button
                        onClick={() => handleRemoveEditor(editor.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}; 