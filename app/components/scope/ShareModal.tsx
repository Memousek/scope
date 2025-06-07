import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FiCopy } from 'react-icons/fi';
import { v4 as uuidv4 } from 'uuid';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopeId: string;
  isOwner: boolean;
}

interface Editor {
  id: string;
  email: string;
  user_id: string | null;
  accepted_at?: string;
  invited_at?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, scopeId, isOwner }) => {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  useEffect(() => {
    if (isOpen && isOwner) {
      setEditorsLoading(true);
      const supabase = createClient();
      supabase
        .from('scope_editors')
        .select('id, email, user_id, accepted_at, invited_at')
        .eq('scope_id', scopeId)
        .then(({ data, error }) => {
          if (!error && data) setEditors(data);
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
      setInviteError('Tento uživatel už má přístup.');
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
      setInviteError('Chyba při pozvání.');
      return;
    }
    setInviteEmail('');
    // Refresh editorů
    if (isOwner) {
      setEditorsLoading(true);
      const { data: editorsData } = await supabase
        .from('scope_editors')
        .select('id, email, user_id, accepted_at, invited_at')
        .eq('scope_id', scopeId);
      if (editorsData) setEditors(editorsData);
      setEditorsLoading(false);
    }
  };

  const handleRemoveEditor = async (editorId: string) => {
    const supabase = createClient();
    await supabase.from('scope_editors').delete().eq('id', editorId);
    // Refresh editorů
    if (isOwner) {
      setEditorsLoading(true);
      const { data: editorsData } = await supabase
        .from('scope_editors')
        .select('id, email, user_id, accepted_at, invited_at')
        .eq('scope_id', scopeId);
      if (editorsData) setEditors(editorsData);
      setEditorsLoading(false);
    }
  };

  const getLastInviteToken = () => {
    if (editors && editors.length > 0) {
      // Najdi poslední pozvánku bez accepted_at
      const pending = editors.filter(e => !e.accepted_at && e.invite_token);
      if (pending.length > 0) return pending[pending.length - 1].invite_token;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="rounded-2xl bg-background shadow-2xl p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={onClose} aria-label="Zavřít">×</button>
        <h3 className="text-2xl font-bold mb-4 text-center">Sdílení scope</h3>
        {/* Magický link pro sdílení scope (vždy viditelný) */}
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 text-green-700 text-sm break-all">
            <span>Link pro sdílení (editace):</span>
            {(() => {
              const token = getLastInviteToken();
              const link = token ? `${window.location.origin}/scopes/${scopeId}/accept?token=${token}` : `${window.location.origin}/scopes/${scopeId}/accept`;
              return <>
                <a href={link} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">{link}</a>
                <button onClick={() => navigator.clipboard.writeText(link)} title="Kopírovat" className="text-blue-600 hover:text-blue-800"><FiCopy /></button>
              </>;
            })()}
          </div>
          <div className="flex items-center gap-2 text-blue-700 text-sm break-all">
            <span>Link pouze pro zobrazení:</span>
            {(() => {
              const viewLink = `${window.location.origin}/scopes/${scopeId}/view`;
              return <>
                <a href={viewLink} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">{viewLink}</a>
                <button onClick={() => navigator.clipboard.writeText(viewLink)} title="Kopírovat" className="text-blue-600 hover:text-blue-800"><FiCopy /></button>
              </>;
            })()}
          </div>
        </div>
        <form className="flex gap-2 mb-4" onSubmit={handleInvite}>
          <input
            type="email"
            className="border rounded px-3 py-2 min-w-[220px] focus:outline-blue-400"
            placeholder="E-mail uživatele"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-blue-700 transition"
            type="submit"
          >
            Pozvat
          </button>
        </form>
        {inviteError && <div className="text-red-600 text-sm mb-2">{inviteError}</div>}
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Pozvaní a editoři</h4>
          {editorsLoading ? (
            <div className="text-gray-400">Načítám…</div>
          ) : editors.length === 0 ? (
            <div className="text-gray-400">Žádní pozvaní ani editoři</div>
          ) : (
            <ul className="divide-y">
              {editors.map(editor => (
                <li key={editor.id} className="py-2 flex items-center gap-2">
                  <span className="font-mono text-sm">{editor.email || editor.user_id}</span>
                  {editor.accepted_at ? (
                    <span className="text-green-600 text-xs ml-2">editor</span>
                  ) : (
                    <span className="text-yellow-600 text-xs ml-2">pozván</span>
                  )}
                  <button
                    className="ml-2 text-red-600 text-xs hover:underline"
                    onClick={() => handleRemoveEditor(editor.id)}
                    title="Odebrat práva"
                  >
                    Odebrat
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