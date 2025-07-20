/**
 * Modern Team Section Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Inline editace členů týmu
 * - Moderní UI s gradient efekty
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TeamMember, ROLES } from './types';
import { AddMemberModal } from './AddMemberModal';
import { useTranslation } from '@/lib/translation';

interface TeamSectionProps {
  scopeId: string;
  team: TeamMember[];
  onTeamChange: (team: TeamMember[]) => void;
}

export function TeamSection({ scopeId, team, onTeamChange }: TeamSectionProps) {
  const { t } = useTranslation();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [savingMember, setSavingMember] = useState(false);

  const handleAddMember = async (member: { name: string; role: string; fte: number }) => {
    setSavingMember(true);
    const supabase = createClient();
    const { error, data } = await supabase.from('team_members').insert([
      { ...member, scope_id: scopeId }
    ]).select();
    setSavingMember(false);
    if (!error && data && data[0]) {
      onTeamChange([...team, data[0]]);
    }
  };

  const handleEditMember = async (memberId: string, field: keyof TeamMember, value: string | number) => {
    setSavingMember(true);
    const supabase = createClient();
    const { error } = await supabase.from('team_members').update({ [field]: value }).eq('id', memberId);
    setSavingMember(false);
    if (!error) {
      const updated = team.map(m => m.id === memberId ? { ...m, [field]: value } : m);
      onTeamChange(updated);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    onTeamChange(team.filter(m => m.id !== memberId));
    const supabase = createClient();
    await supabase.from('team_members').delete().eq('id', memberId);
  };

  return (
    <>
      <AddMemberModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAddMember={handleAddMember}
        savingMember={savingMember}
      />

      {/* Členové týmu */}
      <section className="mb-8">
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-white/20 dark:border-gray-700 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              👥 {t('teamMembers')}
            </h2>
            <button
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 shadow-lg font-medium"
              onClick={() => setAddModalOpen(true)}
            >
              {t('addMember')}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200/50 dark:border-gray-600/50">
                  <th className="px-3 py-3 text-left">{t('name')}</th>
                  <th className="px-3 py-3 text-center">{t('role')}</th>
                  <th className="px-3 py-3 text-center">{t('fte')}</th>
                  <th className="px-3 py-3 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {team.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-gray-400 dark:text-gray-500 text-center py-8">
                      {t('noMembers')}
                    </td>
                  </tr>
                ) : (
                  team.map(member => (
                    <tr key={member.id} className="border-b border-gray-100/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-3 py-3 align-middle">
                        <input
                          className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                          value={member.name}
                          onChange={e => handleEditMember(member.id, 'name', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        <select
                          className="bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                          value={member.role}
                          onChange={e => handleEditMember(member.id, 'role', e.target.value)}
                        >
                          {ROLES.map(role => (
                            <option key={role.value} value={role.value}>{role.value}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        <input
                          className="w-20 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                          type="number"
                          min={0.1}
                          step={0.01}
                          value={member.fte}
                          onChange={e => handleEditMember(member.id, 'fte', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-3 align-middle text-center">
                        <button 
                          className="text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300 hover:underline transition-colors duration-200" 
                          onClick={() => handleDeleteMember(member.id)}
                        >
                          {t('delete')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
} 