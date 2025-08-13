/**
 * VacationModal Component
 * Umožní spravovat dovolené konkrétního člena týmu.
 * - Ukládá rozsahy do localStorage bez zásahu do DB
 * - Hezký a přehledný UI s ikonami a zvýrazněním
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  readOnly?: boolean;
  onSaved?: (ranges: VacationRange[]) => void;
}

export function VacationModal({ isOpen, member, scopeId, onClose, readOnly = false, onSaved }: VacationModalProps) {
  const { t } = useTranslation();
  const storageKey = useMemo(
    () => (member ? `scope:${scopeId}:member:${member.id}:vacations` : ""),
    [member, scopeId]
  );

  const [ranges, setRanges] = useState<VacationRange[]>([]);
  const [errorsByIndex, setErrorsByIndex] = useState<Record<number, string[]>>({});
  const [hasAnyError, setHasAnyError] = useState(false);
  
  const getInclusiveDays = useCallback((start?: string, end?: string): number | null => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
    const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  }, []);

  // Load from Supabase (fallback localStorage for legacy)
  useEffect(() => {
    const load = async () => {
      if (!isOpen || !member) return;
      const dbMember = await TeamService.getTeamMemberById(member.id);
      if (dbMember && Array.isArray(dbMember.vacations)) {
        setRanges(dbMember.vacations || []);
        return;
      }
      try {
        const raw = localStorage.getItem(storageKey) || localStorage.getItem(`scope:${member.id}:vacations`);
        setRanges(raw ? (JSON.parse(raw) as VacationRange[]) : []);
      } catch {
        setRanges([]);
      }
    };
    void load();
  }, [isOpen, member, storageKey]);

  const addRange = () => {
    const newIndex = ranges.length;
    const today = new Date().toISOString().slice(0, 10);
    setRanges((prev) => [
      ...prev,
      { start: today, end: today },
    ]);
    // shift focus to the new start input for accessibility
    setTimeout(() => {
      const el = document.getElementById(`vac-start-${newIndex}-${member?.id ?? 'x'}`);
      if (el) (el as HTMLInputElement).focus();
    }, 0);
  };
  const updateRange = (i: number, patch: Partial<VacationRange>) =>
    setRanges((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRange = (i: number) => setRanges((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!member) return;
    // Persist to Supabase (JSONB column vacations); fallback localStorage
    TeamService.updateTeamMember(member.id, { vacations: ranges } as Partial<TeamMember>)
      .catch((e) => {
        console.error('Failed to save vacations to DB, fallback localStorage', e);
        try { localStorage.setItem(storageKey, JSON.stringify(ranges)); } catch {}
      })
      .then(() => {
        try {
          onSaved?.(ranges);
        } catch {}
      })
      .finally(() => onClose());
  };

  if (!isOpen || !member) return null;

  // Validate on every change of ranges
  useEffect(() => {
    const newErrors: Record<number, string[]> = {};
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;

    // Basic per-range validation
    ranges.forEach((r, i) => {
      const errs: string[] = [];
      if (!r.start) errs.push(t('dateFromRequired'));
      if (!r.end) errs.push(t('dateToRequired'));
      if (r.start && !isoRegex.test(r.start)) errs.push(t('dateFromInvalid'));
      if (r.end && !isoRegex.test(r.end)) errs.push(t('dateToInvalid'));
      if (r.start && r.end) {
        const s = new Date(r.start).getTime();
        const e = new Date(r.end).getTime();
        if (!Number.isNaN(s) && !Number.isNaN(e) && s > e) {
          errs.push(t('dateFromAfterTo'));
      }
      }
      if (errs.length > 0) newErrors[i] = errs;
    });

    // Overlap validation (only if dates are valid and start<=end)
    const normalized = ranges
      .map((r, i) => ({
        i,
        s: r.start && isoRegex.test(r.start) ? new Date(r.start).getTime() : NaN,
        e: r.end && isoRegex.test(r.end) ? new Date(r.end).getTime() : NaN,
      }))
      .filter((x) => !Number.isNaN(x.s) && !Number.isNaN(x.e) && x.s <= x.e)
      .sort((a, b) => a.s - b.s);

    for (let idx = 1; idx < normalized.length; idx++) {
      const prev = normalized[idx - 1];
      const cur = normalized[idx];
      // inclusive overlap
      if (prev.e >= cur.s) {
        newErrors[prev.i] = [...(newErrors[prev.i] || []), t('dateRangesOverlap')];
        newErrors[cur.i] = [...(newErrors[cur.i] || []), t('dateRangesOverlap')];
      }
    }

    setErrorsByIndex(newErrors);
    setHasAnyError(Object.keys(newErrors).length > 0);
  }, [ranges, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${t("manageVacations")} ${t("user's")} <b>${member.name}</b>`}
      description={`${t("defineMemberVacations")}`}
      icon={<FiCalendar className="w-4 h-4" />}
    >
      <div className="space-y-5" role="region" aria-labelledby="vacation-editor-title">
        <h3 id="vacation-editor-title" className="sr-only">
          {t("manageVacations")}
        </h3>

        {readOnly && (
          <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 px-1">
            <div>
              {t("total")}: {ranges.length}
            </div>
            <div>
              {(() => {
                const totalDays = ranges.reduce((sum, r) => sum + (getInclusiveDays(r.start, r.end) ?? 0), 0);
                return `${totalDays} ${totalDays === 1 ? t("day") : t("days")}`;
              })()}
            </div>
          </div>
        )}

        <ul role="list" className="space-y-4">
          {ranges.map((r, i) => {
            const startId = `vac-start-${i}-${member.id}`;
            const endId = `vac-end-${i}-${member.id}`;
            const noteId = `vac-note-${i}-${member.id}`;
            const helpId = `vac-help-${i}-${member.id}`;
            const days = getInclusiveDays(r.start, r.end);

            return (
              <li key={i} role="listitem">
                <fieldset className="rounded-2xl border border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-br from-white/95 to-white/70 dark:from-gray-800/95 dark:to-gray-800/70 shadow-sm">
                  <legend className="px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {t("vacations")} #{i + 1}
                        {days !== null && (
                          <span className="inline-flex items-center px-2 py-1 " aria-live="polite">
                            {days} {days === 1 ? t("day") : t("days")}
                          </span>
                        )}
                  </legend>

                  <div className="p-4 space-y-3" role="group" aria-labelledby={`${startId} ${endId}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5">
                        <label htmlFor={startId} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          {t("from")}
                        </label>
                        {readOnly ? (
                          <div id={startId} aria-readonly className="w-full rounded-xl px-3 py-2 bg-white/60 dark:bg-gray-900/60 border border-gray-300/50 dark:border-gray-700/50">
                            {r.start}
                          </div>
                        ) : (
                          <input
                            id={startId}
                            type="date"
                            className="w-full rounded-xl px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={r.start}
                            onChange={(e) => updateRange(i, { start: e.target.value })}
                            aria-describedby={helpId}
                          />
                        )}
                      </div>
                      <div className="sm:col-span-5">
                        <label htmlFor={endId} className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          {t("to")}
                        </label>
                        {readOnly ? (
                          <div id={endId} aria-readonly className="w-full rounded-xl px-3 py-2 bg-white/60 dark:bg-gray-900/60 border border-gray-300/50 dark:border-gray-700/50">
                            {r.end}
                          </div>
                        ) : (
                          <input
                            id={endId}
                            type="date"
                            className="w-full rounded-xl px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={r.end}
                            onChange={(e) => updateRange(i, { end: e.target.value })}
                            aria-describedby={helpId}
                            min={r.start || undefined}
                          />
                        )}
                      </div>
                      <div className="sm:col-span-2 flex items-end justify-end gap-2">
                        {!readOnly && (
                          <button
                            type="button"
                            className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                            onClick={() => removeRange(i)}
                            aria-label={`${t("remove")} #${i + 1}`}
                          >
                            <FiTrash2 className="w-4 h-4" /> {t("remove")}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center" aria-hidden="true">
                        <FiTag className="w-4 h-4" />
                      </div>
                      {readOnly ? (
                        <div id={noteId} aria-readonly className="flex-1 rounded-xl px-3 py-2 bg-white/60 dark:bg-gray-900/60 border border-gray-300/50 dark:border-gray-700/50">
                          {r.note || "—"}
                        </div>
                      ) : (
                        <>
                          <label htmlFor={noteId} className="sr-only">{t("note")}</label>
                          <input
                            id={noteId}
                            type="text"
                            className="flex-1 rounded-xl px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder={t("note")}
                            value={r.note || ""}
                            onChange={(e) => updateRange(i, { note: e.target.value })}
                          />
                        </>
                      )}
                    </div>

                    <p id={helpId} className="text-[11px] text-gray-500 dark:text-gray-400">
                      {t("from")} / {t("to")} — {t("note")}
                    </p>
                    {errorsByIndex[i] && errorsByIndex[i].length > 0 && (
                      <ul className="mt-1 text-xs text-red-500 list-disc ml-5">
                        {errorsByIndex[i].map((er, idx) => (
                          <li key={idx}>{er}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </fieldset>
              </li>
            );
          })}
          {ranges.length === 0 && (
            <li className="text-sm text-center font-semibold text-gray-800 dark:text-gray-100" role="status">{t("noVacations")}</li>
          )}
        </ul>

        <div className="flex justify-between items-center">
          {!readOnly && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 flex items-center gap-2"
              onClick={addRange}
              aria-label={t("addRange")}
            >
              <FiPlus className="w-4 h-4" /> {t("addRange")}
            </button>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 flex items-center gap-2"
              onClick={onClose}
            >
              <FiX className="w-4 h-4" /> {t("close")}
            </button>
            {!readOnly && (
              <button
                type="button"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={hasAnyError || ranges.length === 0}
              >
                <FiSave className="w-4 h-4" /> {t("save")}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}


