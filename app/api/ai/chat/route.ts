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

// Type definitions for database responses
interface ProjectNote {
  id: string;
  text: string;
  created_at: string;
}

interface ProjectRoleDependency {
  be_depends_on_fe: boolean;
  fe_depends_on_be: boolean;
  qa_depends_on_be: boolean;
  qa_depends_on_fe: boolean;
  parallel_mode: boolean;
  current_active_roles: string[];
  worker_states?: Array<{
    role: string;
    status: 'active' | 'waiting' | 'blocked';
    team_member_id?: string;
    allocation_fte?: number;
  }>;
}

interface ProjectTeamAssignment {
  project_id: string;
  role: string;
  allocation_fte: number;
  team_members?: {
    name: string;
    role: string;
    fte: number;
  };
  projects?: {
    name: string;
    priority: number;
    status: string;
  };
}

interface Project {
  name: string;
  priority: number;
  status: string;
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
  delivery_date: string | null;
  created_at: string;
  started_at: string | null;
  project_notes?: ProjectNote[];
  project_role_dependencies?: ProjectRoleDependency;
  project_team_assignments?: ProjectTeamAssignment[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  fte: number;
  vacations?: Array<{
    start: string;
    end: string;
    note?: string;
  }>;
  project_team_assignments?: ProjectTeamAssignment[];
  timesheets?: Array<{
    date: string;
    project?: string;
    role?: string;
    hours: number;
    note?: string;
    externalId?: string;
  }>;
}

interface ScopeRole {
  key: string;
  label: string;
  color: string;
  is_active: boolean;
  order_index: number;
}

interface ScopeEditor {
  id: string;
  email: string;
  accepted_at: string | null;
  invited_at: string | null;
  users?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ProjectProgress {
  project_id: string;
  date: string;
  fe_done: number;
  be_done: number;
  qa_done: number;
  pm_done: number;
  dpl_done: number;
  fe_mandays: number;
  be_mandays: number;
  qa_mandays: number;
  pm_mandays: number;
  dpl_mandays: number;
  projects?: {
    name: string;
  };
}

interface MemberAssignment {
  name: string;
  role: string;
  mappedRole: string;
  fte: number;
  assignedFte: number;
  availableFte: number;
  utilization: number;
  isOnVacation: boolean;
  assignments: Array<{
    project: string;
    role: string;
    allocationFte: number;
  }>;
}

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

function projectPlannedMd(p: Project): number {
  return (p.fe_mandays || 0) + (p.be_mandays || 0) + (p.qa_mandays || 0) + (p.pm_mandays || 0) + (p.dpl_mandays || 0);
}

function projectSpentMd(p: Project): number {
  const map = (role: 'fe'|'be'|'qa'|'pm'|'dpl') =>
    doneToSpentMd(p[`${role}_mandays`] || 0, p[`${role}_done`] || 0);
  return map('fe') + map('be') + map('qa') + map('pm') + map('dpl');
}

function projectProgressPct(p: Project): number {
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

    const summarizeProjects = (focusedProjects || []).map((p: unknown) => {
      const project = p as Project;
      const progress = projectProgressPct(project);
      const notes = (project.project_notes || []).length;
      const assignments = (project.project_team_assignments || []) as ProjectTeamAssignment[];
      const dependencies = project.project_role_dependencies ? 'yes' : 'no';
      const started = project.started_at ? 'started' : 'not started';
      
      // Group assignments by role
      const assignmentsByRole = assignments.reduce((acc: Record<string, string[]>, a: ProjectTeamAssignment) => {
        const role = a.role || 'unknown';
        const memberName = a.team_members?.name || 'unknown';
        if (!acc[role]) acc[role] = [];
        acc[role].push(memberName);
        return acc;
      }, {});
      
      const roleInfo = Object.entries(assignmentsByRole).map(([role, members]) => `${role}: ${members.join(', ')}`).join('; ');
      
      const statusEmoji = project.status === 'completed' ? '✅' : project.status === 'in_progress' ? '🔄' : project.status === 'paused' ? '⏸️' : project.status === 'cancelled' ? '❌' : '📋';
      const priorityEmoji = project.priority <= 2 ? '🔴' : project.priority <= 4 ? '🟡' : '🟢';
      
      return `📋 **${project.name}** ${priorityEmoji}${statusEmoji}\n   📊 Progress: ${progress}% | 📅 Delivery: ${project.delivery_date ?? '—'} | 📝 Notes: ${notes}\n   👥 Roles: ${roleInfo || 'none'} | 🔗 Dependencies: ${dependencies} | 🚀 ${started}`;
    }).join('\n');
    

    const notesLines = wantsNotes
      ? (focusedProjects || []).map((p: unknown) => {
          const project = p as Project;
          const ns = (project.project_notes || []) as ProjectNote[];
          if (ns.length === 0) return `📋 **${project.name}**: Žádné poznámky`;
          
          const recentNotes = ns
            .sort((a: ProjectNote, b: ProjectNote) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 3)
            .map((n: ProjectNote) => {
              const date = new Date(n.created_at).toLocaleDateString('cs-CZ');
              return `"${n.text}" (${date})`;
            });
          return `📋 **${project.name}**\n   📝 ${recentNotes.join('\n   📝 ')}`;
        }).join('\n\n')
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
    const memberAssignments = (team || []).map((m: unknown): MemberAssignment => {
      const member = m as TeamMember;
      const assignments = (member.project_team_assignments || []) as ProjectTeamAssignment[];
      const totalAssignedFte = assignments.reduce((sum: number, a: ProjectTeamAssignment) => sum + (a.allocation_fte || 0), 0);
      const isOnVacation = activeVacations.some(v => v.name === member.name);
      const availableFte = isOnVacation ? 0 : (member.fte || 0);
      const utilization = availableFte > 0 ? Math.round((totalAssignedFte / availableFte) * 100) : 0;
      
      // Map role to standard development roles
      const mapRole = (role: string): string => {
        const roleLower = role.toLowerCase();
        if (roleLower.includes('fe') || roleLower.includes('front') || roleLower.includes('ui') || roleLower.includes('react') || roleLower.includes('vue') || roleLower.includes('angular')) return 'FE';
        if (roleLower.includes('be') || roleLower.includes('back') || roleLower.includes('api') || roleLower.includes('server') || roleLower.includes('node') || roleLower.includes('java') || roleLower.includes('python')) return 'BE';
        if (roleLower.includes('qa') || roleLower.includes('test') || roleLower.includes('quality')) return 'QA';
        if (roleLower.includes('pm') || roleLower.includes('project') || roleLower.includes('manager')) return 'PM';
        if (roleLower.includes('dpl') || roleLower.includes('devops') || roleLower.includes('deploy') || roleLower.includes('ops')) return 'DPL';
        return role;
      };
      
      const mappedRole = mapRole(member.role || '—');
      
      return {
        name: member.name,
        role: member.role || '—',
        mappedRole,
        fte: member.fte || 0,
        assignedFte: totalAssignedFte,
        availableFte,
        utilization,
        isOnVacation,
        assignments: assignments.map((a: ProjectTeamAssignment) => ({
          project: a.projects?.name || 'unknown',
          role: a.role,
          allocationFte: a.allocation_fte
        }))
      };
    });
    
    // Create comprehensive team summary with better formatting
    const teamSummary = [
      `👥 **Tým**: ${totalMembers} členů | ${totalFte.toFixed(1)} FTE celkem`,
      `✅ **Dostupnost**: ${availableToday}/${totalMembers} členů | ${availableFteToday.toFixed(1)} FTE dnes`,
      `🏖️ **Dovolené**: ${activeVacations.length} členů`,
      `📈 **Vytížení**: ${Math.round(memberAssignments.reduce((sum, m) => sum + m.utilization, 0) / memberAssignments.length)}% průměr`
    ].join('\n');
    
    // Create detailed team lines with availability and workload
    const teamLines = memberAssignments.map(m => {
      const vacationInfo = m.isOnVacation ? ' 🏖️' : '';
      const workloadInfo = m.utilization > 100 ? ' ⚠️' : m.utilization > 80 ? ' 🔴' : m.utilization > 50 ? ' 🟡' : ' 🟢';
      const roleInfo = m.mappedRole !== m.role ? ` (${m.role} → ${m.mappedRole})` : '';
      const assignmentInfo = m.assignments.length > 0 
        ? `\n   📋 Projekty: ${m.assignments.map((a) => `**${a.project}** (${a.role})`).join(', ')}`
        : '\n   📋 Žádné projekty';
      
      return `👤 **${m.name}** (${m.role}${roleInfo}, ${m.fte} FTE)${vacationInfo}${workloadInfo}\n   📊 Vytížení: ${m.assignedFte}/${m.availableFte} FTE (${m.utilization}%)${assignmentInfo}`;
    }).join('\n\n');
    
    const vacationsTodayLine = (() => {
      if (activeVacations.length === 0) return '🏖️ **Dnes na dovolené**: Nikdo';
      const parts = activeVacations.map(v => {
        const start = new Date(v.start);
        const end = new Date(v.end);
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000*60*60*24)) + 1;
        const remainingDays = Math.floor((end.getTime() - new Date(todayIso).getTime()) / (1000*60*60*24)) + 1;
        return `👤 **${v.name}**: ${v.start} → ${v.end} (${totalDays} dní, zbývá ${Math.max(remainingDays,0)} dní)`;
      }).join('\n   ');
      return `🏖️ **Dnes na dovolené**:\n   ${parts}`;
    })();

