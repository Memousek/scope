'use client';
/**
 * Stránka Scope Burndown
 * - Přístupná pouze přihlášeným uživatelům (chráněná route)
 * - Každý scope má unikátní URL (dynamická route)
 * - UI podle zadání, data zatím mock
 * - Statické role (FE, QA, BE, PM, DPL), později editovatelné v Supabase
 * - Příprava na napojení na Supabase
 */

import { useEffect, useState, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/translation';
import { TeamSection } from '@/app/components/scope/TeamSection';
import { ProjectSection } from '@/app/components/scope/ProjectSection';
import { ShareModal } from '@/app/components/scope/ShareModal';
import { TeamMember, Project } from '@/app/components/scope/types';
import { useAuth } from '@/lib/auth';
import { downloadCSV } from '@/app/utils/csvUtils';

export default function ScopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading, user, userId } = useAuth();
  const [scope, setScope] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [fetching, setFetching] = useState(false);
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const { t } = useTranslation();

  // --- Tým ---
  const [team, setTeam] = useState<TeamMember[]>([]);

  // --- Projekty ---
  const [projects, setProjects] = useState<Project[]>([]);

  // --- Sdílení ---
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // --- Název ---
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [errorName, setErrorName] = useState<string | null>(null);

  // Zjistím, které role jsou v týmu
  const teamRoles = Array.from(new Set(team.map(m => m.role)));
  const hasFE = teamRoles.includes('FE');
  const hasBE = teamRoles.includes('BE');
  const hasQA = teamRoles.includes('QA');
  const hasPM = teamRoles.includes('PM');
  const hasDPL = teamRoles.includes('DPL');

  const handleExportTeam = () => {
    downloadCSV('tym.csv', team as unknown as Record<string, unknown>[], ['name', 'role', 'fte'], { name: t('name'), role: t('role'), fte: t('fte') });
  };

  const handleExportProjects = () => {
    downloadCSV('projekty.csv', projects as unknown as Record<string, unknown>[], ['name', 'priority', 'fe_mandays', 'be_mandays', 'qa_mandays', 'pm_mandays', 'dpl_mandays', 'delivery_date'], {
      name: t('projectName'), priority: t('priority'), fe_mandays: t('fe_mandays'), be_mandays: t('be_mandays'), qa_mandays: t('qa_mandays'), pm_mandays: t('pm_mandays'), dpl_mandays: t('dpl_mandays'), delivery_date: t('deliveryDate')
    });
  };

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
            setName(data.name || '');
          }
          setFetching(false);
        });
    }
  }, [loading, user, id]);

  // Načtení členů týmu
  useEffect(() => {
    if (!loading && user && id) {
      const supabase = createClient();
      supabase
        .from('team_members')
        .select('*')
        .eq('scope_id', id)
        .order('role', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) setTeam(data);
        });
    }
  }, [loading, user, id]);

  // Načtení projektů
  useEffect(() => {
    if (!loading && user && id) {
      const supabase = createClient();
      supabase
        .from('projects')
        .select('*')
        .eq('scope_id', id)
        .order('priority', { ascending: true })
        .then(({ data, error }) => {
          if (!error && data) setProjects(data);
        });
    }
  }, [loading, user, id]);

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

  // Funkce pro uložení názvu
  const handleSaveName = async () => {
    if (!scope) return;
    setSavingName(true);
    setErrorName(null);
    const supabase = createClient();
    const { error } = await supabase.from('scopes').update({ name }).eq('id', scope.id);
    setSavingName(false);
    if (!error) {
      setScope(s => s ? { ...s, name } : s);
      setEditingName(false);
    } else {
      setErrorName(error.message || 'Chyba při ukládání názvu.');
      console.error('Chyba při ukládání názvu scopu:', error);
    }
  };

  if (loading || !user || fetching) {
    return <div className="min-h-screen flex items-center justify-center min-w-screen">{t('loading')}</div>;
  }
  if (!scope) {
    return <div className="min-h-screen flex items-center justify-center min-w-screen">{t('notFound')}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-white dark:bg-gray-800 mt-10 mb-10 rounded-lg">
      <div className="flex justify-between items-center mb-8 flex-col gap-4 md:flex-row">
        <div className="flex items-center gap-3">
          {editingName ? (
            <>
              <input
                className="text-2xl font-bold border rounded px-2 py-1 mr-2 min-w-[120px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={savingName}
                maxLength={100}
                autoFocus
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !name.trim()}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition text-sm"
              >
                {savingName ? 'Ukládání...' : 'Uložit'}
              </button>
              <button
                onClick={() => { setEditingName(false); setName(scope.name); setErrorName(null); }}
                className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 transition text-sm"
              >
                Zrušit
              </button>
              {errorName && (
                <div className="text-red-600 text-sm mt-2 ml-1">{errorName}</div>
              )}
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{scope.name}</h1>
              {isOwner && (
                <button
                  onClick={() => { setEditingName(true); setName(scope.name); }}
                  className="text-blue-500 hover:text-blue-600 ml-2 text-sm"
                >
                  Upravit název
                </button>
              )}
            </>
          )}
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleExportTeam}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            {t('exportTeam')}
          </button>
          <button
            onClick={handleExportProjects}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            {t('exportProjects')}
          </button>
          {isOwner && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              {t('share')}
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
              className="w-full p-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={3}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveDescription}
                disabled={savingDescription}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
              >
                {savingDescription ? t('saving') : t('save')}
              </button>
              <button
                onClick={() => {
                  setEditingDescription(false);
                  setDescription(scope.description || '');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-start">
            <p className="text-gray-600 whitespace-pre-wrap">{description || t('no_description')}</p>
            {isOwner && (
              <button
                onClick={() => setEditingDescription(true)}
                className="text-blue-500 hover:text-blue-600"
              >
                {t('editDescription')}
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