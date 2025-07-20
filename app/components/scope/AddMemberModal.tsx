/**
 * Modern Add Member Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState, useEffect } from 'react';
import { ROLES } from './types';
import { useTranslation } from '@/lib/translation';

type Role = typeof ROLES[number]['value'];

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: { name: string; role: Role; fte: number }) => Promise<void>;
  savingMember: boolean;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddMember, 
  savingMember 
}) => {
  const { t } = useTranslation();
  const [newMember, setNewMember] = useState<{ name: string; role: Role; fte: number }>({ 
    name: '', 
    role: ROLES[0].value, 
    fte: 1 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    await onAddMember(newMember);
    setNewMember({ name: '', role: ROLES[0].value, fte: 1 });
    onClose();
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
        <button 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-3xl font-bold transition-colors duration-200" 
          onClick={onClose} 
          aria-label={t('close')}
        >
          ×
        </button>
        
        <h3 className="text-2xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          👥 {t('addNewMember')}
        </h3>
        
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          {/* Jméno člena */}
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('memberName')}</label>
            <input
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              placeholder={t('memberNamePlaceholder')}
              value={newMember.name}
              onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
              disabled={savingMember}
              required
            />
          </div>
          
          {/* Role */}
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('role')}</label>
            <select
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              value={newMember.role}
              onChange={e => setNewMember(m => ({ ...m, role: e.target.value as Role }))}
              disabled={savingMember}
            >
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>
          
          {/* FTE */}
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('fte')}</label>
            <input
              className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
              placeholder={t('ftePlaceholder')}
              type="number"
              min={0.1}
              step={0.01}
              value={newMember.fte}
              onChange={e => setNewMember(m => ({ ...m, fte: Number(e.target.value) }))}
              disabled={savingMember}
              required
            />
          </div>
          
          {/* Tlačítka */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              type="button" 
              className="px-6 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200" 
              onClick={onClose}
            >
              Zrušit
            </button>
            <button
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-lg disabled:opacity-60"
              type="submit"
              disabled={savingMember || !newMember.name.trim()}
            >
              Přidat člena
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 