    // Build enhanced JSON payload based on intent
    const payload: Record<string, unknown> = {};
    if (wantsProgress || wantsDeadlines) {
      payload.projects = (focusedProjects || []).map((p: unknown) => {
        const project = p as Project;
        return {
          name: project.name,
          priority: project.priority,
          status: project.status,
          progress: projectProgressPct(project),
          delivery: project.delivery_date,
          started_at: project.started_at,
          created_at: project.created_at
        };
      });
    }
    
    if (wantsNotes) {
      payload.notes = (focusedProjects || []).map((p: unknown) => {
        const project = p as Project;
        return {
          project: project.name,
          notes: (project.project_notes || []).slice(0, 10).map((n: ProjectNote) => ({
            text: (n.text || '').slice(0, 300),
            created_at: n.created_at
          }))
        };
      });
    }
    
    if (wantsTeam || wantsVacations) {
      payload.team = (team || []).map((m: unknown) => {
        const member = m as TeamMember;
        return {
          name: member.name,
          role: member.role,
          fte: member.fte,
          assignments: (member.project_team_assignments || []).map((a: ProjectTeamAssignment) => ({
            project: a.projects?.name,
            role: a.role,
            allocation_fte: a.allocation_fte
          }))
        };
      });
    }
    
    if (wantsVacations) {
      payload.vacationsToday = activeVacations;
      payload.vacations = (team || []).map((m: unknown) => {
        const member = m as TeamMember;
        return {
          name: member.name,
          vacations: Array.isArray(member.vacations) ? member.vacations.slice(0, 20) : []
        };
      });
    }
    
