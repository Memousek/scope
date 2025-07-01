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
      <section className="mb-6">
        <div className="rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className="text-xl font-semibold mb-2 sm:mb-0">{t('teamMembers')}</h2>
              <button
                className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition w-full sm:w-auto mt-2 sm:mt-0"
                onClick={() => setAddModalOpen(true)}
              >
                {t('addMember')}
              </button>
          </div>
          <div className="rounded p-2 sm:p-3">
            <div className="flex font-semibold mb-2 text-gray-700 text-xs sm:text-base">
              <div className="flex-1">{t('name')}</div>
              <div className="w-24 sm:w-32">{t('role')}</div>
              <div className="w-24 sm:w-32">{t('fte')}</div>
              <div className="w-16 sm:w-20">{t('actions')}</div>
            </div>
            {team.length === 0 ? (
              <div className="text-gray-400">{t('noMembers')}</div>
            ) : (
              team.map(member => (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center mb-2 gap-1 sm:gap-0" key={member.id}>
                  <input
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex-1 border rounded px-2 py-1 mr-0 sm:mr-2 focus:outline-blue-400"
                    value={member.name}
                    onChange={e => handleEditMember(member.id, 'name', e.target.value)}
                  />
                  <select
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-24 sm:w-32 border rounded px-2 py-1 mr-0 sm:mr-2 focus:outline-blue-400"
                    value={member.role}
                    onChange={e => handleEditMember(member.id, 'role', e.target.value)}
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.value}</option>
                    ))}
                  </select>
                  <input
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-24 sm:w-32 border rounded px-2 py-1 mr-0 sm:mr-2 focus:outline-blue-400"
                    type="number"
                    min={0.1}
                    step={0.01}
                    value={member.fte}
                    onChange={e => handleEditMember(member.id, 'fte', Number(e.target.value))}
                  />
                  <button className="text-red-600 font-semibold hover:underline ml-0 sm:ml-2 mt-1 sm:mt-0" onClick={() => handleDeleteMember(member.id)}>{t('delete')}</button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
} 