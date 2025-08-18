/**
 * Enhanced server-side AI chat proxy with comprehensive project context
 * 
 * Features:
 * - Hides API keys and reduces token usage
 * - Provides rich context including:
 *   - Project details with progress, notes, and metadata
 *   - Team assignments and member availability
 *   - Role dependencies and workflow information
 *   - Vacation tracking and capacity planning
 *   - Scope roles and permissions
 *   - Project progress history and trends
 *   - Timesheet data and actual vs planned work
 *   - Scope settings and configuration
 *   - Access permissions and editors
 *   - Calendar settings and holidays
 *   - Jira integration status
 * - Intent-aware context selection for optimal token usage
 * - Real-time data from database with proper relationships
 * - Smart payload size management to stay within token limits
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, scopeId, userMessage, chatHistory } = body as {
      provider: 'openai' | 'gemini';
      scopeId: string;
      userMessage: string;
      chatHistory: ChatMessage[];
    };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Load user provider + encrypted keys
    const { data: userMeta, error } = await supabase
      .from('user_meta')
      .select('ai_provider, open_api_key, gemini_api_key')
      .eq('user_id', user.id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const selectedProvider = (provider || userMeta?.ai_provider || 'openai') as 'openai' | 'gemini';
    const openaiKey = userMeta?.open_api_key ? Buffer.from(userMeta.open_api_key, 'base64').toString('utf8') : null;
    const geminiKey = userMeta?.gemini_api_key ? Buffer.from(userMeta.gemini_api_key, 'base64').toString('utf8') : null;
    if (selectedProvider === 'openai' && !openaiKey) return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 400 });
    if (selectedProvider === 'gemini' && !geminiKey) return NextResponse.json({ error: 'Missing Gemini API key' }, { status: 400 });

    // Load comprehensive scope context with enhanced project data
    const { data: scope } = await supabase
      .from('scopes')
      .select('name, description, created_at')
      .eq('id', scopeId)
      .single();

    // Enhanced projects with notes, role dependencies, and team assignments
    const { data: projects } = await supabase
      .from('projects')
      .select(`
        name, priority, status, 
        fe_mandays, be_mandays, qa_mandays, pm_mandays, dpl_mandays,
        fe_done, be_done, qa_done, pm_done, dpl_done, 
        delivery_date, created_at, started_at,
        project_notes(id, text, created_at),
        project_role_dependencies(
          be_depends_on_fe, fe_depends_on_be, qa_depends_on_be, qa_depends_on_fe,
          parallel_mode, current_active_roles, worker_states
        ),
        project_team_assignments(
          team_member_id, role, allocation_fte,
          team_members(name, role, fte)
        )
      `)
      .eq('scope_id', scopeId)
      .order('priority', { ascending: true });

    // Enhanced team with vacations and project assignments
    const { data: team } = await supabase
      .from('team_members')
      .select(`
        id, name, role, fte, vacations,
        project_team_assignments(
          project_id, role, allocation_fte,
          projects(name, priority, status)
        )
      `)
      .eq('scope_id', scopeId)
      .order('name', { ascending: true });

    // Load scope roles for better context
    const { data: scopeRoles } = await supabase
      .from('scope_roles')
      .select('key, label, color, is_active, order_index')
      .eq('scope_id', scopeId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    // Load scope settings for calendar, integrations, etc.
    const { data: scopeSettings } = await supabase
      .from('scopes')
      .select('settings')
      .eq('id', scopeId)
      .single();

    // Load scope editors for permissions context
    const { data: scopeEditors } = await supabase
      .from('scope_editors')
      .select(`
        id, email, accepted_at, invited_at,
        users(id, email, full_name, avatar_url, user_meta)
      `)
      .eq('scope_id', scopeId);

    // Load recent project progress history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: projectProgressHistory } = await supabase
      .from('project_progress')
      .select(`
        project_id, date, fe_done, be_done, qa_done, pm_done, dpl_done,
        fe_mandays, be_mandays, qa_mandays, pm_mandays, dpl_mandays,
        projects(name)
      `)
      .gte('date', thirtyDaysAgo.toISOString())
      .order('date', { ascending: false })
      .limit(100);

    // Load timesheet data for team members (last 14 days)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data: teamWithTimesheets } = await supabase
      .from('team_members')
      .select(`
        id, name, role, fte, vacations, timesheets
      `)
      .eq('scope_id', scopeId)
      .not('timesheets', 'is', null);

    // Utility: normalize for intent and name matching
    const normalize = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim();


        // Convert mixed *_done (either % or MD) into spent mandays
function doneToSpentMd(planMd: number, doneField: number): number {
  if (!planMd || planMd <= 0) return 0;
  // Heuristika: když je done výrazně větší než plán, ber to jako procenta.
  if (doneField > planMd * 1.5) return Math.min(Math.max(doneField, 0), 100) / 100 * planMd;
  // Jinak to ber jako odpracované MD (ohranič na >= 0)
  return Math.max(doneField, 0);
}

function projectPlannedMd(p: any): number {
  return (p.fe_mandays || 0) + (p.be_mandays || 0) + (p.qa_mandays || 0) + (p.pm_mandays || 0) + (p.dpl_mandays || 0);
}

function projectSpentMd(p: any): number {
  const map = (role: 'fe'|'be'|'qa'|'pm'|'dpl') =>
    doneToSpentMd(p[`${role}_mandays`] || 0, p[`${role}_done`] || 0);
  return map('fe') + map('be') + map('qa') + map('pm') + map('dpl');
}

function projectProgressPct(p: any): number {
  const plan = projectPlannedMd(p);
  if (plan <= 0) return 0;
  return Math.min(100, Math.round((projectSpentMd(p) / plan) * 100));
}

// Today in Europe/Prague as YYYY-MM-DD (for vacations)
function todayIsoInTz(tz = 'Europe/Prague'): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  // en-CA gives YYYY-MM-DD directly
  return fmt.format(now);
}


    // Enhanced intent detection from user message
    const intentText = normalize(userMessage);
    const wantsVacations = /(dovol|vacat|holiday|volno)/.test(intentText);
    const wantsDeadlines = /(termin|deadline|priorit|kapac|fte|konec|start)/.test(intentText);
    const wantsProgress = /(burndown|progres|progress|prubeh|hotovo|%)/.test(intentText);
    const wantsTeam = /(tym|team|role|clen|member|assignment|alokac)/.test(intentText);
    const wantsNotes = /(poznam|pozn|note|koment)/.test(intentText);
    const wantsDependencies = /(zavisl|depend|blok|block|paralel|workflow)/.test(intentText);
    const wantsAssignments = /(assign|alokac|kdo.*del|kdo.*prac|member.*project)/.test(intentText);
    const wantsRoles = /(role|pozic|position|scope.*role)/.test(intentText);
    const wantsHistory = /(histori|trend|vyvoj|minul|predchoz|burndown)/.test(intentText);
    const wantsTimesheets = /(timesheet|odprac|skutec|real|plan.*real)/.test(intentText);
    const wantsSettings = /(nastav|config|kalendar|svat|holiday|jira)/.test(intentText);
    const wantsPermissions = /(pristup|editor|permission|kdo.*muze|kdo.*vid)/.test(intentText);
    const wantsTeamCapacity = /(kapac|fte|dostup|vytiz|workload|utiliz)/.test(intentText);
    const wantsTeamOverview = /(tym|team|celkem|pocet|members|overview)/.test(intentText);

    // Pick focused projects: match by name tokens + top by priority
    const matchedProjects = (projects || []).filter(p => intentText.includes(normalize(p.name)));
    const topByPriority = (projects || []).slice(0, 12);
    const focusedProjects = Array.from(new Map([...matchedProjects, ...topByPriority].map(p => [p.name, p])).values());

    const summarizeProjects = (focusedProjects || []).map(p => {
      const progress = projectProgressPct(p);
      const notes = ((p as any).project_notes || []).length;
      const assignments = ((p as any).project_team_assignments || []);
      const dependencies = (p as any).project_role_dependencies ? 'yes' : 'no';
      const started = (p as any).started_at ? 'started' : 'not started';
      
      // Group assignments by role
      const assignmentsByRole = assignments.reduce((acc: Record<string, string[]>, a: any) => {
        const role = a.role || 'unknown';
        const memberName = a.team_members?.name || 'unknown';
        if (!acc[role]) acc[role] = [];
        acc[role].push(memberName);
        return acc;
      }, {});
      
      const roleInfo = Object.entries(assignmentsByRole).map(([role, members]) => `${role}: ${(members as string[]).join(', ')}`).join('; ');
      
      return `• ${p.name} | prio ${p.priority} | status ${p.status} | progress ${progress}% | delivery ${p.delivery_date ?? '—'} | notes: ${notes} | roles: ${roleInfo || 'none'} | dependencies: ${dependencies} | ${started}`;
    }).join('\n');
    

    const notesLines = wantsNotes
      ? (focusedProjects || []).map(p => {
          const ns = ((p as any).project_notes || []);
          if (ns.length === 0) return `• ${p.name}: žádné poznámky`;
          
          const recentNotes = ns
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3)
            .map((n: any) => {
              const date = new Date(n.created_at).toLocaleDateString('cs-CZ');
              return `"${n.text}" (${date})`;
            });
          return `• ${p.name}: ${recentNotes.join(' | ')}`;
        }).join('\n')
      : '';

    // Prepare comprehensive team analysis with availability and capacity metrics
    const todayIso = todayIsoInTz();
    
    // Calculate team capacity metrics
    const totalFte = (team || []).reduce((sum, m) => sum + (m.fte || 0), 0);
    const totalMembers = (team || []).length;
    const membersByRole = (team || []).reduce((acc, m) => {
      const role = m.role || 'Unassigned';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate availability today
    const activeVacations = (team || [])
      .flatMap((m: { name: string; vacations?: Array<{ start: string; end: string }> }) =>
        (Array.isArray(m.vacations) ? m.vacations : [])
          .filter((v: { start: string; end: string }) => v?.start <= todayIso && todayIso <= v?.end)
          .map((v: { start: string; end: string }) => ({ name: m.name, start: v.start, end: v.end }))
      );
    
    const availableToday = totalMembers - activeVacations.length;
    const availableFteToday = (team || []).reduce((sum, m) => {
      const isOnVacation = activeVacations.some(v => v.name === m.name);
      return sum + (isOnVacation ? 0 : (m.fte || 0));
    }, 0);
    
    // Calculate project assignments and workload with role mapping
    const memberAssignments = (team || []).map(m => {
      const assignments = ((m as any).project_team_assignments || []);
      const totalAssignedFte = assignments.reduce((sum: number, a: any) => sum + (a.allocation_fte || 0), 0);
      const isOnVacation = activeVacations.some(v => v.name === m.name);
      const availableFte = isOnVacation ? 0 : (m.fte || 0);
      const utilization = availableFte > 0 ? Math.round((totalAssignedFte / availableFte) * 100) : 0;
      
      // Map role to standard development roles
      const mapRole = (role: string) => {
        const roleLower = role.toLowerCase();
        if (roleLower.includes('fe') || roleLower.includes('front') || roleLower.includes('ui') || roleLower.includes('react') || roleLower.includes('vue') || roleLower.includes('angular')) return 'FE';
        if (roleLower.includes('be') || roleLower.includes('back') || roleLower.includes('api') || roleLower.includes('server') || roleLower.includes('node') || roleLower.includes('java') || roleLower.includes('python')) return 'BE';
        if (roleLower.includes('qa') || roleLower.includes('test') || roleLower.includes('quality')) return 'QA';
        if (roleLower.includes('pm') || roleLower.includes('project') || roleLower.includes('manager')) return 'PM';
        if (roleLower.includes('dpl') || roleLower.includes('devops') || roleLower.includes('deploy') || roleLower.includes('ops')) return 'DPL';
        return role;
      };
      
      const mappedRole = mapRole(m.role || '—');
      
      return {
        name: m.name,
        role: m.role || '—',
        mappedRole,
        fte: m.fte || 0,
        assignedFte: totalAssignedFte,
        availableFte,
        utilization,
        isOnVacation,
        assignments: assignments.map((a: any) => ({
          project: a.projects?.name || 'unknown',
          role: a.role,
          allocationFte: a.allocation_fte
        }))
      };
    });
    
    // Create comprehensive team summary
    const teamSummary = [
      `📊 Tým: ${totalMembers} členů, ${totalFte.toFixed(1)} FTE celkem`,
      `✅ Dnes dostupných: ${availableToday}/${totalMembers} členů, ${availableFteToday.toFixed(1)} FTE`,
      `🏖️ Na dovolené: ${activeVacations.length} členů`,
      `📈 Průměrné vytížení: ${Math.round(memberAssignments.reduce((sum, m) => sum + m.utilization, 0) / memberAssignments.length)}%`
    ].join(' | ');
    
    // Create detailed team lines with availability and workload
    const teamLines = memberAssignments.map(m => {
      const vacationInfo = m.isOnVacation ? ' (🏖️ dovolená)' : '';
      const workloadInfo = m.utilization > 100 ? ' (⚠️ přetížen)' : m.utilization > 80 ? ' (🔴 vysoké vytížení)' : m.utilization > 50 ? ' (🟡 střední vytížení)' : ' (🟢 volný)';
      const roleInfo = m.mappedRole !== m.role ? ` (${m.role} → ${m.mappedRole})` : '';
      const assignmentInfo = m.assignments.length > 0 
        ? ` | projekty: ${m.assignments.map((a: any) => `${a.project}(${a.role})`).join(', ')}`
        : ' | žádné projekty';
      
      return `• ${m.name} (${m.role}${roleInfo}, ${m.fte} FTE)${vacationInfo}${workloadInfo} | přiřazeno: ${m.assignedFte}/${m.availableFte} FTE (${m.utilization}%)${assignmentInfo}`;
    }).join('\n');
    
    const vacationsTodayLine = (() => {
      if (activeVacations.length === 0) return 'Dnes na dovolené: nikdo';
      const parts = activeVacations.map(v => {
        const start = new Date(v.start);
        const end = new Date(v.end);
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1;
        const remainingDays = Math.floor((end.getTime() - new Date(todayIso).getTime()) / (1000*60*60*24)) + 1;
        return `${v.name}: ${v.start}..${v.end} (celkem ${totalDays} dní, zbývá ${Math.max(remainingDays,0)} dní)`;
      }).join('; ');
      return `Dnes na dovolené: ${parts}`;
    })();

    // Build enhanced JSON payload based on intent
    const payload: Record<string, unknown> = {};
    if (wantsProgress || wantsDeadlines) {
      payload.projects = (focusedProjects || []).map(p => ({
        name: p.name,
        priority: p.priority,
        status: p.status,
        progress: projectProgressPct(p),
        delivery: p.delivery_date,
        started_at: (p as any).started_at,
        created_at: (p as any).created_at
      }));
    }
    
    if (wantsNotes) {
      payload.notes = (focusedProjects || []).map(p => ({
        project: p.name,
        notes: ((p as any).project_notes || []).slice(0, 10).map((n: any) => ({
          text: (n.text || '').slice(0, 300),
          created_at: n.created_at
        }))
      }));
    }
    
    if (wantsTeam || wantsVacations) {
      payload.team = (team || []).map((m: any) => ({
        name: m.name,
        role: m.role,
        fte: m.fte,
        assignments: (m.project_team_assignments || []).map((a: any) => ({
          project: a.projects?.name,
          role: a.role,
          allocation_fte: a.allocation_fte
        }))
      }));
    }
    
    if (wantsVacations) {
      payload.vacationsToday = activeVacations;
      payload.vacations = (team || []).map((m: any) => ({
        name: m.name,
        vacations: Array.isArray(m.vacations) ? m.vacations.slice(0, 20) : []
      }));
    }
    
    if (wantsDependencies || wantsAssignments) {
      payload.dependencies = (focusedProjects || []).map(p => ({
        project: p.name,
        dependencies: (p as any).project_role_dependencies ? {
          be_depends_on_fe: (p as any).project_role_dependencies.be_depends_on_fe,
          fe_depends_on_be: (p as any).project_role_dependencies.fe_depends_on_be,
          qa_depends_on_be: (p as any).project_role_dependencies.qa_depends_on_be,
          qa_depends_on_fe: (p as any).project_role_dependencies.qa_depends_on_fe,
          parallel_mode: (p as any).project_role_dependencies.parallel_mode,
          current_active_roles: (p as any).project_role_dependencies.current_active_roles,
          worker_states: (p as any).project_role_dependencies.worker_states
        } : null
      }));
    }
    
    if (wantsAssignments) {
      payload.assignments = (focusedProjects || []).map(p => ({
        project: p.name,
        assignments: ((p as any).project_team_assignments || []).map((a: any) => ({
          team_member: a.team_members?.name,
          role: a.role,
          allocation_fte: a.allocation_fte
        }))
      }));
    }
    
    if (wantsRoles) {
      payload.scopeRoles = (scopeRoles || []).map(r => ({
        key: r.key,
        label: r.label,
        color: r.color,
        is_active: r.is_active,
        order_index: r.order_index
      }));
    }
    
    if (wantsHistory) {
      payload.progressHistory = (projectProgressHistory || []).map(h => ({
        project: (h as any).projects?.name,
        date: h.date,
        fe_done: h.fe_done,
        be_done: h.be_done,
        qa_done: h.qa_done,
        pm_done: h.pm_done,
        dpl_done: h.dpl_done,
        fe_mandays: h.fe_mandays,
        be_mandays: h.be_mandays,
        qa_mandays: h.qa_mandays,
        pm_mandays: h.pm_mandays,
        dpl_mandays: h.dpl_mandays
      }));
    }
    
    if (wantsTimesheets) {
      payload.timesheets = (teamWithTimesheets || []).map(m => ({
        name: m.name,
        role: m.role,
        timesheets: Array.isArray(m.timesheets) ? m.timesheets.slice(0, 20) : []
      }));
    }
    
    if (wantsSettings) {
      payload.scopeSettings = scopeSettings?.settings || {};
    }
    
    if (wantsPermissions) {
      payload.scopeEditors = (scopeEditors || []).map(e => ({
        email: e.email,
        accepted_at: e.accepted_at,
        invited_at: e.invited_at,
        user: (e as any).users ? {
          id: (e as any).users.id,
          email: (e as any).users.email,
          full_name: (e as any).users.full_name,
          avatar_url: (e as any).users.avatar_url
        } : null
      }));
    }
    
    if (wantsTeamCapacity || wantsTeamOverview) {
      // Group members by mapped roles
      const membersByMappedRole = memberAssignments.reduce((acc, m) => {
        const role = m.mappedRole;
        if (!acc[role]) acc[role] = [];
        acc[role].push(m);
        return acc;
      }, {} as Record<string, typeof memberAssignments>);
      
      payload.teamCapacity = {
        summary: {
          totalMembers,
          totalFte,
          availableToday,
          availableFteToday,
          onVacation: activeVacations.length,
          averageUtilization: Math.round(memberAssignments.reduce((sum, m) => sum + m.utilization, 0) / memberAssignments.length)
        },
        membersByRole,
        membersByMappedRole: Object.entries(membersByMappedRole).map(([role, members]) => ({
          role,
          count: members.length,
          totalFte: members.reduce((sum, m) => sum + m.fte, 0),
          availableFte: members.reduce((sum, m) => sum + m.availableFte, 0),
          members: members.map(m => ({
            name: m.name,
            originalRole: m.role,
            fte: m.fte,
            availableFte: m.availableFte,
            utilization: m.utilization,
            isOnVacation: m.isOnVacation
          }))
        })),
        memberDetails: memberAssignments.map(m => ({
          name: m.name,
          role: m.role,
          mappedRole: m.mappedRole,
          fte: m.fte,
          assignedFte: m.assignedFte,
          availableFte: m.availableFte,
          utilization: m.utilization,
          isOnVacation: m.isOnVacation,
          assignments: m.assignments
        }))
      };
    }

    // Minify and cap payload size
    let dataJson = '';
    try {
      dataJson = JSON.stringify(payload);
      const MAX_LEN = 7000;
      if (dataJson.length > MAX_LEN) {
        // Reduce arrays if needed
        const reduceArray = (arr: unknown[], keep: number) => arr.slice(0, keep);
        const temp = payload as Record<string, unknown> & { 
          notes?: unknown[]; 
          projects?: unknown[]; 
          team?: unknown[]; 
          vacations?: unknown[];
          dependencies?: unknown[];
          assignments?: unknown[];
          scopeRoles?: unknown[];
          progressHistory?: unknown[];
          timesheets?: unknown[];
          scopeEditors?: unknown[];
          teamCapacity?: unknown;
        };
        if (Array.isArray(temp.notes)) temp.notes = reduceArray(temp.notes, 5);
        if (Array.isArray(temp.projects)) temp.projects = reduceArray(temp.projects, 8);
        if (Array.isArray(temp.team)) temp.team = reduceArray(temp.team, 20);
        if (Array.isArray(temp.vacations)) temp.vacations = reduceArray(temp.vacations, 20);
        if (Array.isArray(temp.dependencies)) temp.dependencies = reduceArray(temp.dependencies, 10);
        if (Array.isArray(temp.assignments)) temp.assignments = reduceArray(temp.assignments, 15);
        if (Array.isArray(temp.scopeRoles)) temp.scopeRoles = reduceArray(temp.scopeRoles, 10);
        if (Array.isArray(temp.progressHistory)) temp.progressHistory = reduceArray(temp.progressHistory, 30);
        if (Array.isArray(temp.timesheets)) temp.timesheets = reduceArray(temp.timesheets, 15);
        if (Array.isArray(temp.scopeEditors)) temp.scopeEditors = reduceArray(temp.scopeEditors, 10);
        dataJson = JSON.stringify(temp);
      }
    } catch {}

    // Enhanced intent-aware system prompt with comprehensive context + JSON [DATA]
    const parts: string[] = [];
    parts.push(`Jsi profesionální expert v projektovém managementu. Odpovídej česky, stručně (max 5 vět), s konkrétními doporučeními.`);
    parts.push(`Scope: ${scope?.name}`);
    
    if (wantsProgress || wantsDeadlines || summarizeProjects) {
      parts.push(`Projekty (vybrané):\n${summarizeProjects}`);
    }
    
    if (wantsNotes && notesLines) {
      parts.push(`Poznámky:\n${notesLines}`);
    }
    
    if (wantsTeam || wantsVacations) {
      parts.push(`Tým:\n${teamLines}`);
    }
    
    if (wantsVacations) {
      parts.push(vacationsTodayLine + '.');
      parts.push(`Pokud se ptá: \"kdo má dnes dovolenou\", odpověz podle seznamu. Pokud \"na jak dlouho\", uveď rozsahy (od..do), celkový a zbývající počet dní.`);
    }
    
    if (wantsDeadlines) {
      parts.push(`Při otázkách na termíny/prioritu doporuč nejprve zrevidovat kapacitu (FTE), dovolené a blokace v pracovním toku.`);
    }
    
    if (wantsDependencies) {
      parts.push(`Při otázkách na závislosti mezi rolemi zvaž workflow blokace a paralelní práci.`);
    }
    
    if (wantsAssignments) {
      parts.push(`Při otázkách na přiřazení členů týmu zvaž jejich FTE, role a současné vytížení.`);
    }
    
    if (wantsRoles) {
      parts.push(`Dostupné role v scope: ${(scopeRoles || []).map(r => `${r.label} (${r.key})`).join(', ')}`);
    }
    
    if (wantsHistory) {
      parts.push(`Při otázkách na historii a trendy analyzuj vývoj progressu v čase a predikuj budoucí vývoj.`);
    }
    
    if (wantsTimesheets) {
      parts.push(`Při otázkách na timesheets porovnávej plánovanou vs. skutečnou odpracovanou dobu.`);
    }
    
    if (wantsSettings) {
      const settings = scopeSettings?.settings || {};
      const calendarInfo = settings.calendar ? `Kalendář: ${settings.calendar.country || 'CZ'}${settings.calendar.subdivision ? ` (${settings.calendar.subdivision})` : ''}, svátky: ${settings.calendar.includeHolidays ? 'zapnuto' : 'vypnuto'}` : 'Kalendář: nenastaven';
      const jiraInfo = settings.jira?.baseUrl ? `Jira: ${settings.jira.baseUrl}` : 'Jira: nenastaveno';
      parts.push(`Scope nastavení: ${calendarInfo}, ${jiraInfo}`);
    }
    
    if (wantsPermissions) {
      const editorsCount = scopeEditors?.length || 0;
      const acceptedCount = scopeEditors?.filter(e => e.accepted_at).length || 0;
      parts.push(`Přístup ke scopu: ${editorsCount} editorů, ${acceptedCount} přijatých pozvánek`);
    }
    
    if (wantsTeamCapacity || wantsTeamOverview) {
      parts.push(`Týmová kapacita:\n${teamSummary}`);
      
      // Add role-specific information
      const membersByMappedRole = memberAssignments.reduce((acc, m) => {
        const role = m.mappedRole;
        if (!acc[role]) acc[role] = [];
        acc[role].push(m);
        return acc;
      }, {} as Record<string, typeof memberAssignments>);
      
      const roleSummary = Object.entries(membersByMappedRole).map(([role, members]) => {
        const totalFte = members.reduce((sum, m) => sum + m.fte, 0);
        const availableFte = members.reduce((sum, m) => sum + m.availableFte, 0);
        const names = members.map(m => m.name).join(', ');
        return `${role}: ${members.length} členů (${totalFte} FTE, ${availableFte} dostupných) - ${names}`;
      }).join('\n');
      
      if (roleSummary) {
        parts.push(`Rozdělení podle rolí:\n${roleSummary}`);
      }
      
      parts.push(`Při otázkách na kapacitu analyzuj dostupnost, vytížení a možnosti přerozdělení práce.`);
      parts.push(`Role jsou mapovány: FE (frontend), BE (backend), QA (testování), PM (management), DPL (devops).`);
    }
    
    if (dataJson && dataJson !== '{}' && dataJson.length < 8000) {
      parts.push(`[DATA] ${dataJson}`);
    }
    const systemPrompt = parts.join('\n\n');

    const messages: ChatMessage[] = chatHistory.length === 0
      ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }]
      : [...chatHistory, { role: 'user', content: userMessage }];

    let message = '';
    if (selectedProvider === 'openai') {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 1000, temperature: 0.6 })
      });
      if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: resp.status });
      const data = await resp.json();
      message = data.choices?.[0]?.message?.content || '';
    } else {
      // Gemini – nemá system roli, proto systémový kontext vždy vložíme do první user zprávy
      let systemText = messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
      if (!systemText) systemText = systemPrompt;
      const nonSystem = messages.filter(m => m.role !== 'system');
      const firstUserIndex = nonSystem.findIndex(m => m.role === 'user');
      if (firstUserIndex !== -1) {
        nonSystem[firstUserIndex] = { ...nonSystem[firstUserIndex], content: `${systemText}\n${nonSystem[firstUserIndex].content}` };
      } else {
        nonSystem.unshift({ role: 'user', content: `${systemText}\n${userMessage}` });
      }
      const geminiMessages = nonSystem.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiMessages, generationConfig: { maxOutputTokens: 1500, temperature: 0.6 } })
      });
      if (!resp.ok) return NextResponse.json({ error: await resp.text() }, { status: resp.status });
      const data = await resp.json();
      message = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    return NextResponse.json({ message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}