    if (wantsDependencies || wantsAssignments) {
      payload.dependencies = (focusedProjects || []).map((p: unknown) => {
        const project = p as Project;
        return {
          project: project.name,
          dependencies: project.project_role_dependencies ? {
            be_depends_on_fe: project.project_role_dependencies.be_depends_on_fe,
            fe_depends_on_be: project.project_role_dependencies.fe_depends_on_be,
            qa_depends_on_be: project.project_role_dependencies.qa_depends_on_be,
            qa_depends_on_fe: project.project_role_dependencies.qa_depends_on_fe,
            parallel_mode: project.project_role_dependencies.parallel_mode,
            current_active_roles: project.project_role_dependencies.current_active_roles,
            worker_states: project.project_role_dependencies.worker_states
          } : null
        };
      });
    }
    
    if (wantsAssignments) {
      payload.assignments = (focusedProjects || []).map((p: unknown) => {
        const project = p as Project;
        return {
          project: project.name,
          assignments: (project.project_team_assignments || []).map((a: ProjectTeamAssignment) => ({
            team_member: a.team_members?.name,
            role: a.role,
            allocation_fte: a.allocation_fte
          }))
        };
      });
    }
    
    if (wantsRoles) {
      payload.scopeRoles = (scopeRoles || []).map((r: ScopeRole) => ({
        key: r.key,
        label: r.label,
        color: r.color,
        is_active: r.is_active,
        order_index: r.order_index
      }));
    }
    
    if (wantsHistory) {
      payload.progressHistory = (projectProgressHistory || []).map((h: unknown) => {
        const progress = h as ProjectProgress;
        return {
          project: progress.projects?.name,
          date: progress.date,
          fe_done: progress.fe_done,
          be_done: progress.be_done,
          qa_done: progress.qa_done,
          pm_done: progress.pm_done,
          dpl_done: progress.dpl_done,
          fe_mandays: progress.fe_mandays,
          be_mandays: progress.be_mandays,
          qa_mandays: progress.qa_mandays,
          pm_mandays: progress.pm_mandays,
          dpl_mandays: progress.dpl_mandays
        };
      });
    }
    
