'use client';
/**
 * Stránka Scope Burndown
 * - Přístupná pouze přihlášeným uživatelům (chráněná route)
 * - Každý scope má unikátní URL (dynamická route)
 * - UI podle zadání, data zatím mock
 * - Statické role (FE, QA, BE, PM, DPL), později editovatelné v Supabase
 * - Příprava na napojení na Supabase
 */

import { use, useEffect, useState, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useCallback } from 'react';
import { FiShare2, FiCopy } from 'react-icons/fi';
import { useTranslation } from '@/lib/translation';
import { v4 as uuidv4 } from 'uuid';

// Statické role, později načítat ze Supabase
const ROLES = [
  { value: 'FE', label: 'FE' },
  { value: 'QA', label: 'QA' },
  { value: 'BE', label: 'BE' },
  { value: 'PM', label: 'PM' },
  { value: 'DPL', label: 'DPL' },
];

// Funkce pro kontrolu přihlášení (mock, později Supabase auth)
const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<null | { email: string }>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user && data.user.email ? { email: data.user.email } : null);
      setUserId(data.user?.id || null);
      setLoading(false);
    });
  }, []);

  return { loading, user, userId };
};

/**
 * Přičte k datu pouze pracovní dny (pondělí až pátek).
 * @param {Date} date - výchozí datum
 * @param {number} workdays - počet pracovních dnů k přičtení
 * @returns {Date} - nové datum
 */
function addWorkdays(date: Date, workdays: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < workdays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) { // 0 = neděle, 6 = sobota
      added++;
    }
  }
  return result;
}

// Přidám typ pro záznam historie postupu
interface ProjectProgress {
  id?: string;
  project_id: string;
  date: string; // ISO string
  fe_done?: number;
  be_done?: number;
  qa_done?: number;
  pm_done?: number;
  dpl_done?: number;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  fte: number;
}

interface Project {
  id: string;
  name: string;
  priority: number;
  fe_mandays: number;
  be_mandays: number;
  qa_mandays: number;
  pm_mandays: number;
  dpl_mandays: number;
  fe_done: number;
  be_done: number;
  qa_done: number;
  pm_done: number;
  dpl_done: number;
  delivery_date: string;
}

