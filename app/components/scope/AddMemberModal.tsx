/**
 * Modern Add Member Modal Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Moderní form styling
 * - Smooth transitions a hover efekty
 */

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/translation';
import { Modal } from '@/app/components/ui/Modal';
import { FiUserPlus } from 'react-icons/fi';
import { useScopeRoles } from '@/app/hooks/useScopeRoles';
import { ContainerService } from "@/lib/container.service";
import { ManageUserPlansService } from "@/lib/domain/services/manage-user-plans.service";
import { useScopeUsage } from "@/app/hooks/useData";
import { useSWRConfig } from "swr";

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
  const { mutate } = useSWRConfig();
  
  const [newMember, setNewMember] = useState<{ name: string; role: string; fte: number }>({ 
    name: '', 
    role: activeRoles.length > 0 ? activeRoles[0].label : '', 
    fte: 1 
  });
  const [limitError] = useState<string>('');
  const { data: usage } = useScopeUsage(scopeId);
  const [limits, setLimits] = useState<{ maxTeamMembers: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!isOpen) return;
      try {
        const container = ContainerService.getInstance();
        const svc = container.get(ManageUserPlansService);
        const plan = await svc.getPlanForScope(scopeId);
        if (plan) setLimits({ maxTeamMembers: plan.maxTeamMembers });
      } catch {}
    };
    load();
  }, [isOpen, scopeId]);

  // Ensure default role is preselected once roles are available
  useEffect(() => {
    if (!isOpen) return;
    if (activeRoles.length > 0 && (!newMember.role || newMember.role.trim() === '')) {
      setNewMember((m) => ({ ...m, role: activeRoles[0].label }));
    }
  }, [isOpen, activeRoles, newMember.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    await onAddMember(newMember);
    try { await mutate(["scopeUsage", scopeId]); } catch {}
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
      {usage && limits && (limits.maxTeamMembers - usage.teamMembers) <= 5 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('teamMembers')}: <span className="font-semibold">{usage.teamMembers}</span> {t('of')} <span className="font-semibold">{limits.maxTeamMembers}</span>
          </div>
          <div className="flex-1 mx-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className={`h-full rounded-full ${usage.teamMembers >= limits.maxTeamMembers ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, (usage.teamMembers / Math.max(1, limits.maxTeamMembers)) * 100)}%` }} />
          </div>
          <div className={`text-xs ${usage.teamMembers >= limits.maxTeamMembers ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
            {usage.teamMembers >= limits.maxTeamMembers ? t('limitReached') : `${t('remaining')}: ${Math.max(0, limits.maxTeamMembers - usage.teamMembers)}`}
          </div>
        </div>
      )}
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

        {limitError && (
          <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 rounded-md px-2 py-1">{limitError}</div>
        )}

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
            disabled={activeRoles.length === 0 || savingMember || !newMember.name.trim() || !!(limits && usage && usage.teamMembers >= limits.maxTeamMembers)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            title={limits && usage && usage.teamMembers >= limits.maxTeamMembers ? t('upgradeToIncreaseLimits') : undefined}
          >
            {savingMember ? t('adding') : t('addMember')}
          </button>
        </div>
      </form>
    </Modal>
  );
}; 