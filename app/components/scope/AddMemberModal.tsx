/**
 * Modern Add Member Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState } from 'react';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { FiUserPlus } from 'react-icons/fi';
import { useScopeRoles } from '@/app/hooks/useScopeRoles';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: { name: string; role: string; fte: number }) => Promise<void>;
  savingMember: boolean;
  scopeId: string;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddMember, 
  savingMember,
  scopeId
}) => {
  const { t } = useTranslation();
  const { activeRoles } = useScopeRoles(scopeId);
  
  const [newMember, setNewMember] = useState<{ name: string; role: string; fte: number }>({ 
    name: '', 
    role: activeRoles.length > 0 ? activeRoles[0].label : '', 
    fte: 1 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    await onAddMember(newMember);
    setNewMember({ name: '', role: activeRoles.length > 0 ? activeRoles[0].label : '', fte: 1 });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('addNewMember')}
      icon={<FiUserPlus size={24} className="text-white" />}
      maxWidth="lg"
    >
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
            className={`${
              activeRoles.length === 0 ? 'opacity-50 cursor-not-allowed text-red-400 dark:text-red-400' : ''
            } w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200`}
            value={activeRoles.length > 0 ? newMember.role : t('noActiveRolesAddRolesInRoleSettings')}
            onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
            disabled={activeRoles.length === 0 || savingMember}
          >
            {activeRoles.map(role => (
              <option key={role.key} value={role.label}>{role.label}</option>
            ))}
            {activeRoles.length === 0 && (
              <option disabled defaultChecked>{t('noActiveRolesAddRolesInRoleSettings')}</option>
            )}
          </select>
        </div>

        

        {/* FTE */}
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('fte')}</label>
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
            value={newMember.fte}
            onChange={e => setNewMember(m => ({ ...m, fte: Number(e.target.value) }))}
            disabled={savingMember}
            required
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            disabled={savingMember}
            className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-all duration-200 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={activeRoles.length === 0 || savingMember || !newMember.name.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {savingMember ? t('adding') : t('addMember')}
          </button>
        </div>
      </form>
    </Modal>
  );
}; 