export default function ScopeBurndownPage({ params }: { params: Promise<{ id: string }> }) {
  const { loading, user, userId } = useAuth();
  const router = useRouter();
  const { id } = use(params);
  const [scope, setScope] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const { t } = useTranslation();

  // --- Tým ---
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', role: ROLES[0].value, fte: 1 });
  const [savingMember, setSavingMember] = useState(false);

  // --- Projekty ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    priority: 1,
    fe_mandays: 0,
    be_mandays: 0,
    qa_mandays: 0,
    pm_mandays: 0,
    dpl_mandays: 0,
    delivery_date: '',
    fe_done: 0,
    be_done: 0,
    qa_done: 0,
    pm_done: 0,
    dpl_done: 0
  });
  const [savingProject, setSavingProject] = useState(false);

  // --- Historie postupu projektů (hooky musí být uvnitř komponenty) ---
  const [progressHistory, setProgressHistory] = useState<Record<string, ProjectProgress[]>>({});

  const fetchProgressHistory = useCallback(async (projectIds: string[]) => {
    if (!projectIds.length) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_progress')
      .select('*')
      .in('project_id', projectIds)
      .order('date', { ascending: true });
    if (!error && data) {
      // Rozdělím podle project_id
      const grouped: Record<string, ProjectProgress[]> = {};
      data.forEach((row: ProjectProgress) => {
        if (!grouped[row.project_id]) grouped[row.project_id] = [];
        grouped[row.project_id].push(row);
      });
      setProgressHistory(grouped);
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchProgressHistory(projects.map((p: any) => p.id));
    }
  }, [projects, fetchProgressHistory]);

  // Zjistím, které role jsou v týmu
  const teamRoles = Array.from(new Set(team.map(m => m.role)));
  const hasFE = teamRoles.includes('FE');
  const hasBE = teamRoles.includes('BE');
  const hasQA = teamRoles.includes('QA');
  const hasPM = teamRoles.includes('PM');
  const hasDPL = teamRoles.includes('DPL');

  // Pomocná pole pro klíče
  const projectMandaysKeys: (keyof Project)[] = ['fe_mandays', 'be_mandays', 'qa_mandays', 'pm_mandays', 'dpl_mandays'];
  const projectDoneKeys: (keyof Project)[] = ['fe_done', 'be_done', 'qa_done', 'pm_done', 'dpl_done'];

  // Pokud není přihlášený uživatel, přesměruj na login
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [loading, user, router]);

  // Načtení scope z Supabase podle id
  useEffect(() => {
    if (!loading && user && id) {
      setFetching(true);
      const supabase = createClient();
      supabase
        .from('scopes')
        .select('id, name, description')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setScope(data as { id: string; name: string; description?: string });
            setDescription(data.description || '');
          }
          setFetching(false);
        });
    }
  }, [loading, user, id]);

  // Načtení členů týmu
  useEffect(() => {
    if (!loading && user && id) {
      setTeamLoading(true);
      const supabase = createClient();
      supabase
        .from('team_members')
        .select('id, name, role, fte')
        .eq('scope_id', id)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) setTeam(data);
          setTeamLoading(false);
        });
    }
  }, [loading, user, id]);

  // Načtení projektů
  useEffect(() => {
    if (!loading && user && id) {
      setProjectsLoading(true);
      const supabase = createClient();
      supabase
        .from('projects')
        .select('id, name, priority, fe_mandays, be_mandays, qa_mandays, pm_mandays, dpl_mandays, fe_done, be_done, qa_done, pm_done, dpl_done, delivery_date, required_delivery_date')
        .eq('scope_id', id)
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) setProjects(data);
          setProjectsLoading(false);
        });
    }
  }, [loading, user, id]);

  // Přidání člena
  const handleAddMember = async () => {
    if (!newMember.name.trim()) return;
    setSavingMember(true);
    const supabase = createClient();
    const { error, data } = await supabase.from('team_members').insert([
      { ...newMember, scope_id: id }
    ]).select();
    setSavingMember(false);
    if (!error && data && data[0]) {
      setTeam(t => [...t, data[0]]);
      setNewMember({ name: '', role: ROLES[0].value, fte: 1 });
    }
  };

  // Editace člena (inline update)
  const handleEditMember = async (memberId: string, field: string, value: string | number) => {
    setTeam(t => t.map(m => m.id === memberId ? { ...m, [field]: value } : m));
    const supabase = createClient();
    await supabase.from('team_members').update({ [field]: value }).eq('id', memberId);
  };

  // Smazání člena
  const handleDeleteMember = async (memberId: string) => {
    setTeam(t => t.filter(m => m.id !== memberId));
    const supabase = createClient();
    await supabase.from('team_members').delete().eq('id', memberId);
  };

  // Přidání projektu
  const handleAddProject = async () => {
    if (!newProject.name.trim()) return;
    // Validace: žádný odhad nesmí být 0 (pro použité role)
    const usedMandays = [
      hasFE ? newProject.fe_mandays : 1,
      hasBE ? newProject.be_mandays : 1,
      hasQA ? newProject.qa_mandays : 1,
      hasPM ? newProject.pm_mandays : 1,
      hasDPL ? newProject.dpl_mandays : 1,
    ];
    if (usedMandays.some(v => v === 0)) {
      alert('Odhad mandays nesmí být 0.');
      return;
    }
    setSavingProject(true);
    const supabase = createClient();
    const { error, data } = await supabase.from('projects').insert([
      { ...newProject, scope_id: id }
    ]).select();
    setSavingProject(false);
    if (!error && data && data[0]) {
      setProjects(p => [...p, data[0]]);
      setNewProject({
        name: '',
        priority: 1,
        fe_mandays: 0,
        be_mandays: 0,
        qa_mandays: 0,
        pm_mandays: 0,
        dpl_mandays: 0,
        delivery_date: '',
        fe_done: 0,
        be_done: 0,
        qa_done: 0,
        pm_done: 0,
        dpl_done: 0
      });
    }
  };

  // Editace projektu (inline update)
  const handleEditProject = async (projectId: string, field: string, value: string | number) => {
    setProjects(p => p.map(pr => pr.id === projectId ? { ...pr, [field]: value } : pr));
    const supabase = createClient();
    await supabase.from('projects').update({ [field]: value }).eq('id', projectId);
    // Pokud se mění % hotovo, ulož do historie
    if (["fe_done", "be_done", "qa_done", "pm_done", "dpl_done"].includes(field)) {
      const progress: ProjectProgress = {
        project_id: projectId,
        date: new Date().toISOString(),
        [`${field}`]: typeof value === 'number' ? value : Number(value)
      };
      await supabase.from('project_progress').insert([progress]);
    }
  };

  // Smazání projektu
  const handleDeleteProject = async (projectId: string) => {
    setProjects(p => p.filter(pr => pr.id !== projectId));
    const supabase = createClient();
    await supabase.from('projects').delete().eq('id', projectId);
  };

  // Kopírování URL scope do schránky
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  // --- Export do CSV ---
  function downloadCSV(filename: string, rows: any[], columns: string[], headerMap?: Record<string, string>) {
    const csv = [
      columns.map(col => headerMap?.[col] || col).join(','),
      ...rows.map(row => columns.map(col => '"' + (row[col] ?? '') + '"').join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const handleExportTeam = () => {
    if (!team.length) return;
    downloadCSV(
      `tym_${scope?.name || 'scope'}.csv`,
      team,
      ['name', 'role', 'fte'],
      { name: 'Jméno člena týmu', role: 'Role', fte: 'Úvazek v FTE' }
    );
  };

  // Projekty budou napojeny později
  const handleExportProjects = () => {
    if (!projects.length) return;
    downloadCSV(
      `projekty_${scope?.name || 'scope'}.csv`,
      projects,
      ['name', 'priority', 'fe_mandays', 'be_mandays', 'qa_mandays', 'fe_done'],
      { name: 'Název', priority: 'Priorita', fe_mandays: 'FE (MD)', be_mandays: 'BE (MD)', qa_mandays: 'QA (MD)', fe_done: '% FE hotovo' }
    );
  };

  // Funkce pro uložení popisu
  const handleSaveDescription = async () => {
    if (!scope) return;
    setSavingDescription(true);
    const supabase = createClient();
    const { error } = await supabase.from('scopes').update({ description }).eq('id', scope.id);
    setSavingDescription(false);
    if (!error) {
      setScope(s => s ? { ...s, description } : s);
      setEditingDescription(false);
    }
  };

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<any | null>(null);
  const initialEditState = useRef<any>(null);

  // Otevření modalu pro úpravu projektu
  const handleOpenEditModal = (project: any) => {
    setEditProject({ ...project });
    initialEditState.current = { ...project };
    setEditModalOpen(true);
  };

  // Zavření modalu
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditProject(null);
  };

  // Uložení změn v modalu
  const handleSaveEditProject = async () => {
    if (!editProject) return;
    // Validace: žádný odhad nesmí být 0 (pro použité role)
    const usedMandays = [
      hasFE ? editProject.fe_mandays : 1,
      hasBE ? editProject.be_mandays : 1,
      hasQA ? editProject.qa_mandays : 1,
      hasPM ? editProject.pm_mandays : 1,
      hasDPL ? editProject.dpl_mandays : 1,
    ];
    if (usedMandays.some(v => v === 0)) {
      alert('Odhad mandays nesmí být 0.');
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.from('projects').update(editProject).eq('id', editProject.id);
    if (!error) {
      setProjects(p => p.map(pr => pr.id === editProject.id ? { ...editProject } : pr));
      // --- Ulož změny do project_progress pokud se změnilo % hotovo ---
      if (initialEditState.current) {
        const changed: Partial<ProjectProgress> = {};
        if (editProject.fe_done !== initialEditState.current.fe_done) changed.fe_done = Number(editProject.fe_done);
        if (editProject.be_done !== initialEditState.current.be_done) changed.be_done = Number(editProject.be_done);
        if (editProject.qa_done !== initialEditState.current.qa_done) changed.qa_done = Number(editProject.qa_done);
        if (editProject.pm_done !== initialEditState.current.pm_done) changed.pm_done = Number(editProject.pm_done);
        if (editProject.dpl_done !== initialEditState.current.dpl_done) changed.dpl_done = Number(editProject.dpl_done);
        if (Object.keys(changed).length > 0) {
          const progress: ProjectProgress = {
            project_id: editProject.id,
            date: new Date().toISOString(),
            ...changed
          };
          await supabase.from('project_progress').insert([progress]);
        }
      }
      setEditModalOpen(false);
      setEditProject(null);
    } else {
      alert('Chyba při ukládání projektu.');
    }
  };

  /**
   * Calculates delivery info for a project using only remaining mandays (based on % done) for each role.
   * FE/BE run in parallel, QA follows after both are done.
   * Nově: počítá pouze pracovní dny (víkendy se nepočítají).
   */
  function getProjectDeliveryInfo(project: any, team: any[]) {
    // Zjisti FTE pro FE, BE, QA
    const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    // Zbývající mandays (pouze nedokončená práce)
    const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
    const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
    const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
    // Výpočet trvání v pracovních dnech
    const feDays = feRem / feFte;
    const beDays = beRem / beFte;
    const qaDays = qaRem / qaFte;
    const totalDays = Math.ceil(Math.max(feDays, beDays) + qaDays);
    // Výpočet spočítaného termínu dodání (od dneška, pouze pracovní dny)
    const today = new Date();
    const calculatedDeliveryDate = addWorkdays(today, totalDays);
    // Uživatelský termín dodání
    let deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
    let diffDays = deliveryDate ? Math.ceil((deliveryDate.getTime() - calculatedDeliveryDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    return {
      calculatedDeliveryDate,
      deliveryDate,
      totalDays,
      diffDays,
      onTime: diffDays === null ? null : diffDays >= 0
    };
  }

  // Funkce pro generování dat pro burndown graf s datumy na ose X
  function getBurndownDataWithDates(project: any) {
    // FE/BE paralelně, QA až po nich
    const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
    const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
    const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
    const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const feDays = feRem / feFte;
    const beDays = beRem / beFte;
    const qaDays = qaRem / qaFte;
    const feBeDays = Math.ceil(Math.max(feDays, beDays));
    const totalDays = feBeDays + Math.ceil(qaDays);
    const today = new Date();
    const data: any[] = [];
    // Celkový podíl FE/BE a QA na projektu
    const totalMandays = Number(project.fe_mandays) + Number(project.be_mandays) + Number(project.qa_mandays);
    const feBeShare = (Number(project.fe_mandays) + Number(project.be_mandays)) / totalMandays;
    const qaShare = Number(project.qa_mandays) / totalMandays;

    // --- Skutečný průběh z historie ---
    const history = progressHistory[project.id] || [];
    // Mapování: datum (YYYY-MM-DD) -> hodnoty
    const historyMap: Record<string, any> = {};
    history.forEach(h => {
      const d = new Date(h.date);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      historyMap[key] = {
        fe: h.fe_done,
        be: h.be_done,
        qa: h.qa_done,
        pm: h.pm_done,
        dpl: h.dpl_done,
      };
    });

    // --- Ideální průběh podle původního plánu (delivery_date) ---
    let plannedDays = totalDays;
    if (project.delivery_date) {
      const plannedDate = new Date(project.delivery_date);
      let planned = 0;
      let d = new Date(today);
      while (d <= plannedDate) {
        if (d.getDay() !== 0 && d.getDay() !== 6) planned++;
        d.setDate(d.getDate() + 1);
      }
      plannedDays = planned - 1; // -1 protože dnes je první den
    }

    // --- Generuj dny v rozsahu projektu (pouze pracovní dny) ---
    let lastKnown: Record<string, number> = { fe: 0, be: 0, qa: 0, pm: 0, dpl: 0 };
    let currentDate = new Date(today);
    for (let day = 0; day <= Math.max(totalDays, plannedDays); ) {
      // Přeskoč víkendy
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      const key = currentDate.toISOString().slice(0, 10); // YYYY-MM-DD
      const entry: any = { date: `${currentDate.getDate()}.${currentDate.getMonth() + 1}.` };
      // Ideální průběh: podle původního plánu
      if (day <= plannedDays) {
        entry.ideal = feBeShare > 0 ? (day / plannedDays) * (feBeShare / (feBeShare + qaShare)) * 100 : 0;
        if (day > feBeDays && plannedDays > feBeDays) {
          entry.ideal = feBeShare * 100 + ((day - feBeDays) / (plannedDays - feBeDays)) * qaShare * 100;
        }
        if (entry.ideal > 100) entry.ideal = 100;
      } else {
        entry.ideal = null;
      }
      // Reálný plán (ve skluzu): podle spočítaného termínu
      if (day <= totalDays) {
        entry.realPlan = feBeShare > 0 ? (day / totalDays) * (feBeShare / (feBeShare + qaShare)) * 100 : 0;
        if (day > feBeDays && totalDays > feBeDays) {
          entry.realPlan = feBeShare * 100 + ((day - feBeDays) / (totalDays - feBeDays)) * qaShare * 100;
        }
        if (entry.realPlan > 100) entry.realPlan = 100;
      } else {
        entry.realPlan = null;
      }
      // Skutečný průběh: step line
      if (day === 0) {
        projectRoles.forEach(role => {
          entry[role.key] = 0;
          lastKnown[role.key] = 0;
        });
      } else if (historyMap[key]) {
        projectRoles.forEach(role => {
          if (typeof historyMap[key][role.key] === 'number') {
            entry[role.key] = historyMap[key][role.key];
            lastKnown[role.key] = historyMap[key][role.key];
          } else {
            entry[role.key] = lastKnown[role.key];
          }
        });
      } else {
        projectRoles.forEach(role => {
          entry[role.key] = lastKnown[role.key];
        });
      }
      data.push(entry);
      currentDate.setDate(currentDate.getDate() + 1);
      day++;
    }
    // Pokud není žádná historie, nastav poslední bod na aktuální hodnotu projektu
    if (history.length === 0 && totalDays > 0) {
      data[data.length - 1] = { ...data[data.length - 1] };
      projectRoles.forEach(role => {
        data[data.length - 1][role.key] = Number(project[role.done as keyof Project]) || 0;
      });
    }
    return data;
  }

  // Dynamicky generuj sloupce v tabulce projektů podle zapojených rolí
  const projectRoles = [
    { key: 'fe', label: 'FE', mandays: 'fe_mandays', done: 'fe_done', color: '#2563eb' },
    { key: 'be', label: 'BE', mandays: 'be_mandays', done: 'be_done', color: '#059669' },
    { key: 'qa', label: 'QA', mandays: 'qa_mandays', done: 'qa_done', color: '#f59e42' },
    { key: 'pm', label: 'PM', mandays: 'pm_mandays', done: 'pm_done', color: '#a21caf' },
    { key: 'dpl', label: 'DPL', mandays: 'dpl_mandays', done: 'dpl_done', color: '#e11d48' },
  ];

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  // Zjisti, jestli je uživatel ownerem scope
  useEffect(() => {
    if (scope && userId) {
      const supabase = createClient();
      supabase
        .from('scopes')
        .select('owner_id')
        .eq('id', scope.id)
        .single()
        .then(({ data }) => {
          if (data && userId && data.owner_id === userId) setIsOwner(true);
          else setIsOwner(false);
        });
    }
  }, [scope, userId]);

  // Funkce pro pozvání uživatele
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteLink('');
    if (!inviteEmail || !scope) return;
    const supabase = createClient();
    // Zkontroluj, zda už není editor
    const { data: existing } = await supabase
      .from('scope_editors')
      .select('id')
      .eq('scope_id', scope.id)
      .eq('email', inviteEmail);
    if (existing && existing.length > 0) {
      setInviteError('Tento uživatel už má přístup.');
      return;
    }
    // Zjisti, jestli uživatel existuje v auth.users
    const { data: userRows } = await supabase.from('auth.users').select('id').eq('email', inviteEmail);
    let user_id = null;
    if (userRows && userRows.length > 0) {
      user_id = userRows[0].id;
    }
    const token = uuidv4();
    const insertObj: any = { scope_id: scope.id, email: inviteEmail, invite_token: token };
    if (user_id) {
      insertObj.user_id = user_id;
      insertObj.accepted_at = new Date().toISOString();
    }
    const { error } = await supabase.from('scope_editors').insert([insertObj]);
    if (error) {
      setInviteError('Chyba při pozvání.');
      return;
    }
    setInviteLink(`${window.location.origin}/scopes/${scope.id}/accept?token=${token}`);
    setInviteEmail('');
    // Refresh editorů
    if (scope && isOwner) {
      setEditorsLoading(true);
      const { data: editorsData } = await supabase
        .from('scope_editors')
        .select('id, email, user_id, accepted_at, invited_at')
        .eq('scope_id', scope.id);
      if (editorsData) setEditors(editorsData);
      setEditorsLoading(false);
    }
  };

  // Odebrání editora
  const handleRemoveEditor = async (editorId: string) => {
    const supabase = createClient();
    await supabase.from('scope_editors').delete().eq('id', editorId);
    // Refresh editorů
    if (scope && isOwner) {
      setEditorsLoading(true);
      const { data: editorsData } = await supabase
        .from('scope_editors')
        .select('id, email, user_id, accepted_at, invited_at')
        .eq('scope_id', scope.id);
      if (editorsData) setEditors(editorsData);
      setEditorsLoading(false);
    }
  };

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editors, setEditors] = useState<any[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);

  // Načti editory a pozvané uživatele
  useEffect(() => {
    if (scope && isOwner && shareModalOpen) {
      setEditorsLoading(true);
      const supabase = createClient();
      supabase
        .from('scope_editors')
        .select('id, email, user_id, accepted_at, invited_at')
        .eq('scope_id', scope.id)
        .then(({ data, error }) => {
          if (!error && data) setEditors(data);
          setEditorsLoading(false);
        });
    }
  }, [scope, isOwner, shareModalOpen]);

  // Funkce pro získání posledního tokenu (nebo univerzální link)
  const getLastInviteToken = () => {
    if (editors && editors.length > 0) {
      // Najdi poslední pozvánku bez accepted_at
      const pending = editors.filter(e => !e.accepted_at && e.invite_token);
      if (pending.length > 0) return pending[pending.length - 1].invite_token;
    }
    return null;
  };

  if (loading || !user || fetching) {
    return <div>{t('loading')}</div>;
  }
  if (!scope) {
    return <div>{t('notFound')}</div>;
  }

  return (
    <div className="relative">
      {/* Ikona pro otevření modalu sdílení */}
      {isOwner && (
        <button
          className="absolute top-4 right-4 text-blue-600 hover:text-blue-800 text-2xl z-30"
          onClick={() => setShareModalOpen(true)}
          title="Sdílet scope"
          aria-label="Sdílet scope"
        >
          <FiShare2 />
        </button>
      )}
      {/* Hlavní obsah s blur efektem při otevřeném modalu */}
      <div className={shareModalOpen || editModalOpen ? 'filter blur-sm pointer-events-none select-none transition-all duration-200' : ''}>
        <div className="max-w-7xl mx-auto p-6 rounded-lg shadow mt-8">
          <h1 className="text-2xl font-bold text-center mb-2">
            {scope.name}
          </h1>
          {/* Inline editace popisu */}
          <div className="text-center mb-4">
            {editingDescription ? (
              <div className="flex flex-col items-center gap-2">
                <textarea
                  className="border rounded px-3 py-2 w-full max-w-xl min-h-[60px] focus:outline-blue-400"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={savingDescription}
                  placeholder="Popis scope..."
                />
                <div className="flex gap-2 justify-center">
                  <button
                    className="bg-blue-600 text-white px-4 py-1 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
                    onClick={handleSaveDescription}
                    disabled={savingDescription}
                  >
                    {t('save')}
                  </button>
                  <button
                    className="bg-gray-300 text-gray-700 px-4 py-1 rounded font-semibold shadow hover:bg-gray-400 transition"
                    onClick={() => { setEditingDescription(false); setDescription(scope.description || ''); }}
                    disabled={savingDescription}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2">
                <span className="text-blue-600 min-h-[24px]">{scope.description ? scope.description : <span className="italic text-gray-400">{t('description')}</span>}</span>
                <button
                  className="ml-2 text-sm text-blue-600 underline hover:text-blue-800"
                  onClick={() => setEditingDescription(true)}
                >
                   {t('editDescription')}
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleExportTeam}>Exportovat tým do CSV</button>
            <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleExportProjects}>Exportovat projekty do CSV</button>
          </div>


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
                <button
                  className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
                  type="submit"
                  disabled={savingMember || !newMember.name.trim()}
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
              <div className="bg-gray-50 rounded p-3">
                <div className="flex font-semibold mb-2 text-gray-700">
                  <div className="flex-1">Jméno člena týmu</div>
                  <div className="w-32">Role</div>
                  <div className="w-32">Úvazek v FTE</div>
                  <div className="w-20">Akce</div>
                </div>
                {teamLoading ? (
                  <div className="text-gray-400">Načítám členy…</div>
                ) : team.length === 0 ? (
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

          {/* Přidání nového projektu */}
          <section className="mb-6">
            <div className="rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">Přidat nový projekt</h2>
              <form className="flex flex-wrap gap-4 items-end" onSubmit={e => { e.preventDefault(); handleAddProject(); }}>
                <div className="flex flex-col">
                  <label className="mb-1 font-medium text-gray-700">Název projektu</label>
                  <input
                    className="border rounded px-3 py-2 min-w-[180px] focus:outline-blue-400"
                    placeholder="Nový projekt"
                    value={newProject.name}
                    onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
                    disabled={savingProject}
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="mb-1 font-medium text-gray-700">Priorita</label>
                  <input
                    className="border rounded px-3 py-2 w-16 focus:outline-blue-400"
                    type="number"
                    min={1}
                    value={newProject.priority}
                    onChange={e => setNewProject(p => ({ ...p, priority: Number(e.target.value) }))}
                    disabled={savingProject}
                    required
                  />
                </div>
                {hasFE && (
                  <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Odhad FE (MD)</label>
                    <input
                      className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={newProject.fe_mandays}
                      onChange={e => setNewProject(p => ({ ...p, fe_mandays: Number(e.target.value) }))}
                      disabled={savingProject}
                      required
                    />
                  </div>
                )}
                {hasBE && (
                  <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Odhad BE (MD)</label>
                    <input
                      className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={newProject.be_mandays}
                      onChange={e => setNewProject(p => ({ ...p, be_mandays: Number(e.target.value) }))}
                      disabled={savingProject}
                      required
                    />
                  </div>
                )}
                {hasQA && (
                  <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Odhad QA (MD)</label>
                    <input
                      className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={newProject.qa_mandays}
                      onChange={e => setNewProject(p => ({ ...p, qa_mandays: Number(e.target.value) }))}
                      disabled={savingProject}
                      required
                    />
                  </div>
                )}
                {hasPM && (
                  <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Odhady PM (MD)</label>
                    <input
                      className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={newProject.pm_mandays}
                      onChange={e => setNewProject(p => ({ ...p, pm_mandays: Number(e.target.value) }))}
                      disabled={savingProject}
                      required
                    />
                  </div>
                )}
                {hasDPL && (
                  <div className="flex flex-col">
                    <label className="mb-1 font-medium text-gray-700">Odhady DPL (MD)</label>
                    <input
                      className="border rounded px-3 py-2 w-24 focus:outline-blue-400"
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={newProject.dpl_mandays}
                      onChange={e => setNewProject(p => ({ ...p, dpl_mandays: Number(e.target.value) }))}
                      disabled={savingProject}
                      required
                    />
                  </div>
                )}
                <div className="flex flex-col">
                  <label className="mb-1 font-medium text-gray-700">Termín dodání</label>
                  <input
                    className="border rounded px-3 py-2 focus:outline-blue-400"
                    type="date"
                    value={newProject.delivery_date}
                    onChange={e => setNewProject(p => ({ ...p, delivery_date: e.target.value }))}
                    disabled={savingProject}
                    required
                  />
                </div>
                <button
                  className="bg-blue-600 text-white px-5 py-2 rounded font-semibold shadow hover:bg-blue-700 transition disabled:opacity-60"
                  type="submit"
                  disabled={savingProject || !newProject.name.trim()}
                >
                  Přidat projekt
                </button>
              </form>
            </div>
          </section>

          {/* Projekty */}
          <section>
            <div className="rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">Projekty</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm rounded-lg shadow border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 font-semibold">
                      <th className="px-3 py-2 text-left rounded-tl-lg">Název projektu</th>
                      <th className="px-3 py-2 text-right">Priorita</th>
                      {projectRoles.map(role =>
                        projects.some(p => Number(p[role.mandays as keyof Project]) > 0) && (
                          <Fragment key={role.key}>
                            <th className="px-3 py-2 text-right">Odhad {role.label} (MD)</th>
                            <th className="px-3 py-2 text-right">% {role.label} hotovo</th>
                          </Fragment>
                        )
                      )}
                      <th className="px-3 py-2 text-center">Termín dodání</th>
                      <th className="px-3 py-2 text-center">Spočítaný termín</th>
                      <th className="px-3 py-2 text-center">Skluz</th>
                      <th className="px-3 py-2 text-center rounded-tr-lg">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsLoading ? (
                      <tr><td colSpan={15} className="text-gray-400 text-center py-4">Načítám projekty…</td></tr>
                    ) : projects.length === 0 ? (
                      <tr><td colSpan={15} className="text-gray-400 text-center py-4">Žádné projekty</td></tr>
                    ) : (
                      projects.map(project => {
                        const info = getProjectDeliveryInfo(project, team);
                        return (
                          <tr key={project.id} className="hover:bg-blue-50 transition">
                            <td className="px-3 py-2 align-middle font-medium text-gray-900 whitespace-nowrap">{project.name}</td>
                            <td className="px-3 py-2 align-middle text-right">{project.priority}</td>
                            {projectRoles.map(role =>
                              Number(project[role.mandays as keyof Project]) > 0 && (
                                <Fragment key={role.key}>
                                  <td className="px-3 py-2 align-middle text-right">{Number(project[role.mandays as keyof Project]) || 0}</td>
                                  <td className="px-3 py-2 align-middle text-right">{Number(project[role.done as keyof Project]) || 0} %</td>
                                </Fragment>
                              )
                            )}
                            <td className="px-3 py-2 align-middle text-center">{project.delivery_date ? new Date(project.delivery_date).toLocaleDateString() : ''}</td>
                            <td className="px-3 py-2 align-middle text-center">{info.calculatedDeliveryDate.toLocaleDateString()}</td>
                            <td className={`px-3 py-2 align-middle text-center font-semibold ${info.onTime === null ? '' : info.onTime ? 'text-green-600' : 'text-red-600'}`}>
                              {info.onTime === null ? '' : info.onTime ? `+${info.diffDays} dní` : `${info.diffDays} dní`}
                            </td>
                            <td className="px-3 py-2 align-middle text-center whitespace-nowrap">
                              <button className="text-blue-600 font-semibold hover:underline mr-2" onClick={() => handleOpenEditModal(project)}>Upravit</button>
                              <button className="text-red-600 font-semibold hover:underline" onClick={() => handleDeleteProject(project.id)}>Smazat</button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Výsledky a burndown grafy */}
          <div className="my-8">
            <h3 className="text-lg font-semibold mb-2">Burndown & termíny</h3>
            {projects.map(project => {
              const info = getProjectDeliveryInfo(project, team);
              return (
                <div key={project.id} className="mb-6 p-4 rounded-lg border bg-gray-50">
                  <div className="flex flex-wrap gap-4 items-center mb-2">
                    <span className="font-semibold">{project.name}</span>
                    <span>Spočítaný termín dodání: <b>{info.calculatedDeliveryDate.toLocaleDateString()}</b></span>
                    {info.deliveryDate && (
                      <span>Termín dodání: <b>{info.deliveryDate.toLocaleDateString()}</b></span>
                    )}
                    {info.onTime !== null && (
                      <span className={info.onTime ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {info.onTime
                          ? `Na čas (${typeof info.diffDays === 'number' && !isNaN(info.diffDays) ? info.diffDays : 0} dní rezerva)`
                          : `Ve skluzu (${typeof info.diffDays === 'number' && !isNaN(info.diffDays) ? Math.abs(info.diffDays) : 0} dní)`}
                      </span>
                    )}
                  </div>
                  {/* Burndown graf s datumy na ose X */}
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={getBurndownDataWithDates(project)} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={d => d} />
                      <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip labelFormatter={d => d} />
                      <Legend />
                      {projectRoles.map(role =>
                        Number(project[role.mandays as keyof Project]) > 0 && (
                          <Line key={role.key} type="monotone" dataKey={role.key} stroke={role.color} name={`${role.label} % hotovo`} />
                        )
                      )}
                      <Line type="monotone" dataKey="ideal" stroke="#888" name="Ideální průběh" strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="realPlan" stroke="#ccc" name="Reálný plán (ve skluzu)" strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Modal pro sdílení a správu editorů */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="rounded-2xl bg-white shadow-2xl p-8 w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={() => setShareModalOpen(false)} aria-label="Zavřít">×</button>
            <h3 className="text-2xl font-bold mb-4 text-center">Sdílení scope</h3>
            {/* Magický link pro sdílení scope (vždy viditelný) */}
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2 text-green-700 text-sm break-all">
                <span>Link pro sdílení (editace):</span>
                {(() => {
                  const token = getLastInviteToken();
                  const link = token ? `${window.location.origin}/scopes/${scope.id}/accept?token=${token}` : `${window.location.origin}/scopes/${scope.id}/accept`;
                  return <>
                    <a href={link} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">{link}</a>
                    <button onClick={() => navigator.clipboard.writeText(link)} title="Kopírovat" className="text-blue-600 hover:text-blue-800"><FiCopy /></button>
                  </>;
                })()}
              </div>
              <div className="flex items-center gap-2 text-blue-700 text-sm break-all">
                <span>Link pouze pro zobrazení:</span>
                {(() => {
                  const viewLink = `${window.location.origin}/scopes/${scope.id}/view`;
                  return <>
                    <a href={viewLink} className="underline text-blue-700" target="_blank" rel="noopener noreferrer">{viewLink}</a>
                    <button onClick={() => navigator.clipboard.writeText(viewLink)} title="Kopírovat" className="text-blue-600 hover:text-blue-800"><FiCopy /></button>
                  </>;
                })()}
              </div>
            </div>
            <form className="flex gap-2 mb-4" onSubmit={handleInvite}>
              <input
                type="email"
                className="border rounded px-3 py-2 min-w-[220px] focus:outline-blue-400"
                placeholder="E-mail uživatele"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                required
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold shadow hover:bg-blue-700 transition"
                type="submit"
              >
                Pozvat
              </button>
            </form>
            {inviteError && <div className="text-red-600 text-sm mb-2">{inviteError}</div>}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Pozvaní a editoři</h4>
              {editorsLoading ? (
                <div className="text-gray-400">Načítám…</div>
              ) : editors.length === 0 ? (
                <div className="text-gray-400">Žádní pozvaní ani editoři</div>
              ) : (
                <ul className="divide-y">
                  {editors.map(editor => (
                    <li key={editor.id} className="py-2 flex items-center gap-2">
                      <span className="font-mono text-sm">{editor.email || editor.user_id}</span>
                      {editor.accepted_at ? (
                        <span className="text-green-600 text-xs ml-2">editor</span>
                      ) : (
                        <span className="text-yellow-600 text-xs ml-2">pozván</span>
                      )}
                      <button
                        className="ml-2 text-red-600 text-xs hover:underline"
                        onClick={() => handleRemoveEditor(editor.id)}
                        title="Odebrat práva"
                      >
                        Odebrat
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal pro editaci projektu */}
      {editModalOpen && editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="rounded-2xl bg-white shadow-2xl p-8 w-full max-w-2xl relative overflow-y-auto max-h-[90vh]">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold" onClick={handleCloseEditModal} aria-label="Zavřít">×</button>
            <h3 className="text-2xl font-bold mb-6 text-center">Upravit projekt</h3>
            <form className="flex flex-col gap-6" onSubmit={e => { e.preventDefault(); handleSaveEditProject(); }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Název projektu</label>
                  <input className="border rounded px-3 py-2 w-full" value={editProject.name} onChange={e => setEditProject((p: typeof editProject) => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Priorita</label>
                  <input className="border rounded px-3 py-2 w-full" type="number" min={1} value={editProject.priority} onChange={e => setEditProject((p: typeof editProject) => ({ ...p, priority: Number(e.target.value) }))} required />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Termín dodání</label>
                  <input className="border rounded px-3 py-2 w-full" type="date" value={editProject.delivery_date || ''} onChange={e => setEditProject((p: typeof editProject) => ({ ...p, delivery_date: e.target.value }))} />
                </div>
              </div>
              <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {projectRoles.map(role =>
                  Number(editProject[role.mandays as keyof Project]) > 0 && (
                    <div className="flex flex-col gap-2" key={role.key}>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block mb-1 font-medium">Odhad {role.label} (MD)</label>
                          <input
                            className="border rounded px-3 py-2 w-full"
                            type="number"
                            min={0.01}
                            step={0.01}
                            value={Number(editProject[role.mandays as keyof Project]) || ''}
                            onChange={e => setEditProject((p: typeof editProject) => ({ ...p, [role.mandays]: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block mb-1 font-medium">% {role.label} hotovo</label>
                          <input
                            className="border rounded px-3 py-2 w-full"
                            type="number"
                            min={0}
                            max={100}
                            value={Number(editProject[role.done as keyof Project]) || ''}
                            onChange={e => setEditProject((p: typeof editProject) => ({ ...p, [role.done]: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
              {/* Historie priorit */}
              {editProject && editProject.priority_history && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-1">Historie priorit</h4>
                  <ul className="text-sm text-gray-600">
                    {editProject.priority_history.map((h: any) => (
                      <li key={h.id}>{h.priority} (od {new Date(h.changed_at).toLocaleDateString()})</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" className="px-5 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300" onClick={handleCloseEditModal}>Zrušit</button>
                <button type="submit" className="px-5 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow">Uložit změny</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 