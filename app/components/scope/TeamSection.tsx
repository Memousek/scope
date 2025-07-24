/**
 * Modern Team Section Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Inline editace členů týmu
 * - Moderní UI s gradient efekty
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { TeamMember, ROLES } from "./types";
import { AddMemberModal } from "./AddMemberModal";
import { useTranslation } from "@/lib/translation";
import { TeamService } from "@/app/services/teamService";

interface TeamSectionProps {
  scopeId: string;
  team: TeamMember[];
  onTeamChange: (team: TeamMember[]) => void;
  readOnlyMode?: boolean;
}

export function TeamSection({ scopeId, team, onTeamChange, readOnlyMode = false }: TeamSectionProps) {
  const { t } = useTranslation();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const debounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const handleAddMember = async (member: {
    name: string;
    role: string;
    fte: number;
  }) => {
    setSavingMember(true);
    try {
      const newMember = await TeamService.createTeamMember(scopeId, member);
      onTeamChange([...team, newMember]);
    } catch (error) {
      console.error('Chyba při přidávání člena týmu:', error);
    } finally {
      setSavingMember(false);
    }
  };

  const saveToDatabase = useCallback(async (
    memberId: string,
    field: keyof TeamMember,
    value: string | number
  ) => {
    setSavingMember(true);
    try {
      await TeamService.updateTeamMember(memberId, { [field]: value } as Partial<TeamMember>);
    } catch (error) {
      console.error('Chyba při ukládání člena týmu:', error);
    } finally {
      setSavingMember(false);
    }
  }, []);

  const handleEditMember = useCallback((
    memberId: string,
    field: keyof TeamMember,
    value: string | number
  ) => {
    // Okamžitě aktualizuj UI
    const updated = team.map((m) =>
      m.id === memberId ? { ...m, [field]: value } : m
    );
    onTeamChange(updated);

    // Zruš předchozí timeout pro tento member a field
    const timeoutKey = `${memberId}-${field}`;
    if (debounceTimeouts.current[timeoutKey]) {
      clearTimeout(debounceTimeouts.current[timeoutKey]);
    }

    // Nastav nový timeout pro uložení do databáze
    debounceTimeouts.current[timeoutKey] = setTimeout(() => {
      saveToDatabase(memberId, field, value);
      delete debounceTimeouts.current[timeoutKey];
    }, 1000); // Debounce 1 sekunda
  }, [team, onTeamChange, saveToDatabase]);

  // Cleanup timeouts při unmount
  useEffect(() => {
    const timeouts = debounceTimeouts.current;
    return () => {
      Object.values(timeouts).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const handleDeleteMember = async (memberId: string) => {
    onTeamChange(team.filter((m) => m.id !== memberId));
    try {
      await TeamService.deleteTeamMember(memberId);
    } catch (error) {
      console.error('Chyba při mazání člena týmu:', error);
      // Vraťte člena zpět do seznamu při chybě
      // V produkčním kódu byste měli implementovat lepší error handling
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "PM":
        return "from-purple-500 to-pink-500";
      case "FE":
        return "from-blue-500 to-cyan-500";
      case "BE":
        return "from-green-500 to-emerald-500";
      case "QA":
        return "from-orange-500 to-red-500";
      case "DPL":
        return "from-indigo-500 to-purple-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "PM":
        return "👨‍💼";
      case "FE":
        return "🎨";
      case "BE":
        return "⚙️";
      case "QA":
        return "🔍";
      case "DPL":
        return "🚀";
      default:
        return "👤";
    }
  };

  return (
    <>
      {!readOnlyMode && (
        <AddMemberModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAddMember={handleAddMember}
          savingMember={savingMember}
        />
      )}

      {/* Členové týmu */}
      <section className="mb-8">
        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <h2 className="relative text-2xl font-bold dark:text-white text-gray-900">
                    👥 {t("teamMembers")}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span>Správa členů týmu</span>
                </div>
              </div>
              {!readOnlyMode && (
                <button
                  className="relative group bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95"
                  onClick={() => setAddModalOpen(true)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    {t("addMember")}
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {team.length === 0 ? (
                <div className="text-center py-16">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20"></div>
                    <div className="relative text-8xl">👥</div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-xl font-medium mb-2">
                    {t("noMembers")}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Začněte přidáním prvního člena týmu
                  </p>
                </div>
              ) : (
                team.map((member) => (
                  <div
                    key={member.id}
                    className="relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in slide-in-from-bottom-8 fade-in duration-700"
                  >
                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>

                    {/* Loading overlay during save */}
                    {savingMember && (
                      <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center rounded-2xl z-30">
                        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent"></div>
                          <span className="text-sm font-semibold">
                            Ukládám...
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 sm:p-6 relative">
                      {/* Desktop layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-6 flex-1">
                          {/* Avatar a jméno */}
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            </div>

                            <div className="flex-1">
                              {!readOnlyMode && (
                                <input
                                  className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 font-semibold text-lg"
                                  value={member.name}
                                  onChange={(e) =>
                                    handleEditMember(
                                    member.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="Jméno člena"
                              />
                              )}
                              {readOnlyMode && (
                                <div className="text-gray-600 dark:text-gray-400 text-sm">
                                  {member.name}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Role */}
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {getRoleIcon(member.role)}
                            </span>
                            {!readOnlyMode && (
                              <select
                                className="bg-gradient-to-r from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 font-medium min-w-[120px]"
                                value={member.role}
                                onChange={(e) =>
                                  handleEditMember(
                                  member.id,
                                  "role",
                                  e.target.value
                                )
                              }
                              disabled={readOnlyMode}
                            >
                              {ROLES.map((role) => (
                                <option key={role.value} value={role.value}>
                                  {role.value}
                                </option>
                              ))}
                            </select>
                            )}
                            {readOnlyMode && (
                              <div className="text-gray-600 dark:text-gray-400 text-sm">
                                {member.role}
                              </div>
                            )}
                          </div>

                          {/* FTE */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              Úvazek:
                            </span>
                            <div className="relative">
                              {!readOnlyMode && (
                                <>
                                  <input
                                    className="w-20 bg-gradient-to-r from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    type="number"
                                    min={0.1}
                                    step={0.01}
                                    value={member.fte}
                                    onChange={(e) =>
                                      handleEditMember(
                                        member.id,
                                        "fte",
                                        Number(e.target.value)
                                      )
                                    }
                                    disabled={readOnlyMode}
                                  />
                                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                                    FTE
                                  </span>
                                </>
                              )}
                              {readOnlyMode && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  {member.fte.toFixed(2)} FTE
                                </span>
                              )}

                              {/* Custom spinner buttons */}
                              {!readOnlyMode && (
                                <div className="absolute left-1 top-1/2 transform -translate-y-1/2 flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    className="w-3 h-3 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    onClick={() =>
                                      handleEditMember(
                                        member.id,
                                        "fte",
                                        Math.min(member.fte + 0.1, 2)
                                      )
                                    }
                                  >
                                    <svg
                                      className="w-2 h-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 15l7-7 7 7"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="w-3 h-3 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    onClick={() =>
                                      handleEditMember(
                                        member.id,
                                        "fte",
                                        Math.max(member.fte - 0.1, 0.1)
                                      )
                                    }
                                  >
                                    <svg
                                      className="w-2 h-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Akce */}
                        {!readOnlyMode && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-3 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl group"
                              title={t("delete")}
                            >
                              <svg
                                className="w-5 h-5 group-hover:scale-110 transition-transform duration-200"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Mobile layout */}
                      <div className="md:hidden space-y-4">
                        {/* Header s avatarem a jménem */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            </div>

                            <div className="flex-1">
                              {!readOnlyMode && (
                                <input
                                  className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 font-semibold text-base"
                                  value={member.name}
                                  onChange={(e) =>
                                    handleEditMember(
                                      member.id,
                                      "name",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Jméno člena"
                                />
                              )}
                              {readOnlyMode && (
                                <div className="text-gray-600 dark:text-gray-400 font-semibold text-base">
                                  {member.name}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Delete button */}
                          {!readOnlyMode && (
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                              title={t("delete")}
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Role a FTE */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Role */}
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {getRoleIcon(member.role)}
                            </span>
                            {!readOnlyMode && (
                              <select
                                className="flex-1 bg-gradient-to-r from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 font-medium text-sm"
                                value={member.role}
                                onChange={(e) =>
                                  handleEditMember(
                                    member.id,
                                    "role",
                                    e.target.value
                                  )
                                }
                                disabled={readOnlyMode}
                              >
                                {ROLES.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.value}
                                  </option>
                                ))}
                              </select>
                            )}
                            {readOnlyMode && (
                              <div className="flex-1 text-gray-600 dark:text-gray-400 font-medium text-sm">
                                {member.role}
                              </div>
                            )}
                          </div>

                          {/* FTE */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                              FTE:
                            </span>
                            <div className="relative flex-1">
                              {!readOnlyMode && (
                                <>
                                  <input
                                    className="w-full bg-gradient-to-r from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 text-center font-semibold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    type="number"
                                    min={0.1}
                                    step={0.01}
                                    value={member.fte}
                                    onChange={(e) =>
                                      handleEditMember(
                                        member.id,
                                        "fte",
                                        Number(e.target.value)
                                      )
                                    }
                                    disabled={readOnlyMode}
                                  />

                                  {/* Custom spinner buttons */}
                                  <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
                                    <button
                                      type="button"
                                      className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                      onClick={() =>
                                        handleEditMember(
                                          member.id,
                                          "fte",
                                          Math.min(member.fte + 0.1, 2)
                                        )
                                      }
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M5 15l7-7 7 7"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                      onClick={() =>
                                        handleEditMember(
                                          member.id,
                                          "fte",
                                          Math.max(member.fte - 0.1, 0.1)
                                        )
                                      }
                                    >
                                      <svg
                                        className="w-3 h-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={3}
                                          d="M19 9l-7 7-7-7"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </>
                              )}
                              {readOnlyMode && (
                                <div className="w-full text-center font-semibold text-sm text-gray-600 dark:text-gray-400">
                                  {member.fte.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Role badge - visible on both layouts */}
                      <div className="mt-4 flex items-center gap-2">
                        <span
                          className={`bg-gradient-to-r ${getRoleColor(member.role)} text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg`}
                        >
                          {member.role}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {member.fte} FTE
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Team stats */}
            {team.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Celkem členů
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {team.length}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Celkový úvazek
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {team
                      .reduce((sum, member) => sum + member.fte, 0)
                      .toFixed(1)}{" "}
                    FTE
                  </div>
                </div>

                <div className="bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg">
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    Unikátní role
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {new Set(team.map((m) => m.role)).size}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
