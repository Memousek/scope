import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TeamMember, ROLES } from './types';

interface TeamSectionProps {
  scopeId: string;
  team: TeamMember[];
  onTeamChange: (team: TeamMember[]) => void;
}

export function TeamSection({ scopeId, team, onTeamChange }: TeamSectionProps) {
  const [newMember, setNewMember] = useState<{ name: string; role: string; fte: number }>({ name: '', role: ROLES[0].value, fte: 1 });
  const [savingMember, setSavingMember] = useState<string | null>(null);

  const handleAddMember = async () => {
    if (!newMember.name.trim()) return;
    setSavingMember(null);
    const supabase = createClient();
    const { error, data } = await supabase.from('team_members').insert([
      { ...newMember, scope_id: scopeId }
    ]).select();
    setSavingMember(null);
    if (!error && data && data[0]) {
      onTeamChange([...team, data[0]]);
      setNewMember({ name: '', role: ROLES[0].value, fte: 1 });
    }
  };

  const handleEditMember = async (memberId: string, field: keyof TeamMember, value: string | number) => {
    setSavingMember(null);
    const supabase = createClient();
    const { error } = await supabase.from('team_members').update({ [field]: value }).eq('id', memberId);
    setSavingMember(null);
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
      {/* Přidání nového člena týmu */}
      <section className="mb-6">
        <div className="rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Přidat nového člena týmu</h2>
          <form className="flex flex-wrap gap-4 items-end" onSubmit={e => { e.preventDefault(); handleAddMember(); }}>
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Jméno člena týmu</label>
              <input
                className="border rounded px-3 py-2 min-w-[180px] focus:outline-blue-400"
                placeholder="Jana Nováková"
                value={newMember.name}
                onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
                disabled={!!savingMember}
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Role</label>
              <select
                className="border rounded px-3 py-2 min-w-[140px] focus:outline-blue-400"
                value={newMember.role}
                onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
                disabled={!!savingMember}
              >
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="mb-1 font-medium text-gray-700">Úvazek v FTE</label>
              <input
                className="border rounded px-3 py-2 w-20 focus:outline-blue-400"
                placeholder="FTE"
                type="number"
                min={0.1}
                step={0.01}
                value={newMember.fte}
                onChange={e => setNewMember(m => ({ ...m, fte: Number(e.target.value) }))}
                disabled={!!savingMember}
                required
              />
            </div>
            <button
              className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
              type="submit"
              disabled={!!savingMember || !newMember.name.trim()}
            >
              Přidat člena
            </button>
          </form>
        </div>
      </section>

      {/* Členové týmu */}
      <section className="mb-6">
        <div className="rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Členové týmu</h2>
          <div className="rounded p-3">
            <div className="flex font-semibold mb-2 text-gray-700">
              <div className="flex-1">Jméno člena týmu</div>
              <div className="w-32">Role</div>
              <div className="w-32">Úvazek v FTE</div>
              <div className="w-20">Akce</div>
            </div>
            {team.length === 0 ? (
              <div className="text-gray-400">Žádní členové</div>
            ) : (
              team.map(member => (
                <div className="flex items-center mb-2" key={member.id}>
                  <input
                    className="flex-1 border rounded px-2 py-1 mr-2 focus:outline-blue-400"
                    value={member.name}
                    onChange={e => handleEditMember(member.id, 'name', e.target.value)}
                  />
                  <select
                    className="w-32 border rounded px-2 py-1 mr-2 focus:outline-blue-400"
                    value={member.role}
                    onChange={e => handleEditMember(member.id, 'role', e.target.value)}
                  >
                    {ROLES.map(role => (
                      <option key={role.value} value={role.value}>{role.value}</option>
                    ))}
                  </select>
                  <input
                    className="w-32 border rounded px-2 py-1 mr-2 focus:outline-blue-400"
                    type="number"
                    min={0.1}
                    step={0.01}
                    value={member.fte}
                    onChange={e => handleEditMember(member.id, 'fte', Number(e.target.value))}
                  />
                  <button className="text-red-600 font-semibold hover:underline ml-2" onClick={() => handleDeleteMember(member.id)}>Smazat</button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
} 