    if (wantsTimesheets) {
      payload.timesheets = (teamWithTimesheets || []).map((m: unknown) => {
        const member = m as TeamMember;
        return {
          name: member.name,
          role: member.role,
          timesheets: Array.isArray(member.timesheets) ? member.timesheets.slice(0, 20) : []
        };
      });
    }
    
    if (wantsSettings) {
      payload.scopeSettings = scopeSettings?.settings || {};
    }
    
    if (wantsPermissions) {
      payload.scopeEditors = (scopeEditors || []).map((e: unknown) => {
        const editor = e as ScopeEditor;
        return {
          email: editor.email,
          accepted_at: editor.accepted_at,
          invited_at: editor.invited_at,
          user: editor.users ? {
            id: editor.users.id,
            email: editor.users.email,
            full_name: editor.users.full_name,
            avatar_url: editor.users.avatar_url
          } : null
        };
      });
    }
    
    if (wantsTeamCapacity || wantsTeamOverview) {
      // Group members by mapped roles
      const membersByMappedRole = memberAssignments.reduce((acc, m) => {
        const role = m.mappedRole;
        if (!acc[role]) acc[role] = [];
        acc[role].push(m);
        return acc;
      }, {} as Record<string, MemberAssignment[]>);
      
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

    // Funkce pro vytvoření základních instrukcí
    const createBasicInstructions = (includeData = false) => {
      const instructions = [
        `Jsi profesionální expert v projektovém managementu. Odpovídej v jazyce, kterým se uživatel baví, strukturovaně a přátelsky s emoji pro lepší čitelnost.`,
        `Scope: ${scope?.name}`,
        `Formátování odpovědí:
        • Používej emoji pro kategorizaci (📊, 👥, 🏖️, 📈, ⚠️, ✅, 🔴, 🟡, 🟢) případně jiné emoji podle situace
        • Strukturované odpovědi s odrážkami
        • Krátké, jasné věty
        • Konkrétní doporučení s akčními kroky
        • Používej Markdown formátování (**bold**, *italic*, \`kód\`)
        • Používej Markdown tabulky pro přehlednost dat - VŽDY používej správný formát:
          | Sloupec 1 | Sloupec 2 | Sloupec 3 |
          | :-------- | :-------- | :-------- |
          | Data 1    | Data 2    | Data 3    |
        • Používej číslované seznamy pro kroky
        • Používej kódové bloky pro technické informace
        • VŽDY používej správné Markdown syntaxe pro tabulky`
      ];
      
      if (includeData && dataJson && dataJson !== '{}' && dataJson.length < 8000) {
        instructions.push(`[DATA] ${dataJson}`);
      }
      
      return instructions;
    };

    // Enhanced intent-aware system prompt with comprehensive context + JSON [DATA]
    const parts: string[] = [];
    parts.push(...createBasicInstructions(true));
    
    if (wantsProgress || wantsDeadlines || summarizeProjects) {
      parts.push(`📋 **Projekty (vybrané)**:\n${summarizeProjects}`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení projektů s kolonkami: Projekt, Priorita, Status, Progress, Termín, Role.
      Příklad formátu:
      | Projekt | Priorita | Status | Progress | Termín | Role |
      | :------- | :-------- | :------ | :-------- | :------ | :---- |
      | Projekt A | 🔴 | 🔄 | 75% | 2025-09-15 | FE, BE |`);
    }
    
    if (wantsNotes && notesLines) {
      parts.push(`📝 **Poznámky**:\n${notesLines}`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení poznámek s kolonkami: Projekt, Poznámka, Datum, Autor.`);
    }
    
    if (wantsTeam || wantsVacations) {
      parts.push(`👥 **Tým**:\n${teamLines}`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení týmu s kolonkami: Člen, Role, FTE, Vytížení, Stav, Projekty.
      Příklad formátu:
      | Člen | Role | FTE | Vytížení | Stav | Projekty |
      | :---- | :---- | :--- | :-------- | :---- | :-------- |
      | Jan | FE | 1.0 | 85% | 🟡 | Projekt A, B |`);
    }
    
    if (wantsVacations) {
      parts.push(vacationsTodayLine);
      parts.push(`💡 **Tip**: Při otázkách na dovolené uveď rozsahy (od → do), celkový a zbývající počet dní.`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení dovolených s kolonkami: Člen, Od, Do, Celkem dní, Zbývá dní.
      Příklad formátu:
      | Člen | Od | Do | Celkem dní | Zbývá dní |
      | :---- | :-- | :-- | :---------- | :---------- |
      | Jan | 2025-08-13 | 2025-09-07 | 26 | 21 |`);
    }
    
    if (wantsDeadlines) {
      parts.push(`⏰ **Tip pro termíny**: Při otázkách na termíny/prioritu doporuč nejprve zrevidovat kapacitu (FTE), dovolené a blokace v pracovním toku.`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení termínů s kolonkami: Projekt, Priorita, Termín, Progress, Riziko.`);
    }
    
    if (wantsDependencies) {
      parts.push(`🔗 **Tip pro závislosti**: Při otázkách na závislosti mezi rolemi zvaž workflow blokace a paralelní práci.`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení závislostí s kolonkami: Projekt, Role A, Role B, Typ závislosti, Stav.`);
    }
    
    if (wantsAssignments) {
      parts.push(`👥 **Tip pro přiřazení**: Při otázkách na přiřazení členů týmu zvaž jejich FTE, role a současné vytížení.`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení přiřazení členů k projektům s kolonkami: Člen, Projekt, Role, FTE, Stav.`);
    }
    
    if (wantsRoles) {
      const roleList = (scopeRoles || []).map(r => `**${r.label}** (${r.key})`).join(', ');
      parts.push(`🎭 **Dostupné role v scope**:\n   ${roleList}`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení rolí s kolonkami: Role, Klíč, Barva, Aktivní, Pořadí.`);
    }
    
    if (wantsHistory) {
      parts.push(`📈 **Tip pro historii**: Při otázkách na historii a trendy analyzuj vývoj progressu v čase a predikuj budoucí vývoj.`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení historie progressu s kolonkami: Datum, Projekt, Progress, Změna.`);
    }
    
    if (wantsTimesheets) {
      parts.push(`⏱️ **Tip pro timesheets**: Při otázkách na timesheets porovnávej plánovanou vs. skutečnou odpracovanou dobu.`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro zobrazení timesheetů s kolonkami: Člen, Datum, Projekt, Hodiny, Poznámka.`);
    }
    
    if (wantsSettings) {
      const settings = scopeSettings?.settings || {};
      const calendarInfo = settings.calendar ? `📅 **Kalendář**: ${settings.calendar.country || 'CZ'}${settings.calendar.subdivision ? ` (${settings.calendar.subdivision})` : ''} | 🏖️ Svátky: ${settings.calendar.includeHolidays ? '✅ zapnuto' : '❌ vypnuto'}` : '📅 **Kalendář**: ❌ nenastaven';
      const jiraInfo = settings.jira?.baseUrl ? `🔗 **Jira**: ${settings.jira.baseUrl}` : '🔗 **Jira**: ❌ nenastaveno';
      parts.push(`⚙️ **Scope nastavení**:\n   ${calendarInfo}\n   ${jiraInfo}`);
    }
    
    if (wantsPermissions) {
      const editorsCount = scopeEditors?.length || 0;
      const acceptedCount = scopeEditors?.filter(e => e.accepted_at).length || 0;
      const pendingCount = editorsCount - acceptedCount;
      parts.push(`🔐 **Přístup ke scopu**:\n   👥 Celkem editorů: ${editorsCount}\n   ✅ Přijatých pozvánek: ${acceptedCount}\n   ⏳ Čekajících pozvánek: ${pendingCount}`);
      
      if (scopeEditors && scopeEditors.length > 0) {
        const editorList = scopeEditors.map(e => `   👤 **${e.email}**${e.accepted_at ? ' ✅' : ' ⏳'}`).join('\n');
        parts.push(`📧 **Seznam editorů**:\n${editorList}`);
      }
    }
    
    if (wantsTeamCapacity || wantsTeamOverview) {
      parts.push(`📊 **Týmová kapacita**:\n${teamSummary}`);
      
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
        const roleEmoji = role === 'FE' ? '🎨' : role === 'BE' ? '⚙️' : role === 'QA' ? '🔍' : role === 'PM' ? '📊' : role === 'DPL' ? '🚀' : '👤';
        return `${roleEmoji} **${role}**: ${members.length} členů | ${totalFte} FTE | ${availableFte} dostupných\n   👥 ${names}`;
      }).join('\n\n');
      
