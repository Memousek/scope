import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { JiraService } from '@/lib/services/jiraService';

export async function POST(req: NextRequest) {
  try {
    const { scopeId, jql, from, to } = (await req.json()) as { scopeId?: string; jql?: string; from?: string; to?: string };
    if (!scopeId || !from || !to) {
      return NextResponse.json({ error: 'Missing scopeId/from/to' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('scopes')
      .select('settings')
      .eq('id', scopeId)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const settings = (data?.settings || {}) as { jira?: { baseUrl?: string; email?: string; apiToken?: string } };
    const cfg = settings.jira || {};

    const worklogs = await JiraService.fetchWorklogsWithConfig(cfg, jql || '', from, to);
    return NextResponse.json({ ok: true, worklogs });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


