/**
 * Modern Team Section Component
 * - Glass-like design s animacemi
 * - Dark mode podpora
 * - Inline editace členů týmu
 * - Moderní UI s gradient efekty
 * - Filtrování členů týmu podle role a FTE
 * - Animace s respektem k prefers-reduced-motion
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { TeamMember } from "./types";
import { AddMemberModal } from "./AddMemberModal";
import TeamImportModal from "../TeamImportModal";
import { RoleManagementModal } from "./RoleManagementModal";
import { useTranslation } from "@/lib/translation";
import { TeamService } from "@/app/services/teamService";
import { getHolidays } from "@/app/utils/holidays";
import { ScopeSettingsService } from "@/app/services/scopeSettingsService";
import { TimesheetService } from "@/lib/domain/services/timesheet-service";
import { getDefaultCurrencyForLocation } from "@/app/utils/currencyUtils";

import { SettingsIcon, FilterIcon, XIcon, ChevronDownIcon } from "lucide-react";
import { FiUpload, FiCalendar, FiClock } from 'react-icons/fi';
import { useSWRConfig } from "swr";
import { FiUsers, FiSearch } from 'react-icons/fi';
import { VacationModal } from "./VacationModal";
import { TimesheetEntryModal } from "./TimesheetEntryModal";
import { ReportsModal } from "./ReportsModal";
import TeamAvailabilityModal from "./TeamAvailabilityModal";
import { useToastFunctions } from '@/app/components/ui/Toast';

interface TeamSectionProps {
  scopeId: string;
  team: TeamMember[];
  projects: Array<{ id: string; name: string }>;
  onTeamChange: (team: TeamMember[]) => void;
  readOnlyMode?: boolean;
  activeRoles?: Array<{ id: string; key: string; label: string }>;
  loading?: boolean;
  onRolesChanged?: (roles: Array<{ id: string; key: string; label: string }>) => void;
}

export function TeamSection({ scopeId, team, projects, onTeamChange, readOnlyMode = false, activeRoles: activeRolesProp, loading = false, onRolesChanged }: TeamSectionProps) {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const { t } = useTranslation();
  const { mutate } = useSWRConfig();
  const toast = useToastFunctions();
  const rolesToUse = useMemo(() => {
    if (activeRolesProp && activeRolesProp.length > 0) return activeRolesProp;
    const labels = Array.from(new Set(team.map(m => m.role)));
    return labels.map(label => ({ id: label, key: label.toLowerCase(), label }));
  }, [activeRolesProp, team]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [roleManagementModalOpen, setRoleManagementModalOpen] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");
  type VacationFilter = 'all' | 'vacation' | 'available';
  const [vacationFilter, setVacationFilter] = useState<VacationFilter>('all');
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const debounceTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const [vacationModal, setVacationModal] = useState<{ open: boolean; member: TeamMember | null; readOnly?: boolean }>({ open: false, member: null });
  const [timesheetModal, setTimesheetModal] = useState<{ open: boolean; member: TeamMember | null }>({ open: false, member: null });
  const [reportsOpen, setReportsOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [currencyInfo, setCurrencyInfo] = useState({ code: 'CZK', symbol: 'Kč' });
  const [jiraMappings, setJiraMappings] = useState<Record<string, any>>({});
  const [jiraConfigured, setJiraConfigured] = useState(false);


  // const manageAssignmentsService = useMemo(() => new ManageProjectTeamAssignmentsService(), []);


  const isOnVacationToday = useCallback((member: TeamMember): boolean => {
    const now = new Date();
    const localIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (!Array.isArray(member.vacations)) return false;
    return member.vacations.some((r) => r.start <= localIso && localIso <= r.end);
  }, []);

  // Detekce prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Načti region svátků ze scopu a zahřej cache svátků
  useEffect(() => {
    const run = async () => {
      try {
        const settings = await ScopeSettingsService.get(scopeId);
        const c = settings?.calendar?.country || 'CZ';
        const s = settings?.calendar?.subdivision ?? null;
        // setHolidayRegion({ country: c, subdivision: s });
        try { getHolidays(c, s ?? undefined); } catch {}
      } catch {}
    };
    void run();
  }, [scopeId]);

  // Load currency from scope settings
  useEffect(() => {
    const loadCurrency = async () => {
      try {
        const settings = await ScopeSettingsService.get(scopeId);
        if (settings?.calendar) {
          const country = settings.calendar.country || 'CZ';
          const subdivision = settings.calendar.subdivision || null;
          
          const currency = getDefaultCurrencyForLocation(country, subdivision);
          setCurrencyInfo({ code: currency.code, symbol: currency.symbol });
        }
      } catch (err) {
        console.error('Failed to load currency settings:', err);
        // Fallback na CZK
        setCurrencyInfo({ code: 'CZK', symbol: 'Kč' });
      }
    };
    
    loadCurrency();
  }, [scopeId]);

  // Load JIRA mappings and check if JIRA is configured
  useEffect(() => {
    const loadJiraMappings = async () => {
      try {
        const settings = await ScopeSettingsService.get(scopeId);
        const jiraConfig = settings?.jira || {};
        
        // Check if JIRA is configured
        const isConfigured = !!(jiraConfig.baseUrl && jiraConfig.email && jiraConfig.apiToken);
        setJiraConfigured(isConfigured);
        
        if (isConfigured) {
          const mappings = settings?.jiraUserMappings || [];
          
          const mappingObj: Record<string, any> = {};
          if (Array.isArray(mappings)) {
            mappings.forEach((mapping: any) => {
              if (mapping.teamMemberId) {
                mappingObj[mapping.teamMemberId] = mapping;
              }
            });
          }
          
          setJiraMappings(mappingObj);
        } else {
          setJiraMappings({});
        }
      } catch (error) {
        console.warn('Failed to load JIRA mappings:', error);
        setJiraConfigured(false);
        setJiraMappings({});
      }
    };
    
    if (scopeId) {
      loadJiraMappings();
    }
  }, [scopeId]);

  // Načti souhrnnou alokaci FTE a seznam projektů pro mini heatmapu
  // useEffect(() => {
  //   const run = async () => {
  //     try {
  //       // const assignments: ProjectTeamAssignmentWithDetails[] = await manageAssignmentsService.getScopeAssignments(scopeId);
  //       const totals: Record<string, number> = {};
  //       const projects: Record<string, Set<string>> = {};
  //       for (const a of assignments) {
  //         totals[a.teamMemberId] = (totals[a.teamMemberId] || 0) + Number(a.allocationFte || 0);
  //         if (!projects[a.teamMemberId]) projects[a.teamMemberId] = new Set<string>();
  //         if (a.project?.name) projects[a.teamMemberId].add(a.project.name);
  //       }
  //       setAllocByMember(totals);
  //       const projectNames: Record<string, string[]> = {};
  //       Object.entries(projects).forEach(([id, set]) => { projectNames[id] = Array.from(set); });
  //       setAllocProjectsByMember(projectNames);
  //     } catch {
  //       setAllocByMember({});
  //       setAllocProjectsByMember({});
  //     }
  //   };
  //   void run();
  // }, [manageAssignmentsService, scopeId]);

  // Filtrování členů týmu
  const filteredTeam = team.filter((member) => {
    const matchesRole = !roleFilter || member.role === roleFilter;
    const onVacation = isOnVacationToday(member);
    const matchesVacation =
      vacationFilter === 'all' ||
      (vacationFilter === 'vacation' && onVacation) ||
      (vacationFilter === 'available' && !onVacation);
    return matchesRole && matchesVacation;
  });

  // Reset filtrů
  const resetFilters = () => {
    setRoleFilter("");
    setVacationFilter('all');
  };

  // Získání unikátních rolí pro filtr
  const uniqueRoles = Array.from(new Set(team.map(member => member.role))).sort();

  const handleAddMember = async (member: {
    name: string;
    role: string;
    fte: number;
  }) => {
    setSavingMember(true);
    try {
      const newMember = await TeamService.createTeamMember(scopeId, member);
      onTeamChange([...team, newMember]);
      try { await mutate(["scopeUsage", scopeId]); } catch { }
      toast.success('Člen týmu přidán', `${member.name} byl úspěšně přidán do týmu.`);
    } catch (error) {
      console.error('Chyba při přidávání člena týmu:', error);
      toast.error('Chyba při přidávání', 'Nepodařilo se přidat člena týmu. Zkuste to prosím znovu.');
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
      const updatedMember = await TeamService.updateTeamMember(memberId, { [field]: value } as Partial<TeamMember>);
      
      // Aktualizuj UI s nejnovějšími daty z databáze
      const updatedTeam = team.map(member => 
        member.id === memberId ? updatedMember : member
      );
      onTeamChange(updatedTeam);
      
      toast.success('Změny uloženy', 'Informace o členovi týmu byly úspěšně aktualizovány.');
    } catch (error) {
      console.error('Chyba při ukládání člena týmu:', error);
      toast.error('Chyba při ukládání', 'Nepodařilo se uložit změny. Zkuste to prosím znovu.');
    } finally {
      setSavingMember(false);
    }
  }, [toast, team, onTeamChange]);

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
      try { await mutate(["scopeUsage", scopeId]); } catch { }
    } catch (error) {
      console.error('Chyba při mazání člena týmu:', error);
      // Vraťte člena zpět do seznamu při chybě
      // V produkčním kódu byste měli implementovat lepší error handling
    }
  };


  // pomocná funkce pro ztmavení barvy (např. na 10 % tmavší) - currently unused
  // function shadeColor(color: string, percent: number) {
  //   const f = parseInt(color.slice(1), 16);
  //   const t = percent < 0 ? 0 : 255;
  //   const p = Math.abs(percent) / 100;
  //   const R = f >> 16;
  //   const G = (f >> 8) & 0x00FF;
  //   const B = f & 0x0000FF;
  //   return `rgb(${Math.round((t - R) * p + R)}, ${Math.round((t - G) * p + G)}, ${Math.round((t - B) * p + B)})`;
  // }


  // Skeleton UI for loading
  if (loading) {
    return (
      <section className="mb-8">
        <div className="relative bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-8 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-9 w-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="bg-white/70 dark:bg-gray-700/70 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 p-4 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600" />
                      <div>
                        <div className="h-4 w-40 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-28 bg-gray-200 dark:bg-gray-600 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {!readOnlyMode && (
        <AddMemberModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          onAddMember={handleAddMember}
          savingMember={savingMember}
          scopeId={scopeId}
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
            <div className="flex items-center justify-between mb-8 flex-col md:flex-row gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <h2 className="relative text-2xl font-bold dark:text-white text-gray-900">
                    <FiUsers className="inline mr-2" /> {t("teamMembers")}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
                  <span>{t("teamManagement")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-col md:flex-row">
                {/* Filter button */}
                <button
                  className={`relative group px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${showFilters || roleFilter
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                    : "bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90"
                    }`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <div className="flex items-center gap-2">
                    <FilterIcon className={`w-5 h-5 transition-transform duration-300`} />
                    <span className="hidden sm:inline">{t("filter")}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${showFilters && !isReducedMotion ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Reset filters button */}
                {(roleFilter) && (
                  <button
                    className={`relative group bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${!isReducedMotion ? 'hover:scale-105' : 'hover:bg-gradient-to-r hover:from-red-600 hover:to-pink-600'
                      }`}
                    onClick={resetFilters}
                  >
                    <div className="flex items-center gap-2">
                      <XIcon className="w-5 h-5" />
                      <span className="hidden sm:inline">{t("clear")}</span>
                    </div>
                  </button>
                )}

                {!readOnlyMode && (
                  <>
                    <button
                      className={`relative group bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${!isReducedMotion ? 'hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95' : 'hover:bg-gradient-to-r hover:from-blue-600 hover:via-purple-600 hover:to-pink-600'
                        }`}
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
                    <button
                      className={`relative group bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${!isReducedMotion ? 'hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/25 active:scale-95' : 'hover:bg-gradient-to-r hover:from-pink-600 hover:via-rose-600 hover:to-red-600'}`}
                      onClick={() => setRoleManagementModalOpen(true)}
                    >

                      <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="relative z-10 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5" />
                        {t("manageRoles")}
                      </span>
                    </button>
                  </>
                )}
                {/* Import členů týmu modal */}
                {!readOnlyMode && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setImportModalOpen(true)}
                      className=" group bg-gradient-to-r from-red-600 via-pink-600 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25 active:scale-95"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <FiUpload className="w-5 h-5" />
                        {t("importTeam")}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-pink-600 to-orange-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </button>
                    <TeamImportModal
                      isOpen={importModalOpen}
                      onClose={() => setImportModalOpen(false)}
                      onImport={async (members) => {
                        setSavingMember(true);
                        try {
                          const nameToMember = new Map(team.map(tm => [tm.name.trim().toLowerCase(), tm] as const));
                          const updatedTeam = [...team];
                          for (const m of members) {
                            const normalized = m.name.trim().toLowerCase();
                            const existing = nameToMember.get(normalized);
                            if (existing) {
                              const updated = await TeamService.updateTeamMember(existing.id, {
                                role: m.role,
                                fte: Number(m.fte),
                                vacations: m.vacations,
                              });
                              const idx = updatedTeam.findIndex(t => t.id === existing.id);
                              if (idx >= 0) updatedTeam[idx] = updated;
                            } else {
                              const created = await TeamService.createTeamMember(scopeId, {
                                name: m.name,
                                role: m.role,
                                fte: Number(m.fte),
                                vacations: m.vacations,
                              });
                              updatedTeam.push(created);
                              nameToMember.set(normalized, created);
                            }
                          }
                          onTeamChange(updatedTeam);
                          try { await mutate(["scopeUsage", scopeId]); } catch { }
                          toast.success('Import dokončen', `${members.length} členů týmu bylo úspěšně importováno.`);
                        } catch (error) {
                          console.error('Chyba při importu členů týmu:', error);
                          toast.error('Chyba při importu', 'Nepodařilo se importovat členy týmu. Zkuste to prosím znovu.');
                        } finally {
                          setSavingMember(false);
                        }
                      }}
                    />
                  </div>
                )}


                <button
                  className={`relative group bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${!isReducedMotion ? 'hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/25 active:scale-95' : 'hover:bg-gradient-to-r hover:from-emerald-700 hover:to-teal-700'}`}
                  onClick={() => setAvailabilityOpen(true)}
                  title={t('availabilityOverview')}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2v-8H3v8a2 2 0 002 2z" /></svg>
                    {t('overviews')}
                  </span>
                </button>

              </div>
            </div>

            {/* Filter panel */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${showFilters ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'
                }`}
            >
              <div className={`p-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-600/50 ${!isReducedMotion ? 'animate-in slide-in-from-top-4 fade-in duration-500' : ''
                }`}>
                <div className="flex items-center gap-4 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {t("filterMembers")}
                  </h3>
                  {(roleFilter) && (
                    <button
                      onClick={resetFilters}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-200"
                    >
                      {t("clearAll")}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Role filter */}
                  <div className={`${!isReducedMotion ? 'animate-in slide-in-from-top-4 fade-in duration-500 delay-100' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("filterByRole")}
                    </label>
                    <select
                      className="w-full bg-white/90 dark:bg-gray-700/90 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                    >
                      <option value="">{t("allRoles")}</option>
                      {uniqueRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Vacation filter */}
                  <div className={`${!isReducedMotion ? 'animate-in slide-in-from-top-4 fade-in duration-500 delay-150' : ''}`}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t("filterByVacation")}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setVacationFilter('all')}
                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${vacationFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/90 dark:bg-gray-700/90 text-gray-800 dark:text-gray-200 border-gray-300/50 dark:border-gray-600/50'}`}
                      >
                        {t("showAll")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacationFilter('vacation')}
                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${vacationFilter === 'vacation' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/90 dark:bg-gray-700/90 text-gray-800 dark:text-gray-200 border-gray-300/50 dark:border-gray-600/50'}`}
                      >
                        {t("onVacation")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVacationFilter('available')}
                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${vacationFilter === 'available' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/90 dark:bg-gray-700/90 text-gray-800 dark:text-gray-200 border-gray-300/50 dark:border-gray-600/50'}`}
                      >
                        {t("available")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            

            {/* Team stats */}
            {team.length > 0 && (
              <div className={`mt-8 mb-8 grid grid-cols-1 md:grid-cols-2 ${jiraConfigured ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
                <div className="relative group bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in fade-in duration-300">
                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-xl"></div>
                  
                  <div className="relative">
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
                      {t("totalMembers")}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {team.length}
                    </div>
                  </div>
                </div>

                <div className="relative group bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in fade-in duration-300">
                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-xl"></div>
                  
                  <div className="relative">
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
                      {t("totalFte")}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {team
                        .reduce((sum, member) => sum + member.fte, 0)
                        .toFixed(1)}{" "}
                      FTE
                    </div>
                  </div>
                </div>

                <div className="relative group bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in fade-in duration-300">
                  {/* Hover effect overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-xl"></div>
                  
                  <div className="relative">
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
                      {t("uniqueRoles")}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {new Set(team.map((m) => m.role)).size}
                    </div>
                  </div>
                </div>

                {jiraConfigured && (
                  <div className="relative group bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in fade-in duration-300">
                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-xl"></div>
                    
                    <div className="relative">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-orange-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        JIRA připojení
                      </div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {Object.keys(jiraMappings).length}/{team.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {Object.keys(jiraMappings).length === team.length ? 'Všichni připojeni' : `${team.length - Object.keys(jiraMappings).length} nepřipojeno`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              {filteredTeam.length === 0 ? (
                <div className={`text-center py-16 ${!isReducedMotion ? 'animate-in fade-in duration-700' : ''}`}>
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20"></div>
                    <div className={`relative text-8xl flex items-center justify-center ${!isReducedMotion ? 'animate-bounce' : ''}`}>
                      {team.length === 0 ? <FiUsers /> : <FiSearch />}
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-xl font-medium mb-2">
                    {team.length === 0 ? t("noMembers") : t("noMembersMatchFilter")}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {team.length === 0 ? t("startByAddingFirstMember") : t("tryAdjustingFilters")}
                  </p>
                  {team.length > 0 && (
                    <button
                      onClick={resetFilters}
                      className={`mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg transition-all duration-200 ${!isReducedMotion ? 'hover:scale-105' : 'hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600'
                        }`}
                    >
                      {t("clearFilters")}
                    </button>
                  )}
                </div>
              ) : (
                filteredTeam.map((member) => (
                  <div
                    key={member.id}
                    className={`relative group bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-700/90 dark:via-gray-700/70 dark:to-gray-700/50 backdrop-blur-lg rounded-2xl border border-white/40 dark:border-gray-600/40 overflow-hidden transition-all duration-300 ${!isReducedMotion ? 'hover:scale-[1.02] hover:shadow-2xl hover:shadow-blue-500/10 animate-in fade-in duration-300' : 'hover:shadow-lg'
                      }`}

                  >
                    {/* Hover effect overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 rounded-2xl"></div>

                    {/* Loading overlay during save */}
                    {savingMember && (
                      <div className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center rounded-2xl z-30">
                        <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                          <div className={`rounded-full h-6 w-6 border-2 border-current border-t-transparent ${!isReducedMotion ? 'animate-spin' : ''}`}></div>
                          <span className="text-sm font-semibold">
                            {t("saving")}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 sm:p-6 relative">
                      <div className="text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white absolute top-2 left-2">
                        {member.role}
                      </div>
                      {/* Desktop layout */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {/* Avatar a jméno */}
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                            </div>

                            <div className="flex-1">
                              {!readOnlyMode && (
                                <>
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
                                    placeholder={t("memberNamePlaceholder")}
                                  />
                                </>
                              )}
                              {readOnlyMode && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <div className="w-full text-center font-bold text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                                      {member.name}
                                      {isOnVacationToday(member) && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 align-middle">
                                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2h20V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM22 10H2v9a2 2 0 002 2h16a2 2 0 002-2v-9z" /></svg>
                                          {t("onVacation")}
                                        </span>
                                      )}
                                      {/* JIRA status - always reserve space */}
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold align-middle min-w-[80px]">
                                        {jiraConfigured ? (
                                          jiraMappings[member.id] ? (
                                            <span 
                                              className="inline-flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                              title={`Připojen k JIRA: ${jiraMappings[member.id].jiraDisplayName}${jiraMappings[member.id].jiraEmail ? ` (${jiraMappings[member.id].jiraEmail})` : ''}`}
                                            >
                                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                              </svg>
                                              JIRA
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                              Nepřipojeno
                                            </span>
                                          )
                                        ) : (
                                          <span className="invisible">Placeholder</span>
                                        )}
                                      </span>
                                      <button
                                        type="button"
                                        className="ml-2 p-2 rounded-lg text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                        onClick={() => setVacationModal({ open: true, member, readOnly: true })}
                                        title={t("vacations")}
                                      >
                                        <FiCalendar className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                              {!readOnlyMode && (
                                <div className="flex items-center gap-2 mt-2">
                                  {isOnVacationToday(member) && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 align-middle">
                                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2h20V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM22 10H2v9a2 2 0 002 2h16a2 2 0 002-2v-9z" /></svg>
                                      {t("vacations")}
                                    </span>
                                  )}
                                  {/* JIRA status - always reserve space */}
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold align-middle min-w-[80px] absolute right-2 top-2">
                                    {jiraConfigured ? (
                                      jiraMappings[member.id] ? (
                                        <span 
                                          className="inline-flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                          title={`Připojen k JIRA: ${jiraMappings[member.id].jiraDisplayName}${jiraMappings[member.id].jiraEmail ? ` (${jiraMappings[member.id].jiraEmail})` : ''}`}
                                        >
                                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                          </svg>
                                          JIRA
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          Nepřipojeno
                                        </span>
                                      )
                                    ) : (
                                      <span className="invisible">Placeholder</span>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Role */}
                          <div className="flex items-center gap-3">
                            {!readOnlyMode && (
                              <>
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
                                  {rolesToUse.map((role) => (
                                    <option key={role.key} value={role.label}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>

                          {/* FTE */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {t("fte")}:
                            </span>
                            <div className="relative">
                              {!readOnlyMode && (
                                <>
                                  <input
                                    className="w-20 bg-gradient-to-r from-white/90 to-white/70 dark:from-gray-700/90 dark:to-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 pr-8 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                                    onFocus={(e) => {
                                      if (e.target.value === '1') {
                                        e.target.value = '';
                                      }
                                    }}
                                    onBlur={(e) => {
                                      if (e.target.value === '') {
                                        e.target.value = '1';
                                        handleEditMember(member.id, "fte", 1);
                                      }
                                    }}
                                    disabled={readOnlyMode}
                                  />
                                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
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

                          {/* MD Rates - Prodejní a Nákladový */}
                          {!readOnlyMode && (
                            <div className="flex flex-col gap-2">
                              {/* Prodejní MD Rate */}
                              <div className="flex items-center gap-2">
                                <input
                                  className="w-20 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  type="number"
                                  min={0}
                                  step={100}
                                  value={member.mdRate || 0}
                                  onChange={(e) =>
                                    handleEditMember(
                                      member.id,
                                      "mdRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  onFocus={(e) => {
                                    if (e.target.value === '0') {
                                      e.target.value = '';
                                    }
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      e.target.value = '0';
                                      handleEditMember(member.id, "mdRate", 0);
                                    }
                                  }}
                                  placeholder="0"
                                  disabled={readOnlyMode}
                                  title={t('mdRate.sellingTooltip')}
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                  {t('mdRate.selling')}
                                </span>
                              </div>
                              
                              {/* Nákladový MD Rate */}
                              <div className="flex items-center gap-2">
                                <input
                                  className="w-20 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  type="number"
                                  min={0}
                                  step={100}
                                  value={member.costMdRate || 0}
                                  onChange={(e) =>
                                    handleEditMember(
                                      member.id,
                                      "costMdRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  onFocus={(e) => {
                                    if (e.target.value === '0') {
                                      e.target.value = '';
                                    }
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      e.target.value = '0';
                                      handleEditMember(member.id, "costMdRate", 0);
                                    }
                                  }}
                                  placeholder="0"
                                  disabled={readOnlyMode}
                                  title={t('mdRate.costTooltip')}
                                />
                                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                  {t('mdRate.cost')}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Weekly availability heatmap temporarily disabled */}
                        </div>

                        {/* Akce */}
                        {!readOnlyMode && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="p-3 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl group"
                              onClick={() => setVacationModal({ open: true, member, readOnly: false })}
                              title={t("manageVacations")}
                            >
                              <FiCalendar className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              className="p-3 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-all duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl group"
                              onClick={() => setTimesheetModal({ open: true, member })}
                              title={t("timesheetEntry")}
                            >
                              <FiClock className="w-5 h-5" />
                            </button>
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
                                  placeholder={t("memberNamePlaceholder")}
                                />
                              )}
                              {readOnlyMode && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-semibold text-base">
                                  {member.name}
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => setVacationModal({ open: true, member, readOnly: true })}
                                    title={t("vacations")}
                                  >
                                    <FiCalendar className="w-4 h-4" />
                                  </button>
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

                        {/* Role, FTE a MD Rate */}
                        <div className="grid grid-cols-3 gap-2">
                          {/* Role */}
                          <div className="flex items-center gap-2">
                            {!readOnlyMode && (
                              <>


                                <select
                                  className="flex-1 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl text-gray-900 dark:text-gray-100 border border-white/30 dark:border-gray-600/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300 font-medium text-sm"
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
                                  {rolesToUse.map((role) => (
                                    <option key={role.key} value={role.label}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>

                          {/* FTE */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                              {t("fte")}:
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
                                <>
                                  <div className="w-full text-center font-semibold text-sm text-gray-600 dark:text-gray-400">
                                    {member.fte.toFixed(2)}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* MD Rates - Mobile */}
                          {!readOnlyMode && (
                            <div className="flex flex-col gap-3">
                              {/* Prodejní MD Rate */}
                              <div className="flex items-center gap-2">
                                <input
                                  className="flex-1 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  type="number"
                                  min={0}
                                  step={100}
                                  value={member.mdRate || 0}
                                  onChange={(e) =>
                                    handleEditMember(
                                      member.id,
                                      "mdRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  onFocus={(e) => {
                                    if (e.target.value === '0') {
                                      e.target.value = '';
                                    }
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      e.target.value = '0';
                                      handleEditMember(member.id, "mdRate", 0);
                                    }
                                  }}
                                  placeholder="0"
                                  disabled={readOnlyMode}
                                  title={t('mdRate.sellingTooltip')}
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                  {t('mdRate.selling')}
                                </span>
                              </div>
                              
                              {/* Nákladový MD Rate */}
                              <div className="flex items-center gap-2">
                                <input
                                  className="flex-1 bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all duration-200 text-center font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  type="number"
                                  min={0}
                                  step={100}
                                  value={member.costMdRate || 0}
                                  onChange={(e) =>
                                    handleEditMember(
                                      member.id,
                                      "costMdRate",
                                      Number(e.target.value)
                                    )
                                  }
                                  onFocus={(e) => {
                                    if (e.target.value === '0') {
                                      e.target.value = '';
                                    }
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value === '') {
                                      e.target.value = '0';
                                      handleEditMember(member.id, "costMdRate", 0);
                                    }
                                  }}
                                  placeholder="0"
                                  disabled={readOnlyMode}
                                  title={t('mdRate.costTooltip')}
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                  {t('mdRate.cost')}
                                </span>
                              </div>
                            </div>
                          )}

                          {!readOnlyMode && (
                            <button
                              type="button"
                              className="col-span-3 mt-2 px-2 py-1 text-[10px] rounded-md bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700"
                              onClick={() => setVacationModal({ open: true, member, readOnly: true })}
                            >
                              {t("vacations")}
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Vacation Modal */}
      {vacationModal.open && (
        <VacationModal
          isOpen={vacationModal.open}
          member={vacationModal.member}
          scopeId={scopeId}
          readOnly={vacationModal.readOnly}
          onClose={() => setVacationModal({ open: false, member: null })}
          onSaved={(ranges) => {
            if (!vacationModal.member) return;
            // promítnout do lokálního stavu, aby se po uložení hned propsaly dovolené
            const updated = team.map((m) =>
              m.id === vacationModal.member?.id ? { ...m, vacations: ranges } : m
            );
            onTeamChange(updated);
          }}
        />
      )}

      {/* Timesheet Entry Modal */}
      {timesheetModal.open && timesheetModal.member && (
        <TimesheetEntryModal
          isOpen={timesheetModal.open}
          onClose={() => setTimesheetModal({ open: false, member: null })}
          memberName={timesheetModal.member.name}
          projects={projects}
          roles={rolesToUse.map(r => r.label)} // Use all available roles
          selectedDate={new Date()}
          userRole={timesheetModal.member.role} // Pass member's role as default
          onSave={async (entries: Array<{ projectId: string; role: string; hours: number; description: string }>, date: Date) => {
            try {
              // Get timesheet service instance
              const timesheetService = new TimesheetService();
              
              // Convert entries to CreateTimesheetData format
              const timesheetData = entries.map(entry => ({
                memberId: timesheetModal.member!.id,
                projectId: entry.projectId,
                scopeId: scopeId,
                date: date,
                hours: entry.hours,
                role: entry.role,
                description: entry.description || undefined
              }));

              // Save to database
              await timesheetService.createManyTimesheets(timesheetData);
              
              // Show success message
              toast.success(t("timesheetSaved"), t("timesheetSavedDescription"));
              
              // Close modal
              setTimesheetModal({ open: false, member: null });
              
              // Refresh team data to show updated timesheets
              // This will trigger a re-render and show the new data
              
            } catch (error) {
              console.error('Failed to save timesheet:', error);
              toast.error(t("timesheetSaveError"), t("timesheetSaveErrorDescription"));
            }
          }}
        />
      )}

      {/* Reports Modal */}
      {reportsOpen && (
        <ReportsModal
          isOpen={reportsOpen}
          onClose={() => setReportsOpen(false)}
          team={team}
        />
      )}
      {/* Availability Heatmap Modal */}
      {availabilityOpen && (
        <TeamAvailabilityModal
          isOpen={availabilityOpen}
          onClose={() => setAvailabilityOpen(false)}
          scopeId={scopeId}
          team={team}
        />
      )}
      {/* Role Management Modal */}
      {roleManagementModalOpen && (
        <RoleManagementModal
          isOpen={roleManagementModalOpen}
          onClose={() => setRoleManagementModalOpen(false)}
          scopeId={scopeId}
          onRolesChanged={(r) => {
            // update local roles list used for selects if parent didn't pass activeRoles
            if (!activeRolesProp || activeRolesProp.length === 0) {
              // rebuild rolesToUse by forcing recompute through team state update noop
              // and inform parent if they care
              onRolesChanged?.(r);
            } else {
              onRolesChanged?.(r);
            }
          }}
        />
      )}
    </>
  );
}

// VacationEditor moved to VacationModal.tsx
