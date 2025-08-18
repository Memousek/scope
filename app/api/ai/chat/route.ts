/**
 * Server-side AI chat proxy to hide API keys and reduce token usage.
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

    // Load minimal scope context (token-optimized)
    const { data: scope } = await supabase
      .from('scopes')
      .select('name, description, created_at')
      .eq('id', scopeId)
      .single();

    const { data: projects } = await supabase
      .from('projects')
      .select('name, priority, status, fe_mandays, be_mandays, qa_mandays, pm_mandays, dpl_mandays, fe_done, be_done, qa_done, pm_done, dpl_done, delivery_date, project_notes(text)')
      .eq('scope_id', scopeId)
      .order('priority', { ascending: true });

    // Team with vacations
    const { data: team } = await supabase
      .from('team_members')
      .select('name, role, fte, vacations')
      .eq('scope_id', scopeId)
      .order('name', { ascending: true });

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


    // Detect intent from user message
    const intentText = normalize(userMessage);
    const wantsVacations = /(dovol|vacat|holiday|volno)/.test(intentText);
    const wantsDeadlines = /(termin|deadline|priorit|kapac|fte|konec|start)/.test(intentText);
    const wantsProgress = /(burndown|progres|progress|prubeh|hotovo|%)/.test(intentText);
    const wantsTeam = /(tym|team|role|clen|member)/.test(intentText);
    const wantsNotes = /(poznam|pozn|note)/.test(intentText);

    // Pick focused projects: match by name tokens + top by priority
    const matchedProjects = (projects || []).filter(p => intentText.includes(normalize(p.name)));
    const topByPriority = (projects || []).slice(0, 12);
    const focusedProjects = Array.from(new Map([...matchedProjects, ...topByPriority].map(p => [p.name, p])).values());

    const summarizeProjects = (focusedProjects || []).map(p => {
      const progress = projectProgressPct(p);
      return `• ${p.name} | prio ${p.priority} | status ${p.status} | progress ${progress}% | delivery ${p.delivery_date ?? '—'}`;
    }).join('\n');
    

    const notesLines = wantsNotes
      ? (focusedProjects || []).map(p => {
          const ns = ((p as unknown as { project_notes?: Array<{ text: string }> }).project_notes || []);
          const text = ns.length > 0 ? ns.slice(0, 3).map(n => n.text).join(' | ') : '—';
          return `• ${p.name}: ${text}`;
        }).join('\n')
      : '';

    // Prepare team summaries incl. vacations today
    const todayIso = todayIsoInTz();
    const teamLines = (team || []).map(m => `• ${m.name} (${m.role || '—'}, ${m.fte ?? 0} FTE)`).join('\n');
    const activeVacations = (team || [])
      .flatMap((m: { name: string; vacations?: Array<{ start: string; end: string }> }) =>
        (Array.isArray(m.vacations) ? m.vacations : [])
          .filter((v: { start: string; end: string }) => v?.start <= todayIso && todayIso <= v?.end)
          .map((v: { start: string; end: string }) => ({ name: m.name, start: v.start, end: v.end }))
      );
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

    // Build compact JSON payload based on intent
    const payload: Record<string, unknown> = {};
    if (wantsProgress || wantsDeadlines) {
      payload.projects = (focusedProjects || []).map(p => ({
        name: p.name,
        priority: p.priority,
        status: p.status,
        progress: projectProgressPct(p),
        delivery: p.delivery_date
      }));
    }
    
    if (wantsNotes) {
      payload.notes = (focusedProjects || []).map(p => ({
        project: p.name,
        notes: (((p as unknown as { project_notes?: Array<{ text: string }> }).project_notes) || []).slice(0, 10).map(n => (n.text || '').slice(0, 300))
      }));
    }
    if (wantsTeam || wantsVacations) {
      payload.team = (team || []).map((m: { name: string; role: string; fte: number }) => ({ name: m.name, role: m.role, fte: m.fte }));
    }
    if (wantsVacations) {
      payload.vacationsToday = activeVacations;
      payload.vacations = (team || []).map((m: { name: string; vacations?: Array<{ start: string; end: string; note?: string }> }) => ({ name: m.name, vacations: Array.isArray(m.vacations) ? m.vacations.slice(0, 20) : [] }));
    }

    // Minify and cap payload size
    let dataJson = '';
    try {
      dataJson = JSON.stringify(payload);
      const MAX_LEN = 7000;
      if (dataJson.length > MAX_LEN) {
        // Reduce arrays if needed
        const reduceArray = (arr: unknown[], keep: number) => arr.slice(0, keep);
        const temp = payload as Record<string, unknown> & { notes?: unknown[]; projects?: unknown[]; team?: unknown[]; vacations?: unknown[] };
        if (Array.isArray(temp.notes)) temp.notes = reduceArray(temp.notes, 5);
        if (Array.isArray(temp.projects)) temp.projects = reduceArray(temp.projects, 8);
        if (Array.isArray(temp.team)) temp.team = reduceArray(temp.team, 20);
        if (Array.isArray(temp.vacations)) temp.vacations = reduceArray(temp.vacations, 20);
        dataJson = JSON.stringify(temp);
      }
    } catch {}

    // Intent-aware system prompt with compact, relevant context + JSON [DATA]
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