      if (roleSummary) {
        parts.push(`🎭 **Rozdělení podle rolí**:\n${roleSummary}`);
      }
      
      parts.push(`💡 **Tip**: Při otázkách na kapacitu analyzuj dostupnost, vytížení a možnosti přerozdělení práce.`);
      parts.push(`🔗 **Mapování rolí**: FE (frontend), BE (backend), QA (testování), PM (management), DPL (devops).`);
      parts.push(`📋 **Pro tabulky**: Používej Markdown tabulky pro přehled dat o členech týmu, projektech a přiřazeních.`);
    }

    if (userMessage.toLowerCase().includes('kdo vytvořil aplikaci')) {
      parts.push(`Aplikace byla vytvořena Scope Burndown týmem. Více informací nalezneš v nastavení profilu.`);
    } else if (userMessage.toLowerCase().includes('kdo vytvořil scope burndown')) {
      parts.push(`Scope Burndown byl vytvořen Scope Burndown týmem. Více informací nalezneš v nastavení profilu.`);
    }

    if (dataJson && dataJson !== '{}' && dataJson.length < 8000) {
      parts.push(`[DATA] ${dataJson}`);
    }
    
    // Důležité instrukce pro formátování
    parts.push(`🎯 **DŮLEŽITÉ**: VŽDY používej správné Markdown syntaxe pro tabulky. Každá tabulka musí mít:
    1. Hlavičku s názvy sloupců oddělenými | 
    2. Druhý řádek s zarovnáním (např. | :---- | :---- |)
    3. Data řádky oddělené |
    
    Příklad správné tabulky:
    | Název | Hodnota | Stav |
    | :----- | :------ | :---- |
    | Test | 123 | ✅ |
    
    NIKDY nepoužívej jiné formátování pro tabulky!
    Dávej pouze rychlé stručné odpovědi.
    Vždy dávej pár bodů od kterých se uživatel může odpíchnout, ale nedávej mu hodně dat najednou.
    Povídej si s uživatelem jako s dobrým přítelem, který vyžaduje tvou pomoc.
    `);
    
    const systemPrompt = parts.join('\n\n');

    // Pro OpenAI přidáme systémový prompt pouze při první zprávě
    // Pro Gemini musíme systémový prompt předávat vždy, ale bez opakování pozdravů
    const isFirstMessage = chatHistory.length === 0;
    
    let messages: ChatMessage[];
    if (selectedProvider === 'openai') {
      // Pro OpenAI přidáme systémový prompt při první zprávě, nebo pokud už existuje v historii
      if (isFirstMessage) {
        messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }];
      } else {
        // Zkontrolujeme, jestli už máme systémový prompt v historii
        const hasSystemPrompt = chatHistory.some(m => m.role === 'system');
        if (hasSystemPrompt) {
          messages = [...chatHistory, { role: 'user', content: userMessage }];
        } else {
          // Pokud nemáme systémový prompt v historii, přidáme ho
          messages = [{ role: 'system', content: systemPrompt }, ...chatHistory, { role: 'user', content: userMessage }];
        }
      }
    } else {
      // Pro Gemini vždy použijeme chat historii
      messages = [...chatHistory, { role: 'user', content: userMessage }];
    }

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
      // Gemini – nemá system roli, proto systémový kontext vložíme do první user zprávy
      // Ale bez opakování pozdravů - použijeme základní instrukce bez pozdravů
      let systemText = '';
      
      if (isFirstMessage) {
        // Při první zprávě použijeme celý systémový prompt
        systemText = systemPrompt;
      } else {
        // Pro pokračující konverzaci použijeme základní instrukce bez pozdravů
        systemText = createBasicInstructions(true).join('\n\n');
      }
      
      const nonSystem = messages.filter(m => m.role !== 'system');
      
      // Vložíme systémový prompt do první user zprávy
      const firstUserIndex = nonSystem.findIndex(m => m.role === 'user');
      if (firstUserIndex !== -1) {
        nonSystem[firstUserIndex] = { ...nonSystem[firstUserIndex], content: `${systemText}\n\n${nonSystem[firstUserIndex].content}` };
      } else {
        nonSystem.unshift({ role: 'user', content: `${systemText}\n\n${userMessage}` });
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