import { useState } from 'react';
import { ROLES } from './types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (member: { name: string; role: string; fte: number }) => Promise<void>;
  savingMember: boolean;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onAddMember, savingMember }) => {
  const [newMember, setNewMember] = useState({ name: '', role: ROLES[0].value, fte: 1 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name.trim()) return;
    await onAddMember(newMember);
    setNewMember({ name: '', role: ROLES[0].value, fte: 1 });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm">
      <div className="rounded-2xl bg-background shadow-2xl p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={onClose} aria-label="Zavřít">×</button>
        <h3 className="text-2xl font-bold mb-6 text-center">Přidat nového člena týmu</h3>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col">
            <label className="mb-1 font-medium text-gray-700">Jméno člena týmu</label>
            <input
              className="border rounded px-3 py-2 min-w-[180px] focus:outline-blue-400"
              placeholder="Jana Nováková"
              value={newMember.name}
              onChange={e => setNewMember(m => ({ ...m, name: e.target.value }))}
              disabled={savingMember}
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 font-medium text-gray-700">Role</label>
            <select
              className="border rounded px-3 py-2 min-w-[140px] focus:outline-blue-400"
              value={newMember.role}
              onChange={e => setNewMember(m => ({ ...m, role: e.target.value }))}
              disabled={savingMember}
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
              disabled={savingMember}
              required
            />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" className="px-5 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300" onClick={onClose}>Zrušit</button>
            <button
              className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
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