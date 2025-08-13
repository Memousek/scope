/**
 * VacationModal Component
 * Umožní spravovat dovolené konkrétního člena týmu.
 * - Ukládá rozsahy do localStorage bez zásahu do DB
 * - Hezký a přehledný UI s ikonami a zvýrazněním
 */

import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "../ui/Modal";
import { useTranslation } from "@/lib/translation";
import { FiCalendar, FiTag, FiTrash2, FiPlus, FiSave, FiX } from "react-icons/fi";
import type { TeamMember, VacationRange } from "./types";
import { TeamService } from "@/app/services/teamService";

interface VacationModalProps {
  isOpen: boolean;
  member: TeamMember | null;
  scopeId: string;
  onClose: () => void;
}

export function VacationModal({ isOpen, member, scopeId, onClose }: VacationModalProps) {
  const { t } = useTranslation();
  const storageKey = useMemo(
    () => (member ? `scope:${scopeId}:member:${member.id}:vacations` : ""),
    [member, scopeId]
  );

  const [ranges, setRanges] = useState<VacationRange[]>([]);

  // Load from Supabase (fallback localStorage for legacy)
  useEffect(() => {
    const load = async () => {
      if (!isOpen || !member) return;
      const dbMember = await TeamService.getTeamMemberById(member.id);
      if (dbMember && Array.isArray((dbMember as any).vacations)) {
        setRanges(((dbMember as any).vacations as VacationRange[]) || []);
      } else {
        try {
          const raw = localStorage.getItem(storageKey) || localStorage.getItem(`scope:${member.id}:vacations`);
          setRanges(raw ? (JSON.parse(raw) as VacationRange[]) : []);
        } catch {
          setRanges([]);
        }
      }
    };
    void load();
  }, [isOpen, member, storageKey]);

  const addRange = () =>
    setRanges((prev) => [
      ...prev,
      { start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) },
    ]);
  const updateRange = (i: number, patch: Partial<VacationRange>) =>
    setRanges((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRange = (i: number) => setRanges((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!member) return;
    // Persist to Supabase (JSONB column vacations); fallback localStorage
    TeamService.updateTeamMember(member.id, { vacations: ranges } as unknown as TeamMember)
      .catch((e) => {
        console.error('Failed to save vacations to DB, fallback localStorage', e);
        try { localStorage.setItem(storageKey, JSON.stringify(ranges)); } catch {}
      })
      .finally(() => onClose());
  };

  if (!isOpen || !member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t("manageVacations")} ${t("user's")} <b>${member.name}</b>`}
      description={`${t("defineMemberVacations")}`}
      icon={<FiCalendar className="w-4 h-4" />}
    >
      <div className="space-y-4">
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{member.name}</div>
        <div className="space-y-3">
          {ranges.map((r, i) => (
            <div
              key={i}
              className="rounded-2xl p-3 border border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-800/70 shadow-sm"
            >
              <div className="grid grid-cols-1 sm:grid-cols-8 gap-2 items-center">
                <label className="text-[11px] uppercase tracking-wide sm:col-span-1 text-gray-500 dark:text-gray-400">
                  {t("from")}
                </label>
                <input
                  type="date"
                  className="sm:col-span-3 w-full rounded-xl px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={r.start}
                  onChange={(e) => updateRange(i, { start: e.target.value })}
                />
                <label className="text-[11px] uppercase tracking-wide sm:col-span-1 text-gray-500 dark:text-gray-400">
                  {t("to")}
                </label>
                <input
                  type="date"
                  className="sm:col-span-3 w-full rounded-xl px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={r.end}
                  onChange={(e) => updateRange(i, { end: e.target.value })}
                />
                <div className="sm:col-span-7 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center">
                    <FiTag className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    className="flex-1 rounded-xl px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t("note")}
                    value={r.note || ""}
                    onChange={(e) => updateRange(i, { note: e.target.value })}
                  />
                  <button
                    className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                    onClick={() => removeRange(i)}
                  >
                    <FiTrash2 className="w-4 h-4" /> {t("remove")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <button
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 flex items-center gap-2"
            onClick={addRange}
          >
            <FiPlus className="w-4 h-4" /> {t("addRange")}
          </button>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 flex items-center gap-2"
              onClick={onClose}
            >
              <FiX className="w-4 h-4" /> {t("cancel")}
            </button>
            <button
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white flex items-center gap-2"
              onClick={handleSave}
            >
              <FiSave className="w-4 h-4" /> {t("save")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}


