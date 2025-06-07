'use client';
/**
 * Stránka Scope Burndown
 * - Přístupná pouze přihlášeným uživatelům (chráněná route)
 * - Každý scope má unikátní URL (dynamická route)
 * - UI podle zadání, data zatím mock
 * - Statické role (FE, QA, BE, PM, DPL), později editovatelné v Supabase
 * - Příprava na napojení na Supabase
 */

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCallback } from 'react';
import { FiShare2, FiCopy } from 'react-icons/fi';
import { useTranslation } from '@/lib/translation';
import { v4 as uuidv4 } from 'uuid';
import BurndownChart from '@/components/BurndownChart';
import { TeamSection } from '@/app/components/scope/TeamSection';
import { ProjectSection } from '@/app/components/scope/ProjectSection';
import { ShareModal } from '@/app/components/scope/ShareModal';
import { TeamMember, Project } from '@/app/components/scope/types';

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

export default function ScopePage({ params }: { params: { id: string } }) {
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
    }
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      fetchProgressHistory(projects.map((p: Project) => p.id));
    }
  }, [projects, fetchProgressHistory]);

  // Zjistím, které role jsou v týmu
  const teamRoles = Array.from(new Set(team.map(m => m.role)));
  const hasFE = teamRoles.includes('FE');
  const hasBE = teamRoles.includes('BE');
  const hasQA = teamRoles.includes('QA');
  const hasPM = teamRoles.includes('PM');
  const hasDPL = teamRoles.includes('DPL');

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
        .select('*')
        .eq('scope_id', id)
        .order('role', { ascending: true })
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
        .select('*')
        .eq('scope_id', id)
        .order('priority', { ascending: true })
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

  // Smazání projektu
  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Opravdu chcete tento projekt nenávratně smazat včetně všech dat?')) return;
    const supabase = createClient();
    // Smaž navázané progressy
    await supabase.from('project_progress').delete().eq('project_id', projectId);
    // Smaž projekt
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (!error) {
      setProjects(p => p.filter(pr => pr.id !== projectId));
    } else {
      alert('Chyba při mazání projektu.');
    }
  };

  // --- Export do CSV ---
  function downloadCSV(filename: string, rows: Record<string, unknown>[], columns: string[], headerMap?: Record<string, string>) {
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
    downloadCSV('tym.csv', team as unknown as Record<string, unknown>[], ['name', 'role', 'fte'], { name: 'Jméno', role: 'Role', fte: 'FTE' });
  };

  const handleExportProjects = () => {
    downloadCSV('projekty.csv', projects as unknown as Record<string, unknown>[], ['name', 'priority', 'fe_mandays', 'be_mandays', 'qa_mandays', 'pm_mandays', 'dpl_mandays', 'delivery_date'], {
      name: 'Název', priority: 'Priorita', fe_mandays: 'FE MD', be_mandays: 'BE MD', qa_mandays: 'QA MD', pm_mandays: 'PM MD', dpl_mandays: 'DPL MD', delivery_date: 'Termín'
    });
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
  const [editProject, setEditProject] = useState<Project | null>(null);
  const initialEditState = useRef<Project | null>(null);

  // Otevření modalu pro úpravu projektu
  const handleOpenEditModal = (project: Project) => {
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
    // Validace: pouze role, které už v projektu mají mandays > 0, musí mít nenulový odhad
    const projectMandays = [
      { key: 'fe_mandays', label: 'FE' },
      { key: 'be_mandays', label: 'BE' },
      { key: 'qa_mandays', label: 'QA' },
      { key: 'pm_mandays', label: 'PM' },
      { key: 'dpl_mandays', label: 'DPL' },
    ];
    const missing = projectMandays.filter(r => Number(editProject[r.key as keyof Project]) > 0 && Number(editProject[r.key as keyof Project]) === 0);
    if (missing.length > 0) {
      alert('Odhad mandays nesmí být 0 pro existující role v projektu.');
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

  // Pomocná funkce: vygeneruje pole pracovních dnů mezi dvěma daty (včetně start, včetně end)
  function getWorkdaysBetween(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const d = new Date(start);
    d.setHours(0,0,0,0);
    while (d <= end) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        days.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }
    return days;
  }

  // Refaktorovaná funkce pro výpočet termínu a skluzu (pouze pracovní dny)
  function getProjectDeliveryInfo(project: Project, team: TeamMember[]) {
    const feFte = team.filter(m => m.role === 'FE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const beFte = team.filter(m => m.role === 'BE').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const qaFte = team.filter(m => m.role === 'QA').reduce((sum, m) => sum + (m.fte || 0), 0) || 1;
    const feRem = Number(project.fe_mandays) * (1 - (Number(project.fe_done) || 0) / 100);
    const beRem = Number(project.be_mandays) * (1 - (Number(project.be_done) || 0) / 100);
    const qaRem = Number(project.qa_mandays) * (1 - (Number(project.qa_done) || 0) / 100);
    const feDays = feRem / feFte;
    const beDays = beRem / beFte;
    const qaDays = qaRem / qaFte;
    const totalWorkdays = Math.ceil(Math.max(feDays, beDays)) + Math.ceil(qaDays);
    const today = new Date();
    const calculatedDeliveryDate = addWorkdays(today, totalWorkdays);
    const deliveryDate = project.delivery_date ? new Date(project.delivery_date) : null;
    let diffWorkdays: number | null = null;
    if (deliveryDate) {
      const workdaysToPlanned = getWorkdaysBetween(today, deliveryDate).length - 1;
      diffWorkdays = workdaysToPlanned - totalWorkdays;
    }
    return {
      calculatedDeliveryDate,
      deliveryDate,
      totalWorkdays,
      diffWorkdays,
      onTime: diffWorkdays === null ? null : diffWorkdays >= 0
    };
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
    const insertObj: Record<string, unknown> = { scope_id: scope.id, email: inviteEmail, invite_token: token };
    if (user_id) {
      insertObj.user_id = user_id;
      insertObj.accepted_at = new Date().toISOString();
    }
    const { error } = await supabase.from('scope_editors').insert([insertObj]);
    if (error) {
      setInviteError('Chyba při pozvání.');
      return;
    }
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
  const [editors, setEditors] = useState<{ id: string; email: string; user_id: string | null; invite_token?: string; accepted_at?: string }[]>([]);
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">{scope.name}</h1>
        <div className="flex gap-4">
          <button
            onClick={handleExportTeam}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            Exportovat tým do CSV
          </button>
          <button
            onClick={handleExportProjects}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            Exportovat projekty do CSV
          </button>
          {isOwner && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Sdílet
            </button>
          )}
        </div>
      </div>

      {/* Popis scope */}
      <div className="mb-8">
        {editingDescription ? (
          <div className="flex gap-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveDescription}
                disabled={savingDescription}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                {savingDescription ? 'Ukládání...' : 'Uložit'}
              </button>
              <button
                onClick={() => {
                  setEditingDescription(false);
                  setDescription(scope.description || '');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                Zrušit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <p className="text-gray-600 whitespace-pre-wrap">{description || 'Žádný popis'}</p>
            {isOwner && (
              <button
                onClick={() => setEditingDescription(true)}
                className="text-blue-500 hover:text-blue-600"
              >
                Upravit
              </button>
            )}
          </div>
        )}
      </div>

      <TeamSection
        scopeId={id}
        team={team}
        onTeamChange={setTeam}
      />

      <ProjectSection
        scopeId={id}
        projects={projects}
        team={team}
        onProjectsChange={setProjects}
        hasFE={hasFE}
        hasBE={hasBE}
        hasQA={hasQA}
        hasPM={hasPM}
        hasDPL={hasDPL}
      />

      {shareModalOpen && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          scopeId={id}
          isOwner={isOwner}
        />
      )}
    </div>
  );
} 